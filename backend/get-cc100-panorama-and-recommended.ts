import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function getCC100PanoramaAndRecommended() {
  console.log('=== CC100のパノラマURLとおすすめポイントを取得 ===\n');

  try {
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    // Step 1: 業務依頼シートからCC100のスプシURLを取得
    const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID!;
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: gyomuListSpreadsheetId,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!,
    });

    await gyomuListClient.authenticate();
    console.log('✅ 認証成功\n');

    const allRows = await gyomuListClient.readAll();
    const cc100Row = allRows.find((row: any) => row['物件番号'] === 'CC100');
    
    if (!cc100Row || !cc100Row['スプシURL']) {
      console.log('❌ CC100のスプシURLが見つかりません');
      return;
    }
    
    const spreadsheetUrl = cc100Row['スプシURL'] as string;
    const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      console.log('❌ スプレッドシートIDを抽出できません');
      return;
    }
    
    const individualSpreadsheetId = match[1];
    console.log(`個別スプレッドシートID: ${individualSpreadsheetId}\n`);
    
    // Step 2: 個別スプレッドシートのathomeシートからデータ取得
    const fs = require('fs');
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!);
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // athomeシートのN1セル（パノラマURL）を取得
    const panoramaResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: 'athome!N1',
    });
    
    const panoramaUrl = panoramaResponse.data.values?.[0]?.[0] || null;
    console.log(`パノラマURL (N1): ${panoramaUrl || '(空)'}\n`);
    
    // Step 3: 物件種別を確認
    console.log('Step 3: 物件種別を確認\n');
    const propertyType = cc100Row['種別'] || cc100Row['物件種別'] || null;
    console.log(`物件種別: ${propertyType}\n`);
    
    // Step 4: 物件種別に応じたおすすめポイントの範囲を決定
    let recommendedRange = '';
    if (propertyType === '土地') {
      recommendedRange = 'athome!B63:L79';
      console.log('おすすめポイント範囲: B63:L79（土地）\n');
    } else if (propertyType === '戸建て' || propertyType === '戸建' || propertyType === '戸') {
      recommendedRange = 'athome!B152:L166';
      console.log('おすすめポイント範囲: B152:L166（戸建て）\n');
    } else if (propertyType === 'マンション') {
      recommendedRange = 'athome!B149:L163';
      console.log('おすすめポイント範囲: B149:L163（マンション）\n');
    } else {
      console.log(`⚠️  不明な物件種別: ${propertyType}`);
      console.log('デフォルトで戸建ての範囲を使用します\n');
      recommendedRange = 'athome!B152:L166';
    }
    
    // Step 5: おすすめポイントを取得
    const recommendedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: recommendedRange,
    });
    
    const recommendedRows = recommendedResponse.data.values || [];
    const recommendedComments: string[] = [];
    
    console.log('取得したおすすめポイント:\n');
    for (let i = 0; i < recommendedRows.length; i++) {
      const row = recommendedRows[i];
      // B列からL列まで（11列）を結合
      const comment = row.filter((cell: any) => cell && String(cell).trim().length > 0).join(' ');
      if (comment.trim().length > 0) {
        console.log(`  ${i + 1}. ${comment}`);
        recommendedComments.push(comment);
      }
    }
    
    console.log(`\n合計: ${recommendedComments.length}件のおすすめポイント`);
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

getCC100PanoramaAndRecommended()
  .then(() => {
    console.log('\n✅ 完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
