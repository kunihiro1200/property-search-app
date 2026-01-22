/**
 * 全売主の反響日付を修正
 * スプレッドシートの「反響日付」と「反響年」を正しく結合
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { config } from 'dotenv';

config();

/**
 * 反響日付と反響年を結合してYYYY-MM-DD形式の日付を生成
 */
function combineInquiryDateAndYear(inquiryDate: any, inquiryYear: any): string | null {
  if (!inquiryDate || inquiryDate === '') {
    return null;
  }

  const dateStr = String(inquiryDate).trim();
  const yearStr = inquiryYear ? String(inquiryYear).trim() : null;

  // 既にYYYY/MM/DD形式の場合
  if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
    const [year, month, day] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 既にYYYY-MM-DD形式の場合
  if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD形式の場合、反響年と結合
  if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
    if (!yearStr) {
      return null;
    }
    const [month, day] = dateStr.split('/');
    return `${yearStr}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

async function fixAllInquiryDates() {
  console.log('🔧 Fixing all inquiry dates with year...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // スプレッドシートから全データを取得
  console.log('📄 Reading spreadsheet...');
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();
  const allRows = await sheetsClient.readAll();
  
  console.log(`✅ Read ${allRows.length} rows from spreadsheet\n`);

  // 修正が必要な売主を検出
  const toUpdate: Array<{ sellerNumber: string; inquiryDate: string; inquiryYear: string }> = [];
  
  for (const row of allRows) {
    const sellerNumber = row['売主番号'];
    if (!sellerNumber || !String(sellerNumber).startsWith('AA')) {
      continue;
    }

    const inquiryDateValue = row['反響日付'];
    const inquiryYearValue = row['反響年'];
    
    // MM/DD形式で反響年がある場合のみ処理
    if (inquiryDateValue && inquiryYearValue) {
      const dateStr = String(inquiryDateValue).trim();
      const yearStr = String(inquiryYearValue).trim();
      
      // MM/DD形式の場合
      if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
        const combinedDate = combineInquiryDateAndYear(inquiryDateValue, inquiryYearValue);
        if (combinedDate) {
          toUpdate.push({
            sellerNumber: String(sellerNumber),
            inquiryDate: combinedDate,
            inquiryYear: yearStr,
          });
        }
      }
    }
  }

  console.log(`🔍 Found ${toUpdate.length} sellers to update\n`);

  if (toUpdate.length === 0) {
    console.log('✅ No updates needed');
    process.exit(0);
  }

  // 最初の10件を表示
  console.log('📋 First 10 sellers to update:');
  toUpdate.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.sellerNumber}: ${item.inquiryDate} (年: ${item.inquiryYear})`);
  });
  if (toUpdate.length > 10) {
    console.log(`  ... and ${toUpdate.length - 10} more`);
  }

  // 更新を実行
  console.log('\n🔄 Updating...');
  let successCount = 0;
  let errorCount = 0;

  for (const item of toUpdate) {
    const { error } = await supabase
      .from('sellers')
      .update({
        inquiry_date: item.inquiryDate,
        inquiry_year: item.inquiryYear,
      })
      .eq('seller_number', item.sellerNumber);

    if (error) {
      console.error(`❌ ${item.sellerNumber}: ${error.message}`);
      errorCount++;
    } else {
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`  ✅ Updated ${successCount}/${toUpdate.length}...`);
      }
    }
  }

  console.log(`\n🎉 Update complete!`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  
  process.exit(0);
}

fixAllInquiryDates().catch(console.error);
