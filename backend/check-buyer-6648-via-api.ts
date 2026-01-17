import axios from 'axios';

async function checkBuyer6648ViaAPI() {
  console.log('=== 買主6648 API経由確認 ===\n');

  const baseURL = 'http://localhost:3000';
  const buyerId = '5c774182-9057-4544-9ee0-acaf25d15459';

  try {
    // 1. 買主詳細を取得
    console.log('1. 買主詳細を取得...');
    try {
      const buyerResponse = await axios.get(`${baseURL}/api/buyers/${buyerId}`);
      console.log('✓ 買主詳細取得成功:');
      console.log(JSON.stringify(buyerResponse.data, null, 2));
    } catch (error: any) {
      console.log('✗ 買主詳細取得失敗:');
      console.log(`  ステータス: ${error.response?.status}`);
      console.log(`  メッセージ: ${error.response?.data?.message || error.message}`);
    }

    // 2. 統合問い合わせ履歴を取得
    console.log('\n2. 統合問い合わせ履歴を取得...');
    try {
      const historyResponse = await axios.get(`${baseURL}/api/buyers/${buyerId}/unified-inquiry-history`);
      console.log('✓ 統合問い合わせ履歴取得成功:');
      console.log(`  件数: ${historyResponse.data.length}`);
    } catch (error: any) {
      console.log('✗ 統合問い合わせ履歴取得失敗:');
      console.log(`  ステータス: ${error.response?.status}`);
      console.log(`  メッセージ: ${error.response?.data?.message || error.message}`);
    }

    // 3. 関連買主を取得
    console.log('\n3. 関連買主を取得...');
    try {
      const relatedResponse = await axios.get(`${baseURL}/api/buyers/${buyerId}/related`);
      console.log('✓ 関連買主取得成功:');
      console.log(`  件数: ${relatedResponse.data.length}`);
    } catch (error: any) {
      console.log('✗ 関連買主取得失敗:');
      console.log(`  ステータス: ${error.response?.status}`);
      console.log(`  メッセージ: ${error.response?.data?.message || error.message}`);
    }

    // 4. 買主番号6648で検索
    console.log('\n4. 買主番号6648で検索...');
    try {
      const searchResponse = await axios.get(`${baseURL}/api/buyers`, {
        params: { buyer_number: '6648' }
      });
      console.log('✓ 買主番号6648検索成功:');
      if (searchResponse.data.buyers && searchResponse.data.buyers.length > 0) {
        console.log(`  見つかった買主: ${searchResponse.data.buyers.length}件`);
        console.log('  最初の買主:');
        console.log(JSON.stringify(searchResponse.data.buyers[0], null, 2));
      } else {
        console.log('  買主番号6648は見つかりませんでした');
      }
    } catch (error: any) {
      console.log('✗ 買主番号6648検索失敗:');
      console.log(`  ステータス: ${error.response?.status}`);
      console.log(`  メッセージ: ${error.response?.data?.message || error.message}`);
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }

  console.log('\n=== 確認完了 ===');
}

checkBuyer6648ViaAPI().catch(console.error);
