import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAA12903Data() {
  console.log('=== AA12903のデータを修正 ===\n');

  // データベースのAA12903を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .ilike('seller_number', '%12903%')
    .single();

  if (sellerError || !seller) {
    console.log('❌ データベースにAA12903が見つかりません');
    return;
  }

  console.log('売主ID:', seller.id);
  console.log('');

  // 売主情報を更新（スプレッドシートから取得した情報）
  console.log('売主情報を更新中...');
  const { error: updateError } = await supabase
    .from('sellers')
    .update({
      name: encrypt('高見 勇次'),
      address: encrypt('大阪府貝塚市畠中2-10-7'),
      phone_number: encrypt('09034146154'),
    })
    .eq('id', seller.id);

  if (updateError) {
    console.error('❌ 売主情報の更新エラー:', updateError);
    return;
  }

  console.log('✅ 売主情報を更新しました');

  // 物件情報を確認
  const { data: existingProperty } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  if (existingProperty) {
    // 物件情報を更新
    console.log('物件情報を更新中...');
    const { error: propUpdateError } = await supabase
      .from('properties')
      .update({
        address: '大阪府貝塚市畠中2-10-7',
        property_type: 'detached_house', // 戸建てと仮定
        build_year: 2007,
        seller_situation: '空',
      })
      .eq('id', existingProperty.id);

    if (propUpdateError) {
      console.error('❌ 物件情報の更新エラー:', propUpdateError);
    } else {
      console.log('✅ 物件情報を更新しました');
    }
  } else {
    // 物件情報を新規作成
    console.log('物件情報を作成中...');
    const { error: propInsertError } = await supabase
      .from('properties')
      .insert({
        seller_id: seller.id,
        address: '大阪府貝塚市畠中2-10-7',
        property_type: 'detached_house', // 戸建てと仮定
        build_year: 2007,
        seller_situation: '空',
      });

    if (propInsertError) {
      console.error('❌ 物件情報の作成エラー:', propInsertError);
    } else {
      console.log('✅ 物件情報を作成しました');
    }
  }
}

fixAA12903Data()
  .then(() => {
    console.log('\n✅ 修正完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
