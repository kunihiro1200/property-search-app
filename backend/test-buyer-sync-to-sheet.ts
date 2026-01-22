/**
 * 買主データのスプレッドシート同期テスト
 * 
 * 使用方法: npx ts-node test-buyer-sync-to-sheet.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';
import { BuyerWriteService } from './src/services/BuyerWriteService';

async function testBuyerSyncToSheet() {
  console.log('=== 買主スプレッドシート同期テスト ===\n');

  // 環境変数チェック
  console.log('1. 環境変数チェック:');
  const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト';
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  
  console.log(`   GOOGLE_SHEETS_BUYER_SPREADSHEET_ID: ${spreadsheetId ? '設定済み (' + spreadsheetId.substring(0, 10) + '...)' : '❌ 未設定'}`);
  console.log(`   GOOGLE_SHEETS_BUYER_SHEET_NAME: ${sheetName}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${serviceAccountKeyPath ? '設定済み (' + serviceAccountKeyPath + ')' : '❌ 未設定'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_EMAIL: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '設定済み' : '未設定（JSONファイルから読み込み）'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: ${process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? '設定済み' : '未設定（JSONファイルから読み込み）'}`);

  if (!spreadsheetId) {
    console.error('\n❌ GOOGLE_SHEETS_BUYER_SPREADSHEET_ID が設定されていません。');
    console.log('\n.env ファイルに以下を追加してください:');
    console.log('GOOGLE_SHEETS_BUYER_SPREADSHEET_ID=your_spreadsheet_id');
    return;
  }

  if (!serviceAccountKeyPath && (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)) {
    console.error('\n❌ Google Service Account の認証情報が設定されていません。');
    console.log('GOOGLE_SERVICE_ACCOUNT_KEY_PATH または GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY を設定してください。');
    return;
  }

  try {
    // GoogleSheetsClient初期化
    console.log('\n2. GoogleSheetsClient 初期化...');
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: spreadsheetId,
      sheetName: sheetName,
      serviceAccountKeyPath: serviceAccountKeyPath,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });
    console.log('   ✓ GoogleSheetsClient 初期化成功');

    // 認証を実行
    console.log('\n2.5. Google Sheets API 認証...');
    await sheetsClient.authenticate();
    console.log('   ✓ 認証成功');

    // BuyerColumnMapper初期化
    console.log('\n3. BuyerColumnMapper 初期化...');
    const columnMapper = new BuyerColumnMapper();
    console.log('   ✓ BuyerColumnMapper 初期化成功');

    // BuyerWriteService初期化
    console.log('\n4. BuyerWriteService 初期化...');
    const writeService = new BuyerWriteService(sheetsClient, columnMapper);
    console.log('   ✓ BuyerWriteService 初期化成功');

    // テスト用の買主番号を指定（実際に存在する買主番号に変更してください）
    const testBuyerNumber = '1'; // 最初の買主
    
    console.log(`\n5. 買主番号 "${testBuyerNumber}" の行を検索...`);
    const rowNumber = await writeService.findRowByBuyerNumber(testBuyerNumber);
    
    if (rowNumber) {
      console.log(`   ✓ 行番号 ${rowNumber} で見つかりました`);
      
      // 現在の値を取得
      console.log('\n6. 現在の行データを取得...');
      const rowData = await writeService.getRowData(testBuyerNumber);
      if (rowData) {
        console.log('   ✓ 行データ取得成功');
        console.log('   サンプルフィールド:');
        const sampleFields = ['買主番号', '氏名', '電話番号', '最新ステータス'];
        for (const field of sampleFields) {
          if (rowData[field] !== undefined) {
            console.log(`     ${field}: ${rowData[field]}`);
          }
        }
      }
      
      // 書き込みテスト（コメントアウト - 実際にテストする場合は有効化）
      // console.log('\n7. テスト書き込み...');
      // const testResult = await writeService.updateField(testBuyerNumber, 'notes', 'テスト書き込み ' + new Date().toISOString());
      // console.log('   書き込み結果:', testResult);
      
    } else {
      console.log(`   ❌ 買主番号 "${testBuyerNumber}" が見つかりませんでした`);
      
      // 最初の数行を読み取って確認
      console.log('\n   スプレッドシートの最初の5行を確認...');
      const rows = await sheetsClient.readRange('1:5');
      console.log(`   ${rows.length} 行読み取り`);
      if (rows.length > 0) {
        console.log('   ヘッダー:', Object.keys(rows[0]).slice(0, 5).join(', '), '...');
        if (rows.length > 1) {
          const buyerNumberColumn = columnMapper.getSpreadsheetColumnName('buyer_number');
          console.log(`   買主番号カラム名: ${buyerNumberColumn}`);
          for (let i = 1; i < Math.min(rows.length, 4); i++) {
            console.log(`   行${i+1}の買主番号: ${rows[i][buyerNumberColumn || '買主番号']}`);
          }
        }
      }
    }

    console.log('\n=== テスト完了 ===');
    
  } catch (error: any) {
    console.error('\n❌ エラー発生:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:', error.stack);
    }
  }
}

testBuyerSyncToSheet();
