import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    // Auth check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !['operator', 'planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operatorId = payload.userId;
    const supabase = await createClient();

    const { planId } = await params;

    // Plan'ın operatöre atanmış olduğunu kontrol et (operatör için)
    if (payload.role === 'operator') {
      const { data: plan, error: planError } = await supabase
        .from('production_plans')
        .select('assigned_operator_id')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
      }

      if (plan.assigned_operator_id !== operatorId) {
        return NextResponse.json({ error: 'Bu plan size atanmamış' }, { status: 403 });
      }
    }

    // BOM snapshot'ını getir
    const { data: bomSnapshot, error: bomError } = await supabase
      .from('production_plan_bom_snapshot')
      .select('*')
      .eq('plan_id', planId);

    if (bomError) {
      logger.error('BOM snapshot fetch error:', bomError);
      return NextResponse.json({ error: 'BOM snapshot alınamadı' }, { status: 500 });
    }

    if (!bomSnapshot || bomSnapshot.length === 0) {
      logger.log('No BOM snapshot found for plan:', planId);
      // BOM snapshot yoksa, plan'dan ürün bilgisini al ve BOM'u direkt çek
      const { data: plan } = await supabase
        .from('production_plans')
        .select('product_id, product_type, planned_quantity')
        .eq('id', planId)
        .single();
      
      if (plan) {
        logger.log('Plan found, fetching BOM directly for product:', plan.product_id);
        // BOM'u direkt çek
        try {
          const bomResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/bom/${plan.product_id}`);
          if (bomResponse.ok) {
            const bomData = await bomResponse.json();
            logger.log('BOM data fetched directly:', bomData);
            
            // Malzeme stok bilgilerini ekle
            const materials = await Promise.all(
              (bomData.materials || []).map(async (material: any) => {
                let currentStock = 0;
                
                if (material.material_type === 'raw') {
                  const { data: rawMaterial } = await supabase
                    .from('raw_materials')
                    .select('quantity')
                    .eq('id', material.material_id)
                    .single();
                  currentStock = rawMaterial?.quantity || 0;
                } else if (material.material_type === 'semi') {
                  const { data: semiMaterial } = await supabase
                    .from('semi_finished_products')
                    .select('quantity')
                    .eq('id', material.material_id)
                    .single();
                  currentStock = semiMaterial?.quantity || 0;
                } else if (material.material_type === 'finished') {
                  const { data: finishedMaterial } = await supabase
                    .from('finished_products')
                    .select('quantity')
                    .eq('id', material.material_id)
                    .single();
                  currentStock = finishedMaterial?.quantity || 0;
                }

                return {
                  material_type: material.material_type,
                  material_code: material.material_code || 'N/A',
                  material_name: material.material_name || 'N/A',
                  quantity_needed: material.quantity_needed || 0,
                  current_stock: currentStock,
                  consumption_per_unit: material.quantity_needed || 0,
                  material_id: material.material_id
                };
              })
            );
            
            return NextResponse.json({
              materials,
              planId,
              totalMaterials: materials.length
            });
          }
        } catch (error) {
          logger.error('Error fetching BOM directly:', error);
        }
      }
      
      return NextResponse.json({ 
        error: 'Bu plan için BOM snapshot bulunamadı' 
      }, { status: 404 });
    }

    // Malzeme stok bilgilerini ekle
    const materials = await Promise.all(
      bomSnapshot.map(async (item) => {
        let currentStock = 0;
        
        if (item.material_type === 'raw') {
          const { data: rawMaterial } = await supabase
            .from('raw_materials')
            .select('quantity')
            .eq('id', item.material_id)
            .single();
          currentStock = rawMaterial?.quantity || 0;
        } else if (item.material_type === 'semi') {
          const { data: semiMaterial } = await supabase
            .from('semi_finished_products')
            .select('quantity')
            .eq('id', item.material_id)
            .single();
          currentStock = semiMaterial?.quantity || 0;
        }

        return {
          material_type: item.material_type,
          material_code: item.material_code,
          material_name: item.material_name,
          quantity_needed: item.quantity_needed,
          current_stock: currentStock,
          consumption_per_unit: item.quantity_needed / (await supabase
            .from('production_plans')
            .select('planned_quantity')
            .eq('id', planId)
            .single()
            .then(({ data }) => data?.planned_quantity || 1)
          )
        };
      })
    );

    return NextResponse.json({
      materials,
      planId,
      totalMaterials: materials.length
    });

  } catch (error) {
    logger.error('BOM Snapshot API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
