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
    
    // 全データを読み取る
    const allRows = await sheetsClient.readAll();
    
    console.log(`📊 Total rows: ${allRows.length}\n`);
    
    // 最初の行（ヘッダー行の次）を確認
    if (allRows.length > 0) {
      const firstRow = allRows[0];
      
      // athome_data関連
      console.log('   athome_data:');
      // ヘッダーを確認してB列に対応するキーを探す
      const keys = Object.keys(firstRow);
      console.log(`   Available keys: ${keys.slice(0, 10).join(', ')}...`);
      
      // B1, B2に対応するデータを探す
      // スプレッドシートの構造によって異なるため、全てのキーを表示
      for (const key of keys) {
        if (firstRow[key]) {
          console.log(`   ${key}: ${String(firstRow[key]).substring(0, 100)}`);
        }
      }
    } else {
      console.log('   ⚠️  No data rows found in CC100 sheet');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.message.includes('Quota exceeded')) {
      console.error('\n⚠️  Google Sheets APIのクォータを超過しました。');
      console.error('   5-10分待ってから再度実行してください。');
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
