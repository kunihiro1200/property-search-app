// フロントエンドのデプロイ状況を診断
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseFrontendDeployment() {
  console.log('=== フロントエンドデプロイ診断 ===\n');
  
  const frontendUrl = 'https://property-site-frontend-kappa.vercel.app';
  
  const tests = [
    { path: '/', description: 'ルートパス' },
    { path: '/public/properties', description: '公開物件一覧' },
    { path: '/login', description: 'ログインページ' },
    { path: '/index.html', description: 'index.html' },
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n📍 テスト: ${test.description} (${test.path})`);
      const response = await fetch(`${frontendUrl}${test.path}`, {
        method: 'GET',
        redirect: 'manual', // リダイレクトを手動で処理
      });
      
      console.log(`   ステータス: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 301 || response.status === 302) {
        console.log(`   リダイレクト先: ${response.headers.get('location')}`);
      }
      
      if (response.status === 404) {
        console.log(`   ❌ 404エラー - ページが見つかりません`);
      } else if (response.status === 200) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('text/html')) {
          console.log(`   ✓ HTMLページが正しく返されています`);
        } else {
          console.log(`   ⚠️ HTMLではないコンテンツが返されています`);
        }
      }
      
    } catch (error: any) {
      console.log(`   ❌ エラー: ${error.message}`);
    }
  }
  
  console.log('\n=== 推奨される対処法 ===');
  console.log('1. Vercelダッシュボードでフロントエンドプロジェクトの設定を確認');
  console.log('2. Build Command: npm run build');
  console.log('3. Output Directory: dist');
  console.log('4. Install Command: npm install');
  console.log('5. Framework Preset: Vite');
  console.log('6. Root Directory: frontend (もし設定されていない場合)');
  console.log('\n7. frontend/vercel.json の rewrites 設定を確認:');
  console.log('   {');
  console.log('     "rewrites": [');
  console.log('       { "source": "/(.*)", "destination": "/index.html" }');
  console.log('     ]');
  console.log('   }');
}

diagnoseFrontendDeployment().catch(console.error);
