import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkSheetStatus() {
  console.log('🔍 スプレッドシートの状況（当社）フィールドを確認中...\n');

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!;

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName,
    serviceAccountKeyPath,
  });

  try {
    // 認証
    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    // すべての行を取得
    const allRows = await sheetsClient.readAll();
    
    console.log(`📊 合計 ${allRows.length} 行のデータを取得しました\n`);

    // 最初の10行の状況（当社）フィールドを表示
    console.log('最初の10行の状況（当社）フィールド:\n');
    allRows.slice(0, 10).forEach((row, index) => {
      const sellerNumber = row['売主番号'];
      const name = row['名前(漢字のみ）'];
      const status = row['状況（当社）'];
      
      console.log(`行 ${index + 2}:`);
      console.log(`  売主番号: ${sellerNumber}`);
      console.log(`  名前: ${name}`);
      console.log(`  状況（当社）: "${status}"`);
      console.log('---');
    });

    // 「専任媒介」を含む行を検索
    console.log('\n「専任媒介」を含む行を検索中...\n');
    const exclusiveRows = allRows.filter(row => {
      const status = row['状況（当社）'];
      return status && String(status).includes('専任媒介');
    });

    if (exclusiveRows.length > 0) {
      console.log(`「専任媒介」を含む行が ${exclusiveRows.length} 件見つかりました:\n`);
      exclusiveRows.slice(0, 5).forEach((row) => {
        console.log(`売主番号: ${row['売主番号']}`);
        console.log(`名前: ${row['名前(漢字のみ）']}`);
        console.log(`状況（当社）: "${row['状況（当社）']}"`);
        console.log('---');
      });
    } else {
      console.log('「専任媒介」を含む行が見つかりませんでした');
    }

    // すべてのユニークな状況（当社）の値を表示
    console.log('\nすべてのユニークな状況（当社）の値:\n');
    const uniqueStatuses = new Set<string>();
    allRows.forEach(row => {
      const status = row['状況（当社）'];
      if (status) {
        uniqueStatuses.add(String(status));
      }
    });
    
    Array.from(uniqueStatuses).sort().forEach(status => {
      const count = allRows.filter(row => row['状況（当社）'] === status).length;
      console.log(`  "${status}": ${count}件`);
    });

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkSheetStatus().catch(console.error);
