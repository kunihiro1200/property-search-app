import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseHiddenImagesIssue() {
  console.log('=== Hidden Images Column Diagnostic ===\n');

  try {
    // 1. テーブルの存在確認
    console.log('1. Checking if property_listings table exists...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'property_listings');

    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else if (!tables || tables.length === 0) {
      console.error('❌ property_listings table does NOT exist!');
      return;
    } else {
      console.log('✅ property_listings table exists');
    }

    // 2. カラムの存在確認
    console.log('\n2. Checking if hidden_images column exists...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'property_listings')
      .eq('column_name', 'hidden_images');

    if (columnsError) {
      console.error('Error checking columns:', columnsError);
    } else if (!columns || columns.length === 0) {
      console.error('❌ hidden_images column does NOT exist!');
      console.log('\nThis is the root cause. The column was never created.');
    } else {
      console.log('✅ hidden_images column exists:');
      console.log(JSON.stringify(columns[0], null, 2));
    }

    // 3. すべてのカラムをリスト表示
    console.log('\n3. All columns in property_listings table:');
    const { data: allColumns, error: allColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'property_listings')
      .order('ordinal_position');

    if (allColumnsError) {
      console.error('Error fetching all columns:', allColumnsError);
    } else {
      allColumns?.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    // 4. インデックスの確認
    console.log('\n4. Checking for hidden_images index...');
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('schemaname', 'public')
      .eq('tablename', 'property_listings')
      .like('indexname', '%hidden_images%');

    if (indexesError) {
      console.error('Error checking indexes:', indexesError);
    } else if (!indexes || indexes.length === 0) {
      console.log('❌ No hidden_images index found');
    } else {
      console.log('✅ Index found:');
      indexes.forEach((idx: any) => {
        console.log(`  - ${idx.indexname}`);
        console.log(`    ${idx.indexdef}`);
      });
    }

    // 5. マイグレーション履歴の確認
    console.log('\n5. Checking migration history...');
    const { data: migrations, error: migrationsError } = await supabase
      .from('schema_migrations')
      .select('version, name')
      .order('version', { ascending: false })
      .limit(10);

    if (migrationsError) {
      console.log('⚠️  schema_migrations table not found or error:', migrationsError.message);
    } else {
      console.log('Recent migrations:');
      migrations?.forEach((m: any) => {
        console.log(`  - ${m.version}: ${m.name || 'unnamed'}`);
      });
    }

    // 6. 直接SQLでカラム追加を試みる
    console.log('\n6. Attempting to add column directly via SQL...');
    const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'property_listings' 
            AND column_name = 'hidden_images'
          ) THEN
            ALTER TABLE property_listings 
            ADD COLUMN hidden_images TEXT[] DEFAULT '{}';
            
            COMMENT ON COLUMN property_listings.hidden_images 
            IS '非表示にした画像のファイルIDリスト';
            
            CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
            ON property_listings USING GIN (hidden_images);
            
            RAISE NOTICE 'Column added successfully';
          ELSE
            RAISE NOTICE 'Column already exists';
          END IF;
        END $$;
      `
    });

    if (sqlError) {
      console.error('❌ Direct SQL execution failed:', sqlError);
      console.log('\nThis suggests a permissions or RPC function issue.');
    } else {
      console.log('✅ Direct SQL executed successfully');
      console.log('Result:', sqlResult);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

diagnoseHiddenImagesIssue()
  .then(() => {
    console.log('\n=== Diagnostic Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
