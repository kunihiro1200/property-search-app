import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllDates() {
  console.log('🔄 全ての日付フィールドを修正中...\n');

  try {
    // Initialize Google Sheets client
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const columnMapper = new ColumnMapper();

    // Get all rows from spreadsheet
    console.log('📊 スプレッドシートからデータを取得中...');
    const rows = await sheetsClient.readAll();
    console.log(`✅ ${rows.length} 行のデータを取得しました\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    console.log('🔄 日付フィールドを更新中...\n');

    for (const row of rows) {
      try {
        const sellerNumber = row['売主番号'];

        if (!sellerNumber) {
          skipped++;
          continue;
        }

        // Map spreadsheet data to database format
        const mappedData = columnMapper.mapToDatabase(row);

        // Only update if we have date fields
        if (!mappedData.inquiry_date && !mappedData.next_call_date) {
          skipped++;
          continue;
        }

        // Update database
        const { error: updateError } = await supabase
          .from('sellers')
          .update({
            inquiry_date: mappedData.inquiry_date || null,
            next_call_date: mappedData.next_call_date || null,
          })
          .eq('seller_number', sellerNumber);

        if (updateError) {
          console.error(`❌ ${sellerNumber} の更新エラー:`, updateError.message);
          errors++;
        } else {
          updated++;
          if (updated % 500 === 0) {
            console.log(`  ${updated} 件更新しました...`);
          }
        }
      } catch (error) {
        console.error(`❌ 行の処理エラー:`, error);
        errors++;
      }
    }

    console.log('\n✅ 修正完了！');
    console.log(`📊 サマリー:`);
    console.log(`  - 更新: ${updated} 件`);
    console.log(`  - スキップ: ${skipped} 件`);
    console.log(`  - エラー: ${errors} 件`);

  } catch (error) {
    console.error('❌ 修正失敗:', error);
    throw error;
  }
}

fixAllDates().catch(console.error);
