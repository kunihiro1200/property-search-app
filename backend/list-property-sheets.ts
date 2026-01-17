import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// 環境変数を読み込む
config();

async function listPropertySheets() {
  console.log('=== スプレッドシートのシート一覧を取得 ===\n');

  // 売主リストのスプレッドシートIDを使用
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  console.log('スプレッドシートID:', spreadsheetId);

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: '売主リスト', // ダミー（メタデータ取得には不要）
    serviceAccountKeyPath: 'google-service-account.json'
  });
  
  try {
    // 認証
    await sheetsClient.authenticate();
    console.log('✅ スプレッドシートに接続しました\n');
    
    // スプレッドシートのメタデータを取得
    const metadata = await sheetsClient.getSpreadsheetMetadata();
    
    console.log('📊 スプレッドシート名:', metadata.properties?.title);
    console.log('\n利用可能なシート:');
    
    metadata.sheets?.forEach((sheet, index) => {
      const title = sheet.properties?.title;
      const sheetId = sheet.properties?.sheetId;
      const rowCount = sheet.properties?.gridProperties?.rowCount;
      const columnCount = sheet.properties?.gridProperties?.columnCount;
      
      console.log(`\n${index + 1}. ${title}`);
      console.log(`   シートID: ${sheetId}`);
      console.log(`   行数: ${rowCount}, 列数: ${columnCount}`);
    });
    
    console.log('\n💡 物件データが含まれているシート名を確認してください');
    
  } catch (error: any) {
    console.log('❌ エラー:', error.message);
    console.error(error);
  }
  
  console.log('\n=== 確認完了 ===');
}

listPropertySheets().catch(console.error);
