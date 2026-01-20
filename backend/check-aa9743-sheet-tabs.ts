import dotenv from 'dotenv';
import { google } from 'googleapis';
import { GyomuListService } from './src/services/GyomuListService';

dotenv.config();

async function checkAA9743SheetTabs() {
  console.log('=== AA9743 スプレッドシートのシート名確認 ===\n');

  const propertyNumber = 'AA9743';

  try {
    // 1. 業務リストからスプシURLを取得
    const gyomuListService = new GyomuListService();
    const gyomuData = await gyomuListService.getByPropertyNumber(propertyNumber);

    if (!gyomuData?.spreadsheetUrl) {
      console.log('❌ 業務リストにスプシURLが見つかりません');
      return;
    }

    console.log('✅ スプシURL:', gyomuData.spreadsheetUrl);

    // 2. スプレッドシートIDを抽出
    const spreadsheetIdMatch = gyomuData.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
      console.log('❌ スプレッドシートIDを抽出できません');
      return;
    }

    const spreadsheetId = spreadsheetIdMatch[1];
    console.log('📋 スプレッドシートID:', spreadsheetId);

    // 3. Google Sheets APIで認証
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 4. スプレッドシートのメタデータを取得
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    console.log('\n📑 シート一覧:');
    response.data.sheets?.forEach((sheet, index) => {
      const title = sheet.properties?.title || '';
      console.log(`  ${index + 1}. "${title}" (ID: ${sheet.properties?.sheetId})`);
      
      // athomeに似た名前を強調表示
      if (title.toLowerCase().includes('athome') || title.toLowerCase().includes('at home')) {
        console.log(`     ⭐ これがパノラマURL取得用のシートです！`);
      }
    });

    // 5. athomeシート（またはathome ）のN1セルを試す
    console.log('\n🔍 N1セルの内容を確認:');
    
    const possibleSheetNames = [
      'athome',
      'athome ',
      'Athome',
      'Athome ',
      'ATHOME',
      'ATHOME ',
      'at home',
      'At Home'
    ];

    for (const sheetName of possibleSheetNames) {
      try {
        const cellResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: spreadsheetId,
          range: `${sheetName}!N1`,
        });

        const value = cellResponse.data.values?.[0]?.[0];
        if (value) {
          console.log(`  ✅ シート名: "${sheetName}"`);
          console.log(`     N1セルの値: ${value}`);
          break;
        }
      } catch (error: any) {
        // エラーは無視して次を試す
      }
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkAA9743SheetTabs().catch(console.error);
