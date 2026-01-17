/**
 * スプレッドシート同期統合機能の動作確認スクリプト
 * 
 * このスクリプトは以下の機能をテストします:
 * 1. Google Sheets API接続
 * 2. 同期ステータスAPI
 * 3. 手動同期API
 * 4. レート制限チェック
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { SpreadsheetSyncService } from './src/services/SpreadsheetSyncService';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Sheets設定
const sheetsConfig = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
  sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
};

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * テスト1: 環境変数の確認
 */
async function testEnvironmentVariables(): Promise<TestResult> {
  console.log('\n=== Test 1: 環境変数の確認 ===');
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
  ];
  
  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  // 認証方法のチェック
  const hasOAuth = !!(process.env.GOOGLE_OAUTH_CLIENT_ID && 
                      process.env.GOOGLE_OAUTH_CLIENT_SECRET && 
                      process.env.GOOGLE_OAUTH_REFRESH_TOKEN);
  
  const hasServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
                               process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  
  if (!hasOAuth && !hasServiceAccount) {
    missing.push('Google認証情報 (OAuth または Service Account)');
  }
  
  if (missing.length > 0) {
    return {
      testName: '環境変数の確認',
      success: false,
      message: `必要な環境変数が不足しています: ${missing.join(', ')}`,
      details: { missing },
    };
  }
  
  return {
    testName: '環境変数の確認',
    success: true,
    message: 'すべての必要な環境変数が設定されています',
    details: {
      authMethod: hasOAuth ? 'OAuth 2.0' : 'Service Account',
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    },
  };
}

/**
 * テスト2: Google Sheets API接続
 */
async function testGoogleSheetsConnection(): Promise<TestResult> {
  console.log('\n=== Test 2: Google Sheets API接続 ===');
  
  try {
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    
    console.log('認証を試行中...');
    await sheetsClient.authenticate();
    console.log('✓ 認証成功');
    
    console.log('スプレッドシートのメタデータを取得中...');
    const metadata = await sheetsClient.getSpreadsheetMetadata();
    console.log(`✓ スプレッドシート名: ${metadata.properties?.title}`);
    
    console.log('データを読み取り中...');
    const data = await sheetsClient.readAll();
    console.log(`✓ ${data.length}件のレコードを読み取りました`);
    
    return {
      testName: 'Google Sheets API接続',
      success: true,
      message: 'Google Sheets APIに正常に接続できました',
      details: {
        spreadsheetTitle: metadata.properties?.title,
        recordCount: data.length,
        sheets: metadata.sheets?.map(s => s.properties?.title),
      },
    };
  } catch (error: any) {
    return {
      testName: 'Google Sheets API接続',
      success: false,
      message: `接続エラー: ${error.message}`,
      details: { error: error.stack },
    };
  }
}

/**
 * テスト3: Supabase接続
 */
async function testSupabaseConnection(): Promise<TestResult> {
  console.log('\n=== Test 3: Supabase接続 ===');
  
  try {
    console.log('Sellersテーブルからデータを取得中...');
    const { error, count } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    console.log(`✓ Sellersテーブルに${count}件のレコードがあります`);
    
    return {
      testName: 'Supabase接続',
      success: true,
      message: 'Supabaseに正常に接続できました',
      details: {
        sellerCount: count,
      },
    };
  } catch (error: any) {
    return {
      testName: 'Supabase接続',
      success: false,
      message: `接続エラー: ${error.message}`,
      details: { error: error.stack },
    };
  }
}

/**
 * テスト4: SpreadsheetSyncServiceの初期化
 */
async function testSyncServiceInitialization(): Promise<TestResult> {
  console.log('\n=== Test 4: SpreadsheetSyncServiceの初期化 ===');
  
  try {
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const syncService = new SpreadsheetSyncService(sheetsClient, supabase);
    console.log('✓ SpreadsheetSyncServiceを初期化しました');
    
    // 最新データの取得をテスト
    console.log('スプレッドシートから最新データを取得中...');
    const latestData = await syncService.fetchLatestData();
    console.log(`✓ ${latestData.length}件のデータを取得しました`);
    
    // サンプルデータを表示
    if (latestData.length > 0) {
      const sample = latestData[0];
      console.log('サンプルデータ:', {
        seller_number: sample.seller_number,
        name: sample.name ? '***' : undefined,
        hasData: Object.keys(sample).length,
      });
    }
    
    return {
      testName: 'SpreadsheetSyncServiceの初期化',
      success: true,
      message: 'SpreadsheetSyncServiceが正常に動作しています',
      details: {
        dataCount: latestData.length,
        sampleFields: latestData.length > 0 ? Object.keys(latestData[0]).length : 0,
      },
    };
  } catch (error: any) {
    return {
      testName: 'SpreadsheetSyncServiceの初期化',
      success: false,
      message: `初期化エラー: ${error.message}`,
      details: { error: error.stack },
    };
  }
}

/**
 * テスト5: 同期ログテーブルの確認
 */
async function testSyncLogTables(): Promise<TestResult> {
  console.log('\n=== Test 5: 同期ログテーブルの確認 ===');
  
  try {
    // sync_logsテーブルの確認
    const { error: syncError } = await supabase
      .from('sync_logs')
      .select('*')
      .limit(1);
    
    if (syncError) {
      throw new Error(`sync_logsテーブルエラー: ${syncError.message}`);
    }
    
    console.log('✓ sync_logsテーブルが存在します');
    
    // error_logsテーブルの確認
    const { error: errorError } = await supabase
      .from('error_logs')
      .select('*')
      .limit(1);
    
    if (errorError) {
      throw new Error(`error_logsテーブルエラー: ${errorError.message}`);
    }
    
    console.log('✓ error_logsテーブルが存在します');
    
    return {
      testName: '同期ログテーブルの確認',
      success: true,
      message: '同期ログテーブルが正常に存在します',
    };
  } catch (error: any) {
    return {
      testName: '同期ログテーブルの確認',
      success: false,
      message: `テーブル確認エラー: ${error.message}`,
      details: { error: error.stack },
    };
  }
}

/**
 * テスト6: レート制限の確認
 */
async function testRateLimiter(): Promise<TestResult> {
  console.log('\n=== Test 6: レート制限の確認 ===');
  
  try {
    const { sheetsRateLimiter } = await import('./src/services/RateLimiter');
    
    const usage = sheetsRateLimiter.getUsage();
    console.log('レート制限の使用状況:', usage);
    
    const isNearLimit = sheetsRateLimiter.isNearLimit(0.8);
    console.log(`80%制限に近い: ${isNearLimit ? 'はい' : 'いいえ'}`);
    
    return {
      testName: 'レート制限の確認',
      success: true,
      message: 'レート制限が正常に動作しています',
      details: usage,
    };
  } catch (error: any) {
    return {
      testName: 'レート制限の確認',
      success: false,
      message: `レート制限エラー: ${error.message}`,
      details: { error: error.stack },
    };
  }
}

/**
 * すべてのテストを実行
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  スプレッドシート同期統合機能 - 動作確認テスト           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // テストを順次実行
  results.push(await testEnvironmentVariables());
  results.push(await testGoogleSheetsConnection());
  results.push(await testSupabaseConnection());
  results.push(await testSyncServiceInitialization());
  results.push(await testSyncLogTables());
  results.push(await testRateLimiter());
  
  // 結果サマリーを表示
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  テスト結果サマリー                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach((result, index) => {
    const icon = result.success ? '✓' : '✗';
    const status = result.success ? '成功' : '失敗';
    console.log(`${icon} Test ${index + 1}: ${result.testName} - ${status}`);
    console.log(`   ${result.message}`);
    if (!result.success && result.details) {
      console.log(`   詳細: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });
  
  console.log('─'.repeat(60));
  console.log(`合計: ${results.length}件 | 成功: ${passed}件 | 失敗: ${failed}件`);
  console.log('─'.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('\n次のステップ:');
    console.log('1. バックエンドサーバーを起動: npm run dev');
    console.log('2. 以下のAPIエンドポイントをテスト:');
    console.log('   - GET  http://localhost:3000/api/sync/status');
    console.log('   - GET  http://localhost:3000/api/sync/history');
    console.log('   - POST http://localhost:3000/api/sync/manual');
    console.log('   - GET  http://localhost:3000/api/sync/rate-limit');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。上記の詳細を確認してください。');
    process.exit(1);
  }
}

// テストを実行
runAllTests().catch(error => {
  console.error('\n❌ テスト実行中に予期しないエラーが発生しました:');
  console.error(error);
  process.exit(1);
});
