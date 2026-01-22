import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

/**
 * スプレッドシートの構造を確認するデバッグスクリプト
 */
async function main() {
  console.log('📋 スプレッドシート構造確認');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Google Sheets クライアントを初期化
    console.log('🔧 Google Sheets クライアントを初期化中...');
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    });

    await sheetsClient.authenticate();
    console.log('✅ 認証成功\n');

    // ヘッダー行を取得
    console.log('📖 ヘッダー行を取得中...');
    const headers = await (sheetsClient as any).getHeaders();
    console.log('✅ ヘッダー行:');
    headers.forEach((header: string, index: number) => {
      console.log(`   [${index}] "${header}"`);
    });
    console.log('');

    // 最初の5行のデータを取得
    console.log('📖 最初の5行のデータを取得中...');
    const rows = await sheetsClient.readAll();
    console.log(`✅ 総行数: ${rows.length}\n`);

    console.log('最初の5行のサンプルデータ:');
    rows.slice(0, 5).forEach((row, index) => {
      console.log(`\n--- 行 ${index + 2} ---`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });

    // 「氏名」フィールドの統計
    console.log('\n\n📊 「氏名」フィールドの統計:');
    const nameField = '氏名';
    const totalRows = rows.length;
    const emptyNames = rows.filter(row => !row[nameField] || row[nameField] === '').length;
    const nonEmptyNames = totalRows - emptyNames;

    console.log(`  総行数: ${totalRows}`);
    console.log(`  空の「氏名」: ${emptyNames} (${((emptyNames / totalRows) * 100).toFixed(2)}%)`);
    console.log(`  データありの「氏名」: ${nonEmptyNames} (${((nonEmptyNames / totalRows) * 100).toFixed(2)}%)`);

    if (nonEmptyNames > 0) {
      console.log('\n  「氏名」データありのサンプル (最初の5件):');
      rows
        .filter(row => row[nameField] && row[nameField] !== '')
        .slice(0, 5)
        .forEach((row, index) => {
          console.log(`    ${index + 1}. ${row[nameField]}`);
        });
    }

    // すべてのフィールドの空データ統計
    console.log('\n\n📊 各フィールドの空データ統計:');
    const fieldStats: Record<string, number> = {};
    headers.forEach((header: string) => {
      const emptyCount = rows.filter(row => !row[header] || row[header] === '').length;
      fieldStats[header] = emptyCount;
    });

    Object.entries(fieldStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([field, count]) => {
        const percentage = ((count / totalRows) * 100).toFixed(2);
        console.log(`  ${field}: ${count}/${totalRows} (${percentage}%)`);
      });

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
