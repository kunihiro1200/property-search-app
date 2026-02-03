import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAA10804FromSheet() {
  console.log('🔍 スプレッドシートからAA10804の配信日を確認中...\n');

  const sheetsClient = new GoogleSheetsClient();
  const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID!;
  const sheetName = '物件';

  try {
    // ヘッダー行を取得
    const headerResponse = await sheetsClient.getSheets().spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const headers = headerResponse.data.values?.[0] || [];
    console.log('📋 ヘッダー行:', headers.slice(0, 20).join(', '), '...\n');

    // 物件番号の列を探す
    const propertyNumberIndex = headers.findIndex((h: string) => h === '物件番号');
    const distributionDateIndex = headers.findIndex((h: string) => h === '配信日【公開）');
    const atbbStatusIndex = headers.findIndex((h: string) => h === 'atbb_status');

    console.log(`📍 物件番号の列: ${propertyNumberIndex} (${String.fromCharCode(65 + propertyNumberIndex)}列)`);
    console.log(`📍 配信日の列: ${distributionDateIndex} (${String.fromCharCode(65 + distributionDateIndex)}列)`);
    console.log(`📍 atbb_statusの列: ${atbbStatusIndex} (${String.fromCharCode(65 + atbbStatusIndex)}列)\n`);

    // AA10804を検索
    const propertyNumberColumn = String.fromCharCode(65 + propertyNumberIndex);
    const searchResponse = await sheetsClient.getSheets().spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${propertyNumberColumn}:${propertyNumberColumn}`,
    });

    const propertyNumbers = searchResponse.data.values || [];
    const aa10804RowIndex = propertyNumbers.findIndex((row: any[]) => row[0] === 'AA10804');

    if (aa10804RowIndex === -1) {
      console.log('❌ AA10804がスプレッドシートに見つかりません');
      return;
    }

    const rowNumber = aa10804RowIndex + 1;
    console.log(`📍 AA10804の行番号: ${rowNumber}\n`);

    // AA10804の行全体を取得
    const rowResponse = await sheetsClient.getSheets().spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${rowNumber}:${rowNumber}`,
    });

    const row = rowResponse.data.values?.[0] || [];

    console.log('📊 AA10804の情報（スプレッドシート）:');
    console.log(`   - 物件番号: ${row[propertyNumberIndex]}`);
    console.log(`   - atbb_status: ${row[atbbStatusIndex]}`);
    console.log(`   - 配信日【公開）: ${row[distributionDateIndex]}`);
    console.log(`   - 配信日の型: ${typeof row[distributionDateIndex]}`);
    console.log(`   - 配信日の生データ: ${JSON.stringify(row[distributionDateIndex])}`);

    // Excelシリアル値の場合は変換
    if (typeof row[distributionDateIndex] === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + row[distributionDateIndex] * 24 * 60 * 60 * 1000);
      console.log(`   - 配信日（変換後）: ${date.toISOString().split('T')[0]}`);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkAA10804FromSheet().catch(console.error);
