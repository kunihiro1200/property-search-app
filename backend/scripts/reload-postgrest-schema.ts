import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function reloadPostgRESTSchema() {
  console.log('🔄 Reloading PostgREST schema cache...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
  
  try {
    // PostgRESTのスキーマキャッシュをリロード
    const response = await axios.post(
      `${supabaseUrl}/rest/v1/rpc/reload_schema`,
      {},
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ PostgREST schema cache reloaded successfully!');
    console.log('📋 Response:', response.data);
    console.log('\n🎉 Now you can use the new latitude and longitude columns!');
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Error response:', error.response.data);
      console.error('Status:', error.response.status);
      
      if (error.response.status === 404) {
        console.log('\n⚠️ reload_schema function not found.');
        console.log('📝 Alternative: Use Supabase Dashboard to reload schema:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/api');
        console.log('   2. Click "Reload Schema" button');
        console.log('   OR');
        console.log('   3. Wait a few minutes for automatic cache refresh');
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

reloadPostgRESTSchema().catch(console.error);
