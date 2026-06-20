import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルのパスを明示的に指定
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Google Sheets API接続テストスクリプト
 * 
 * このスクリプトは、Google Sheets APIの認証と基本的な読み取り操作をテストします。
 * 
 * 実行方法:
 * npx ts-node src/scripts/test-sheets-connection.ts
 */

async function testSheetsConnection() {
  console.log('🔍 Google Sheets API接続テストを開始します...\n');

  // 環境変数の確認
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME;
  
  // Service Account credentials (JSONファイル)
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  
  // Service Account credentials (環境変数)
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  
  // OAuth 2.0 credentials
  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  const useServiceAccountFile = !!serviceAccountKeyPath;
  const useServiceAccountEnv = !!(serviceAccountEmail && privateKey);
  const useOAuth = !!(oauthClientId && oauthClientSecret && oauthRefreshToken);

  console.log('📋 環境変数の確認:');
  console.log(`  - GOOGLE_SHEETS_SPREADSHEET_ID: ${spreadsheetId ? '✓ 設定済み' : '✗ 未設定'}`);
  console.log(`  - GOOGLE_SHEETS_SHEET_NAME: ${sheetName ? '✓ 設定済み' : '✗ 未設定'}`);
  console.log('\n認証方式:');
  console.log(`  - Service Account (JSONファイル): ${useServiceAccountFile ? '✓ 設定済み（最優先）' : '✗ 未設定'}`);
  console.log(`  - Service Account (環境変数): ${useServiceAccountEnv ? '✓ 設定済み' : '✗ 未設定'}`);
  console.log(`  - OAuth 2.0: ${useOAuth ? '✓ 設定済み' : '✗ 未設定'}\n`);

  if (!spreadsheetId || !sheetName) {
    console.error('❌ エラー: スプレッドシートIDまたはシート名が設定されていません');
    console.error('   backend/.env ファイルを確認してください\n');
    process.exit(1);
  }

  if (!useServiceAccountFile && !useServiceAccountEnv && !useOAuth) {
    console.error('❌ エラー: 認証情報が設定されていません');
    console.error('   サービスアカウント（JSONファイルまたは環境変数）またはOAuth 2.0の認証情報を設定してください\n');
    process.exit(1);
  }

  try {
    let authClient: any;

    if (useServiceAccountFile) {
      // サービスアカウント認証（JSONファイル）
      console.log('🔐 サービスアカウント認証（JSONファイル）を試行中...');
      const fs = require('fs');
      const keyPath = path.resolve(__dirname, '../../', serviceAccountKeyPath!);
      
      if (!fs.existsSync(keyPath)) {
        throw new Error(`サービスアカウントキーファイルが見つかりません: ${keyPath}`);
      }

      const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      console.log(`   サービスアカウント: ${keyFile.client_email}`);

      const auth = new google.auth.GoogleAuth({
        credentials: keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      authClient = await auth.getClient();
      console.log('✅ サービスアカウント認証成功\n');
    } else if (useServiceAccountEnv) {
      // サービスアカウント認証（環境変数）
      console.log('🔐 サービスアカウント認証（環境変数）を試行中...');
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: privateKey!.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      authClient = await auth.getClient();
      console.log('✅ サービスアカウント認証成功\n');
    } else {
      // OAuth 2.0認証
      console.log('🔐 OAuth 2.0認証を試行中...');
      const oauth2Client = new google.auth.OAuth2(
        oauthClientId,
        oauthClientSecret,
        'http://localhost:3000/api/google/callback'
      );

      oauth2Client.setCredentials({
        refresh_token: oauthRefreshToken,
      });

      authClient = oauth2Client;
      console.log('✅ OAuth 2.0認証成功\n');
    }

    // Google Sheets APIクライアントを作成
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // スプレッドシートのメタデータを取得
    console.log('📊 スプレッドシートのメタデータを取得中...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    console.log(`✅ スプレッドシート名: ${spreadsheet.data.properties?.title}`);
    console.log(`   シート数: ${spreadsheet.data.sheets?.length}\n`);

    // シート一覧を表示
    console.log('📄 利用可能なシート:');
    spreadsheet.data.sheets?.forEach((sheet, index) => {
      console.log(`   ${index + 1}. ${sheet.properties?.title}`);
    });
    console.log('');

    // 指定されたシートからデータを読み取り
    console.log(`📖 "${sheetName}" シートからデータを読み取り中...`);
    const range = `${sheetName}!A1:Z10`; // 最初の10行を読み取り
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('⚠️  データが見つかりませんでした');
    } else {
      console.log(`✅ ${rows.length}行のデータを読み取りました`);
      console.log('\n📋 最初の3行のプレビュー:');
      rows.slice(0, 3).forEach((row, index) => {
        console.log(`   行${index + 1}: ${row.slice(0, 5).join(' | ')}${row.length > 5 ? ' | ...' : ''}`);
      });
    }

    console.log('\n✅ すべてのテストが成功しました！');
    console.log('   Google Sheets APIの設定は正しく完了しています。\n');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:\n');
    
    if (error.code === 404) {
      console.error('   スプレッドシートが見つかりません');
      console.error('   - スプレッドシートIDが正しいか確認してください');
      console.error('   - サービスアカウントがスプレッドシートの編集者として追加されているか確認してください\n');
    } else if (error.code === 403) {
      console.error('   アクセス権限がありません');
      if (useServiceAccountFile || useServiceAccountEnv) {
        console.error('   - サービスアカウントがスプレッドシートの編集者として追加されているか確認してください');
        if (useServiceAccountFile) {
          const fs = require('fs');
          const keyPath = path.resolve(__dirname, '../../', serviceAccountKeyPath!);
          const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
          console.error(`   - サービスアカウント: ${keyFile.client_email}\n`);
        } else {
          console.error(`   - サービスアカウント: ${serviceAccountEmail}\n`);
        }
      } else {
        console.error('   - 認証したGoogleアカウントがスプレッドシートの編集者として追加されているか確認してください\n');
      }
    } else if (error.message?.includes('Invalid JWT Signature')) {
      console.error('   サービスアカウントキーが無効です');
      console.error('   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEYの形式が正しいか確認してください');
      console.error('   - 改行文字(\\n)が含まれているか確認してください\n');
    } else if (error.message?.includes('not found')) {
      console.error('   サービスアカウントキーファイルが見つかりません');
      console.error(`   - ファイルパス: ${serviceAccountKeyPath}`);
      console.error('   - backend/.env の GOOGLE_SERVICE_ACCOUNT_KEY_PATH を確認してください\n');
    } else {
      console.error(`   ${error.message}\n`);
      if (error.stack) {
        console.error('スタックトレース:');
        console.error(error.stack);
      }
    }
    
    process.exit(1);
  }
}

// スクリプトを実行
testSheetsConnection();
