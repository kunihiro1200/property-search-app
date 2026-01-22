import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from './src/utils/encryption';

dotenv.config();

async function testAA13424DirectDB() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 AA13424のデータベース情報を直接確認中...\n');

  // 売主情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13424')
    .single();

  if (sellerError || !seller) {
    console.error('❌ 売主が見つかりません:', sellerError);
    return;
  }

  console.log('📊 データベースの生データ:');
  console.log('=====================================');
  console.log(`売主番号: ${seller.seller_number}`);
  console.log(`名前（暗号化）: ${seller.name?.substring(0, 30)}...`);
  console.log(`\n【訪問フィールド（生データ）】`);
  console.log(`visit_acquisition_date: ${seller.visit_acquisition_date || '❌ NULL'}`);
  console.log(`visit_date: ${seller.visit_date || '❌ NULL'}`);
  console.log(`visit_valuation_acquirer: ${seller.visit_valuation_acquirer || '❌ NULL'}`);
  console.log(`visit_assignee: ${seller.visit_assignee || '❌ NULL'}`);
  console.log('=====================================\n');

  // 復号化してみる
  try {
    const decryptedName = decrypt(seller.name);
    console.log(`✅ 復号化成功: ${decryptedName}\n`);
  } catch (error) {
    console.error('❌ 復号化エラー:', error);
  }

  // イニシャルからフルネームへの変換をテスト
  console.log('🔍 イニシャル変換テスト:');
  const { data: employees } = await supabase
    .from('employees')
    .select('initials, name')
    .eq('is_active', true);

  if (employees) {
    const initialsMap = new Map(employees.map((emp: any) => [emp.initials, emp.name]));
    console.log(`R → ${initialsMap.get('R') || '見つかりません'}`);
    console.log(`I → ${initialsMap.get('I') || '見つかりません'}`);
  }

  console.log('\n✅ テスト完了');
}

testAA13424DirectDB();
