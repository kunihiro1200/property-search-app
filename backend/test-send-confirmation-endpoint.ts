import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'http://localhost:3000';

/**
 * POST /api/buyers/:buyer_number/send-confirmation エンドポイントのテスト
 */
async function testSendConfirmationEndpoint() {
  console.log('🧪 Testing POST /api/buyers/:buyer_number/send-confirmation endpoint\n');
  console.log('='.repeat(80));

  // テスト用の買主番号（実際のデータから選択）
  // 注意: この買主は property_number と sales_assignee が設定されている必要があります
  const testBuyerNumber = '6666'; // テスト用の買主番号（実際のデータに合わせて変更してください）

  try {
    // Test 1: 正常系 - メッセージ送信成功
    console.log('\n📝 Test 1: 正常系 - メッセージ送信成功');
    console.log('-'.repeat(80));

    const confirmationText = 'この物件の駐車場は何台分ありますか？\n内覧の際に確認したいです。';

    console.log(`買主番号: ${testBuyerNumber}`);
    console.log(`確認事項:\n${confirmationText}\n`);

    const response1 = await axios.post(
      `${API_BASE_URL}/api/buyers/${testBuyerNumber}/send-confirmation`,
      { confirmationText },
      { validateStatus: () => true } // すべてのステータスコードを受け入れる
    );

    console.log(`ステータスコード: ${response1.status}`);
    console.log(`レスポンス:`, JSON.stringify(response1.data, null, 2));

    if (response1.status === 200 && response1.data.success) {
      console.log('✅ Test 1 passed: メッセージ送信成功');
    } else {
      console.log('❌ Test 1 failed: 期待されるステータスコード 200、success: true');
    }

  } catch (error: any) {
    console.error('❌ Test 1 failed with exception:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  try {
    // Test 2: 異常系 - confirmationTextが空
    console.log('\n📝 Test 2: 異常系 - confirmationTextが空');
    console.log('-'.repeat(80));

    const response2 = await axios.post(
      `${API_BASE_URL}/api/buyers/${testBuyerNumber}/send-confirmation`,
      { confirmationText: '' },
      { validateStatus: () => true }
    );

    console.log(`ステータスコード: ${response2.status}`);
    console.log(`レスポンス:`, JSON.stringify(response2.data, null, 2));

    if (response2.status === 400 && response2.data.error === '確認事項を入力してください') {
      console.log('✅ Test 2 passed: 正しいエラーメッセージ');
    } else {
      console.log('❌ Test 2 failed: 期待されるステータスコード 400、エラーメッセージ「確認事項を入力してください」');
    }

  } catch (error: any) {
    console.error('❌ Test 2 failed with exception:', error.message);
  }

  try {
    // Test 3: 異常系 - 存在しない買主番号
    console.log('\n📝 Test 3: 異常系 - 存在しない買主番号');
    console.log('-'.repeat(80));

    const nonExistentBuyerNumber = '999999';

    const response3 = await axios.post(
      `${API_BASE_URL}/api/buyers/${nonExistentBuyerNumber}/send-confirmation`,
      { confirmationText: 'テスト確認事項' },
      { validateStatus: () => true }
    );

    console.log(`ステータスコード: ${response3.status}`);
    console.log(`レスポンス:`, JSON.stringify(response3.data, null, 2));

    if (response3.status === 404 && response3.data.error === '買主が見つかりませんでした') {
      console.log('✅ Test 3 passed: 正しいエラーメッセージ');
    } else {
      console.log('❌ Test 3 failed: 期待されるステータスコード 404、エラーメッセージ「買主が見つかりませんでした」');
    }

  } catch (error: any) {
    console.error('❌ Test 3 failed with exception:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ All endpoint tests completed!');
  console.log('='.repeat(80));
  console.log('\n📋 Summary:');
  console.log('   - Endpoint: POST /api/buyers/:buyer_number/send-confirmation');
  console.log('   - Request body: { confirmationText: string }');
  console.log('   - Success response: { success: true, message: "送信しました" }');
  console.log('   - Error responses:');
  console.log('     - 400: confirmationTextが空');
  console.log('     - 404: 買主が見つからない、担当者が見つからない');
  console.log('     - 500: サーバーエラー');
  console.log('\n✅ Endpoint test complete!');
}

testSendConfirmationEndpoint()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test script failed:', err);
    process.exit(1);
  });
