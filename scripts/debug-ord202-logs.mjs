import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

(async () => {
  console.log('🔍 ORD-2025-202 DEBUG\n');
  
  // Order ID
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('order_number', 'ORD-2025-202')
    .single();
  
  console.log('Order:', order);
  
  // Plans
  const { data: plans } = await supabase
    .from('production_plans')
    .select('id, order_id, product_id, produced_quantity')
    .eq('order_id', order?.id);
  
  console.log(`\nPlans: ${plans?.length || 0}`);
  console.log('First 3 plan IDs:', plans?.slice(0, 3).map(p => p.id));
  
  // All production logs (recent)
  const { data: allRecentLogs } = await supabase
    .from('production_logs')
    .select('id, plan_id, quantity_produced, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  
  console.log(`\nRecent production logs (last 50): ${allRecentLogs?.length || 0}`);
  if (allRecentLogs && allRecentLogs.length > 0) {
    console.log('First 3 log plan_ids:', allRecentLogs.slice(0, 3).map(l => l.plan_id));
    console.log('First 3 log created_at:', allRecentLogs.slice(0, 3).map(l => l.created_at));
  }
  
  // Check if any log matches our plan IDs
  if (plans && plans.length > 0 && allRecentLogs) {
    const planIdSet = new Set(plans.map(p => p.id));
    const matchingLogs = allRecentLogs.filter(l => planIdSet.has(l.plan_id));
    console.log(`\n✅ Matching logs: ${matchingLogs.length}`);
    if (matchingLogs.length > 0) {
      console.log('Matching log plan_ids:', matchingLogs.map(l => l.plan_id).slice(0, 5));
    }
  }
})();

