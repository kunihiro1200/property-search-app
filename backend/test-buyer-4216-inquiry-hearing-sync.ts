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

async function testBuyer4216InquiryHearingSync() {
  console.log('買主番号4216の問合せ時ヒアリング同期をテスト中...\n');

  // 現在の値を確認
  const { data: before, error: beforeError } = await supabase
    .from('buyers')
    .select('buyer_number, name, desired_property_type, inquiry_hearing, desired_timing, parking_spaces, price_range_house, price_range_apartment, price_range_land')
    .eq('buyer_number', '4216')
    .single();

  if (beforeError) {
    console.error('エラー:', beforeError);
    return;
  }

  console.log('変更前:');
  console.log('  買主番号:', before.buyer_number);
  console.log('  氏名:', before.name);
  console.log('  希望種別:', before.desired_property_type);
  console.log('  問合せ時ヒアリング:', before.inquiry_hearing);
  console.log('  希望時期:', before.desired_timing || '(未設定)');
  console.log('  駐車場希望台数:', before.parking_spaces || '(未設定)');
  console.log('  価格帯（戸建）:', before.price_range_house || '(未設定)');
  console.log('  価格帯（マンション）:', before.price_range_apartment || '(未設定)');
  console.log('  価格帯（土地）:', before.price_range_land || '(未設定)');

  // 問合せ時ヒアリングを再保存（BuyerServiceを直接使用）
  console.log('\n問合せ時ヒアリングを再保存中...');
  
  try {
    await buyerService.update('4216', {
      inquiry_hearing: before.inquiry_hearing,
    });
    console.log('✅ 更新成功');
  } catch (error) {
    console.error('更新エラー:', error);
    return;
  }

  // 更新後の値を確認
  const { data: after, error: afterError } = await supabase
    .from('buyers')
    .select('buyer_number, name, desired_property_type, inquiry_hearing, desired_timing, parking_spaces, price_range_house, price_range_apartment, price_range_land')
    .eq('buyer_number', '4216')
    .single();

  if (afterError) {
    console.error('エラー:', afterError);
    return;
  }

  console.log('\n変更後:');
  console.log('  買主番号:', after.buyer_number);
  console.log('  氏名:', after.name);
  console.log('  希望種別:', after.desired_property_type);
  console.log('  問合せ時ヒアリング:', after.inquiry_hearing);
  console.log('  希望時期:', after.desired_timing || '(未設定)');
  console.log('  駐車場希望台数:', after.parking_spaces || '(未設定)');
  console.log('  価格帯（戸建）:', after.price_range_house || '(未設定)');
  console.log('  価格帯（マンション）:', after.price_range_apartment || '(未設定)');
  console.log('  価格帯（土地）:', after.price_range_land || '(未設定)');

  // 検証
  console.log('\n検証結果:');
  if (after.price_range_land === '2000万円以上' && !after.price_range_house && !after.price_range_apartment) {
    console.log('✅ 価格帯が正しく土地のみに反映されました');
  } else {
    console.log('❌ 価格帯の反映が正しくありません');
    console.log('  期待値: 価格帯（土地）= 2000万円以上、価格帯（戸建）= 未設定、価格帯（マンション）= 未設定');
    console.log('  実際の値: 価格帯（土地）=', after.price_range_land, '、価格帯（戸建）=', after.price_range_house, '、価格帯（マンション）=', after.price_range_apartment);
  }
}

testBuyer4216InquiryHearingSync();
