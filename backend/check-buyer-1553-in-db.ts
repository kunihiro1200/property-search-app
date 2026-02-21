import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer1553InDB() {
  console.log('=== 買主1553がデータベースに存在するか確認 ===\n');

  // 1. 買主1553を取得
  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '1553')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!buyer) {
    console.error('❌ 買主1553が見つかりません');
    return;
  }

  console.log('✅ 買主1553が見つかりました\n');
  console.log('買主情報:');
  console.log('  買主番号:', buyer.buyer_number);
  console.log('  氏名:', buyer.name);
  console.log('  削除済み:', buyer.deleted_at);
  console.log('  配信種別:', buyer.distribution_type);
  console.log('  最新状況:', buyer.latest_status);
  console.log('  希望エリア:', buyer.desired_area);
  console.log('  希望種別:', buyer.desired_property_type);
  console.log('  希望価格（マンション）:', buyer.price_range_apartment);
  console.log('  受付日:', buyer.reception_date);

  // 2. 削除済みを除外するクエリで取得できるか確認
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('buyer_number, name, deleted_at')
    .is('deleted_at', null)
    .order('reception_date', { ascending: false, nullsFirst: false });

  if (buyersError) {
    console.error('\n❌ 買主一覧取得エラー:', buyersError);
    return;
  }

  const buyer1553InList = buyers?.find(b => b.buyer_number === '1553');
  
  if (buyer1553InList) {
    console.log('\n✅ 買主1553は削除済み除外クエリで取得できます');
    console.log('   買主一覧の中の位置:', buyers?.findIndex(b => b.buyer_number === '1553') + 1, '/', buyers?.length);
  } else {
    console.log('\n❌ 買主1553は削除済み除外クエリで取得できません');
    console.log('   → deleted_atがnullではない可能性があります');
  }
}

checkBuyer1553InDB().catch(console.error);
