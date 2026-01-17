import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyNovember2025ExclusiveContracts() {
  console.log('=== 2025年11月の専任媒介データを検証 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('スプレッドシートに接続しました\n');

    const rows = await sheetsClient.readAll();
    console.log(`スプレッドシートから ${rows.length} 件のデータを取得しました\n`);

    // 専任媒介の条件:
    // 1. 状況（当社）= "専任媒介"
    // 2. 営担 = 値が入力されている
    // 3. 訪問日 Y/M/D = 2025年11月の日付

    const exclusiveContracts = rows.filter(row => {
      const situation = row['状況（当社）'];
      const assignee = row['営担'];
      const visitDate = row['訪問日 Y/M/D'];

      // 状況が専任媒介
      const isSenninBaibai = situation === '専任媒介';
      
      // 営担が入力されている
      const hasAssignee = assignee && String(assignee).trim() !== '';
      
      // 訪問日が2025年11月
      let isNovember2025 = false;
      if (visitDate) {
        const dateStr = visitDate.toString().trim();
        // 2025/11/XX の形式をチェック
        if (dateStr.startsWith('2025/11/') || dateStr.startsWith('2025/11')) {
          isNovember2025 = true;
        }
      }

      return isSenninBaibai && hasAssignee && isNovember2025;
    });

    console.log(`\n専任媒介の条件に合致するデータ: ${exclusiveContracts.length}件\n`);

    // 詳細を表示
    exclusiveContracts.forEach((row, index) => {
      console.log(`${index + 1}. 売主番号: ${row['売主番号']}`);
      console.log(`   状況（当社）: ${row['状況（当社）']}`);
      console.log(`   営担: ${row['営担']}`);
      console.log(`   訪問日 Y/M/D: ${row['訪問日 Y/M/D']}`);
      console.log('');
    });

    // 営担別の集計
    const assigneeCounts: { [key: string]: number } = {};
    exclusiveContracts.forEach(row => {
      const assignee = row['営担'];
      if (assignee) {
        assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
      }
    });

    console.log('\n=== 営担別の専任媒介件数 ===');
    Object.entries(assigneeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([assignee, count]) => {
        console.log(`${assignee}: ${count}件`);
      });

    // すべての2025年11月の訪問日を持つデータを確認
    console.log('\n\n=== 2025年11月の訪問日を持つすべてのデータ ===');
    const november2025Visits = rows.filter(row => {
      const visitDate = row['訪問日 Y/M/D'];
      if (visitDate) {
        const dateStr = visitDate.toString().trim();
        return dateStr.startsWith('2025/11/');
      }
      return false;
    });

    console.log(`2025年11月の訪問日を持つデータ: ${november2025Visits.length}件\n`);

    november2025Visits.forEach((row, index) => {
      console.log(`${index + 1}. 売主番号: ${row['売主番号']}`);
      console.log(`   状況（当社）: ${row['状況（当社）']}`);
      console.log(`   営担: ${row['営担']}`);
      console.log(`   訪問日 Y/M/D: ${row['訪問日 Y/M/D']}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

verifyNovember2025ExclusiveContracts();
