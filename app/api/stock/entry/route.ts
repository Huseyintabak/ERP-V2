import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { agentLogger } from '@/lib/ai/utils/logger';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, barcode, quantity, location, notes, type } = body;

    // Validation
    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Ürün ID ve geçerli miktar gerekli', success: false },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // ============================================
    // AI AGENT VALIDATION (Warehouse Agent)
    // ============================================
    if (process.env.AGENT_ENABLED === 'true') {
      try {
        logger.log('🤖 Warehouse Agent validation başlatılıyor (stock entry)...');

        const orchestrator = AgentOrchestrator.getInstance();
        const agentResult = await orchestrator.startConversation('warehouse', {
          id: `stock_entry_${product_id}_${Date.now()}`,
          prompt: `Stok girişi doğrula: Ürün ID ${product_id}, Miktar: ${quantity}`,
          type: 'validation',
          context: {
            productId: product_id,
            barcode: barcode,
            quantity: quantity,
            location: location,
            movementType: 'giris',
            notes: notes,
          },
          urgency: 'medium',
          severity: 'medium',
        });

        await agentLogger.log({
          agent: 'warehouse',
          action: 'stock_entry_validation',
          materialId: product_id,
          finalDecision: agentResult.finalDecision,
          protocolResult: agentResult.protocolResult,
        });

        // Agent reddettiyse - Graceful degradation: warning log ama devam et
        if (agentResult.finalDecision === 'rejected') {
          logger.warn('⚠️ Warehouse Agent stok girişini reddetti, ama işleme devam ediliyor');
        }

        // Agent onayladıysa
        if (agentResult.finalDecision === 'approved') {
          logger.log('✅ Warehouse Agent stok girişini onayladı');
        }
      } catch (error: any) {
        logger.warn('⚠️ Warehouse Agent validation hatası, stok girişi devam ediyor:', error.message);
        await agentLogger.error({
          agent: 'warehouse',
          action: 'stock_entry_validation_error',
          materialId: product_id,
          error: error.message,
        });
      }
    }

    // Get current user (if authentication is implemented)
    // const { data: { user } } = await supabase.auth.getUser();

    // Insert stock movement record
    const { data: movement, error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id,
        type: type || 'entry',
        quantity: Number(quantity),
        location: location || null,
        notes: notes || null,
        created_at: new Date().toISOString(),
        // user_id: user?.id || null,
      })
      .select()
      .single();

    if (movementError) {
      console.error('Stock movement insert error:', movementError);
      return NextResponse.json(
        { error: 'Stok hareketi kaydedilemedi', success: false },
        { status: 500 }
      );
    }

    // Update or create stock record
    const { data: existingStock } = await supabase
      .from('stock')
      .select('*')
      .eq('product_id', product_id)
      .single();

    if (existingStock) {
      // Update existing stock
      const newQuantity = existingStock.quantity + Number(quantity);
      const { error: updateError } = await supabase
        .from('stock')
        .update({
          quantity: newQuantity,
          location: location || existingStock.location,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', product_id);

      if (updateError) {
        console.error('Stock update error:', updateError);
        return NextResponse.json(
          { error: 'Stok güncellenemedi', success: false },
          { status: 500 }
        );
      }
    } else {
      // Create new stock record
      const { error: insertError } = await supabase
        .from('stock')
        .insert({
          product_id,
          quantity: Number(quantity),
          location: location || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Stock insert error:', insertError);
        return NextResponse.json(
          { error: 'Stok kaydı oluşturulamadı', success: false },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `${quantity} adet stok girişi başarılı`,
      movement,
    });
  } catch (error) {
    console.error('Stock entry error:', error);
    return NextResponse.json(
      { error: 'Stok giriş işlemi başarısız', success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get recent stock entries
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products (
          code,
          name,
          barcode
        )
      `)
      .eq('type', 'entry')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      entries: data,
    });
  } catch (error) {
    console.error('Get stock entries error:', error);
    return NextResponse.json(
      { error: 'Stok giriş kayıtları alınamadı', success: false },
      { status: 500 }
    );
  }
}
