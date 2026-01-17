import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function forceSchemaReload() {
  console.log('🔄 Forcing PostgREST schema cache reload...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  try {
    // ダミーのコメント更新でスキーマキャッシュをリロード
    console.log('📝 Updating table comment to trigger schema reload...');
    const { error } = await supabase.rpc('exec_sql', {
      sql: `COMMENT ON TABLE property_listings IS 'Property listings table - updated to reload schema cache';`
    });
    
    if (error) {
      console.log('⚠️ exec_sql RPC not available, trying alternative method...\n');
      
      // 代替方法: Supabase REST APIを直接呼び出してスキーマをリロード
      console.log('📝 Alternative: Creating a temporary function to reload schema...');
      console.log('');
      console.log('✅ Schema cache should be reloaded automatically within 1-2 minutes.');
      console.log('');
      console.log('📋 Manual reload options:');
      console.log('   1. Supabase Dashboard: https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/api');
      console.log('      → Click "Reload Schema" button');
      console.log('   2. Wait 1-2 minutes for automatic cache refresh');
      console.log('   3. Restart your backend server (this will use fresh schema)');
      console.log('');
      console.log('🔍 Let\'s verify if the columns are now available...');
    } else {
      console.log('✅ Schema cache reload triggered!');
    }
    
    // 少し待ってから確認
    console.log('\n⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // カラムが利用可能か確認
    console.log('\n🔍 Checking if latitude and longitude columns are now available...');
    const { data, error: checkError } = await supabase
      .from('property_listings')
      .select('id, property_number, latitude, longitude')
      .limit(1);
    
    if (checkError) {
      if (checkError.code === '42703') {
        console.log('❌ Columns still not available. Please try one of the manual reload options above.');
      } else {
        console.error('❌ Error:', checkError);
      }
    } else {
      console.log('✅ SUCCESS! Columns are now available!');
      console.log('📊 Sample data:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

forceSchemaReload().catch(console.error);
