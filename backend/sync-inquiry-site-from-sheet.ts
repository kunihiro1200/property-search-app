import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import columnMapping from './src/config/column-mapping.json';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncInquirySiteFromSheet() {
  console.log('📊 スプレッドシートから反響年とサイトを同期します...\n');

  // スプレッドシートクライアントを初期化
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();

  // スプレッドシートからデータを取得
  const rows = await sheetsClient.readAll();
  console.log(`✅ スプレッドシートから${rows.length}行を取得しました\n`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const sellerNumber = row['売主番号'];
    const inquiryYear = row['反響年'];
    const inquirySite = row['サイト'];

    if (!sellerNumber) {
      continue;
    }

    try {
      // データベースで売主を検索
      const { data: seller, error: findError } = await supabase
        .from('sellers')
        .select('id, inquiry_year, inquiry_site')
        .eq('seller_number', sellerNumber)
        .single();

      if (findError || !seller) {
        console.log(`⚠️  ${sellerNumber}: データベースに見つかりません`);
        continue;
      }

      // 更新が必要かチェック
      const needsUpdate = 
        (inquiryYear && seller.inquiry_year !== inquiryYear) ||
        (inquirySite && seller.inquiry_site !== inquirySite);

      if (!needsUpdate) {
        continue;
      }

      // 更新データを準備
      const updates: any = {};
      if (inquiryYear && seller.inquiry_year !== inquiryYear) {
        updates.inquiry_year = inquiryYear;
      }
      if (inquirySite && seller.inquiry_site !== inquirySite) {
        updates.inquiry_site = inquirySite;
      }

      // データベースを更新
      const { error: updateError } = await supabase
        .from('sellers')
        .update(updates)
        .eq('id', seller.id);

      if (updateError) {
        console.error(`❌ ${sellerNumber}: 更新エラー - ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`✅ ${sellerNumber}: 更新しました - ${JSON.stringify(updates)}`);
        updatedCount++;
      }
    } catch (error: any) {
      console.error(`❌ ${sellerNumber}: エラー - ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 同期完了:');
  console.log(`   更新: ${updatedCount}件`);
  console.log(`   エラー: ${errorCount}件`);
}

syncInquirySiteFromSheet()
  .then(() => {
    console.log('\n✅ 同期が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 同期エラー:', error);
    process.exit(1);
  });
