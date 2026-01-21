import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function findCC21ActualData() {
  console.log('🔍 CC21の実際のデータを検索中...\n');

  try {
    const propertySheetId = '1ydteBGDPxs_20OuL67e6seig9-V43E69djAgm7Vf6sA';
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: propertySheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ CC21の個別スプレッドシートに接続しました\n');

    // 行142の全カラムを読み取り（A-Z列）
    console.log('📋 行142の全データを読み取り中...');
    const row142Data = await sheetsClient.readRange('A142:Z142');
    console.log('行142のデータ:', JSON.stringify(row142Data, null, 2));

    // 行143の全カラムを読み取り
    console.log('\n📋 行143の全データを読み取り中...');
    const row143Data = await sheetsClient.readRange('A143:Z143');
    console.log('行143のデータ:', JSON.stringify(row143Data, null, 2));

    // 「仲介手数料」を含むセルを検索（お気に入り文言の可能性）
    console.log('\n\n🔍 「仲介手数料」を含むセルを検索中...');
    const wideRangeData = await sheetsClient.readRange('A140:Z150');
    
    if (wideRangeData && Array.isArray(wideRangeData)) {
      wideRangeData.forEach((row, i) => {
        const rowNum = 140 + i;
        if (row && typeof row === 'object') {
          Object.entries(row).forEach(([key, value]) => {
            if (value && typeof value === 'string' && value.includes('仲介手数料')) {
              console.log(`\n行${rowNum}で見つかりました:`);
              console.log(`  カラム名: ${key}`);
              console.log(`  値: ${value}`);
            }
          });
        }
      });
    }

    // 「中古＋新築」を含むセルを検索（お気に入り文言ラベルの可能性）
    console.log('\n\n🔍 「中古＋新築」を含むセルを検索中...');
    if (wideRangeData && Array.isArray(wideRangeData)) {
      wideRangeData.forEach((row, i) => {
        const rowNum = 140 + i;
        if (row && typeof row === 'object') {
          Object.entries(row).forEach(([key, value]) => {
            if (value && typeof value === 'string' && value.includes('中古＋新築')) {
              console.log(`\n行${rowNum}で見つかりました:`);
              console.log(`  カラム名: ${key}`);
              console.log(`  値: ${value}`);
            }
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

findCC21ActualData().catch(console.error);
