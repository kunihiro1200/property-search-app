import http from 'http';

async function checkServerRunning() {
  console.log('=== サーバー実行状況の確認 ===\n');

  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/health', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('✅ サーバーは実行中です');
        console.log(`   ステータスコード: ${res.statusCode}`);
        console.log(`   レスポンス: ${data}`);
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ サーバーは実行されていません');
      console.log(`   エラー: ${error.message}`);
      console.log('\n推奨アクション:');
      console.log('   1. backend/start-clean.bat を実行してサーバーを起動');
      console.log('   2. または、npm run dev を実行');
      resolve(false);
    });
    
    req.end();
  });
}

checkServerRunning()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
