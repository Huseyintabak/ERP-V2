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
        const quantityChange = updateData.quantity - (currentMaterial?.quantity || 0);
        const isDecrease = quantityChange < 0;
        const isCriticalDecrease = updateData.quantity < (currentMaterial?.critical_level || 0);
        const isLargeChange = Math.abs(quantityChange) > 100;
        
        // Daha detaylı ve açıklayıcı prompt
        const prompt = `Hammadde stok güncelleme doğrulaması:

Malzeme: ${currentMaterial?.name || 'Bilinmiyor'} (${currentMaterial?.code || id})
Mevcut Stok: ${currentMaterial?.quantity || 0} ${currentMaterial?.unit || ''}
Yeni Stok: ${updateData.quantity} ${currentMaterial?.unit || ''}
Değişim: ${quantityChange > 0 ? '+' : ''}${quantityChange} ${currentMaterial?.unit || ''}
Kritik Seviye: ${currentMaterial?.critical_level || 0} ${currentMaterial?.unit || ''}

Güncelleme tipi: ${isDecrease ? 'Stok azalışı' : 'Stok artışı'}
${isLargeChange ? '⚠️ BÜYÜK DEĞİŞİM (100+ birim)' : ''}
${isCriticalDecrease ? '🔴 KRİTİK SEVİYE UYARISI: Yeni stok kritik seviyenin altında!' : ''}

Bu güncellemeyi doğrula:
1. Stok değişimi mantıklı mı? (Ani büyük değişimler şüpheli olabilir)
2. Kritik seviye ihlali var mı?
3. Stok azalışı varsa, rezervasyon durumu kontrol edilmeli mi?
4. Bu bir sayım düzeltmesi mi, normal hareket mi?

Yönetici/Planlama tarafından yapılan güncelleme - otomatik onay gerektirebilir.`;

        const agentResult = await orchestrator.startConversation('warehouse', {
          id: `raw_material_update_${id}_${Date.now()}`,
          prompt: prompt,
          type: 'validation',
          context: {
            materialId: id,
            materialName: currentMaterial?.name,
            materialCode: currentMaterial?.code,
            currentQuantity: currentMaterial?.quantity,
            newQuantity: updateData.quantity,
            quantityChange: quantityChange,
            criticalLevel: currentMaterial?.critical_level,
            unit: currentMaterial?.unit,
            isDecrease: isDecrease,
            isCriticalDecrease: isCriticalDecrease,
            isLargeChange: isLargeChange,
            updateData: updateData,
            requestedBy: payload.userId,
            requestedByRole: payload.role
          },
          urgency: isLargeChange ? 'high' : 'medium',
          severity: isCriticalDecrease ? 'high' : 'medium'
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

        // OpenAI API hataları kontrolü (429, quota, billing, invalid key, etc.)
        // Bu hatalar durumunda graceful degradation: işlem devam etmeli
        const reasoning = agentResult.protocolResult?.decision?.reasoning || '';
        const errors = agentResult.protocolResult?.errors || [];
        const warnings = agentResult.protocolResult?.warnings || [];
        
        // Tüm error mesajlarını tek bir string'e birleştir
        const allErrorTexts = [
          reasoning,
          ...errors.map((e: any) => typeof e === 'string' ? e : JSON.stringify(e)),
          ...warnings.map((w: any) => typeof w === 'string' ? w : JSON.stringify(w))
        ].join(' ').toLowerCase();
        
        // OpenAI API hataları kontrolü
        const hasOpenAIError = 
          allErrorTexts.includes('429') || 
          allErrorTexts.includes('quota') || 
          allErrorTexts.includes('exceeded') || 
          allErrorTexts.includes('billing') ||
          allErrorTexts.includes('invalid api key') ||
          allErrorTexts.includes('unauthorized') ||
          allErrorTexts.includes('401') ||
          allErrorTexts.includes('you exceeded your current quota') ||
          allErrorTexts.includes('error processing request');

        // Agent reddettiyse
        if (agentResult.finalDecision === 'rejected') {
          // OpenAI API hatası varsa, graceful degradation: uyarı ver ama devam et
          if (hasOpenAIError) {
            logger.warn('⚠️ OpenAI API hatası nedeniyle AI Agent validation atlandı, manuel güncelleme devam ediyor');
            logger.warn('⚠️ Agent Result:', { 
              finalDecision: agentResult.finalDecision, 
              reasoning: reasoning.substring(0, 200), // İlk 200 karakter
              errors: errors.slice(0, 3) // İlk 3 error
            });
            // OpenAI hatası durumunda işleme devam et (graceful degradation)
          } else {
            // Normal rejection (OpenAI hatası değil)
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
        // OpenAI API key veya quota hataları için özel handling
        const isOpenAIError = error?.message?.includes('429') || 
                             error?.message?.includes('quota') || 
                             error?.message?.includes('exceeded') ||
                             error?.message?.includes('billing') ||
                             error?.message?.includes('Invalid API key') ||
                             error?.message?.includes('401') ||
                             error?.message?.includes('Unauthorized');
        
        if (isOpenAIError) {
          logger.warn('⚠️ OpenAI API hatası (quota/key), AI Agent validation atlandı, manuel güncelleme devam ediyor:', error.message);
          await agentLogger.warn({
            agent: 'warehouse',
            action: 'raw_material_update_validation_openai_error',
            materialId: id,
            error: error.message,
            message: 'OpenAI API error, graceful degradation: manual update continues'
          });
        } else {
          // Diğer hatalar için normal logging
          logger.warn('⚠️ AI Agent validation hatası, manuel güncelleme devam ediyor:', error.message);
          await agentLogger.error({
            agent: 'warehouse',
            action: 'raw_material_update_validation_error',
            materialId: id,
            error: error.message
          });
        }
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