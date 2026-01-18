/**
 * AA13424を再同期して反響日付を修正
 * 
 * 修正後のコードで反響日付が正しく同期されるか確認します
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { encrypt } from './src/utils/encryption';

dotenv.config();

async function resyncAA13424WithInquiryDate() {
  console.log('🔄 Re-syncing AA13424 with inquiry date fix...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // スプレッドシートから取得
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const allRows = await sheetsClient.readAll();
    
    const row = allRows.find(r => r['売主番号'] === 'AA13424');
    
    if (!row) {
      console.error('❌ AA13424 not found in spreadsheet');
      return;
    }

    console.log('📊 Spreadsheet Data:');
    console.log('  反響年:', row['反響年']);
    console.log('  反響日:', row['反響日']);
    console.log('  反響日付:', row['反響日付']);  // 正しいカラム名
    console.log('  サイト:', row['サイト']);
    console.log('');

    // 反響日付をフォーマット
    const inquiryYear = row['反響年'];
    const inquiryDate = row['反響日付'];  // 修正: 反響日 → 反響日付
    
    let formattedInquiryDate = null;
    if (inquiryYear && inquiryDate) {
      const year = parseInt(String(inquiryYear), 10);
      const dateStr = String(inquiryDate).trim();
      
      if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
        const [month, day] = dateStr.split('/');
        formattedInquiryDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    console.log('🔄 Formatted inquiry_date:', formattedInquiryDate);
    console.log('');

    // データベースを更新
    const { data: seller, error: fetchError } = await supabase
      .from('sellers')
      .select('id')
      .eq('seller_number', 'AA13424')
      .single();

    if (fetchError || !seller) {
      console.error('❌ Failed to fetch seller:', fetchError?.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        inquiry_year: inquiryYear ? parseInt(String(inquiryYear), 10) : null,
        inquiry_date: formattedInquiryDate,
        inquiry_site: row['サイト'] || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seller.id);

    if (updateError) {
      console.error('❌ Failed to update seller:', updateError.message);
      return;
    }

    console.log('✅ Successfully updated AA13424\n');

    // 確認
    const { data: updated, error: verifyError } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_year, inquiry_date, inquiry_site')
      .eq('seller_number', 'AA13424')
      .single();

    if (verifyError || !updated) {
      console.error('❌ Failed to verify update:', verifyError?.message);
      return;
    }

    console.log('📊 Updated Database Data:');
    console.log('  seller_number:', updated.seller_number);
    console.log('  inquiry_year:', updated.inquiry_year);
    console.log('  inquiry_date:', updated.inquiry_date);
    console.log('  inquiry_site:', updated.inquiry_site);
    console.log('');

    if (updated.inquiry_date) {
      console.log('✅ 反響日付が正しく保存されました！');
      console.log('   フロントエンドで表示されるはずです: ' + new Date(updated.inquiry_date).toLocaleDateString('ja-JP'));
    } else {
      console.log('⚠️  反響日付がまだNULLです');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

resyncAA13424WithInquiryDate();
