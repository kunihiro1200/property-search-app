import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12903() {
  console.log('=== AA12903のデータを確認 ===\n');

  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .ilike('seller_number', '%12903%');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!sellers || sellers.length === 0) {
    console.log('❌ AA12903が見つかりません');
    return;
  }

  const seller = sellers[0];
  console.log('✅ AA12903を発見\n');

  console.log('【基本情報】');
  console.log('ID:', seller.id);
  console.log('売主番号:', seller.seller_number);
  console.log('氏名:', decrypt(seller.name));
  console.log('住所:', decrypt(seller.address));
  console.log('電話番号:', decrypt(seller.phone_number));
  console.log('');

  // 物件情報を取得
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  console.log('【物件情報】');
  if (property) {
    console.log('物件ID:', property.id);
    console.log('住所:', property.address);
    console.log('物件種別:', property.property_type);
    console.log('土地面積:', property.land_area);
    console.log('建物面積:', property.building_area);
    console.log('築年:', property.build_year);
    console.log('構造:', property.structure);
    console.log('状況（売主）:', property.seller_situation);
  } else {
    console.log('❌ 物件情報がありません');
    if (propError) console.log('エラー:', propError);
  }
  console.log('');

  console.log('【コメント】');
  if (seller.comments) {
    console.log('コメント文字数:', seller.comments.length);
    console.log('コメント内容:');
    console.log(seller.comments);
  } else {
    console.log('❌ コメントがありません');
  }
}

checkAA12903()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
