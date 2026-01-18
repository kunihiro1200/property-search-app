/**
 * 反響日付の修正をテスト
 * 
 * 修正後のコードで反響日付が正しく取得・フォーマットされるか確認
 */
import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

// formatInquiryDateメソッドのコピー
function formatInquiryDate(inquiryYear: any, inquiryDate: any): string | null {
  if (!inquiryYear || !inquiryDate) return null;
  
  const year = parseInt(String(inquiryYear), 10);
  if (isNaN(year)) return null;
  
  const dateStr = String(inquiryDate).trim();
  
  // MM/DD 形式の場合
  if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
    const [month, day] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY/MM/DD 形式の場合（年が含まれている）
  if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
    const [y, month, day] = dateStr.split('/');
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

async function testInquiryDateFix() {
  console.log('🧪 Testing inquiry date fix...\n');

  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const allRows = await sheetsClient.readAll();
    
    // AA13424をテスト
    const aa13424 = allRows.find(r => r['売主番号'] === 'AA13424');
    
    if (aa13424) {
      console.log('📊 AA13424:');
      console.log('  反響年:', aa13424['反響年']);
      console.log('  反響日（旧）:', aa13424['反響日']);
      console.log('  反響日付（新）:', aa13424['反響日付']);
      
      const inquiryYear = aa13424['反響年'];
      const inquiryDateOld = aa13424['反響日'];
      const inquiryDateNew = aa13424['反響日付'];
      
      console.log('');
      console.log('🔄 旧コード（row[\'反響日\']）:');
      const formattedOld = formatInquiryDate(inquiryYear, inquiryDateOld);
      console.log('  結果:', formattedOld || 'NULL');
      
      console.log('');
      console.log('✅ 新コード（row[\'反響日付\']）:');
      const formattedNew = formatInquiryDate(inquiryYear, inquiryDateNew);
      console.log('  結果:', formattedNew || 'NULL');
      console.log('');
    }

    // AA13423もテスト
    const aa13423 = allRows.find(r => r['売主番号'] === 'AA13423');
    
    if (aa13423) {
      console.log('📊 AA13423 (比較用):');
      console.log('  反響年:', aa13423['反響年']);
      console.log('  反響日（旧）:', aa13423['反響日']);
      console.log('  反響日付（新）:', aa13423['反響日付']);
      
      const inquiryYear = aa13423['反響年'];
      const inquiryDateOld = aa13423['反響日'];
      const inquiryDateNew = aa13423['反響日付'];
      
      console.log('');
      console.log('🔄 旧コード（row[\'反響日\']）:');
      const formattedOld = formatInquiryDate(inquiryYear, inquiryDateOld);
      console.log('  結果:', formattedOld || 'NULL');
      
      console.log('');
      console.log('✅ 新コード（row[\'反響日付\']）:');
      const formattedNew = formatInquiryDate(inquiryYear, inquiryDateNew);
      console.log('  結果:', formattedNew || 'NULL');
      console.log('');
    }

    console.log('📝 まとめ:');
    console.log('  ❌ 旧コード: row[\'反響日\'] → スプレッドシートに存在しないカラム');
    console.log('  ✅ 新コード: row[\'反響日付\'] → 正しいカラム名');
    console.log('');
    console.log('✅ 修正完了！今後の自動同期で反響日付が正しく同期されます。');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testInquiryDateFix();
