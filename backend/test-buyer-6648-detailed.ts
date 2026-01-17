import axios from 'axios';

async function testBuyer6648Detailed() {
  console.log('=== 買主6648 詳細テスト ===\n');

  const baseURL = 'http://localhost:3000';
  const buyerId = '5c774182-9057-4544-9ee0-acaf25d15459';

  try {
    // 1. 統合問い合わせ履歴を取得（詳細なエラー情報）
    console.log('1. 統合問い合わせ履歴を取得...');
    try {
      const response = await axios.get(`${baseURL}/api/buyers/${buyerId}/unified-inquiry-history`, {
        validateStatus: () => true // すべてのステータスコードを受け入れる
      });
      
      console.log(`  ステータス: ${response.status}`);
      console.log(`  レスポンスヘッダー:`, response.headers);
      console.log(`  レスポンスボディ:`, JSON.stringify(response.data, null, 2));
      
      if (response.status === 200) {
        console.log('  ✓ 成功');
        if (response.data.inquiries) {
          console.log(`  問い合わせ件数: ${response.data.inquiries.length}`);
        }
        if (response.data.buyer_numbers) {
          console.log(`  買主番号: ${response.data.buyer_numbers.join(', ')}`);
        }
      } else {
        console.log('  ✗ 失敗');
      }
    } catch (error: any) {
      console.log('  ✗ リクエストエラー:');
      console.log(`    メッセージ: ${error.message}`);
      if (error.response) {
        console.log(`    ステータス: ${error.response.status}`);
        console.log(`    データ: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    // 2. 関連買主を取得（詳細なエラー情報）
    console.log('\n2. 関連買主を取得...');
    try {
      const response = await axios.get(`${baseURL}/api/buyers/${buyerId}/related`, {
        validateStatus: () => true
      });
      
      console.log(`  ステータス: ${response.status}`);
      console.log(`  レスポンスボディ:`, JSON.stringify(response.data, null, 2));
      
      if (response.status === 200) {
        console.log('  ✓ 成功');
        if (Array.isArray(response.data)) {
          console.log(`  関連買主件数: ${response.data.length}`);
        }
      } else {
        console.log('  ✗ 失敗');
      }
    } catch (error: any) {
      console.log('  ✗ リクエストエラー:');
      console.log(`    メッセージ: ${error.message}`);
      if (error.response) {
        console.log(`    ステータス: ${error.response.status}`);
        console.log(`    データ: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    // 3. 買主詳細を取得（確認用）
    console.log('\n3. 買主詳細を取得（確認用）...');
    try {
      const response = await axios.get(`${baseURL}/api/buyers/${buyerId}`, {
        validateStatus: () => true
      });
      
      console.log(`  ステータス: ${response.status}`);
      if (response.status === 200) {
        console.log('  ✓ 成功');
        console.log(`  買主番号: ${response.data.buyer_number}`);
        console.log(`  名前: ${response.data.name}`);
        console.log(`  電話番号: ${response.data.phone_number}`);
      } else {
        console.log('  ✗ 失敗');
        console.log(`  レスポンスボディ:`, JSON.stringify(response.data, null, 2));
      }
    } catch (error: any) {
      console.log('  ✗ リクエストエラー:');
      console.log(`    メッセージ: ${error.message}`);
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }

  console.log('\n=== テスト完了 ===');
}

testBuyer6648Detailed().catch(console.error);
