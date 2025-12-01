import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { agentLogger } from '@/lib/ai/utils/logger';

import { logger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    const { data: material, error } = await supabase
      .from('raw_materials')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json(material);
  } catch (error) {
    logger.error('Error fetching raw material:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    // Only managers and planlama can update materials
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = await request.json();

    // Get current material data before update
    const { data: currentMaterial } = await supabase
      .from('raw_materials')
      .select('*')
      .eq('id', id)
      .single();

    // ============================================
    // AI AGENT VALIDATION (Opsiyonel - AGENT_ENABLED kontrolü ile)
    // Quantity güncellemesi için özellikle önemli
    // ============================================
    if (process.env.AGENT_ENABLED === 'true' && updateData.quantity !== undefined) {
      try {
        logger.log('🤖 AI Agent validation başlatılıyor (Warehouse - Raw Material Update)...');
        
        // Warehouse Agent ile konuşma başlat
        const orchestrator = AgentOrchestrator.getInstance();
        const agentResult = await orchestrator.startConversation('warehouse', {
          id: `raw_material_update_${id}_${Date.now()}`,
          prompt: `Bu hammadde stok güncellemesini doğrula: ${currentMaterial?.name || id}`,
          type: 'validation',
          context: {
            materialId: id,
            materialName: currentMaterial?.name,
            materialCode: currentMaterial?.code,
            currentQuantity: currentMaterial?.quantity,
            newQuantity: updateData.quantity,
            quantityChange: updateData.quantity - (currentMaterial?.quantity || 0),
            criticalLevel: currentMaterial?.critical_level,
            updateData: updateData,
            requestedBy: payload.userId,
            requestedByRole: payload.role
          },
          urgency: Math.abs(updateData.quantity - (currentMaterial?.quantity || 0)) > 100 ? 'high' : 'medium',
          severity: updateData.quantity < (currentMaterial?.critical_level || 0) ? 'high' : 'medium'
        });

        await agentLogger.log({
          agent: 'warehouse',
          action: 'raw_material_update_validation',
          materialId: id,
          currentQuantity: currentMaterial?.quantity,
          newQuantity: updateData.quantity,
          finalDecision: agentResult.finalDecision,
          protocolResult: agentResult.protocolResult
        });

        // Agent reddettiyse
        if (agentResult.finalDecision === 'rejected') {
          logger.warn('❌ AI Agent hammadde güncellemesini reddetti:', agentResult.protocolResult?.errors);
          return NextResponse.json(
            {
              error: 'AI Agent validation failed',
              message: 'Hammadde güncellemesi AI Agent tarafından reddedildi',
              details: agentResult.protocolResult?.errors || [],
              warnings: agentResult.protocolResult?.warnings || [],
              agentReasoning: agentResult.protocolResult?.decision?.reasoning
            },
            { status: 400 }
          );
        }

        // Human approval bekleniyorsa
        if (agentResult.finalDecision === 'pending_approval') {
          logger.log('⏳ AI Agent human approval bekliyor...');
          return NextResponse.json(
            {
              error: 'Human approval required',
              message: 'Bu hammadde güncellemesi için yönetici onayı gerekiyor',
              approvalRequired: true,
              decisionId: agentResult.protocolResult?.decision?.action
            },
            { status: 403 }
          );
        }

        // Agent onayladıysa
        if (agentResult.finalDecision === 'approved') {
          logger.log('✅ AI Agent hammadde güncellemesini onayladı');
          logger.log('📊 Agent reasoning:', agentResult.protocolResult?.decision?.reasoning);
          
          // Agent'ın önerileri varsa logla
          if (agentResult.protocolResult?.warnings && agentResult.protocolResult.warnings.length > 0) {
            logger.warn('⚠️ AI Agent uyarıları:', agentResult.protocolResult.warnings);
          }
        }
      } catch (error: any) {
        // Agent hatası durumunda graceful degradation - manuel güncelleme devam eder
        logger.warn('⚠️ AI Agent validation hatası, manuel güncelleme devam ediyor:', error.message);
        await agentLogger.error({
          agent: 'warehouse',
          action: 'raw_material_update_validation_error',
          materialId: id,
          error: error.message
        });
        // Hata olsa bile manuel güncelleme devam eder (graceful degradation)
      }
    }

    const { data: material, error } = await supabase
      .from('raw_materials')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('❌ Update error:', error);
      return NextResponse.json({ 
        error: 'Güncelleme başarısız', 
        details: error.message,
        code: error.code 
      }, { status: 400 });
    }

    // 🔔 Otomatik Kritik Stok Bildirimi Kontrolü
    if (updateData.quantity !== undefined && material) {
      const currentQuantity = updateData.quantity;
      const criticalLevel = material.critical_level;
      
      if (currentQuantity <= criticalLevel) {
        // Mevcut okunmamış bildirim var mı kontrol et
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('material_id', id)
          .eq('type', 'critical_stock')
          .eq('is_read', false)
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          // Yeni kritik stok bildirimi oluştur
          await supabase
            .from('notifications')
            .insert({
              type: 'critical_stock',
              title: 'Kritik Stok Seviyesi',
              message: `Malzeme: ${material.name} (${material.code}) - Mevcut: ${currentQuantity} - Kritik Seviye: ${criticalLevel}`,
              material_type: 'raw',
              material_id: id,
              severity: 'high',
              user_id: payload.userId
            });
          
          logger.log('🔔 Kritik stok bildirimi oluşturuldu:', material.name);
        }
      } else {
        // Stok normal seviyeye çıktıysa, mevcut bildirimleri okundu olarak işaretle
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('material_id', id)
          .eq('type', 'critical_stock')
          .eq('is_read', false);
          
        logger.log('✅ Kritik stok bildirimleri okundu olarak işaretlendi:', material.name);
      }
    }

    return NextResponse.json(material);
  } catch (error) {
    logger.error('❌ Error updating raw material:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    // Only managers and planlama can delete materials
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if material is referenced in BOM
    const { data: bomReferences } = await supabase
      .from('bom')
      .select('id')
      .eq('material_id', id)
      .limit(1);

    if (bomReferences && bomReferences.length > 0) {
      return NextResponse.json({ 
        error: 'Bu hammadde BOM\'da kullanılıyor. Önce BOM\'dan kaldırın.' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('raw_materials')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Delete error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete material', 
        details: error.message 
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'Material deleted successfully' });
  } catch (error) {
    logger.error('Error deleting raw material:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}