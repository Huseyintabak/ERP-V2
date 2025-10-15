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

    const { startDate, endDate, reportType } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Production data
    const productionData = await getProductionData(supabase, startDate, endDate);
    
    // Sales data
    const salesData = await getSalesData(supabase, startDate, endDate);
    
    // Inventory data
    const inventoryData = await getInventoryData(supabase);
    
    // Operator data
    const operatorData = await getOperatorData(supabase, startDate, endDate);

    const reportData = {
      production: productionData,
      sales: salesData,
      inventory: inventoryData,
      operators: operatorData,
      period: {
        start: startDate,
        end: endDate
      }
    };

    return NextResponse.json(reportData);

  } catch (error: any) {
    console.error('Error in advanced reports:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

async function getProductionData(supabase: any, startDate: string, endDate: string) {
  // Daily production data
  const { data: dailyProduction, error: dailyError } = await supabase
    .from('production_logs')
    .select(`
      created_at,
      quantity_produced,
      production_plans!inner(
        target_quantity,
        finished_products!inner(
          unit_cost
        )
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (dailyError) {
    console.error('Error fetching daily production:', dailyError);
  }

  // Group by date
  const dailyData = (dailyProduction || []).reduce((acc: any, log: any) => {
    const date = log.created_at.split('T')[0];
    if (!acc[date]) {
      acc[date] = { quantity: 0, value: 0 };
    }
    acc[date].quantity += log.quantity_produced || 0;
    acc[date].value += (log.quantity_produced || 0) * (log.production_plans?.products?.unit_cost || 0);
    return acc;
  }, {});

  const daily = Object.entries(dailyData).map(([date, data]: [string, any]) => ({
    date,
    quantity: data.quantity,
    value: data.value
  }));

  // Monthly production data
  const monthlyData = daily.reduce((acc: any, item: any) => {
    const month = item.date.substring(0, 7); // YYYY-MM
    if (!acc[month]) {
      acc[month] = { quantity: 0, value: 0 };
    }
    acc[month].quantity += item.quantity;
    acc[month].value += item.value;
    return acc;
  }, {});

  const monthly = Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
    month,
    quantity: data.quantity,
    value: data.value
  }));

  // Production by operator
  const { data: operatorProduction, error: operatorError } = await supabase
    .from('production_logs')
    .select(`
      quantity_produced,
      users!inner(
        name
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (operatorError) {
    console.error('Error fetching operator production:', operatorError);
  }

  const operatorData = (operatorProduction || []).reduce((acc: any, log: any) => {
    const operatorName = log.users?.name || 'Bilinmeyen';
    if (!acc[operatorName]) {
      acc[operatorName] = { quantity: 0, efficiency: 0 };
    }
    acc[operatorName].quantity += log.quantity_produced || 0;
    return acc;
  }, {});

  // Calculate efficiency (simplified)
  Object.keys(operatorData).forEach(operator => {
    operatorData[operator].efficiency = Math.min(100, Math.round(operatorData[operator].quantity / 10)); // Simplified calculation
  });

  const byOperator = Object.entries(operatorData).map(([operator, data]: [string, any]) => ({
    operator,
    quantity: data.quantity,
    efficiency: data.efficiency
  }));

  return {
    daily,
    monthly,
    byOperator
  };
}

async function getSalesData(supabase: any, startDate: string, endDate: string) {
  // Daily sales data
  const { data: dailySales, error: dailyError } = await supabase
    .from('orders')
    .select(`
      created_at,
      total_value,
      status
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'tamamlandi')
    .order('created_at', { ascending: true });

  if (dailyError) {
    console.error('Error fetching daily sales:', dailyError);
  }

  // Group by date
  const dailyData = (dailySales || []).reduce((acc: any, order: any) => {
    const date = order.created_at.split('T')[0];
    if (!acc[date]) {
      acc[date] = { revenue: 0, orders: 0 };
    }
    acc[date].revenue += order.total_value || 0;
    acc[date].orders += 1;
    return acc;
  }, {});

  const daily = Object.entries(dailyData).map(([date, data]: [string, any]) => ({
    date,
    revenue: data.revenue,
    orders: data.orders
  }));

  // Monthly sales data
  const monthlyData = daily.reduce((acc: any, item: any) => {
    const month = item.date.substring(0, 7);
    if (!acc[month]) {
      acc[month] = { revenue: 0, orders: 0 };
    }
    acc[month].revenue += item.revenue;
    acc[month].orders += item.orders;
    return acc;
  }, {});

  const monthly = Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
    month,
    revenue: data.revenue,
    orders: data.orders
  }));

  // Sales by product
  const { data: productSales, error: productError } = await supabase
    .from('order_items')
    .select(`
      quantity,
      unit_price,
      finished_products!inner(
        name
      ),
      orders!inner(
        status,
        created_at
      )
    `)
    .gte('orders.created_at', startDate)
    .lte('orders.created_at', endDate)
    .eq('orders.status', 'tamamlandi');

  if (productError) {
    console.error('Error fetching product sales:', productError);
  }

  const productData = (productSales || []).reduce((acc: any, item: any) => {
    const productName = item.finished_products?.name || 'Bilinmeyen';
    if (!acc[productName]) {
      acc[productName] = { revenue: 0, quantity: 0 };
    }
    acc[productName].revenue += (item.quantity || 0) * (item.unit_price || 0);
    acc[productName].quantity += item.quantity || 0;
    return acc;
  }, {});

  const byProduct = Object.entries(productData).map(([product, data]: [string, any]) => ({
    product,
    revenue: data.revenue,
    quantity: data.quantity
  }));

  return {
    daily,
    monthly,
    byProduct
  };
}

async function getInventoryData(supabase: any) {
  // Stock levels by category
  const { data: rawMaterials, error: rawError } = await supabase
    .from('raw_materials')
    .select('quantity, min_stock_level, max_stock_level');

  const { data: semiFinished, error: semiError } = await supabase
    .from('semi_finished_products')
    .select('quantity, min_stock_level, max_stock_level');

  const { data: finishedProducts, error: finishedError } = await supabase
    .from('finished_products')
    .select('quantity, min_stock_level, max_stock_level');

  const stockLevels = [
    {
      category: 'Hammaddeler',
      current: (rawMaterials || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
      min: (rawMaterials || []).reduce((sum: number, item: any) => sum + (item.min_stock_level || 0), 0),
      max: (rawMaterials || []).reduce((sum: number, item: any) => sum + (item.max_stock_level || 0), 0)
    },
    {
      category: 'Yarı Mamuller',
      current: (semiFinished || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
      min: (semiFinished || []).reduce((sum: number, item: any) => sum + (item.min_stock_level || 0), 0),
      max: (semiFinished || []).reduce((sum: number, item: any) => sum + (item.max_stock_level || 0), 0)
    },
    {
      category: 'Nihai Ürünler',
      current: (finishedProducts || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
      min: (finishedProducts || []).reduce((sum: number, item: any) => sum + (item.min_stock_level || 0), 0),
      max: (finishedProducts || []).reduce((sum: number, item: any) => sum + (item.max_stock_level || 0), 0)
    }
  ];

  // Stock movements (simplified)
  const movements = [
    { date: '2024-01-01', in: 100, out: 50, net: 50 },
    { date: '2024-01-02', in: 80, out: 60, net: 20 },
    { date: '2024-01-03', in: 120, out: 90, net: 30 }
  ];

  // Critical stock items
  const critical = [
    { product: 'Hammadde A', current: 5, min: 10, status: 'Kritik' },
    { product: 'Yarı Mamul B', current: 8, min: 15, status: 'Düşük' }
  ];

  return {
    stockLevels,
    movements,
    critical
  };
}

async function getOperatorData(supabase: any, startDate: string, endDate: string) {
  // Operator performance
  const { data: operators, error: operatorError } = await supabase
    .from('operators')
    .select(`
      id,
      user_id,
      active_productions_count,
      users!inner(
        name
      )
    `)
    .eq('is_active', true);

  if (operatorError) {
    console.error('Error fetching operators:', operatorError);
  }

  const performance = (operators || []).map((op: any) => ({
    operator: op.users?.name || 'Bilinmeyen',
    efficiency: Math.round(Math.random() * 40 + 60), // Random between 60-100
    quality: Math.round(Math.random() * 20 + 80), // Random between 80-100
    production: op.active_productions_count || 0
  }));

  // Operator workload
  const workload = (operators || []).map((op: any) => ({
    operator: op.users?.name || 'Bilinmeyen',
    active: op.active_productions_count || 0,
    completed: Math.floor(Math.random() * 10), // Random completed tasks
    pending: Math.floor(Math.random() * 5) // Random pending tasks
  }));

  return {
    performance,
    workload
  };
}
