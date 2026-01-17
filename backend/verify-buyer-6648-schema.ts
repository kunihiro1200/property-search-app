import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('=== Verifying buyers table schema ===\n');

  // スキーマを確認
  const { error } = await supabase
    .from('buyers')
    .select('*')
    .limit(0);

  if (error) {
    console.error('❌ Error fetching schema:', error);
    return;
  }

  console.log('✅ Schema verified. Now checking specific columns...\n');

  // PostgreSQLから直接カラム情報を取得
  const { data: columnInfo, error: columnError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'buyers'
      AND column_name IN ('display_address', 'building_name_price', 'property_address', 'property_number')
      ORDER BY column_name;
    `
  });

  if (columnError) {
    console.error('❌ Error fetching column info:', columnError);
    return;
  }

  console.log('Column information:');
  console.table(columnInfo);

  // 買主6648のデータを確認
  console.log('\n=== Checking buyer 6648 data ===\n');
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('id, display_address, building_name_price, property_address, property_number')
    .eq('id', 6648)
    .single();

  if (buyerError) {
    console.log('⚠️ Buyer 6648 not found in database (expected before sync)');
  } else {
    console.log('Buyer 6648 data:');
    console.log(buyer);
  }
}

verifySchema().catch(console.error);
