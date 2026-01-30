import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function deleteAA13496FromDatabase() {
  console.log('🗑️  Deleting AA13496 from database...\n');

  // 1. 現在の状態を確認
  console.log('🔍 Checking current state in database...');
  const { data: seller, error: selectError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13496')
    .single();

  if (selectError) {
    console.log('❌ AA13496 not found in database:', selectError.message);
    return;
  }

  console.log('✅ Found AA13496 in database:');
  console.log('  ID:', seller.id);
  console.log('  売主番号:', seller.seller_number);
  console.log('  名前:', seller.name);
  console.log('  状況:', seller.status);
  console.log('  更新日時:', seller.updated_at);

  // 2. データベースから削除
  console.log('\n🗑️  Deleting from database...');
  const { error: deleteError } = await supabase
    .from('sellers')
    .delete()
    .eq('seller_number', 'AA13496');

  if (deleteError) {
    console.error('❌ Failed to delete:', deleteError.message);
    return;
  }

  console.log('✅ AA13496 deleted from database');

  // 3. 確認
  console.log('\n🔍 Verifying deletion...');
  const { data: checkSeller, error: checkError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13496')
    .single();

  if (checkError && checkError.code === 'PGRST116') {
    console.log('✅ Confirmed: AA13496 has been deleted from database');
    console.log('\n📝 Note: AA13496 still exists in spreadsheet (as intended)');
  } else if (checkSeller) {
    console.log('❌ AA13496 still exists in database');
  }
}

deleteAA13496FromDatabase().catch(console.error);
