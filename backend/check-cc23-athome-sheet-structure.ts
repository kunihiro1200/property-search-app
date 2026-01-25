// CC23の個別スプシのathomeシート構造を確認
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { GyomuDriveFolderService } from './src/services/GyomuDriveFolderService';

// .envファイルを読み込む
dotenv.config();

async function checkCC23AthomeSheetStructure(propertyNumber: string) {
  try {
    console.log(`\n========================================`);
    console.log(`${propertyNumber}の個別スプシのathomeシート構造を確認`);
    console.log(`========================================\n`);
    
    // ========================================
    // ステップ1: 個別スプシを検索
    // ========================================
    console.log(`[Step 1] 業務依頼フォルダから個別スプシを検索...`);
    
    const gyomuDriveFolderService = new GyomuDriveFolderService();
    const spreadsheetUrl = await gyomuDriveFolderService.findSpreadsheetByPropertyNumber(propertyNumber);
    
    if (!spreadsheetUrl) {
      console.error(`❌ 個別スプシが見つかりませんでした`);
      return;
    }
    
    console.log(`✅ 個別スプシが見つかりました: ${spreadsheetUrl}`);
    
    // スプレッドシートIDを抽出
    const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
      throw new Error('スプレッドシートIDを抽出できませんでした');
    }
    const spreadsheetId = spreadsheetIdMatch[1];
    console.log(`   スプレッドシートID: ${spreadsheetId}`);
    
    // ========================================
    // ステップ2: athomeシートの全データを取得
    // ========================================
    console.log(`\n[Step 2] athomeシートの全データを取得...`);
    
    const individualSheetClient = new GoogleSheetsClient({
      spreadsheetId: spreadsheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    });
    
    await individualSheetClient.authenticate();
    console.log(`✅ 個別スプシ認証成功`);
    
    // A1:Z10の範囲を取得（最初の10行）
    const data = await individualSheetClient.readRange('A1:Z10');
    
    console.log(`\n取得したデータ（最初の10行）:`);
    console.log(`行数: ${data.length}`);
    
    data.forEach((row, index) => {
      console.log(`\n--- 行 ${index + 1} ---`);
      console.log(JSON.stringify(row, null, 2));
    });
    
    // ========================================
    // ステップ3: M列とN列のデータを確認
    // ========================================
    console.log(`\n[Step 3] M列とN列のデータを確認...`);
    
    const mColumnData = await individualSheetClient.readRange('M1:M10');
    const nColumnData = await individualSheetClient.readRange('N1:N10');
    
    console.log(`\nM列のデータ（最初の10行）:`);
    mColumnData.forEach((row, index) => {
      const value = Object.values(row)[0];
      console.log(`  M${index + 1}: ${value || '(empty)'}`);
    });
    
    console.log(`\nN列のデータ（最初の10行）:`);
    nColumnData.forEach((row, index) => {
      const value = Object.values(row)[0];
      console.log(`  N${index + 1}: ${value || '(empty)'}`);
    });
    
    console.log(`\n========================================`);
    console.log(`✅ 確認完了`);
    console.log(`========================================\n`);
    
  } catch (error: any) {
    console.error(`\n❌ エラーが発生しました:`, error);
    console.error(`エラー詳細:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

// CC23のathomeシート構造を確認
checkCC23AthomeSheetStructure('CC23')
  .then(() => {
    console.log('スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
