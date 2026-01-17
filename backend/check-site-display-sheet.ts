import { google } from 'googleapis';

// 既存の売主スプレッドシートを使用
const SPREADSHEET_ID = '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';
const SHEET_NAME = 'サイト表示';

async function checkSheetStructure() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // スプレッドシートのメタデータを取得してシート一覧を表示
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    console.log('=== スプレッドシート内のシート一覧 ===');
    if (metadata.data.sheets) {
      metadata.data.sheets.forEach((sheet: any, index: number) => {
        console.log(`${index + 1}. ${sheet.properties?.title}`);
      });
    }

    // 「サイト表示」シートが存在するか確認
    const siteDisplaySheet = metadata.data.sheets?.find(
      (sheet: any) => sheet.properties?.title === SHEET_NAME
    );

    if (!siteDisplaySheet) {
      console.log(`\n「${SHEET_NAME}」シートが見つかりませんでした。`);
      console.log('物件リストのスプレッドシートIDを教えてください。');
      return;
    }

    // ヘッダー行を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });

    console.log(`\n=== ${SHEET_NAME}シートのヘッダー ===`);
    if (response.data.values && response.data.values[0]) {
      response.data.values[0].forEach((header: string, index: number) => {
        console.log(`列${index + 1}: ${header}`);
      });
    }

    // サンプルデータを3行取得
    const sampleResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!2:4`,
    });

    console.log('\n=== サンプルデータ（最初の3行） ===');
    if (sampleResponse.data.values) {
      sampleResponse.data.values.forEach((row: any[], rowIndex: number) => {
        console.log(`\n行${rowIndex + 2}:`);
        row.forEach((cell: any, cellIndex: number) => {
          if (cell) {
            console.log(`  列${cellIndex + 1}: ${cell}`);
          }
        });
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

checkSheetStructure();
