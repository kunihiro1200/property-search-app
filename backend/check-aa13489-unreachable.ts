import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13489Unreachable() {
  console.log('🔍 Checking AA13489 unreachable status...\n');

  // AA13489の売主データを取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13489')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!seller) {
    console.log('⚠️  Seller AA13489 not found');
    return;
  }

  console.log('📋 Seller AA13489 data:');
  console.log('  ID:', seller.id);
  console.log('  Seller Number:', seller.seller_number);
  console.log('  Name:', seller.name ? `${seller.name.substring(0, 20)}...` : 'null');
  console.log('  is_unreachable:', seller.is_unreachable);
  console.log('  unreachable_since:', seller.unreachable_since);
  console.log('  second_call_after_unreachable:', seller.second_call_after_unreachable);
  console.log('  confidence:', seller.confidence);
  console.log('  status:', seller.status);
  console.log('\n');

  // データベーススキーマを確認
  console.log('🔍 Checking database schema for sellers table...\n');
  
  const { data: columns, error: schemaError } = await supabase
    .rpc('get_table_columns', { table_name: 'sellers' });

  if (schemaError) {
    console.log('⚠️  Could not fetch schema (RPC function may not exist)');
    console.log('  Checking columns manually...\n');
    
    // 手動でカラムを確認
    const columnNames = Object.keys(seller);
    console.log('📋 Available columns in seller data:');
    columnNames.forEach(col => {
      if (col.includes('unreachable') || col.includes('confidence')) {
        console.log(`  ✅ ${col}: ${seller[col]}`);
      }
    });
  } else {
    console.log('📋 Columns related to unreachable:');
    columns?.forEach((col: any) => {
      if (col.column_name.includes('unreachable') || col.column_name.includes('confidence')) {
        console.log(`  ${col.column_name} (${col.data_type})`);
      }
    });
  }
}

checkAA13489Unreachable();
