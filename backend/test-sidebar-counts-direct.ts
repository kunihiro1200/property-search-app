/**
 * サイドバーカウントAPIを直接テストするスクリプト
 */

import fetch from 'node-fetch';

async function main() {
  console.log('=== サイドバーカウントAPI確認 ===\n');

  try {
    const response = await fetch('http://localhost:3000/api/sellers/sidebar-counts', {
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });

    if (!response.ok) {
      console.log(`❌ HTTPエラー: ${response.status}`);
      const text = await response.text();
      console.log('レスポンス:', text);
      return;
    }

    const data = await response.json();
    console.log('📊 サイドバーカウント:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`❌ エラー: ${error}`);
  }
}

main().catch(console.error);
