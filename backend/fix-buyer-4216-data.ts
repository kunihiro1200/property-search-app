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

async function fixBuyer4216Data() {
  console.log('買主番号4216のデータを修正中...\n');

  // 1. desired_property_typeを「土地」に設定
  console.log('1. desired_property_typeを「土地」に設定中...');
  await supabase
    .from('buyers')
    .update({ desired_property_type: '土地' })
    .eq('buyer_number', '4216');
  console.log('✅ 完了');

  // 2. 問合せ時ヒアリングを正しいフォーマットに修正
  console.log('\n2. 問合せ時ヒアリングを正しいフォーマットに修正中...');
  const correctInquiryHearing = '希望時期：2年以内\n駐車場希望台数：2台\n予算：1500万円';
  
  await buyerService.update('4216', {
    inquiry_hearing: correctInquiryHearing,
  });
  console.log('✅ 完了');

  // 3. 結果を確認
  const { data: after, error: afterError } = await supabase
    .from('buyers')
    .select('buyer_number, name, desired_property_type, inquiry_hearing, price_range_house, price_range_apartment, price_range_land')
    .eq('buyer_number', '4216')
    .single();

  if (afterError) {
    console.error('エラー:', afterError);
    return;
  }

  console.log('\n修正後:');
  console.log('  買主番号:', after.buyer_number);
  console.log('  氏名:', after.name);
  console.log('  希望種別:', after.desired_property_type);
  console.log('  問合せ時ヒアリング:', after.inquiry_hearing);
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
}

fixBuyer4216Data();
