// AA13129のスプレッドシートデータを確認
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAA13129() {
  console.log('=== AA13129のスプレッドシートデータ確認 ===\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json'
  });
  
  try {
    // 認証
    await sheetsClient.authenticate();
    
    // スプレッドシートから全データを取得
    const rows = await sheetsClient.readAll();
    
    // AA13129を検索
    const aa13129Row = rows.find((row: any) => 
      row['売主番号'] === 'AA13129' || 
      row['売主番号'] === 'aa13129' ||
      row['売主番号']?.toString().toUpperCase() === 'AA13129'
    );

    if (!aa13129Row) {
      console.error('❌ AA13129がスプレッドシートに見つかりません');
      console.log('\n利用可能な売主番号の例:');
      rows.slice(0, 5).forEach((row: any) => {
        console.log('  -', row['売主番号']);
      });
      return;
    }

    console.log('✅ AA13129のスプレッドシートデータ:');
    console.log('');
    
    console.log('【基本情報】');
    console.log('  売主番号:', aa13129Row['売主番号']);
    console.log('  名前:', aa13129Row['名前(漢字のみ）']);
    console.log('  住所:', aa13129Row['住所']);
    console.log('  市:', aa13129Row['市']);
    console.log('');
    
    console.log('【Google Map URL】');
    console.log('  Google Map URL:', aa13129Row['Google Map URL']);
    console.log('');
    
    console.log('【物件情報】');
    console.log('  物件種別:', aa13129Row['物件種別']);
    console.log('  土地面積:', aa13129Row['土地面積']);
    console.log('  建物面積:', aa13129Row['建物面積']);
    console.log('');
    
    console.log('【ステータス】');
    console.log('  状況（当社）:', aa13129Row['状況（当社）']);
    console.log('  問合日:', aa13129Row['問合日']);
    console.log('');

    // Google Map URLの有無を確認
    if (!aa13129Row['Google Map URL']) {
      console.log('⚠️  Google Map URLが設定されていません');
      console.log('💡 スプレッドシートの「Google Map URL」列にURLを設定してください');
    } else {
      console.log('✅ Google Map URLが設定されています');
    }

    // 市の有無を確認
    if (!aa13129Row['市']) {
      console.log('⚠️  市が設定されていません');
      console.log('💡 スプレッドシートの「市」列に市名を設定してください（例: 大分市）');
    } else {
      console.log('✅ 市が設定されています');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

checkAA13129()
  .then(() => {
    console.log('\n確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nエラー:', error);
    process.exit(1);
  });
