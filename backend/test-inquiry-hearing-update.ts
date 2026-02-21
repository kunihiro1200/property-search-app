/**
 * 問合せ時ヒアリング更新のテスト
 */

import { createClient } from '@supabase/supabase-js';
import { BuyerService } from './src/services/BuyerService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUpdate() {
  console.log('=== 問合せ時ヒアリング更新テスト ===\n');

  const testBuyerNumber = '4216';
  
  try {
    // 現在の状態を取得
    console.log('【更新前の状態を取得】');
    const { data: before, error: beforeError } = await supabase
      .from('buyers')
      .select('buyer_number, inquiry_hearing, desired_timing, parking_spaces, desired_price_range, inquiry_hearing_updated_at, desired_timing_updated_at, parking_spaces_updated_at, desired_price_range_updated_at')
      .eq('buyer_number', testBuyerNumber)
      .single();
    
    if (beforeError) {
      console.error('❌ 買主の取得に失敗:', beforeError.message);
      return;
    }
    
    console.log('買主番号:', before.buyer_number);
    console.log('問合せ時ヒアリング:', before.inquiry_hearing || '(空)');
    console.log('希望時期:', before.desired_timing || '(空)');
    console.log('駐車場希望台数:', before.parking_spaces || '(空)');
    console.log('予算:', before.desired_price_range || '(空)');
    console.log('');

    // BuyerServiceを使用して更新
    console.log('【BuyerServiceで更新】');
    const testInquiryHearing = `希望時期：2年後
駐車場場希望台数：2
予算：1000万円`;

    console.log('更新内容:');
    console.log(testInquiryHearing);
    console.log('');

    const buyerService = new BuyerService();
    const updated = await buyerService.update(testBuyerNumber, {
      inquiry_hearing: testInquiryHearing
    });

    console.log('✅ 更新成功');
    console.log('');

    // 更新後の状態を取得
    console.log('【更新後の状態を取得】');
    const { data: after, error: afterError } = await supabase
      .from('buyers')
      .select('buyer_number, inquiry_hearing, desired_timing, parking_spaces, desired_price_range, inquiry_hearing_updated_at, desired_timing_updated_at, parking_spaces_updated_at, desired_price_range_updated_at')
      .eq('buyer_number', testBuyerNumber)
      .single();
    
    if (afterError) {
      console.error('❌ 買主の取得に失敗:', afterError.message);
      return;
    }

    console.log('買主番号:', after.buyer_number);
    console.log('問合せ時ヒアリング:', after.inquiry_hearing || '(空)');
    console.log('希望時期:', after.desired_timing || '(空)');
    console.log('駐車場希望台数:', after.parking_spaces || '(空)');
    console.log('予算:', after.desired_price_range || '(空)');
    console.log('');

    // 変更を確認
    console.log('【変更内容】');
    if (before.desired_timing !== after.desired_timing) {
      console.log(`✅ 希望時期: "${before.desired_timing}" → "${after.desired_timing}"`);
    } else {
      console.log(`⚠️  希望時期: 変更なし (${after.desired_timing})`);
    }

    if (before.parking_spaces !== after.parking_spaces) {
      console.log(`✅ 駐車場希望台数: "${before.parking_spaces}" → "${after.parking_spaces}"`);
    } else {
      console.log(`⚠️  駐車場希望台数: 変更なし (${after.parking_spaces})`);
    }

    if (before.desired_price_range !== after.desired_price_range) {
      console.log(`✅ 予算: "${before.desired_price_range}" → "${after.desired_price_range}"`);
    } else {
      console.log(`⚠️  予算: 変更なし (${after.desired_price_range})`);
    }

  } catch (error) {
    console.error('❌ テストに失敗:', error);
  }
}

testUpdate();
