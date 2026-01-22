/**
 * 訪問フィールドのスプレッドシートカラム名を確認
 * 
 * ユーザー提供情報:
 * - Column 28: 訪問取得日 年/月/日 → visit_acquisition_date
 * - Column 29: 訪問日 Y/M/D → visit_date
 * - Column 30: 訪問査定取得者 → visit_valuation_acquirer
 * - Column 31: 営担 → visit_assignee
 */
import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkVisitFieldColumnNames() {
  console.log('🔍 訪問フィールドのカラム名を確認中...\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();

  // ヘッダー行を取得
  const allRows = await sheetsClient.readAll();
  if (allRows.length === 0) {
    console.log('❌ データが見つかりません');
    return;
  }

  const headers = Object.keys(allRows[0]);
  console.log(`📊 全カラム数: ${headers.length}\n`);

  // 訪問関連のカラムを検索
  console.log('🔍 訪問関連カラムを検索:\n');
  
  const visitRelatedKeywords = ['訪問', '営担', 'visit', 'Visit'];
  const visitColumns: Array<{ index: number; name: string }> = [];

  headers.forEach((header, index) => {
    const matchesKeyword = visitRelatedKeywords.some(keyword => 
      header.includes(keyword)
    );
    
    if (matchesKeyword) {
      visitColumns.push({ index: index + 1, name: header });
    }
  });

  if (visitColumns.length === 0) {
    console.log('❌ 訪問関連カラムが見つかりません');
  } else {
    console.log(`✅ ${visitColumns.length}個の訪問関連カラムが見つかりました:\n`);
    visitColumns.forEach(col => {
      console.log(`   列${col.index}: "${col.name}"`);
      // 特殊文字を表示
      const bytes = Buffer.from(col.name, 'utf8');
      console.log(`        バイト表現: ${bytes.toString('hex')}`);
      console.log(`        文字コード: ${Array.from(col.name).map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
      console.log('');
    });
  }

  // AA13424のデータを確認
  console.log('\n📋 AA13424の訪問フィールドデータ:\n');
  const aa13424Row = allRows.find(row => row['売主番号'] === 'AA13424');
  
  if (aa13424Row) {
    visitColumns.forEach(col => {
      const value = aa13424Row[col.name];
      console.log(`   ${col.name}: ${value || '(空)'}`);
    });
  } else {
    console.log('❌ AA13424が見つかりません');
  }

  // 期待されるカラム名との比較
  console.log('\n\n🎯 期待されるカラム名との比較:\n');
  const expectedColumns = [
    { expected: '訪問取得日 年/月/日', dbField: 'visit_acquisition_date' },
    { expected: '訪問日 Y/M/D', dbField: 'visit_date' },
    { expected: '訪問査定取得者', dbField: 'visit_valuation_acquirer' },
    { expected: '営担', dbField: 'visit_assignee' },
  ];

  expectedColumns.forEach(({ expected, dbField }) => {
    const found = headers.find(h => h.includes(expected.split(' ')[0]));
    if (found) {
      console.log(`✅ ${dbField}:`);
      console.log(`   期待: "${expected}"`);
      console.log(`   実際: "${found}"`);
      console.log(`   一致: ${found === expected ? 'YES' : 'NO'}`);
    } else {
      console.log(`❌ ${dbField}: カラムが見つかりません`);
    }
    console.log('');
  });
}

checkVisitFieldColumnNames()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
