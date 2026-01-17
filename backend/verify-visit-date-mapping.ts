import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

async function verifyVisitDateMapping() {
  console.log('=== 訪問日マッピング検証 ===\n');

  try {
    const sheetsClient = new GoogleSheetsClient();
    const columnMapper = new ColumnMapper();

    // スプレッドシートのヘッダーを取得
    const headers = await sheetsClient.getHeaders();
    console.log('スプレッドシートのヘッダー:');
    headers.forEach((header, index) => {
      if (header.includes('訪問')) {
        console.log(`  [${index}] "${header}"`);
        // 改行文字を可視化
        const escaped = header.replace(/\n/g, '\\n');
        console.log(`       エスケープ: "${escaped}"`);
      }
    });

    console.log('\n現在のマッピング設定:');
    const mapping = columnMapper.getMapping();
    Object.entries(mapping.spreadsheetToDatabase).forEach(([key, value]) => {
      if (key.includes('訪問')) {
        const escaped = key.replace(/\n/g, '\\n');
        console.log(`  "${escaped}" -> "${value}"`);
      }
    });

    // 実際のデータを1行取得してマッピングをテスト
    console.log('\n実際のデータでマッピングをテスト:');
    const rows = await sheetsClient.getRows(1, 2); // 最初の1行のみ
    
    if (rows.length > 0) {
      const row = rows[0];
      const mapped = columnMapper.mapSpreadsheetToDatabase(row);
      
      console.log('  元データ:');
      Object.entries(row).forEach(([key, value]) => {
        if (key.includes('訪問')) {
          const escaped = key.replace(/\n/g, '\\n');
          console.log(`    "${escaped}": "${value}"`);
        }
      });
      
      console.log('\n  マッピング後:');
      if (mapped.visit_acquisition_date) {
        console.log(`    visit_acquisition_date: "${mapped.visit_acquisition_date}"`);
      }
      if (mapped.visit_date) {
        console.log(`    visit_date: "${mapped.visit_date}"`);
      }
      if (mapped.visit_assignee) {
        console.log(`    visit_assignee: "${mapped.visit_assignee}"`);
      }
    }

    console.log('\n✅ 検証完了');
  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

verifyVisitDateMapping();
