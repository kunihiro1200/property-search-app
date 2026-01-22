import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAllInquiryFields() {
  console.log('🎯 全売主の反響年、サイト、反響日付、コメントを同期します\n');

  // 1. スプレッドシートからデータを取得
  console.log('📊 ステップ1: スプレッドシートからデータを取得...');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();
  
  console.log(`✅ ${rows.length}行のデータを取得しました\n`);

  // 2. 各行を処理
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row['売主番号'];
    
    if (!sellerNumber) {
      skipCount++;
      continue;
    }

    try {
      // データを抽出
      const inquiryYear = row['反響年'];
      const inquirySite = row['サイト'];
      const inquiryDate = row['反響日付'];
      const comments = row['コメント'];

      // 更新するデータを準備
      const updates: any = {};
      if (inquiryYear) updates.inquiry_year = inquiryYear;
      if (inquirySite) updates.inquiry_site = inquirySite;
      if (inquiryDate && typeof inquiryDate === 'string') {
        // 日付を解析（MM/DD形式）
        try {
          const [month, day] = inquiryDate.split('/');
          const year = inquiryYear || new Date().getFullYear();
          updates.inquiry_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch (dateError) {
          console.warn(`⚠️  ${sellerNumber}: 日付の解析に失敗 (${inquiryDate})`);
        }
      }
      if (comments) updates.comments = comments;

      // 更新するデータがない場合はスキップ
      if (Object.keys(updates).length === 0) {
        skipCount++;
        continue;
      }

      // データベースを更新
      const { error: updateError } = await supabase
        .from('sellers')
        .update(updates)
        .eq('seller_number', sellerNumber);

      if (updateError) {
        console.error(`❌ ${sellerNumber}: 更新エラー - ${updateError.message}`);
        errorCount++;
      } else {
        successCount++;
        if ((i + 1) % 100 === 0) {
          console.log(`📊 進捗: ${i + 1}/${rows.length} (成功: ${successCount}, スキップ: ${skipCount}, エラー: ${errorCount})`);
        }
      }
    } catch (error: any) {
      console.error(`❌ ${sellerNumber}: エラー - ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n🎉 同期完了！');
  console.log(`📊 結果:`);
  console.log(`   ✅ 成功: ${successCount}件`);
  console.log(`   ⏭️  スキップ: ${skipCount}件`);
  console.log(`   ❌ エラー: ${errorCount}件`);
  console.log('');
  console.log('次のステップ:');
  console.log('1. ブラウザで売主リストページをリロード（F5）');
  console.log('2. 複数の売主の詳細画面を開いて、データが正しく表示されているか確認');
}

syncAllInquiryFields()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
