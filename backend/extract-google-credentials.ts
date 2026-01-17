import fs from 'fs';
import path from 'path';

async function extractGoogleCredentials() {
  console.log('\n=== Google認証情報の抽出 ===\n');

  try {
    // google-service-account.jsonファイルのパス
    const serviceAccountPath = path.join(__dirname, 'google-service-account.json');
    
    // ファイルの存在確認
    if (!fs.existsSync(serviceAccountPath)) {
      console.log('❌ google-service-account.jsonファイルが見つかりません');
      console.log(`   パス: ${serviceAccountPath}`);
      console.log('\n解決方法:');
      console.log('1. Google Cloud Consoleからサービスアカウントキーをダウンロード');
      console.log('2. ファイル名を google-service-account.json に変更');
      console.log('3. backend/ ディレクトリに配置');
      return;
    }

    console.log('✅ google-service-account.jsonファイルを発見');

    // ファイルを読み込む
    const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf-8');
    const serviceAccount = JSON.parse(serviceAccountContent);

    // 必要な情報を抽出
    const email = serviceAccount.client_email;
    const privateKey = serviceAccount.private_key;

    if (!email || !privateKey) {
      console.log('❌ サービスアカウントファイルに必要な情報が含まれていません');
      console.log('   client_email:', email ? '✅' : '❌');
      console.log('   private_key:', privateKey ? '✅' : '❌');
      return;
    }

    console.log('✅ 認証情報を抽出しました');
    console.log(`   Email: ${email}`);
    console.log(`   Private Key: ${privateKey.substring(0, 50)}...`);

    // .envファイルのパス
    const envPath = path.join(__dirname, '.env');

    // .envファイルを読み込む
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // 既存の設定を確認
    const hasEmail = envContent.includes('GOOGLE_SERVICE_ACCOUNT_EMAIL=');
    const hasPrivateKey = envContent.includes('GOOGLE_PRIVATE_KEY=');

    console.log('\n現在の.env設定:');
    console.log(`   GOOGLE_SERVICE_ACCOUNT_EMAIL: ${hasEmail ? '設定済み' : '未設定'}`);
    console.log(`   GOOGLE_PRIVATE_KEY: ${hasPrivateKey ? '設定済み' : '未設定'}`);

    // private_keyの改行を\nに変換
    const privateKeyEscaped = privateKey.replace(/\n/g, '\\n');

    // 新しい設定行
    const emailLine = `GOOGLE_SERVICE_ACCOUNT_EMAIL=${email}`;
    const privateKeyLine = `GOOGLE_PRIVATE_KEY="${privateKeyEscaped}"`;

    // .envファイルを更新
    if (hasEmail) {
      // 既存の行を置き換え
      envContent = envContent.replace(
        /GOOGLE_SERVICE_ACCOUNT_EMAIL=.*/,
        emailLine
      );
      console.log('\n✅ GOOGLE_SERVICE_ACCOUNT_EMAILを更新しました');
    } else {
      // 新しい行を追加
      envContent += `\n# Google Service Account Configuration (auto-generated)\n${emailLine}\n`;
      console.log('\n✅ GOOGLE_SERVICE_ACCOUNT_EMAILを追加しました');
    }

    if (hasPrivateKey) {
      // 既存の行を置き換え
      envContent = envContent.replace(
        /GOOGLE_PRIVATE_KEY=.*/,
        privateKeyLine
      );
      console.log('✅ GOOGLE_PRIVATE_KEYを更新しました');
    } else {
      // 新しい行を追加
      envContent += `${privateKeyLine}\n`;
      console.log('✅ GOOGLE_PRIVATE_KEYを追加しました');
    }

    // .envファイルに書き込む
    fs.writeFileSync(envPath, envContent, 'utf-8');

    console.log('\n=== 完了 ===');
    console.log('\n次のステップ:');
    console.log('1. バックエンドサーバーを再起動してください');
    console.log('2. 診断ツールを再実行して確認:');
    console.log('   npx ts-node diagnose-auto-sync-status.ts');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    
    if (error instanceof SyntaxError) {
      console.log('\ngoogle-service-account.jsonファイルの形式が正しくありません');
      console.log('ファイルが有効なJSONであることを確認してください');
    }
  }
}

extractGoogleCredentials();
