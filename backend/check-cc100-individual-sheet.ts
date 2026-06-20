import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkCC100IndividualSheet() {
  console.log('=== CC100の個別シート確認 ===\n');

  try {
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    // CC100の個別シート
    const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
    const sheetName = 'CC100';
    
    console.log(`スプレッドシートID: ${spreadsheetId}`);
    console.log(`シート名: ${sheetName}\n`);
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ Google Sheets認証成功\n');

    // 特定のセルを読み取る
    console.log('📊 CC100の個別シートデータ:\n');
    
    // N1セル（お気に入り文言）
    const n1Cell = await sheetsClient.readCell('N1');
    console.log(`   N1 (お気に入り文言): ${n1Cell || 'null'}`);
    
    // B142セル（こちらの物件について）
    const b142Cell = await sheetsClient.readCell('B142');
    console.log(`   B142 (こちらの物件について): ${b142Cell || 'null'}`);
    
    // B143-B152セル（おすすめポイント）
    console.log('\n   おすすめポイント (B143-B152):');
    for (let i = 143; i <= 152; i++) {
      const cell = await sheetsClient.readCell(`B${i}`);
      if (cell) {
        console.log(`      B${i}: ${cell}`);
      }
    }
    
    // athome_dataの確認（B1とB2）
    const b1Cell = await sheetsClient.readCell('B1');
    const b2Cell = await sheetsClient.readCell('B2');
    console.log(`\n   athome_data:`);
    console.log(`      B1: ${b1Cell || 'null'}`);
    console.log(`      B2 (パノラマURL): ${b2Cell || 'null'}`);
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  }
}

checkCC100IndividualSheet()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
