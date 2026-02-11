/**
 * 問合せ時ヒアリング自動反映機能のAPIテスト
 * 実際のAPIエンドポイント経由でテスト
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const API_BASE_URL = 'http://localhost:3001';

async function testApi() {
  console.log('=== 問合せ時ヒアリング自動反映機能 APIテスト ===\n');

  try {
    // テスト用の買主番号
    const testBuyerNumber = '4216';
    
    console.log(`テスト対象買主: ${testBuyerNumber}`);
    
    // 現在の状態を取得
    console.log('\n【更新前の状態を取得】');
    const beforeResponse = await axios.get(`${API_BASE_URL}/api/buyers/${testBuyerNumber}`);
    const before = beforeResponse.data;
    
    console.log('問合せ時ヒアリング:', before.inquiry_hearing || '(空)');
    console.log('希望時期:', before.desired_timing || '(空)');
    console.log('駐車場希望台数:', before.parking_spaces || '(空)');
    console.log('価格帯（戸建）:', before.price_range_house || '(空)');
    console.log('価格帯（マンション）:', before.price_range_apartment || '(空)');
    console.log('価格帯（土地）:', before.price_range_land || '(空)');
    console.log('');

    // 問合せ時ヒアリングを更新（テストデータ）
    const testInquiryHearing = `予算：3000万
駐車場希望台数：3
希望時期：2`;

    console.log('【更新内容】');
    console.log('問合せ時ヒアリング:');
    console.log(testInquiryHearing);
    console.log('');

    // APIエンドポイント経由で更新
    console.log('【APIエンドポイント経由で更新】');
    const updateResponse = await axios.put(
      `${API_BASE_URL}/api/buyers/${testBuyerNumber}`,
      {
        inquiry_hearing: testInquiryHearing
      }
    );

    console.log('✅ 更新成功');
    console.log('レスポンス:', JSON.stringify(updateResponse.data, null, 2));
    console.log('');

    // 更新後の状態を取得
    console.log('【更新後の状態を取得】');
    const afterResponse = await axios.get(`${API_BASE_URL}/api/buyers/${testBuyerNumber}`);
    const after = afterResponse.data;

    console.log('問合せ時ヒアリング:', after.inquiry_hearing || '(空)');
    console.log('希望時期:', after.desired_timing || '(空)');
    console.log('駐車場希望台数:', after.parking_spaces || '(空)');
    console.log('価格帯（戸建）:', after.price_range_house || '(空)');
    console.log('価格帯（マンション）:', after.price_range_apartment || '(空)');
    console.log('価格帯（土地）:', after.price_range_land || '(空)');
    console.log('');

    // 変更を確認
    console.log('【変更内容】');
    if (after.desired_timing !== before.desired_timing) {
      console.log(`✅ 希望時期: ${before.desired_timing || '(空)'} → ${after.desired_timing}`);
    } else {
      console.log(`⚠️  希望時期: 変更なし (${after.desired_timing || '(空)'})`);
    }

    if (after.parking_spaces !== before.parking_spaces) {
      console.log(`✅ 駐車場希望台数: ${before.parking_spaces || '(空)'} → ${after.parking_spaces}`);
    } else {
      console.log(`⚠️  駐車場希望台数: 変更なし (${after.parking_spaces || '(空)'})`);
    }

    if (after.price_range_house !== before.price_range_house) {
      console.log(`✅ 価格帯（戸建）: ${before.price_range_house || '(空)'} → ${after.price_range_house}`);
    } else {
      console.log(`⚠️  価格帯（戸建）: 変更なし (${after.price_range_house || '(空)'})`);
    }

    if (after.price_range_apartment !== before.price_range_apartment) {
      console.log(`✅ 価格帯（マンション）: ${before.price_range_apartment || '(空)'} → ${after.price_range_apartment}`);
    } else {
      console.log(`⚠️  価格帯（マンション）: 変更なし (${after.price_range_apartment || '(空)'})`);
    }

    if (after.price_range_land !== before.price_range_land) {
      console.log(`✅ 価格帯（土地）: ${before.price_range_land || '(空)'} → ${after.price_range_land}`);
    } else {
      console.log(`⚠️  価格帯（土地）: 変更なし (${after.price_range_land || '(空)'})`);
    }

  } catch (error: any) {
    console.error('❌ テストに失敗:', error.message);
    if (error.response) {
      console.error('レスポンスステータス:', error.response.status);
      console.error('レスポンスデータ:', error.response.data);
    }
  }
}

testApi();
