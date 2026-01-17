#!/usr/bin/env node
/**
 * スプレッドシート設定検証ツール
 * 
 * 環境変数で定義されたスプレッドシート設定の正当性を検証します。
 * - 環境変数の存在確認
 * - スプレッドシートIDの形式検証
 * - Google Sheets APIアクセス確認
 * - シート名の存在確認
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

// 検証対象の設定
interface SpreadsheetConfig {
  name: string;
  spreadsheetIdEnv: string;
  sheetNameEnv: string;
  defaultSheetName?: string;
}

const CONFIGS: SpreadsheetConfig[] = [
  {
    name: '売主リスト',
    spreadsheetIdEnv: 'SELLER_SPREADSHEET_ID',
    sheetNameEnv: 'SELLER_SHEET_NAME',
    defaultSheetName: '売主リスト'
  },
  {
    name: '物件リスト',
    spreadsheetIdEnv: 'PROPERTY_LISTING_SPREADSHEET_ID',
    sheetNameEnv: 'PROPERTY_LISTING_SHEET_NAME',
    defaultSheetName: '物件リスト'
  },
  {
    name: '買主リスト',
    spreadsheetIdEnv: 'BUYER_SPREADSHEET_ID',
    sheetNameEnv: 'BUYER_SHEET_NAME',
    defaultSheetName: '買主リスト'
  },
  {
    name: '業務リスト',
    spreadsheetIdEnv: 'WORK_TASK_SPREADSHEET_ID',
    sheetNameEnv: 'WORK_TASK_SHEET_NAME',
    defaultSheetName: '業務リスト'
  },
  {
    name: '追客履歴',
    spreadsheetIdEnv: 'FOLLOW_UP_LOG_HISTORY_SPREADSHEET_ID',
    sheetNameEnv: 'FOLLOW_UP_LOG_HISTORY_SHEET_NAME',
    defaultSheetName: '追客履歴'
  }
];

// スプレッドシートIDの形式を検証
function validateSpreadsheetIdFormat(id: string): boolean {
  // Google Sheets IDは通常44文字の英数字とハイフン、アンダースコア
  const pattern = /^[a-zA-Z0-9_-]{40,50}$/;
  return pattern.test(id);
}

// スプレッドシートIDをマスク表示
function maskSpreadsheetId(id: string): string {
  if (id.length <= 8) return '***';
  return `${id.substring(0, 4)}...${id.substring(id.length - 4)}`;
}

// Google Sheets APIクライアントを初期化
async function initializeSheetsClient() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    throw new Error('Google Sheets API認証情報の初期化に失敗しました');
  }
}

// 検証結果の型
interface ValidationResult {
  config: SpreadsheetConfig;
  spreadsheetId?: string;
  sheetName?: string;
  errors: string[];
  warnings: string[];
  success: boolean;
}

// 単一の設定を検証
async function validateConfig(
  config: SpreadsheetConfig,
  sheets: any
): Promise<ValidationResult> {
  const result: ValidationResult = {
    config,
    errors: [],
    warnings: [],
    success: false
  };

  // 1. スプレッドシートIDの環境変数チェック
  const spreadsheetId = process.env[config.spreadsheetIdEnv];
  if (!spreadsheetId) {
    result.errors.push(
      `環境変数 ${config.spreadsheetIdEnv} が設定されていません`
    );
    return result;
  }
  result.spreadsheetId = spreadsheetId;

  // 2. スプレッドシートIDの形式検証
  if (!validateSpreadsheetIdFormat(spreadsheetId)) {
    result.warnings.push(
      'スプレッドシートIDの形式が通常と異なります'
    );
  }

  // 3. シート名の環境変数チェック
  let sheetName = process.env[config.sheetNameEnv];
  if (!sheetName) {
    if (config.defaultSheetName) {
      sheetName = config.defaultSheetName;
      result.warnings.push(
        `環境変数 ${config.sheetNameEnv} が未設定のため、デフォルト値 "${config.defaultSheetName}" を使用します`
      );
    } else {
      result.errors.push(
        `環境変数 ${config.sheetNameEnv} が設定されていません`
      );
      return result;
    }
  }
  result.sheetName = sheetName;

  // 4. Google Sheets APIアクセス確認
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });

    // 5. シート名の存在確認
    const sheetExists = response.data.sheets?.some(
      (sheet: any) => sheet.properties?.title === sheetName
    );

    if (!sheetExists) {
      result.errors.push(
        `シート "${sheetName}" が見つかりません。利用可能なシート: ${
          response.data.sheets?.map((s: any) => s.properties?.title).join(', ') || 'なし'
        }`
      );
      return result;
    }

    result.success = true;
  } catch (error: any) {
    if (error.code === 403) {
      result.errors.push(
        'スプレッドシートへのアクセス権限がありません。サービスアカウントに共有権限を付与してください'
      );
    } else if (error.code === 404) {
      result.errors.push(
        'スプレッドシートが見つかりません。IDが正しいか確認してください'
      );
    } else {
      result.errors.push(
        `APIアクセスエラー: ${error.message}`
      );
    }
  }

  return result;
}

// 結果を表示
function printResult(result: ValidationResult) {
  const icon = result.success ? '✓' : '✗';
  const status = result.success ? 'OK' : 'エラー';
  
  console.log(`\n${icon} ${result.config.name}: ${status}`);
  
  if (result.spreadsheetId) {
    console.log(`  - スプレッドシートID: ${maskSpreadsheetId(result.spreadsheetId)}`);
  }
  
  if (result.sheetName) {
    console.log(`  - シート名: ${result.sheetName}`);
  }
  
  if (result.success) {
    console.log(`  - アクセス: 成功`);
  }
  
  // 警告を表示
  if (result.warnings.length > 0) {
    console.log(`  ⚠ 警告:`);
    result.warnings.forEach(warning => {
      console.log(`    - ${warning}`);
    });
  }
  
  // エラーを表示
  if (result.errors.length > 0) {
    console.log(`  ✗ エラー:`);
    result.errors.forEach(error => {
      console.log(`    - ${error}`);
    });
    console.log(`  修正方法:`);
    
    if (result.errors.some(e => e.includes('環境変数') && e.includes('設定されていません'))) {
      console.log(`    1. .env ファイルに以下を追加してください:`);
      console.log(`       ${result.config.spreadsheetIdEnv}=<スプレッドシートID>`);
      if (!result.sheetName) {
        console.log(`       ${result.config.sheetNameEnv}=<シート名>`);
      }
    }
    
    if (result.errors.some(e => e.includes('アクセス権限'))) {
      console.log(`    1. Google Sheetsでスプレッドシートを開く`);
      console.log(`    2. 右上の「共有」ボタンをクリック`);
      console.log(`    3. サービスアカウントのメールアドレスを追加`);
      console.log(`    4. 「閲覧者」権限を付与`);
    }
    
    if (result.errors.some(e => e.includes('見つかりません'))) {
      console.log(`    1. スプレッドシートIDが正しいか確認してください`);
      console.log(`    2. シート名が正しいか確認してください`);
    }
  }
}

// メイン処理
async function main() {
  console.log('='.repeat(60));
  console.log('スプレッドシート設定検証ツール');
  console.log('='.repeat(60));

  // Google Service Account認証情報の確認
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.error('\n✗ エラー: GOOGLE_SERVICE_ACCOUNT_KEY 環境変数が設定されていません');
    console.error('\n修正方法:');
    console.error('  1. Google Cloud Consoleでサービスアカウントを作成');
    console.error('  2. JSONキーをダウンロード');
    console.error('  3. .env ファイルに以下を追加:');
    console.error('     GOOGLE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account",...}\'');
    process.exit(1);
  }

  let sheets;
  try {
    sheets = await initializeSheetsClient();
  } catch (error: any) {
    console.error(`\n✗ エラー: ${error.message}`);
    console.error('\n修正方法:');
    console.error('  1. GOOGLE_SERVICE_ACCOUNT_KEY の形式が正しいか確認');
    console.error('  2. JSONが有効か確認');
    process.exit(1);
  }

  // 各設定を検証
  const results: ValidationResult[] = [];
  for (const config of CONFIGS) {
    const result = await validateConfig(config, sheets);
    results.push(result);
    printResult(result);
  }

  // サマリーを表示
  console.log('\n' + '='.repeat(60));
  console.log('検証結果サマリー');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n成功: ${successCount}/${totalCount}`);
  console.log(`失敗: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n✓ すべての設定が正常です！');
    process.exit(0);
  } else {
    console.log('\n✗ 一部の設定にエラーがあります。上記の修正方法を参照してください。');
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error: any) => {
  console.error('\n予期しないエラーが発生しました:', error.message);
  process.exit(1);
});

// 実行
main();
