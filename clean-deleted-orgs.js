const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

(async () => {
  try {
    // Check organizations with deleted_at set
    const { data: deleted } = await client
      .from('organizations')
      .select('id, name, deleted_at')
      .not('deleted_at', 'is', null);
    
    console.log('Organizaciones con deleted_at no nulo:', deleted?.length);
    if (deleted?.length > 0) {
      console.log(deleted.map(o => `${o.name} - deleted_at: ${o.deleted_at}`));
      
      // Delete them permanently
      const { error } = await client
        .from('organizations')
        .delete()
        .not('deleted_at', 'is', null);
      
      if (error) {
        console.error('Error al eliminar:', error);
      } else {
        console.log('✅ Eliminadas ' + deleted.length + ' organizaciones marcadas como deleted');
      }
    }
    
    // Show remaining
    const { data: remaining } = await client
      .from('organizations')
      .select('name');
    
    console.log('\n✅ Organizaciones activas restantes: ' + remaining?.length);
    remaining?.forEach(o => console.log('  - ' + o.name));
    
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
})();
