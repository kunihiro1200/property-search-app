import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDateParsing() {
  console.log('🔍 日付パースのテスト...\n');

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

    // Get AA12903 from spreadsheet
    console.log('📊 スプレッドシートからAA12903を取得中...');
    const allRows = await sheetsClient.readAll();
    const sheetRow = allRows.find(row => row['売主番号'] === 'AA12903');

    if (!sheetRow) {
      console.error('❌ AA12903が見つかりません');
      return;
    }

    console.log('\n=== スプレッドシートの生データ ===');
    console.log(`反響日付: "${sheetRow['反響日付']}"`);
    console.log(`次電日: "${sheetRow['次電日']}"`);

    // Map to database format
    const mappedData = columnMapper.mapToDatabase(sheetRow);

    console.log('\n=== マッピング後のデータ ===');
    console.log(`反響日付: "${mappedData.inquiry_date}"`);
    console.log(`次電日: "${mappedData.next_call_date}"`);

    // Update database
    console.log('\n🔄 データベースを更新中...');
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        inquiry_date: mappedData.inquiry_date || null,
        next_call_date: mappedData.next_call_date || null,
      })
      .eq('seller_number', 'AA12903');

    if (updateError) {
      console.error('❌ 更新エラー:', updateError.message);
      return;
    }

    console.log('✅ 更新完了！');

    // Verify
    console.log('\n🔍 更新後の確認...');
    const { data: seller } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date, next_call_date')
      .eq('seller_number', 'AA12903')
      .single();

    if (seller) {
      console.log('\n=== データベースの更新後データ ===');
      console.log(`反響日付: "${seller.inquiry_date}"`);
      console.log(`次電日: "${seller.next_call_date}"`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testDateParsing().catch(console.error);
