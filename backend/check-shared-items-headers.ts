import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function checkHeaders() {
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1BuvYd9cKOdgIAy0XhL-voVx1tiGA-cd6MCU_dYvbAQE',
    sheetName: '共有',
  });

  try {
    console.log('認証中...');
    await sheetsClient.authenticate();

    console.log('\n=== ヘッダー行（1行目）の確認 ===');
    const headers = await sheetsClient.getHeaders();
    console.log('ヘッダー数:', headers.length);
    console.log('ヘッダー一覧:');
    headers.forEach((header, index) => {
      const columnLetter = String.fromCharCode(65 + index); // A, B, C, ...
      console.log(`  ${columnLetter}列: "${header}"`);
    });

    // 重要なカラムの確認
    console.log('\n=== 重要なカラムの確認 ===');
    const importantColumns = ['共有場', '共有日', '共有できていない', '確認日'];
    importantColumns.forEach(col => {
      const index = headers.indexOf(col);
      if (index !== -1) {
        const columnLetter = String.fromCharCode(65 + index);
        console.log(`✅ "${col}" → ${columnLetter}列（${index + 1}番目）`);
      } else {
        console.log(`❌ "${col}" → 見つかりません`);
      }
    });

    // データ行の確認（2行目のみ）
    console.log('\n=== データ行の確認（2行目のみ） ===');
    const rows = await sheetsClient.readAll();
    console.log('データ行数:', rows.length);

    if (rows.length > 0) {
      console.log('\n2行目のデータ:');
      const firstRow = rows[0];
      Object.entries(firstRow).forEach(([key, value]) => {
        console.log(`  "${key}": "${value}"`);
      });
    } else {
      console.log('データが存在しません（2行目以降が空）');
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error('詳細:', error);
  }
}

checkHeaders();
