import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration069WithReload() {
  console.log('🚀 Starting Migration 069 with schema reload...\n');

  try {
    // Step 1: スキーマキャッシュをリロード
    console.log('📝 Step 1: Reloading PostgREST schema cache...');
    const { error: reloadError } = await supabase.rpc('pgrst_reload_schema' as any);
    
    if (reloadError) {
      console.log('⚠️  Schema reload RPC not available, trying NOTIFY...');
      // NOTIFY経由でリロードを試みる
      const { error: notifyError } = await supabase.rpc('exec_sql', {
        sql: "NOTIFY pgrst, 'reload schema';"
      } as any);
      
      if (notifyError) {
        console.log('⚠️  NOTIFY failed, continuing anyway...');
      }
    }
    
    console.log('✅ Schema cache reload requested\n');
    
    // 少し待機してキャッシュがリロードされるのを待つ
    console.log('⏳ Waiting 3 seconds for cache to reload...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: 関数が存在するか確認
    console.log('\n📝 Step 2: Verifying function exists...');
    const { error: checkError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'create_sync_monitoring_tables')
      .single();
    
    if (checkError) {
      console.log('⚠️  Could not verify function (this is OK if using RPC)');
    } else {
      console.log('✅ Function exists in database\n');
    }
    
    // Step 3: 関数を呼び出す
    console.log('📝 Step 3: Calling create_sync_monitoring_tables() function...');
    const { error: functionError } = await supabase.rpc('create_sync_monitoring_tables');
    
    if (functionError) {
      console.error('❌ Error calling function:', functionError);
      console.log('\n💡 解決方法:');
      console.log('1. Supabaseダッシュボードでプロジェクトを再起動してください');
      console.log('2. または、以下のSQLを直接実行してください:');
      console.log('   SELECT create_sync_monitoring_tables();');
      throw functionError;
    }
    
    console.log('✅ Function executed successfully\n');
    
    // Step 4: テーブルが作成されたか確認
    console.log('📝 Step 4: Verifying tables were created...');
    const { error: tablesError } = await supabase
      .from('sync_logs')
      .select('id')
      .limit(0);
    
    if (tablesError) {
      console.error('❌ Tables not found:', tablesError);
      throw tablesError;
    }
    
    console.log('✅ Tables created successfully\n');
    console.log('✅ Migration 069 completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration069WithReload();
