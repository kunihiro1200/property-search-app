import axios from 'axios';

async function testPerformanceMetricsAPI() {
  console.log('=== パフォーマンスメトリクスAPI テスト ===\n');

  try {
    const baseURL = 'http://localhost:3000';
    const month = '2025-11';

    console.log(`APIエンドポイント: ${baseURL}/api/sellers/performance-metrics?month=${month}\n`);

    const response = await axios.get(`${baseURL}/api/sellers/performance-metrics`, {
      params: { month },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('レスポンス:');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n=== 検証結果 ===');
    const visitAppraisalCount = response.data.visitAppraisalCount;
    console.log(`訪問査定取得数: ${visitAppraisalCount} 件`);
    console.log(`期待値: 24 件`);
    console.log(`結果: ${visitAppraisalCount === 24 ? '✅ 成功！' : `❌ 失敗（差分: ${24 - visitAppraisalCount} 件）`}`);

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ バックエンドサーバーが起動していません');
      console.log('\n次のコマンドでバックエンドを起動してください:');
      console.log('cd backend && npm run dev');
    } else if (error.response) {
      console.error('APIエラー:', error.response.status, error.response.data);
    } else {
      console.error('エラー:', error.message);
    }
  }
}

testPerformanceMetricsAPI();
