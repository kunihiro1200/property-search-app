/**
 * AA13485とAA13486がスプレッドシートに存在するか確認
 */
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// 環境変数を読み込む
dotenv.config({ path: '.env.local' });

async function checkSellersInSheet() {
  try {
    console.log('🔍 Checking if AA13485 and AA13486 exist in spreadsheet...\n');

    // 環境変数を確認
    // 売主リスト専用のスプレッドシートID（ユーザー提供）
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

    console.log(`📋 Using spreadsheet ID: ${spreadsheetId}`);
    console.log(`📋 Using sheet name: ${sheetName}\n`);

    // Google Sheets設定
    const sheetsConfig = {
      spreadsheetId,
      sheetName,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // 全行を取得
    const allRows = await sheetsClient.readAll();
    console.log(`📊 Total rows in spreadsheet: ${allRows.length}\n`);

    // AA13485とAA13486を検索
    const targetSellers = ['AA13485', 'AA13486'];
    const foundSellers: any[] = [];

    for (const row of allRows) {
      const sellerNumber = row['売主番号'];
      if (targetSellers.includes(sellerNumber)) {
        foundSellers.push({
          sellerNumber,
          name: row['氏名'],
          status: row['状況（当社）'],
          nextCallDate: row['次電日'],
          visitDate: row['訪問日 Y/M/D'],
          visitAssignee: row['営担'],
          phoneAssignee: row['電話担当（任意）'],
          pinrich: row['Pinrich'],
          notReachable: row['不通'],
        });
      }
    }

    // 結果を表示
    console.log('='.repeat(80));
    console.log('検索結果');
    console.log('='.repeat(80));

    if (foundSellers.length === 0) {
      console.log('❌ AA13485とAA13486はスプレッドシートに存在しません\n');
      console.log('考えられる原因:');
      console.log('  1. 売主番号が異なる（例: AA14485）');
      console.log('  2. まだスプレッドシートに追加されていない');
      console.log('  3. 削除された');
    } else {
      console.log(`✅ ${foundSellers.length}件の売主が見つかりました\n`);
      
      for (const seller of foundSellers) {
        console.log(`売主番号: ${seller.sellerNumber}`);
        console.log(`  氏名: ${seller.name || '（空）'}`);
        console.log(`  状況（当社）: ${seller.status || '（空）'}`);
        console.log(`  次電日: ${seller.nextCallDate || '（空）'}`);
        console.log(`  訪問日 Y/M/D: ${seller.visitDate || '（空）'}`);
        console.log(`  営担: ${seller.visitAssignee || '（空）'}`);
        console.log(`  電話担当（任意）: ${seller.phoneAssignee || '（空）'}`);
        console.log(`  Pinrich: ${seller.pinrich || '（空）'}`);
        console.log(`  不通: ${seller.notReachable || '（空）'}`);
        console.log('');
      }
    }

    // 売主番号の形式をチェック
    console.log('='.repeat(80));
    console.log('売主番号の形式チェック');
    console.log('='.repeat(80));

    const sellerNumbers = allRows
      .map((row: any) => row['売主番号'])
      .filter((num: any) => num && String(num).startsWith('AA13'))
      .slice(0, 10);

    console.log('AA13で始まる売主番号の例（最初の10件）:');
    sellerNumbers.forEach((num: any) => {
      console.log(`  ${num} (型: ${typeof num})`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSellersInSheet();
