import { config } from 'dotenv';
import { google } from 'googleapis';
import * as path from 'path';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function findLongFields() {
  try {
    console.log('=== 買主6648の50文字を超えるフィールドを検索 ===\n');

    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];

    // データ取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];
    
    const buyerNumberIndex = headers.findIndex(h => h === '買主番号');
    const buyer6648Row = rows.find(row => row[buyerNumberIndex] === '6648');

    if (!buyer6648Row) {
      console.log('買主6648が見つかりません');
      return;
    }

    // マッピング
    const mapper = new BuyerColumnMapper();
    const data = mapper.mapSpreadsheetToDatabase(headers, buyer6648Row);
    
    console.log('50文字を超えるフィールド:\n');
    
    let foundLongFields = false;
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'string' && value.length > 50) {
        console.log(`❌ ${key}: ${value.length}文字`);
        console.log(`   値: "${value.substring(0, 60)}..."`);
        console.log('');
        foundLongFields = true;
      }
    }
    
    if (!foundLongFields) {
      console.log('✅ 50文字を超えるフィールドはありません');
    }
    
    console.log('\n全フィールドの文字数:');
    const sortedFields = Object.entries(data)
      .filter(([_, value]) => value && typeof value === 'string')
      .map(([key, value]) => ({ key, length: (value as string).length }))
      .sort((a, b) => b.length - a.length);
    
    sortedFields.slice(0, 20).forEach(({ key, length }) => {
      console.log(`  ${key}: ${length}文字`);
    });

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

findLongFields();
