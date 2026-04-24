import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('ipos')
  .select('id,name,slug,listing_date,price_max,status')
  .eq('slug', 'mehul-telecom-limited-ipo')
  .single();

if (error) {
  console.error('[v0] Error:', error);
  process.exit(1);
}

console.log('[v0] Mehul Telecom IPO:');
console.log(JSON.stringify(data, null, 2));
