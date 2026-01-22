// Supabaseの買主テーブルスキーマを直接確認
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== Checking buyers table schema ===\n');

  // Use raw SQL to query information_schema
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'buyers'
        AND data_type = 'character varying'
      ORDER BY column_name;
    `
  });

  if (error) {
    console.error('Error querying schema:', error);
    
    // Try alternative method using pg_catalog
    console.log('\nTrying alternative method...\n');
    
    const { data: altData, error: altError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          a.attname as column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
        JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND c.relname = 'buyers'
          AND a.attnum > 0
          AND NOT a.attisdropped
          AND pg_catalog.format_type(a.atttypid, a.atttypmod) LIKE 'character varying%'
        ORDER BY a.attname;
      `
    });
    
    if (altError) {
      console.error('Alternative method also failed:', altError);
      console.log('\n⚠️  Please run this SQL directly in Supabase SQL Editor:\n');
      console.log(`
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'buyers'
  AND data_type = 'character varying'
ORDER BY column_name;
      `);
      return;
    }
    
    console.log('VARCHAR columns found:');
    console.log(altData);
    return;
  }

  if (!data || data.length === 0) {
    console.log('✅ No VARCHAR columns found! All text fields have been converted to TEXT.');
    return;
  }

  console.log(`Found ${data.length} VARCHAR columns:\n`);
  
  const varchar50 = data.filter((col: any) => col.character_maximum_length === 50);
  const otherVarchar = data.filter((col: any) => col.character_maximum_length !== 50);
  
  if (varchar50.length > 0) {
    console.log('❌ VARCHAR(50) columns that need to be converted:');
    varchar50.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}(${col.character_maximum_length})`);
    });
    console.log('');
  }
  
  if (otherVarchar.length > 0) {
    console.log('ℹ️  Other VARCHAR columns:');
    otherVarchar.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}(${col.character_maximum_length || 'unlimited'})`);
    });
  }
}

checkSchema().catch(console.error);
