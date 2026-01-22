import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12984() {
  console.log('=== AA12984のデータを確認 ===\n');

  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12984')
    .maybeSingle();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!sellers) {
    console.log('❌ AA12984が見つかりません');
    return;
  }

  const seller = sellers;
  console.log('✅ AA12984を発見\n');

  console.log('【基本情報】');
  console.log('ID:', seller.id);
  console.log('売主番号:', seller.seller_number);
  console.log('氏名:', seller.name ? decrypt(seller.name) : '(空)');
  console.log('住所:', seller.address ? decrypt(seller.address) : '(空)');
  console.log('電話番号:', seller.phone_number ? decrypt(seller.phone_number) : '(空)');
  console.log('メール:', seller.email ? decrypt(seller.email) : '(空)');
  console.log('');

  console.log('【ステータス】');
  console.log('状況（当社）:', seller.status || '(空)');
  console.log('確度:', seller.confidence || '(空)');
  console.log('');

  console.log('【査定額】');
  console.log('査定額1:', seller.valuation_amount_1 || '(空)');
  console.log('査定額2:', seller.valuation_amount_2 || '(空)');
  console.log('査定額3:', seller.valuation_amount_3 || '(空)');
  console.log('');

  console.log('【訪問情報】');
  console.log('訪問日:', seller.visit_date || '(空)');
  console.log('訪問時間:', seller.visit_time || '(空)');
  console.log('訪問担当:', seller.visit_assignee || '(空)');
  console.log('訪問メモ:', seller.visit_notes || '(空)');
  console.log('');

  console.log('【コメント】');
  console.log('コメント:', seller.comments || '(空)');
  console.log('');

  // 物件情報を確認
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .maybeSingle();

  if (property) {
    console.log('【物件情報】');
    console.log('物件ID:', property.id);
    console.log('住所:', property.address || '(空)');
    console.log('物件種別:', property.property_type || '(空)');
    console.log('土地面積:', property.land_area || '(空)');
    console.log('建物面積:', property.building_area || '(空)');
    console.log('築年:', property.build_year || '(空)');
    console.log('構造:', property.structure || '(空)');
    console.log('状況（売主）:', property.seller_situation || '(空)');
    console.log('間取り:', property.floor_plan || '(空)');
  } else {
    console.log('【物件情報】');
    console.log('❌ 物件情報が見つかりません');
  }
}

checkAA12984()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
