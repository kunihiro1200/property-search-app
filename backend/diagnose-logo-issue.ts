// ロゴ画像の表示問題を診断
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseLogoIssue() {
  console.log('=== ロゴ画像の表示問題を診断 ===\n');
  
  const environments = [
    {
      name: 'ローカル環境',
      baseUrl: 'http://localhost:5174',
      logoPath: '/comfortable-tenant-search-logo.png',
    },
    {
      name: '本番環境（Vercel）',
      baseUrl: 'https://property-site-frontend-kappa.vercel.app',
      logoPath: '/comfortable-tenant-search-logo.png',
    },
  ];
  
  for (const env of environments) {
    console.log(`\n${env.name}:`);
    console.log(`  ベースURL: ${env.baseUrl}`);
    console.log(`  ロゴパス: ${env.logoPath}`);
    console.log(`  完全URL: ${env.baseUrl}${env.logoPath}`);
    
    try {
      const response = await fetch(`${env.baseUrl}${env.logoPath}`);
      console.log(`  HTTPステータス: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      console.log(`  Content-Length: ${response.headers.get('content-length')} bytes`);
      
      if (response.ok) {
        console.log('  ✓ ロゴ画像は正常にアクセス可能');
      } else {
        console.log('  ❌ ロゴ画像にアクセスできません');
      }
    } catch (error: any) {
      console.log(`  ❌ エラー: ${error.message}`);
    }
  }
  
  console.log('\n=== 診断完了 ===');
  console.log('\n推奨事項:');
  console.log('1. ローカル環境でロゴが表示される場合:');
  console.log('   - Vercelのビルドログを確認');
  console.log('   - public/フォルダが正しくデプロイされているか確認');
  console.log('   - Vercelの設定でRoot Directoryが"frontend"になっているか確認');
  console.log('\n2. ローカル環境でもロゴが表示されない場合:');
  console.log('   - ファイルパスを確認: frontend/public/comfortable-tenant-search-logo.png');
  console.log('   - Viteの設定を確認: vite.config.ts');
  console.log('   - ブラウザのキャッシュをクリア');
}

diagnoseLogoIssue().catch(console.error);
