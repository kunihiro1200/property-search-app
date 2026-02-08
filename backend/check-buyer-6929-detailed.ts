import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer6929() {
  console.log('🔍 Checking buyer 6929 in detail...\n');

  // 買主6929を直接検索（削除済みを含む）
  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6929')
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!buyer) {
    console.log('❌ Buyer 6929 not found');
    return;
  }

  console.log('✅ Buyer 6929 found:');
  console.log(`   buyer_number: ${buyer.buyer_number}`);
  console.log(`   name: ${buyer.name}`);
  console.log(`   deleted_at: ${buyer.deleted_at}`);
  console.log(`   updated_at: ${buyer.updated_at}`);
  console.log();

  if (buyer.deleted_at) {
    console.log('🗑️  Buyer 6929 is DELETED');
    console.log(`   Deleted at: ${buyer.deleted_at}`);
  } else {
    console.log('⚠️  Buyer 6929 is NOT deleted (deleted_at is NULL)');
  }

  // アクティブな買主として検索
  console.log('\n🔍 Checking if buyer 6929 is in active list...\n');
  
  const { data: activeBuyer, error: activeError } = await supabase
    .from('buyers')
    .select('buyer_number, name')
    .eq('buyer_number', '6929')
    .is('deleted_at', null)
    .single();

  if (activeError) {
    if (activeError.code === 'PGRST116') {
      console.log('✅ Buyer 6929 is NOT in active list (correct - it is deleted)');
    } else {
      console.error('❌ Error:', activeError.message);
    }
  } else if (activeBuyer) {
    console.log('⚠️  Buyer 6929 is in ACTIVE list (should not be!)');
    console.log(JSON.stringify(activeBuyer, null, 2));
  }
}

checkBuyer6929()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
