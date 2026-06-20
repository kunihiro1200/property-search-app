/**
 * AA13407の「こちらの物件について」を物件リストスプレッドシートから確認するスクリプト
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function getGoogleSheetsClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function checkAA13407FromPropertyListSheet() {
  console.log('=== AA13407 物件リストスプレッドシート確認 ===\n');
  
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID;
  
  // ヘッダー行を取得してBQ列の位置を確認
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '物件!1:1',
  });
  
  const headers = headerResponse.data.values?.[0] || [];
  
  // BQ列のインデックスを探す（BQ = 68番目、0-indexed）
  // A=0, B=1, ..., Z=25, AA=26, ..., AZ=51, BA=52, ..., BQ=68
  const bqIndex = 68;
  console.log(`📋 BQ列（インデックス${bqIndex}）のヘッダー: "${headers[bqIndex] || '(空)'}"`);
  
  // 「こちらの物件について」というヘッダーを探す
  const propertyAboutIndex = headers.findIndex((h: string) => 
    h && h.includes('こちらの物件について')
  );
  console.log(`📋 「こちらの物件について」のインデックス: ${propertyAboutIndex}`);
  if (propertyAboutIndex >= 0) {
    console.log(`   ヘッダー名: "${headers[propertyAboutIndex]}"`);
  }
  
  // AA13407の行を探す
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '物件!A:CZ',
  });
  
  const rows = dataResponse.data.values || [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const propertyNumber = row[1]; // B列 = インデックス1
    
    if (propertyNumber === 'AA13407') {
      console.log(`\n📊 AA13407のデータ（行${i + 1}）:`);
      console.log(`  物件番号: ${propertyNumber}`);
      console.log(`  BQ列（インデックス${bqIndex}）: "${row[bqIndex] || '(空)'}"`);
      
      if (propertyAboutIndex >= 0) {
        console.log(`  「こちらの物件について」（インデックス${propertyAboutIndex}）: "${row[propertyAboutIndex] || '(空)'}"`);
      }
      
      // 周辺の列も確認
      console.log(`\n📋 周辺の列（BN〜BT）:`);
      for (let j = 65; j <= 71; j++) {
        const colName = String.fromCharCode(65 + Math.floor(j / 26) - 1) + String.fromCharCode(65 + (j % 26));
        console.log(`  ${colName}列（${j}）: ヘッダー="${headers[j] || '(空)'}", 値="${row[j] || '(空)'}"`);
      }
      
      break;
    }
  }
}

checkAA13407FromPropertyListSheet().catch(console.error);
