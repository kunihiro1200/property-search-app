import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkCC21B142B143() {
  console.log('🔍 CC21のB142とB143セルを確認中...\n');

  try {
    const propertySheetId = '1ydteBGDPxs_20OuL67e6seig9-V43E69djAgm7Vf6sA';
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: propertySheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ CC21の個別スプレッドシートに接続しました\n');

    // B142セル（お気に入り文言）
    console.log('📋 B142セルを読み取り中...');
    const b142Data = await sheetsClient.readRange('B142:B142');
    console.log('B142の生データ:', b142Data);
    console.log('B142の値:', b142Data?.[0]?.[0] || '(空)');

    // B143セル（こちらの物件について）
    console.log('\n📋 B143セルを読み取り中...');
    const b143Data = await sheetsClient.readRange('B143:B143');
    console.log('B143の生データ:', b143Data);
    console.log('B143の値:', b143Data?.[0]?.[0] || '(空)');

    // 周辺のセルも確認（A142:C143）
    console.log('\n📋 A142:C143の範囲を読み取り中...');
    const surroundingData = await sheetsClient.readRange('A142:C143');
    console.log('周辺データ:');
    if (surroundingData) {
      surroundingData.forEach((row, i) => {
        console.log(`  行${142 + i}:`, row);
      });
    }

    // B140:B145の範囲も確認
    console.log('\n📋 B140:B145の範囲を読み取り中...');
    const rangeData = await sheetsClient.readRange('B140:B145');
    console.log('B140:B145のデータ:');
    if (rangeData) {
      rangeData.forEach((row, i) => {
        console.log(`  B${140 + i}:`, row[0] || '(空)');
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkCC21B142B143().catch(console.error);
