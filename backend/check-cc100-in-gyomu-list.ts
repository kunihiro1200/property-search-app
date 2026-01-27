import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkCC100InGyomuList() {
  console.log('=== 業務リスト（業務依頼）でCC100を確認 ===\n');

  try {
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    // 業務リスト（業務依頼）シート
    const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
    const sheetName = '業務依頼';
    
    console.log(`スプレッドシートID: ${spreadsheetId}`);
    console.log(`シート名: ${sheetName}\n`);
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ Google Sheets認証成功\n');

    // 全データを読み取る
    console.log('📊 業務リストからCC100を検索中...\n');
    const allRows = await sheetsClient.readAll();
    
    console.log(`📊 Total rows: ${allRows.length}\n`);
    
    // CC100を検索
    const cc100Row = allRows.find((row: any) => row['物件番号'] === 'CC100');
    
    if (cc100Row) {
      console.log('✅ CC100が見つかりました:\n');
      console.log(`   物件番号: ${cc100Row['物件番号']}`);
      console.log(`   物件所在: ${cc100Row['物件所在']}`);
      console.log(`   売主: ${cc100Row['売主']}`);
      console.log(`   格納先URL: ${cc100Row['格納先URL']}`);
      console.log(`   スプシURL: ${cc100Row['スプシURL']}`);
      
      // スプシURLが存在する場合、個別シートのIDを抽出
      if (cc100Row['スプシURL']) {
        const spreadsheetUrl = cc100Row['スプシURL'];
        const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          const individualSpreadsheetId = match[1];
          console.log(`\n   個別スプレッドシートID: ${individualSpreadsheetId}`);
          console.log(`   個別シート名: CC100（推定）`);
        }
      } else {
        console.log('\n   ⚠️  スプシURLが設定されていません');
      }
    } else {
      console.log('❌ CC100が見つかりませんでした');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.message.includes('Quota exceeded')) {
      console.error('\n⚠️  Google Sheets APIのクォータを超過しました。');
      console.error('   5-10分待ってから再度実行してください。');
    }
  }
}

checkCC100InGyomuList()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
