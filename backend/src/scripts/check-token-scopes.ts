import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkTokenScopes() {
  console.log('================================================================================');
  console.log('Google OAuth トークンのスコープ確認');
  console.log('================================================================================\n');

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ エラー: 必要な環境変数が設定されていません');
    console.error('   - GOOGLE_OAUTH_CLIENT_ID');
    console.error('   - GOOGLE_OAUTH_CLIENT_SECRET');
    console.error('   - GOOGLE_OAUTH_REFRESH_TOKEN');
    process.exit(1);
  }

  try {
    // OAuth2クライアントを作成
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:3000/api/google/callback'
    );

    // リフレッシュトークンを設定
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // アクセストークンを取得（これによりスコープ情報も取得できる）
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    console.log('✅ トークン情報の取得に成功しました\n');
    console.log('📋 トークン情報:');
    console.log('----------------------------------------');
    console.log(`アクセストークン: ${credentials.access_token ? '取得済み' : '未取得'}`);
    console.log(`有効期限: ${credentials.expiry_date ? new Date(credentials.expiry_date).toLocaleString('ja-JP') : '不明'}`);
    console.log(`スコープ: ${credentials.scope || '情報なし'}`);
    console.log('----------------------------------------\n');

    // スコープを確認
    const scopes = credentials.scope?.split(' ') || [];
    const hasSheetsScope = scopes.some(scope => 
      scope.includes('spreadsheets') || scope.includes('drive')
    );
    const hasGmailScope = scopes.some(scope => 
      scope.includes('gmail')
    );

    console.log('🔍 スコープの詳細:');
    console.log('----------------------------------------');
    scopes.forEach(scope => {
      console.log(`  ✓ ${scope}`);
    });
    console.log('----------------------------------------\n');

    console.log('📊 必要なスコープの確認:');
    console.log('----------------------------------------');
    console.log(`  Google Sheets: ${hasSheetsScope ? '✅ 含まれています' : '❌ 含まれていません'}`);
    console.log(`  Gmail: ${hasGmailScope ? '✅ 含まれています' : '❌ 含まれていません'}`);
    console.log('----------------------------------------\n');

    if (!hasSheetsScope) {
      console.log('⚠️  Google Sheetsのスコープが含まれていません');
      console.log('');
      console.log('対処方法:');
      console.log('1. 新しいリフレッシュトークンを取得する必要があります');
      console.log('2. 以下のコマンドを実行してください:');
      console.log('   npm run sheets:get-oauth-token');
      console.log('');
      console.log('3. または、Google Cloud Consoleで既存のトークンを無効化し、');
      console.log('   再度認証を行ってください');
    } else {
      console.log('✅ このトークンはGoogle Sheets APIにアクセスできます');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.error('\nトラブルシューティング:');
      console.error('- リフレッシュトークンが無効または期限切れです');
      console.error('- 新しいリフレッシュトークンを取得してください');
      console.error('  コマンド: npm run sheets:get-oauth-token');
    }
  }
}

checkTokenScopes();
