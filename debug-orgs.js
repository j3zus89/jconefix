const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${serviceKey}` } }
});

(async () => {
  try {
    console.log('🔍 Testing Supabase JS client from Node...\n');
    
    const { data, error, count } = await client
      .from('organizations')
      .select('*', { count: 'exact' });
    
    console.log('✅ JS client .select("*", {count: "exact"})');
    console.log('   count:', count);
    console.log('   data.length:', data?.length);
    if (error) console.log('   ERROR:', error);
    
    const { data: rest } = await client.from('organizations').select('id,name');
    console.log('\n✅ JS client .select("id,name")');
    console.log('   length:', rest?.length);
    if (rest && rest.length > 0) {
      console.log('   IDs:', rest.map(o => o.id).join(', '));
    }
    
    // Direct REST
    console.log('\n🔍 Testing direct REST API...\n');
    const restRes = await fetch(`${supabaseUrl}/rest/v1/organizations?select=id,name`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      }
    });
    const restData = await restRes.json();
    console.log('✅ Direct REST .../rest/v1/organizations');
    console.log('   length:', Array.isArray(restData) ? restData.length : 'not array');
    if (Array.isArray(restData) && restData.length > 0) {
      console.log('   IDs:', restData.map(o => o.id).join(', '));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
