import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkPropertiesSchema() {
  console.log('🔍 Checking properties table schema...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // propertiesテーブルから1件取得してカラムを確認
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No data in properties table');
    
    // テーブル構造を確認するために空のINSERTを試みる
    const { error: insertError } = await supabase
      .from('properties')
      .insert({})
      .select();

    if (insertError) {
      console.log('\n📊 Available columns (from error message):');
      console.log(insertError.message);
    }
    return;
  }

  console.log('📊 Properties table columns:');
  const columns = Object.keys(data[0]);
  columns.forEach(col => {
    console.log(`   - ${col}: ${typeof data[0][col]}`);
  });

  console.log('\n✅ Sample data:');
  console.log(JSON.stringify(data[0], null, 2));
}

checkPropertiesSchema().catch(console.error);
