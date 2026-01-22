/**
 * スプレッドシートのシート名確認スクリプト
 */

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSheetNames(): Promise<void> {
  try {
    // テスト用のスプレッドシートID
    const testSpreadsheetId = '1PUTQXeuvnfj17XPTzHOWI_oDDvoErMCNA31L3dAlSCI';
    
    console.log('スプレッドシートのシート名を確認中...\n');
    console.log(`スプレッドシートID: ${testSpreadsheetId}\n`);
    
    const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    
    const client = new GoogleSheetsClient({
      spreadsheetId: testSpreadsheetId,
      sheetName: 'athome', // 仮のシート名
      serviceAccountKeyPath,
    });
    
    await client.authenticate();
    
    // スプレッドシートのメタデータを取得
    const sheets = (client as any).sheets;
    const response = await sheets.spreadsheets.get({
      spreadsheetId: testSpreadsheetId,
    });
    
    const sheetList = response.data.sheets;
    
    console.log('='.repeat(80));
    console.log('利用可能なシート一覧:');
    console.log('='.repeat(80));
    console.log('');
    
    for (const sheet of sheetList) {
      const title = sheet.properties.title;
      const sheetId = sheet.properties.sheetId;
      const index = sheet.properties.index;
      
      console.log(`${index + 1}. シート名: "${title}"`);
      console.log(`   シートID: ${sheetId}`);
      
      // 'athome'に似た名前かチェック
      if (title.toLowerCase().includes('athome') || title.toLowerCase().includes('at home')) {
        console.log(`   ⭐ 'athome'に関連するシート名です`);
      }
      
      console.log('');
    }
    
    console.log('='.repeat(80));
    console.log('推奨事項:');
    console.log('='.repeat(80));
    console.log('');
    
    const athomeSheet = sheetList.find((s: any) => 
      s.properties.title.toLowerCase() === 'athome' ||
      s.properties.title.toLowerCase() === 'at home'
    );
    
    if (athomeSheet) {
      console.log(`✅ 'athome'シートが見つかりました: "${athomeSheet.properties.title}"`);
    } else {
      console.log(`❌ 'athome'という名前のシートが見つかりませんでした`);
      console.log('');
      console.log('対応方法:');
      console.log('  1. 正しいシート名を確認してください');
      console.log('  2. FavoriteCommentServiceとRecommendedCommentServiceのsheetName設定を更新してください');
    }
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
    if (error.response?.data) {
      console.error('詳細:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkSheetNames();
