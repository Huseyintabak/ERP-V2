import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates array is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const results = [];

    for (const update of updates) {
      const { materialId, materialType, quantity, difference, reason, notes } = update;

      try {
        // Update the appropriate table based on material type
        let tableName = '';
        let quantityField = '';
        
        switch (materialType) {
          case 'raw':
            tableName = 'raw_materials';
            quantityField = 'quantity';
            break;
          case 'semi':
            tableName = 'semi_finished_products';
            quantityField = 'quantity';
            break;
          case 'finished':
            tableName = 'finished_products';
            quantityField = 'quantity';
            break;
          default:
            throw new Error(`Invalid material type: ${materialType}`);
        }

        // Update quantity
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ [quantityField]: quantity })
          .eq('id', materialId);

        if (updateError) {
          console.error(`Error updating ${materialType} material:`, updateError);
          results.push({
            materialId,
            success: false,
            error: updateError.message
          });
          continue;
        }

        // Create stock movement record
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            material_type: materialType,
            material_id: materialId,
            movement_type: difference > 0 ? 'sayim_fazlasi' : 'sayim_eksigi',
            quantity: Math.abs(difference),
            description: `${reason}: ${notes}`,
            user_id: payload.userId,
            created_at: new Date().toISOString()
          });

        if (movementError) {
          console.error('Error creating stock movement:', movementError);
          // Don't fail the whole operation for movement record error
        }

        // Create audit log
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            user_id: payload.userId,
            action: 'UPDATE',
            table_name: tableName,
            record_id: materialId,
            old_values: { [quantityField]: quantity - difference },
            new_values: { [quantityField]: quantity },
            description: `Envanter sayım güncellemesi: ${reason}`,
            created_at: new Date().toISOString()
          });

        if (auditError) {
          console.error('Error creating audit log:', auditError);
          // Don't fail the whole operation for audit log error
        }

        results.push({
          materialId,
          success: true,
          difference,
          newQuantity: quantity
        });

      } catch (error: any) {
        console.error(`Error processing update for material ${materialId}:`, error);
        results.push({
          materialId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} adet güncelleme başarılı, ${failureCount} adet başarısız`,
      results,
      summary: {
        total: updates.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error: any) {
    console.error('Error in inventory count process:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
