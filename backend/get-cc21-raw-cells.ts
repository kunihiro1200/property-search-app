import dotenv from 'dotenv';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function getCC21RawCells() {
  console.log('🔍 CC21の生のセルデータを取得中...\n');

  try {
    // サービスアカウント認証
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    
    const auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheetId = '1ydteBGDPxs_20OuL67e6seig9-V43E69djAgm7Vf6sA';
    
    console.log('✅ 認証成功\n');

    // B142セル（お気に入り文言）
    console.log('📋 B142セルを読み取り中...');
    const b142Response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'athome!B142',
    });
    console.log('B142の値:', b142Response.data.values);

    // B143セル（こちらの物件について？）
    console.log('\n📋 B143セルを読み取り中...');
    const b143Response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'athome!B143',
    });
    console.log('B143の値:', b143Response.data.values);

    // B140:B150の範囲
    console.log('\n📋 B140:B150の範囲を読み取り中...');
    const rangeResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'athome!B140:B150',
    });
    console.log('B140:B150の値:');
    if (rangeResponse.data.values) {
      rangeResponse.data.values.forEach((row, i) => {
        console.log(`  B${140 + i}: ${row[0] || '(空)'}`);
      });
    }

    // A142:E143の範囲（周辺のセル）
    console.log('\n📋 A142:E143の範囲を読み取り中...');
    const surroundingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'athome!A142:E143',
    });
    console.log('A142:E143の値:');
    if (surroundingResponse.data.values) {
      surroundingResponse.data.values.forEach((row, i) => {
        console.log(`  行${142 + i}:`, row);
      });
    }

    // より広い範囲を確認（A140:Z150）
    console.log('\n📋 A140:Z150の範囲を読み取り中（生データ）...');
    const wideResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'athome!A140:Z150',
    });
    
    if (wideResponse.data.values) {
      console.log('\n各行の全データ:');
      wideResponse.data.values.forEach((row, i) => {
        const rowNum = 140 + i;
        console.log(`\n行${rowNum}:`);
        row.forEach((cell, j) => {
          if (cell && cell !== '') {
            const colLetter = String.fromCharCode(65 + j); // A=65
            console.log(`  ${colLetter}${rowNum}: ${cell}`);
          }
        });
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

getCC21RawCells().catch(console.error);
