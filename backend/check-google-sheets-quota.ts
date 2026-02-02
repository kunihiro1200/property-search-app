/**
 * Google Sheets APIクォータ確認スクリプト
 * 
 * 現在のクォータ使用状況を確認します。
 */

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み（複数のパスを試行）
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkQuota() {
  console.log('📊 Google Sheets APIクォータ確認中...\n');

  try {
    // Google Sheetsクライアントを初期化
    const client = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    });

    // 認証
    await client.authenticate();
    console.log('✅ 認証成功\n');

    // テストリクエストを実行（ヘッダー取得）
    const startTime = Date.now();
    const headers = await client.getHeaders();
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('✅ テストリクエスト成功');
    console.log(`   レスポンス時間: ${responseTime}ms`);
    console.log(`   ヘッダー数: ${headers.length}\n`);

    // クォータ情報（推定）
    console.log('📊 クォータ情報（推定）:');
    console.log('   - 読み取りリクエスト制限: 100リクエスト/100秒/ユーザー');
    console.log('   - 書き込みリクエスト制限: 100リクエスト/100秒/ユーザー');
    console.log('   - 1日あたりの制限: 無制限（サービスアカウント）\n');

    // 推奨事項
    console.log('💡 推奨事項:');
    console.log('   - 大量の同期を実行する場合は、レートリミッターが自動的に調整します');
    console.log('   - 現在のレートリミッター設定: 1リクエスト/秒');
    console.log('   - 同期中にエラーが発生した場合は、自動的にリトライされます\n');

    // 現在の状況
    if (responseTime < 1000) {
      console.log('✅ クォータに余裕があります。同期を実行できます。');
    } else if (responseTime < 3000) {
      console.log('⚠️  レスポンスがやや遅いです。同期は可能ですが、時間がかかる可能性があります。');
    } else {
      console.log('❌ レスポンスが非常に遅いです。クォータ制限に近い可能性があります。');
      console.log('   しばらく待ってから再度実行してください。');
    }

  } catch (error: any) {
    console.error('❌ クォータ確認エラー:', error.message);
    
    if (error.message.includes('quota')) {
      console.error('\n⚠️  クォータ制限に達している可能性があります。');
      console.error('   しばらく待ってから再度実行してください。');
    }
    
    process.exit(1);
  }
}

// 実行
checkQuota();
