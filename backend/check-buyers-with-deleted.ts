import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyersWithDeleted() {
  console.log('🔍 Checking buyers (including deleted)...\n');

  // 全買主を取得（削除済みを含む）
  const { data: allBuyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, name, deleted_at')
    .order('buyer_number', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`📊 Total buyers (top 20): ${allBuyers?.length || 0}\n`);

  // 買主6929を探す
  const buyer6929 = allBuyers?.find(b => b.buyer_number === '6929');
  
  if (buyer6929) {
    console.log('✅ Buyer 6929 found:');
    console.log(JSON.stringify(buyer6929, null, 2));
    console.log();
    
    if (buyer6929.deleted_at) {
      console.log('🗑️  Buyer 6929 is DELETED');
      console.log(`   Deleted at: ${buyer6929.deleted_at}`);
    } else {
      console.log('⚠️  Buyer 6929 is NOT deleted (deleted_at is NULL)');
    }
  } else {
    console.log('❌ Buyer 6929 not found in top 20');
  }

  console.log('\n📋 All buyers (top 20):');
  allBuyers?.forEach(buyer => {
    const deletedMark = buyer.deleted_at ? '🗑️ ' : '   ';
    console.log(`${deletedMark}${buyer.buyer_number}: ${buyer.name} ${buyer.deleted_at ? `(deleted: ${buyer.deleted_at})` : ''}`);
  });

  // アクティブな買主のみを取得
  console.log('\n\n🔍 Checking active buyers only...\n');
  
  const { data: activeBuyers, error: activeError } = await supabase
    .from('buyers')
    .select('buyer_number, name')
    .is('deleted_at', null)
    .order('buyer_number', { ascending: false })
    .limit(20);

  if (activeError) {
    console.error('❌ Error:', activeError.message);
    return;
  }

  console.log(`📊 Active buyers (top 20): ${activeBuyers?.length || 0}\n`);

  // 買主6929がアクティブリストに含まれているか確認
  const activeBuyer6929 = activeBuyers?.find(b => b.buyer_number === '6929');
  
  if (activeBuyer6929) {
    console.log('⚠️  Buyer 6929 is in ACTIVE list (should not be!)');
  } else {
    console.log('✅ Buyer 6929 is NOT in active list (correct)');
  }

  console.log('\n📋 Active buyers (top 20):');
  activeBuyers?.forEach(buyer => {
    console.log(`   ${buyer.buyer_number}: ${buyer.name}`);
  });
}

checkBuyersWithDeleted()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
