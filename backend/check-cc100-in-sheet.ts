import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkCC100InSheet() {
  console.log('=== CC100のスプレッドシート確認 ===\n');

  try {
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    // 物件リストのスプレッドシートID（業務リスト）
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

    // 全行を取得
    const allRows = await sheetsClient.readAll();
    console.log(`📊 スプレッドシート総行数: ${allRows.length}\n`);

    // CC100を検索
    const cc100Row = allRows.find(row => row['物件番号'] === 'CC100');

    if (cc100Row) {
      console.log('✅ CC100が見つかりました:');
      console.log('   物件番号:', cc100Row['物件番号']);
      console.log('   売主番号:', cc100Row['売主番号']);
      console.log('   住所:', cc100Row['住所']);
      console.log('   価格:', cc100Row['価格']);
      console.log('   物件種別:', cc100Row['物件種別']);
      console.log('\n   全データ:');
      console.log(JSON.stringify(cc100Row, null, 2));
    } else {
      console.log('❌ CC100が見つかりません');
      console.log('\n最近追加された物件（最新10件）:');
      const recentRows = allRows.slice(-10);
      recentRows.forEach((row, index) => {
        console.log(`   ${allRows.length - 10 + index + 1}. ${row['物件番号']}`);
      });
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  }
}

checkCC100InSheet()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
