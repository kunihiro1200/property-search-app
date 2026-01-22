import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkSheetHeaders() {
  console.log('🔍 スプレッドシートのヘッダーを確認中...\n');

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

    // すべての行を取得（最初の1行だけでヘッダーを確認）
    const allRows = await sheetsClient.readAll();
    
    if (allRows.length > 0) {
      const firstRow = allRows[0];
      const headers = Object.keys(firstRow);
      
      console.log('📋 スプレッドシートのヘッダー一覧:\n');
      headers.forEach((header, index) => {
        console.log(`${index + 1}. "${header}"`);
      });
      
      console.log(`\n合計: ${headers.length} カラム\n`);
      
      // 不足しているフィールドを確認
      const missingFields = [
        '専任（他決）',
        '決定日',
        '競合',
        '専任・他決要因',
        '競合名、理由',
        '確度',
        '次電日'
      ];
      
      console.log('🔍 不足しているフィールドの確認:\n');
      missingFields.forEach(field => {
        const exists = headers.includes(field);
        console.log(`  ${exists ? '✅' : '❌'} "${field}"`);
      });
      
      // サンプルデータを表示
      console.log('\n📊 サンプルデータ（最初の3行）:\n');
      allRows.slice(0, 3).forEach((row, index) => {
        console.log(`--- 行 ${index + 2} ---`);
        console.log(`売主番号: ${row['売主番号']}`);
        console.log(`名前: ${row['名前(漢字のみ）']}`);
        console.log(`状況（当社）: ${row['状況（当社）']}`);
        console.log(`反響日付: ${row['反響日付']}`);
        console.log(`サイト: ${row['サイト']}`);
        console.log(`確度: ${row['確度']}`);
        console.log(`次電日: ${row['次電日']}`);
        console.log(`決定日: ${row['決定日']}`);
        console.log(`競合: ${row['競合']}`);
        console.log(`専任（他決）: ${row['専任（他決）']}`);
        console.log(`専任・他決要因: ${row['専任・他決要因']}`);
        console.log(`競合名、理由: ${row['競合名、理由']}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkSheetHeaders().catch(console.error);
