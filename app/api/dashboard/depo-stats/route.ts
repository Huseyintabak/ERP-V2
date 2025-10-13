import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only depo and yonetici can view warehouse stats
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get last 7 days range
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Parallel fetch all statistics
    const [
      rawMaterialsCount,
      semiFinishedCount,
      finishedProductsCount,
      dailyInbound,
      dailyOutbound,
      weeklyInbound,
      weeklyOutbound,
      criticalStock,
      lowStockItems,
      reservedStock,
      stockValue,
      stockAge,
      stockTurnoverResult
    ] = await Promise.all([
      // 1. Raw materials count
      supabase.from('raw_materials').select('*', { count: 'exact', head: true }),
      
      // 2. Semi-finished count
      supabase.from('semi_finished_products').select('*', { count: 'exact', head: true }),
      
      // 3. Finished products count
      supabase.from('finished_products').select('*', { count: 'exact', head: true }),
      
      // 4. Daily inbound movements (today)
      supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('movement_type', 'giris')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString()),
      
      // 5. Daily outbound movements (today)
      supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('movement_type', 'cikis')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString()),
      
      // 6. Weekly inbound movements
      supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('movement_type', 'giris')
        .gte('created_at', weekAgo.toISOString()),
      
      // 7. Weekly outbound movements
      supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('movement_type', 'cikis')
        .gte('created_at', weekAgo.toISOString()),
      
      // 8. Critical stock (quantity <= reorder_level)
      supabase.rpc('get_critical_stock_count'),
      
      // 9. Low stock items (quantity <= minimum_stock)
      supabase.rpc('get_low_stock_count'),
      
      // 10. Reserved stock (from material_reservations)
      supabase
        .from('material_reservations')
        .select('reserved_quantity'),
      
      // 11. Total stock value
      Promise.all([
        supabase.from('raw_materials').select('quantity, unit_cost'),
        supabase.from('semi_finished_products').select('quantity, unit_cost'),
        supabase.from('finished_products').select('quantity, sale_price'),
      ]),
      
      // 12. Stock age analysis
      supabase.from('raw_materials').select('created_at').order('created_at', { ascending: true }),
      
      // 13. Stock turnover analysis
      supabase.rpc('get_stock_turnover_analysis')
    ]);

    // Calculate stock counts
    const rawCount = rawMaterialsCount.count || 0;
    const semiCount = semiFinishedCount.count || 0;
    const finishedCount = finishedProductsCount.count || 0;
    const totalCount = rawCount + semiCount + finishedCount;

    // Calculate stock value
    let totalStockValue = 0;
    
    if (stockValue[0].data) {
      totalStockValue += stockValue[0].data.reduce((sum, item) => 
        sum + (item.quantity * (item.unit_cost || 0)), 0
      );
    }
    if (stockValue[1].data) {
      totalStockValue += stockValue[1].data.reduce((sum, item) => 
        sum + (item.quantity * (item.unit_cost || 0)), 0
      );
    }
    if (stockValue[2].data) {
      totalStockValue += stockValue[2].data.reduce((sum, item) => 
        sum + (item.quantity * (item.sale_price || 0)), 0
      );
    }

    // Calculate stock age
    let averageStockAge = 45; // Default
    let oldestStock = 120; // Default
    let newestStock = 2; // Default

    if (stockAge.data && stockAge.data.length > 0) {
      const oldestDate = new Date(stockAge.data[0].created_at);
      const newestDate = new Date(stockAge.data[stockAge.data.length - 1].created_at);
      const now = new Date();
      
      oldestStock = Math.floor((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
      newestStock = Math.floor((now.getTime() - newestDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate average
      const totalAge = stockAge.data.reduce((sum, item) => {
        const itemAge = Math.floor((now.getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return sum + itemAge;
      }, 0);
      averageStockAge = Math.floor(totalAge / stockAge.data.length);
    }

    // Calculate reserved stock total
    const totalReserved = reservedStock.data?.reduce((sum, item) => sum + (item.reserved_quantity || 0), 0) || 0;

    // Get real stock turnover analysis from database function
    const stockTurnover = stockTurnoverResult.data || {
      high: 0,
      medium: 0,
      low: 0
    };

    // Calculate trend (compare this week vs last week)
    const lastWeekAgo = new Date(weekAgo);
    lastWeekAgo.setDate(lastWeekAgo.getDate() - 7);
    
    const { count: lastWeekMovements } = await supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastWeekAgo.toISOString())
      .lt('created_at', weekAgo.toISOString());

    const thisWeekMovements = (weeklyInbound.count || 0) + (weeklyOutbound.count || 0);
    const lastWeekTotal = lastWeekMovements || 1;
    const stockMovementTrend = ((thisWeekMovements - lastWeekTotal) / lastWeekTotal) * 100;

    return NextResponse.json({
      data: {
        // Stock counts
        rawMaterials: rawCount,
        semiFinished: semiCount,
        finished: finishedCount,
        totalStock: totalCount,
        
        // Daily movements
        dailyInbound: dailyInbound.count || 0,
        dailyOutbound: dailyOutbound.count || 0,
        
        // Weekly movements
        weeklyInbound: weeklyInbound.count || 0,
        weeklyOutbound: weeklyOutbound.count || 0,
        
        // Stock turnover
        stockTurnover,
        
        // Critical alerts
        criticalStock: criticalStock.data || 0,
        lowStockItems: lowStockItems.data || 0,
        expiredStock: 0, // TODO: Implement expiry tracking
        reservedStock: Math.round(totalReserved),
        
        // Value & age
        totalStockValue: Math.round(totalStockValue),
        averageStockAge,
        oldestStock,
        newestStock,
        
        // Trends
        stockMovementTrend: Math.round(stockMovementTrend * 10) / 10
      }
    });

  } catch (error) {
    console.error('Depo stats API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

