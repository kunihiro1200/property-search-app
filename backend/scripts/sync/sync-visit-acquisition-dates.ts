import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function syncVisitAcquisitionDates() {
  try {
    console.log('🔄 訪問取得日を同期します...\n');

    // Supabaseクライアント
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Google Sheetsクライアント
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();

    // スプレッドシートからデータを取得
    console.log('📊 スプレッドシートからデータを取得中...');
    const allData = await sheetsClient.readAll();
    console.log(`   取得件数: ${allData.length}件\n`);

    // 訪問取得日が入っているデータをフィルター
    const dataWithVisitAcquisition = allData.filter(row => {
      const visitAcquisitionDate = row['訪問取得日\n年/月/日'];
      return visitAcquisitionDate && visitAcquisitionDate.trim() !== '';
    });

    console.log(`📝 訪問取得日が入っているデータ: ${dataWithVisitAcquisition.length}件\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log('🔄 同期を開始します...\n');

    for (const row of dataWithVisitAcquisition) {
      const sellerNumber = row['売主番号'];
      const visitAcquisitionDateStr = row['訪問取得日\n年/月/日'];

      if (!sellerNumber) {
        skipCount++;
        continue;
      }

      try {
        // 日付をパース（YYYY/MM/DD形式）
        let visitAcquisitionDate: string | null = null;
        
        if (visitAcquisitionDateStr) {
          // YYYY/MM/DD または YYYY-MM-DD 形式を想定
          const dateStr = visitAcquisitionDateStr.trim();
          const parts = dateStr.split(/[\/\-]/);
          
          if (parts.length === 3) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const day = parseInt(parts[2]);
            
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
              // ISO 8601形式に変換
              visitAcquisitionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          }
        }

        if (!visitAcquisitionDate) {
          console.log(`⚠️ ${sellerNumber}: 日付フォーマットが不正 (${visitAcquisitionDateStr})`);
          errorCount++;
          continue;
        }

        // データベースを更新
        const { error } = await supabase
          .from('sellers')
          .update({ visit_acquisition_date: visitAcquisitionDate })
          .eq('seller_number', sellerNumber);

        if (error) {
          console.error(`❌ ${sellerNumber}: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
          if (successCount % 100 === 0) {
            console.log(`   進捗: ${successCount}件完了...`);
          }
        }

      } catch (error: any) {
        console.error(`❌ ${sellerNumber}: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n=== 同期完了 ===');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`⏭️ スキップ: ${skipCount}件`);
    console.log(`❌ エラー: ${errorCount}件`);

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました');
    console.error('エラーメッセージ:', error.message || '(空)');
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  }
}

syncVisitAcquisitionDates();
