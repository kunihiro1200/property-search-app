import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseRootCause() {
  console.log('=== Hidden Images Root Cause Diagnosis ===\n');

  // 1. テーブルの存在確認
  console.log('1. Checking if property_listings table exists...');
  const { error: tablesError } = await supabase
    .from('property_listings')
    .select('id')
    .limit(1);
  
  if (tablesError) {
    console.error('❌ property_listings table does not exist or is not accessible');
    console.error('Error:', tablesError);
    return;
  }
  console.log('✅ property_listings table exists\n');

  // 2. テーブルのスキーマ情報を直接取得
  console.log('2. Fetching table schema from information_schema...');
  const { error: columnsError } = await supabase.rpc('get_table_columns', {
    table_name: 'property_listings'
  });

  if (columnsError) {
    console.log('⚠️  RPC function not available, trying direct query...');
    
    // 直接SQLで確認
    const { data: directColumns, error: directError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'property_listings')
      .eq('table_schema', 'public');

    if (directError) {
      console.error('❌ Cannot access information_schema');
      console.error('Error:', directError);
    } else {
      console.log('Columns found:', directColumns);
      const hiddenImagesColumn = directColumns?.find(c => c.column_name === 'hidden_images');
      if (hiddenImagesColumn) {
        console.log('✅ hidden_images column EXISTS in information_schema');
        console.log('Column details:', hiddenImagesColumn);
      } else {
        console.log('❌ hidden_images column NOT FOUND in information_schema');
        console.log('This means the column was never created or was dropped');
      }
    }
  }

  // 3. マイグレーション履歴の確認
  console.log('\n3. Checking migration history...');
  const { data: migrations, error: migrationsError } = await supabase
    .from('schema_migrations')
    .select('*')
    .order('version', { ascending: false })
    .limit(10);

  if (migrationsError) {
    console.log('⚠️  Cannot access schema_migrations table');
  } else {
    console.log('Recent migrations:', migrations);
    const migration077 = migrations?.find(m => m.version === '077');
    if (migration077) {
      console.log('✅ Migration 077 is recorded as executed');
    } else {
      console.log('❌ Migration 077 is NOT in migration history');
      console.log('This means the migration was never successfully executed');
    }
  }

  // 4. 実際のデータ取得を試みる
  console.log('\n4. Attempting to select hidden_images column...');
  const { data: testData, error: testError } = await supabase
    .from('property_listings')
    .select('id, hidden_images')
    .limit(1);

  if (testError) {
    console.error('❌ Cannot select hidden_images column');
    console.error('Error:', testError);
    console.log('\n🔍 This confirms the column does not exist in the actual table');
  } else {
    console.log('✅ Successfully selected hidden_images column');
    console.log('Sample data:', testData);
  }

  // 5. テーブルの権限確認
  console.log('\n5. Checking table permissions...');
  const { data: permissions, error: permError } = await supabase.rpc('check_table_permissions', {
    table_name: 'property_listings'
  });

  if (permError) {
    console.log('⚠️  Cannot check permissions (RPC not available)');
  } else {
    console.log('Permissions:', permissions);
  }

  console.log('\n=== Diagnosis Complete ===');
  console.log('\nNext Steps:');
  console.log('1. If column does NOT exist in information_schema: The migration never ran successfully');
  console.log('2. If column EXISTS in information_schema but cannot be selected: Permission issue');
  console.log('3. If migration 077 is NOT in history: Need to run migration properly');
}

diagnoseRootCause().catch(console.error);
