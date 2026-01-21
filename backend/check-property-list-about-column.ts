import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkPropertyListAboutColumn() {
  console.log('🔍 物件リストスプレッドシートの「こちらの物件について」カラムを確認中...\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ 物件リストスプレッドシートに接続しました\n');

    // CC21の行を検索
    console.log('📋 CC21の行を検索中...');
    const rowIndex = await sheetsClient.findRowByColumn('物件番号', 'CC21');
    console.log(`CC21の行番号: ${rowIndex}`);

    if (!rowIndex) {
      console.log('❌ CC21が見つかりませんでした');
      return;
    }

    // CC21の行の全データを取得
    console.log('\n📋 CC21の行の全データを取得中...');
    const rowData = await sheetsClient.readRange(`A${rowIndex}:ZZ${rowIndex}`);
    
    if (rowData && rowData.length > 0) {
      const data = rowData[0];
      console.log('\n利用可能なカラム名:');
      Object.keys(data).forEach((key, index) => {
        if (key && key.trim() !== '') {
          console.log(`  ${index + 1}. ${key}`);
        }
      });

      // 「こちらの物件について」に関連するカラムを検索
      console.log('\n\n🔍 「こちらの物件について」に関連するカラムを検索:');
      Object.entries(data).forEach(([key, value]) => {
        if (key && (
          key.includes('こちらの物件について') ||
          key.includes('物件について') ||
          key.includes('内覧前') ||
          key.includes('伝達事項') ||
          key.includes('●')
        )) {
          console.log(`\nカラム名: ${key}`);
          console.log(`値: ${value || '(空)'}`);
        }
      });

      // CC21の「●内覧前伝達事項」カラムの値を確認
      console.log('\n\n📋 「●内覧前伝達事項」カラムの値:');
      const aboutValue = data['●内覧前伝達事項'];
      console.log(aboutValue || '(空)');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkPropertyListAboutColumn().catch(console.error);
