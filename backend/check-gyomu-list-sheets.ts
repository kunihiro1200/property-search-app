/**
 * 業務リストスプレッドシートのシート一覧を確認するスクリプト
 * 
 * 実行方法:
 * cd backend
 * npx ts-node check-gyomu-list-sheets.ts
 */

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';

dotenv.config();

async function checkSheets() {
  console.log('=== 業務リストスプレッドシート シート一覧確認 ===\n');
  
  const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
  
  if (!spreadsheetId) {
    console.error('エラー: GYOMU_LIST_SPREADSHEET_ID が設定されていません');
    return;
  }
  
  console.log(`スプレッドシートID: ${spreadsheetId}\n`);
  
  try {
    const client = new GoogleSheetsClient({
      spreadsheetId,
      sheetName: 'athome', // 初期化用（実際には使わない）
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    });
    
    await client.authenticate();
    console.log('✓ 認証成功\n');
    
    const metadata = await client.getSpreadsheetMetadata();
    
    if (!metadata.sheets || metadata.sheets.length === 0) {
      console.log('シートが見つかりませんでした');
      return;
    }
    
    console.log(`シート数: ${metadata.sheets.length}\n`);
    console.log('シート一覧:');
    console.log('─'.repeat(60));
    
    metadata.sheets.forEach((sheet, index) => {
      const title = sheet.properties?.title || '(名前なし)';
      const sheetId = sheet.properties?.sheetId || 'N/A';
      const rowCount = sheet.properties?.gridProperties?.rowCount || 0;
      const colCount = sheet.properties?.gridProperties?.columnCount || 0;
      
      console.log(`${index + 1}. ${title}`);
      console.log(`   ID: ${sheetId}`);
      console.log(`   サイズ: ${rowCount}行 × ${colCount}列`);
      
      // AA13129を含むシート名を強調表示
      if (title.includes('AA13129') || title.includes('13129')) {
        console.log('   ★ AA13129関連のシートです！');
      }
      
      console.log('');
    });
    
    console.log('─'.repeat(60));
    
    // AA13129を含むシートを検索
    const aa13129Sheets = metadata.sheets.filter(sheet => {
      const title = sheet.properties?.title || '';
      return title.includes('AA13129') || title.includes('13129');
    });
    
    if (aa13129Sheets.length > 0) {
      console.log('\n✓ AA13129関連のシートが見つかりました:');
      aa13129Sheets.forEach(sheet => {
        console.log(`  - ${sheet.properties?.title}`);
      });
    } else {
      console.log('\n✗ AA13129関連のシートは見つかりませんでした');
      console.log('\n確認事項:');
      console.log('1. スプレッドシート内に「AA13129」という名前のシートが存在するか');
      console.log('2. シート名が正確に一致しているか（大文字小文字、スペースなど）');
      console.log('3. 「athome」スプレッドシートではなく、別のスプレッドシートを参照していないか');
    }
    
  } catch (error: any) {
    console.error('\nエラー:', error.message);
    console.log('\n考えられる原因:');
    console.log('1. スプレッドシートIDが正しくない');
    console.log('2. サービスアカウントがスプレッドシートにアクセスできない');
    console.log('3. サービスアカウントキーファイルが正しくない');
  }
}

checkSheets()
  .then(() => {
    console.log('\nスクリプト終了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n予期しないエラー:', error);
    process.exit(1);
  });
