import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth & Permission Check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !['operator', 'planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = payload.userId;
    const userRole = payload.role;
    const supabase = await createClient();

    // Request body parse
    const body = await request.json();
    const { plan_id, action } = body;

    if (!plan_id || !action) {
      return NextResponse.json({ 
        error: 'plan_id ve action gerekli' 
      }, { status: 400 });
    }

    // 2. Plan Bilgilerini Al
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .select(`
        *,
        order:orders(*),
        product:finished_products(*)
      `)
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ 
        error: 'Plan bulunamadı' 
      }, { status: 404 });
    }

    // 3. Operatör Yetkisi Kontrolü (operatör rolü için)
    if (userRole === 'operator' && plan.assigned_operator_id !== userId) {
      return NextResponse.json({ 
        error: 'Bu plan size atanmamış' 
      }, { status: 403 });
    }

    // 4. Action'a Göre İşlem Yap
    let newStatus: string;
    let updateData: any = {};

    switch (action) {
      case 'accept':
        if (plan.status !== 'planlandi') {
          return NextResponse.json({ 
            error: 'Sadece planlandi durumundaki planlar kabul edilebilir' 
          }, { status: 400 });
        }
        newStatus = 'devam_ediyor';
        updateData = {
          status: newStatus,
          started_at: new Date().toISOString()
        };
        break;

      case 'pause':
        if (plan.status !== 'devam_ediyor') {
          return NextResponse.json({ 
            error: 'Sadece devam_ediyor durumundaki planlar duraklatılabilir' 
          }, { status: 400 });
        }
        newStatus = 'duraklatildi';
        updateData = { status: newStatus };
        break;

      case 'resume':
        if (plan.status !== 'duraklatildi') {
          return NextResponse.json({ 
            error: 'Sadece duraklatildi durumundaki planlar devam ettirilebilir' 
          }, { status: 400 });
        }
        newStatus = 'devam_ediyor';
        updateData = { status: newStatus };
        break;

      case 'complete':
        if (plan.status !== 'devam_ediyor') {
          return NextResponse.json({ 
            error: 'Sadece devam_ediyor durumundaki planlar tamamlanabilir' 
          }, { status: 400 });
        }
        
        // Hedef miktar kontrolü
        if (plan.produced_quantity < plan.planned_quantity) {
          return NextResponse.json({ 
            error: `Hedef miktar tamamlanmamış. Planlanan: ${plan.planned_quantity}, Üretilen: ${plan.produced_quantity}` 
          }, { status: 400 });
        }
        
        newStatus = 'tamamlandi';
        updateData = {
          status: newStatus,
          completed_at: new Date().toISOString()
        };
        break;

      default:
        return NextResponse.json({ 
          error: 'Geçersiz action. Geçerli değerler: accept, pause, resume, complete' 
        }, { status: 400 });
    }

    // 5. Plan Status Güncelle
    const { data: updatedPlan, error: updateError } = await supabase
      .from('production_plans')
      .update(updateData)
      .eq('id', plan_id)
      .select(`
        *,
        order:orders(*),
        product:finished_products(*)
      `)
      .single();

    if (updateError) {
      console.error('Plan update error:', updateError);
      return NextResponse.json({ 
        error: 'Plan güncellenemedi' 
      }, { status: 500 });
    }

    // 6. Complete action ise Order status'u da güncelle
    if (action === 'complete') {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: 'tamamlandi' })
        .eq('id', plan.order_id);

      if (orderUpdateError) {
        console.error('Order update error:', orderUpdateError);
        // Plan güncellendi ama order güncellenemedi - warning olarak logla
      }
    }

    // 7. Operatör Status Güncelle (accept/pause/resume için)
    if (['accept', 'pause', 'resume'].includes(action)) {
      let operatorStatus: string;
      
      if (action === 'accept' || action === 'resume') {
        operatorStatus = 'active';
      } else if (action === 'pause') {
        operatorStatus = 'idle';
      }

      if (operatorStatus && plan.assigned_operator_id) {
        const { error: operatorUpdateError } = await supabase
          .from('operators')
          .update({ current_status: operatorStatus })
          .eq('id', plan.assigned_operator_id);

        if (operatorUpdateError) {
          console.error('Operator status update error:', operatorUpdateError);
          // Kritik değil, devam et
        }
      }
    }

    // Response
    const response = {
      success: true,
      message: `Plan başarıyla ${action === 'accept' ? 'kabul edildi' : 
                                   action === 'pause' ? 'duraklatıldı' :
                                   action === 'resume' ? 'devam ettirildi' : 'tamamlandı'}`,
      plan: updatedPlan,
      action,
      oldStatus: plan.status,
      newStatus: newStatus
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Plan Status API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
