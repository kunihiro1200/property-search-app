/**
 * スタッフ管理スプレッドシートから「通常=TRUE」のスタッフを取得
 */

import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const STAFF_SPREADSHEET_ID = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';

async function checkNormalStaff() {
  console.log('=== スタッフ管理スプレッドシートから「通常」スタッフを取得 ===\n');
  
  try {
    // Google Sheets API認証
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // まずシート名を確認
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: STAFF_SPREADSHEET_ID,
    });
    
    console.log('📋 スプレッドシート情報:');
    console.log(`  タイトル: ${spreadsheet.data.properties?.title}`);
    console.log(`  シート一覧:`);
    spreadsheet.data.sheets?.forEach(sheet => {
      console.log(`    - ${sheet.properties?.title}`);
    });
    console.log('');
    
    // 最初のシートからデータを取得（A:I列）
    const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: STAFF_SPREADSHEET_ID,
      range: `${firstSheetName}!A:I`,
    });
    
    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.log('❌ データが見つかりません');
      return;
    }
    
    // ヘッダー行を確認
    const headers = rows[0];
    console.log('📊 ヘッダー行:');
    headers.forEach((header, index) => {
      const colLetter = String.fromCharCode(65 + index);
      console.log(`  ${colLetter}列: ${header}`);
    });
    console.log('');
    
    // 「通常」カラムのインデックスを特定（I列 = インデックス8）
    const normalColIndex = 8; // I列
    const initialColIndex = 0; // A列（イニシャル）
    const nameColIndex = 1; // B列（名前）
    
    console.log('📊 全スタッフデータ:');
    console.log('-'.repeat(60));
    
    const normalStaff: string[] = [];
    const nonNormalStaff: string[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const initial = row[initialColIndex] || '';
      const name = row[nameColIndex] || '';
      const normalValue = row[normalColIndex] || '';
      
      if (!initial) continue;
      
      // 「通常」の判定（TRUE, ○, 1 などを通常とみなす）
      const isNormal = normalValue === 'TRUE' || 
                       normalValue === '○' || 
                       normalValue === '〇' ||
                       normalValue === '1' ||
                       normalValue === true ||
                       normalValue.toString().toLowerCase() === 'true';
      
      console.log(`  ${initial.padEnd(5)} | ${name.padEnd(10)} | 通常: ${normalValue.toString().padEnd(6)} | ${isNormal ? '✅ 通常' : '❌ 通常外'}`);
      
      if (isNormal) {
        normalStaff.push(initial);
      } else {
        nonNormalStaff.push(initial);
      }
    }
    
    console.log('-'.repeat(60));
    console.log('');
    
    console.log('📊 集計結果:');
    console.log(`  通常スタッフ（${normalStaff.length}名）: ${normalStaff.join(', ')}`);
    console.log(`  通常外スタッフ（${nonNormalStaff.length}名）: ${nonNormalStaff.join(', ')}`);
    console.log('');
    
    // TypeScript配列として出力
    console.log('📝 実装用コード:');
    console.log(`const NORMAL_STAFF_INITIALS = [${normalStaff.map(s => `'${s}'`).join(', ')}];`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkNormalStaff();
