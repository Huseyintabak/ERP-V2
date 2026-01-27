import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
// Validation schema
const inventoryCountSchema = z.object({
  materialType: z.enum(['raw', 'semi', 'finished']),
  materialId: z.string().uuid(),
  physicalQuantity: z.number().min(0),
  notes: z.string().optional(),
  batchId: z.string().uuid().optional()
});

/**
 * POST /api/stock/count
 * Yeni envanter sayımı kaydı oluşturur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = inventoryCountSchema.parse(body);

    const supabase = await createClient();

    // Malzeme bilgilerini al
    let materialQuery;
    let materialTable;

    switch (validated.materialType) {
      case 'raw':
        materialTable = 'raw_materials';
        break;
      case 'semi':
        materialTable = 'semi_finished_products';
        break;
      case 'finished':
        materialTable = 'finished_products';
        break;
    }

    const { data: material, error: materialError } = await supabase
      .from(materialTable)
      .select('id, code, name, quantity, unit')
      .eq('id', validated.materialId)
      .single();

    if (materialError || !material) {
      return NextResponse.json(
        { error: 'Malzeme bulunamadı' },
        { status: 404 }
      );
    }

    // Kullanıcı bilgisini al (auth token'dan)
    const { data: { user } } = await supabase.auth.getUser();

    // Envanter sayımı oluştur
    const { data: count, error: countError } = await supabase
      .from('inventory_counts')
      .insert([{
        material_type: validated.materialType,
        material_id: validated.materialId,
        material_code: material.code,
        material_name: material.name,
        system_quantity: material.quantity,
        physical_quantity: validated.physicalQuantity,
        counted_by: user?.id || null,
        notes: validated.notes,
        batch_id: validated.batchId || null,
        status: 'pending'
      }])
      .select(`
        *,
        counted_by_user:users!inventory_counts_counted_by_fkey(id, name, email)
      `)
      .single();

    if (countError) throw countError;

    // Fark analizi
    const difference = validated.physicalQuantity - material.quantity;
    const variancePercent = material.quantity > 0 
      ? ((difference / material.quantity) * 100).toFixed(2)
      : '0';

    const analysis = {
      system_quantity: material.quantity,
      physical_quantity: validated.physicalQuantity,
      difference: difference,
      variance_percentage: parseFloat(variancePercent),
      severity: Math.abs(parseFloat(variancePercent)) > 10 
        ? 'high' 
        : Math.abs(parseFloat(variancePercent)) > 5 
        ? 'medium' 
        : 'low'
    };

    // ============================================
    // AI AGENT VALIDATION (Warehouse Agent)
    // ============================================
    if (process.env.AGENT_ENABLED === 'true') {
      try {
        logger.log('🤖 Warehouse Agent validation başlatılıyor (stock count)...');

        const orchestrator = AgentOrchestrator.getInstance();
        const agentResult = await orchestrator.startConversation('warehouse', {
          id: `stock_count_${validated.materialId}_${Date.now()}`,
          prompt: `Envanter sayımı doğrula: ${material.name} (${material.code}), Sistem: ${material.quantity}, Fiziksel: ${validated.physicalQuantity}, Fark: ${difference}`,
          type: 'validation',
          context: {
            materialType: validated.materialType,
            materialId: validated.materialId,
            materialCode: material.code,
            materialName: material.name,
            systemQuantity: material.quantity,
            physicalQuantity: validated.physicalQuantity,
            difference: difference,
            variancePercentage: parseFloat(variancePercent),
            severity: analysis.severity,
            notes: validated.notes,
          },
          urgency: analysis.severity === 'high' ? 'high' : 'medium',
          severity: analysis.severity === 'high' ? 'high' : 'medium',
        });

        await agentLogger.log({
          agent: 'warehouse',
          action: 'stock_count_validation',
          materialId: validated.materialId,
          finalDecision: agentResult.finalDecision,
          protocolResult: agentResult.protocolResult,
        });

        // Agent reddettiyse - Graceful degradation: warning log ama devam et
        if (agentResult.finalDecision === 'rejected') {
          logger.warn('⚠️ Warehouse Agent envanter sayımını reddetti, ama işleme devam ediliyor');
        }

        // Agent onayladıysa
        if (agentResult.finalDecision === 'approved') {
          logger.log('✅ Warehouse Agent envanter sayımını onayladı');
        }
      } catch (error: any) {
        logger.warn('⚠️ Warehouse Agent validation hatası, envanter sayımı devam ediyor:', error.message);
        await agentLogger.error({
          agent: 'warehouse',
          action: 'stock_count_validation_error',
          materialId: validated.materialId,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: count,
      analysis
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Geçersiz veri', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('❌ Inventory count error:', error);
    return NextResponse.json(
      { error: error.message || 'Envanter sayımı oluşturulamadı' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stock/count
 * Envanter sayımlarını listeler
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const materialType = searchParams.get('materialType');
    const batchId = searchParams.get('batchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = await createClient();

    let query = supabase
      .from('inventory_counts')
      .select(`
        *,
        counted_by_user:users!inventory_counts_counted_by_fkey(id, name, email),
        approved_by_user:users!inventory_counts_approved_by_fkey(id, name, email)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (materialType) {
      query = query.eq('material_type', materialType);
    }

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    logger.error('❌ Inventory count list error:', error);
    return NextResponse.json(
      { error: error.message || 'Envanter sayımları listelenemedi' },
      { status: 500 }
    );
  }
}

