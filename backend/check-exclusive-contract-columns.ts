import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkExclusiveContractColumns() {
  console.log('=== 専任媒介関連の列名確認 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('スプレッドシートに接続しました\n');

    const rows = await sheetsClient.readAll();
    
    if (rows.length === 0) {
      console.log('データが見つかりませんでした');
      return;
    }

    // 最初の行から列名を取得
    const firstRow = rows[0];
    const columnNames = Object.keys(firstRow);

    console.log('=== 関連する列名を検索 ===\n');

    // 状況（当社）
    const statusColumns = columnNames.filter(col => col.includes('状況') && col.includes('当社'));
    console.log('「状況（当社）」関連の列名:');
    statusColumns.forEach(col => {
      console.log(`  - "${col}"`);
      console.log(`    文字コード: ${Array.from(col).map(c => c.charCodeAt(0)).join(', ')}`);
    });

    // 営担
    const assigneeColumns = columnNames.filter(col => col.includes('営担'));
    console.log('\n「営担」関連の列名:');
    assigneeColumns.forEach(col => {
      console.log(`  - "${col}"`);
      console.log(`    文字コード: ${Array.from(col).map(c => c.charCodeAt(0)).join(', ')}`);
    });

    // 訪問日
    const visitDateColumns = columnNames.filter(col => col.includes('訪問日'));
    console.log('\n「訪問日」関連の列名:');
    visitDateColumns.forEach(col => {
      console.log(`  - "${col}"`);
      console.log(`    文字コード: ${Array.from(col).map(c => c.charCodeAt(0)).join(', ')}`);
    });

    // 2025年11月のデータで専任媒介を確認
    console.log('\n=== 2025年11月の専任媒介データ確認 ===\n');
    
    const statusCol = statusColumns[0] || '状況（当社）';
    const assigneeCol = assigneeColumns[0] || '営担';
    const visitDateCol = visitDateColumns[0] || '訪問日 Y/M/D';

    console.log(`使用する列名:`);
    console.log(`  状況: "${statusCol}"`);
    console.log(`  営担: "${assigneeCol}"`);
    console.log(`  訪問日: "${visitDateCol}"`);

    const exclusiveRows = rows.filter(row => {
      const status = row[statusCol];
      const assignee = row[assigneeCol];
      const visitDate = row[visitDateCol];
      
      // 専任媒介で、営担が埋まっており、訪問日が2025年11月
      const isExclusive = status && status.includes('専任媒介');
      const hasAssignee = assignee && assignee.trim() !== '';
      const isNov2025 = visitDate && (
        String(visitDate).includes('2025/11/') || 
        String(visitDate).startsWith('11/')
      );

      return isExclusive && hasAssignee && isNov2025;
    });

    console.log(`\n専任媒介（2025年11月）: ${exclusiveRows.length} 件\n`);

    if (exclusiveRows.length > 0) {
      console.log('最初の5件:');
      exclusiveRows.slice(0, 5).forEach((row, index) => {
        console.log(`${index + 1}. 売主番号: ${row['売主番号']}`);
        console.log(`   状況: ${row[statusCol]}`);
        console.log(`   営担: ${row[assigneeCol]}`);
        console.log(`   訪問日: ${row[visitDateCol]}`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

checkExclusiveContractColumns();
