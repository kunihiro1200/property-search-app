import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を先に読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { BuyerService } from './src/services/BuyerService';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const buyerService = new BuyerService();

async function testPriceRange2500() {
  console.log('予算2500万円のテストを実行中...\n');

  // 問合せ時ヒアリングを「予算：2500万円」に変更
  const inquiryHearing = '希望時期：2年以内\n駐車場希望台数：2台\n予算：2500万円';

  console.log('1. 問合せ時ヒアリングを更新中...');
  console.log('  予算: 2500万円');

  try {
    await buyerService.update('4216', {
      inquiry_hearing: inquiryHearing,
    });
    console.log('✅ 更新成功');
  } catch (error) {
    console.error('更新エラー:', error);
    return;
  }

  // 更新後の値を確認
  const { data: after, error: afterError } = await supabase
    .from('buyers')
    .select('buyer_number, name, desired_property_type, price_range_house, price_range_apartment, price_range_land')
    .eq('buyer_number', '4216')
    .single();

  if (afterError) {
    console.error('エラー:', afterError);
    return;
  }

  console.log('\n変更後:');
  console.log('  希望種別:', after.desired_property_type);
  console.log('  価格帯（戸建）:', after.price_range_house || '(未設定)');
  console.log('  価格帯（マンション）:', after.price_range_apartment || '(未設定)');
  console.log('  価格帯（土地）:', after.price_range_land || '(未設定)');

  // 検証
  console.log('\n検証結果:');
  if (after.price_range_land === '1000万円~2999万円' && !after.price_range_house && !after.price_range_apartment) {
    console.log('✅ 価格帯が正しく「1000万円~2999万円」に設定されました');
  } else {
    console.log('❌ 価格帯の反映が正しくありません');
    console.log('  期待値: 価格帯（土地）= 1000万円~2999万円、価格帯（戸建）= 未設定、価格帯（マンション）= 未設定');
    console.log('  実際の値: 価格帯（土地）=', after.price_range_land, '、価格帯（戸建）=', after.price_range_house, '、価格帯（マンション）=', after.price_range_apartment);
  }

  // 元に戻す
  console.log('\n2. 問合せ時ヒアリングを元に戻しています...');
  const originalInquiryHearing = '希望時期：2年以内\n駐車場希望台数：2台\n予算：3000万円';
  await buyerService.update('4216', {
    inquiry_hearing: originalInquiryHearing,
  });
  console.log('✅ 元に戻しました');
}

testPriceRange2500();
