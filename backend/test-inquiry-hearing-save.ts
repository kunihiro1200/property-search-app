/**
 * 問合せ時ヒアリング保存のテスト（APIエンドポイント経由）
 */

import axios from 'axios';

async function testSave() {
  console.log('=== 問合せ時ヒアリング保存テスト（APIエンドポイント経由） ===\n');

  const testBuyerNumber = '4216';
  const apiUrl = 'http://localhost:3001';

  try {
    // 現在の状態を取得
    console.log('【更新前の状態を取得】');
    const beforeResponse = await axios.get(`${apiUrl}/api/buyers/${testBuyerNumber}`);
    const before = beforeResponse.data;

    console.log('買主番号:', before.buyer_number);
    console.log('問合せ時ヒアリング:', before.inquiry_hearing || '(空)');
    console.log('希望時期:', before.desired_timing || '(空)');
    console.log('駐車場希望台数:', before.parking_spaces || '(空)');
    console.log('価格帯（戸建）:', before.price_range_house || '(空)');
    console.log('価格帯（マンション）:', before.price_range_apartment || '(空)');
    console.log('価格帯（土地）:', before.price_range_land || '(空)');
    console.log('希望種別:', before.desired_property_type || '(空)');
    console.log('');

    // 問合せ時ヒアリングを更新
    console.log('【問合せ時ヒアリングを更新】');
    const testInquiryHearing = `希望時期：2年後
駐車場希望台数：2
予算：1000万円`;

    console.log('更新内容:');
    console.log(testInquiryHearing);
    console.log('');

    const updateResponse = await axios.put(`${apiUrl}/api/buyers/${testBuyerNumber}`, {
      inquiry_hearing: testInquiryHearing
    });

    console.log('✅ 更新成功');
    console.log('');

    // 更新後の状態を取得
    console.log('【更新後の状態を取得】');
    const afterResponse = await axios.get(`${apiUrl}/api/buyers/${testBuyerNumber}`);
    const after = afterResponse.data;

    console.log('買主番号:', after.buyer_number);
    console.log('問合せ時ヒアリング:', after.inquiry_hearing || '(空)');
    console.log('希望時期:', after.desired_timing || '(空)');
    console.log('駐車場希望台数:', after.parking_spaces || '(空)');
    console.log('価格帯（戸建）:', after.price_range_house || '(空)');
    console.log('価格帯（マンション）:', after.price_range_apartment || '(空)');
    console.log('価格帯（土地）:', after.price_range_land || '(空)');
    console.log('希望種別:', after.desired_property_type || '(空)');
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

    if (before.price_range_house !== after.price_range_house) {
      console.log(`✅ 価格帯（戸建）: "${before.price_range_house}" → "${after.price_range_house}"`);
    } else {
      console.log(`⚠️  価格帯（戸建）: 変更なし (${after.price_range_house})`);
    }

    if (before.price_range_apartment !== after.price_range_apartment) {
      console.log(`✅ 価格帯（マンション）: "${before.price_range_apartment}" → "${after.price_range_apartment}"`);
    } else {
      console.log(`⚠️  価格帯（マンション）: 変更なし (${after.price_range_apartment})`);
    }

    if (before.price_range_land !== after.price_range_land) {
      console.log(`✅ 価格帯（土地）: "${before.price_range_land}" → "${after.price_range_land}"`);
    } else {
      console.log(`⚠️  価格帯（土地）: 変更なし (${after.price_range_land})`);
    }

  } catch (error: any) {
    console.error('❌ テストに失敗:', error.message);
    if (error.response) {
      console.error('レスポンスステータス:', error.response.status);
      console.error('レスポンスデータ:', error.response.data);
    }
  }
}

testSave();
