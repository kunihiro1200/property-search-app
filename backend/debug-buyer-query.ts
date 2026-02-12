import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function debugBuyerQuery() {
  console.log('=== 買主クエリのデバッグ ===\n');

  // 1. 買主1553を直接取得
  console.log('1. 買主1553を直接取得:');
  const { data: buyer1553, error: error1 } = await supabase
    .from('buyers')
    .select('buyer_number, name, deleted_at, reception_date')
    .eq('buyer_number', '1553')
    .single();

  if (error1) {
    console.error('   エラー:', error1);
  } else {
    console.log('   ✅ 取得成功');
    console.log('   買主番号:', buyer1553.buyer_number);
    console.log('   氏名:', buyer1553.name);
    console.log('   削除済み:', buyer1553.deleted_at);
    console.log('   受付日:', buyer1553.reception_date);
  }

  // 2. deleted_at IS NULL のクエリ
  console.log('\n2. deleted_at IS NULL のクエリ:');
  const { data: buyers2, error: error2 } = await supabase
    .from('buyers')
    .select('buyer_number, name, deleted_at, reception_date')
    .is('deleted_at', null);

  if (error2) {
    console.error('   エラー:', error2);
  } else {
    console.log('   ✅ 取得成功:', buyers2?.length, '件');
    const found = buyers2?.find(b => b.buyer_number === '1553');
    if (found) {
      console.log('   ✅ 買主1553が含まれています');
    } else {
      console.log('   ❌ 買主1553が含まれていません');
    }
  }

  // 3. deleted_at IS NULL + order by reception_date
  console.log('\n3. deleted_at IS NULL + order by reception_date:');
  const { data: buyers3, error: error3 } = await supabase
    .from('buyers')
    .select('buyer_number, name, deleted_at, reception_date')
    .is('deleted_at', null)
    .order('reception_date', { ascending: false, nullsFirst: false });

  if (error3) {
    console.error('   エラー:', error3);
  } else {
    console.log('   ✅ 取得成功:', buyers3?.length, '件');
    const found = buyers3?.find(b => b.buyer_number === '1553');
    if (found) {
      const index = buyers3?.findIndex(b => b.buyer_number === '1553');
      console.log('   ✅ 買主1553が含まれています');
      console.log('   位置:', index + 1, '/', buyers3?.length);
    } else {
      console.log('   ❌ 買主1553が含まれていません');
    }
  }

  // 4. BuyerCandidateServiceと同じクエリ
  console.log('\n4. BuyerCandidateServiceと同じクエリ:');
  const { data: buyers4, error: error4 } = await supabase
    .from('buyers')
    .select('*')
    .is('deleted_at', null)
    .order('reception_date', { ascending: false, nullsFirst: false });

  if (error4) {
    console.error('   エラー:', error4);
  } else {
    console.log('   ✅ 取得成功:', buyers4?.length, '件');
    const found = buyers4?.find(b => b.buyer_number === '1553');
    if (found) {
      const index = buyers4?.findIndex(b => b.buyer_number === '1553');
      console.log('   ✅ 買主1553が含まれています');
      console.log('   位置:', index + 1, '/', buyers4?.length);
      console.log('   受付日:', found.reception_date);
      console.log('   削除済み:', found.deleted_at);
    } else {
      console.log('   ❌ 買主1553が含まれていません');
    }
  }
}

debugBuyerQuery().catch(console.error);
