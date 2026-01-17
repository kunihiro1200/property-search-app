import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function checkFromSpreadsheet() {
  console.log('=== スプレッドシートから2025年11月の他決（未訪問）を確認 ===\n');

  try {
    // Google Sheets API setup
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AM`, // A列から AM列（契約年月）まで
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('データが見つかりません');
      return;
    }

    const headers = rows[0];
    console.log('ヘッダー確認:');
    console.log(`  売主番号: ${headers[1]} (列 B)`);
    console.log(`  営担: ${headers[27]} (列 AB)`);
    console.log(`  状況（当社）: ${headers[28]} (列 AC)`);
    console.log(`  確度: ${headers[7]} (列 H)`);
    console.log(`  契約年月: ${headers[38]} (列 AM)\n`);

    // 列インデックス
    const sellerNumberIdx = 1; // B列
    const visitAssigneeIdx = 27; // AB列（営担）
    const statusIdx = 28; // AC列（状況（当社））
    const confidenceIdx = 7; // H列（確度）
    const contractYearMonthIdx = 38; // AM列（契約年月）

    const results: any[] = [];

    // データ行をチェック（ヘッダー行をスキップ）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const sellerNumber = row[sellerNumberIdx] || '';
      const visitAssignee = row[visitAssigneeIdx] || '';
      const status = row[statusIdx] || '';
      const confidence = row[confidenceIdx] || '';
      const contractYearMonth = row[contractYearMonthIdx] || '';

      // 条件チェック:
      // 1. 契約年月が2025年11月
      // 2. 状況に"他決"を含む
      // 3. 営担が空欄
      if (contractYearMonth && status.includes('他決') && !visitAssignee.trim()) {
        // 日付パース
        let contractDate: Date | null = null;
        if (contractYearMonth) {
          // 日付形式: YYYY/MM/DD または YYYY-MM-DD
          const dateStr = contractYearMonth.toString().trim();
          contractDate = new Date(dateStr);
        }

        if (contractDate && !isNaN(contractDate.getTime())) {
          const year = contractDate.getFullYear();
          const month = contractDate.getMonth() + 1; // 0-indexed

          if (year === 2025 && month === 11) {
            results.push({
              rowNumber: i + 1,
              sellerNumber,
              contractYearMonth,
              status,
              visitAssignee: visitAssignee || '(空欄)',
              confidence,
            });
          }
        }
      }
    }

    console.log(`\n2025年11月の他決（未訪問）: ${results.length}件\n`);

    if (results.length > 0) {
      console.log('すべてのレコード:');
      console.log('─'.repeat(100));
      console.log('行 | 売主番号 | 契約年月 | 状況 | 営担 | 確度');
      console.log('─'.repeat(100));

      results.forEach(r => {
        console.log(
          `${r.rowNumber.toString().padStart(4)} | ` +
          `${r.sellerNumber.padEnd(10)} | ` +
          `${r.contractYearMonth.padEnd(10)} | ` +
          `${r.status.padEnd(20)} | ` +
          `${r.visitAssignee.padEnd(6)} | ` +
          `${r.confidence.padEnd(4)}`
        );
      });
      console.log('─'.repeat(100));

      // 確度別集計
      console.log('\n確度別の件数:');
      const confidenceCount = new Map<string, number>();
      results.forEach(r => {
        const conf = r.confidence || '(空欄)';
        confidenceCount.set(conf, (confidenceCount.get(conf) || 0) + 1);
      });

      Array.from(confidenceCount.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([conf, count]) => {
          console.log(`  ${conf}: ${count}件`);
        });

      console.log(`\n期待値: 6件`);
      console.log(`実際: ${results.length}件`);
      if (results.length === 6) {
        console.log('✅ 期待値と一致');
      } else {
        console.log(`⚠️ ${Math.abs(results.length - 6)}件の差異`);
      }
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkFromSpreadsheet();
