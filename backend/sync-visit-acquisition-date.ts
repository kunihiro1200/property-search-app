import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncVisitAcquisitionDate() {
  console.log('=== 訪問取得日のデータ同期 ===\n');

  try {
    // 1. スプレッドシートからデータを取得
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('スプレッドシートに接続しました\n');

    const rows = await sheetsClient.readAll();
    console.log(`スプレッドシートから ${rows.length} 件のデータを取得しました\n`);

    // 2. 訪問取得日が存在する行を抽出
    const columnName = '訪問取得日\n年/月/日';
    const rowsWithVisitAcquisition = rows.filter(row => row[columnName]);
    console.log(`訪問取得日が存在する行: ${rowsWithVisitAcquisition.length} 件\n`);

    if (rowsWithVisitAcquisition.length === 0) {
      console.log('訪問取得日のデータが見つかりませんでした');
      return;
    }

    // 3. データベースを更新
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const row of rowsWithVisitAcquisition) {
      const sellerNumber = row['売主番号'];
      const visitAcquisitionDate = row[columnName];

      if (!sellerNumber) {
        console.log(`売主番号がありません: ${JSON.stringify(row)}`);
        errorCount++;
        continue;
      }

      // 日付をパース
      let parsedDate: string | null = null;
      try {
        if (visitAcquisitionDate) {
          const date = new Date(visitAcquisitionDate);
          if (!isNaN(date.getTime())) {
            parsedDate = date.toISOString().split('T')[0];
          }
        }
      } catch (e) {
        console.log(`日付のパースに失敗: ${sellerNumber} - ${visitAcquisitionDate}`);
      }

      if (!parsedDate) {
        errorCount++;
        continue;
      }

      // データベースを更新
      const { error } = await supabase
        .from('sellers')
        .update({ visit_acquisition_date: parsedDate })
        .eq('seller_number', sellerNumber);

      if (error) {
        console.error(`更新エラー (${sellerNumber}):`, error.message);
        errors.push({ sellerNumber, error: error.message });
        errorCount++;
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`進捗: ${successCount} / ${rowsWithVisitAcquisition.length} 件完了`);
        }
      }
    }

    console.log('\n=== 同期完了 ===');
    console.log(`成功: ${successCount} 件`);
    console.log(`エラー: ${errorCount} 件`);

    if (errors.length > 0) {
      console.log('\nエラー詳細:');
      errors.forEach(err => {
        console.log(`- ${err.sellerNumber}: ${err.error}`);
      });
    }

    // 4. 2025年11月のデータを確認
    console.log('\n=== 2025年11月の訪問査定取得数を確認 ===');
    const { count, error: countError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('inquiry_date', '2025-11-01')
      .lt('inquiry_date', '2025-12-01')
      .not('confidence', 'in', '("D","ダブり")')
      .not('visit_acquisition_date', 'is', null);

    if (countError) {
      console.error('カウントエラー:', countError);
    } else {
      console.log(`訪問査定取得数: ${count || 0} 件`);
      console.log(`期待値: 24 件`);
      console.log(`差分: ${24 - (count || 0)} 件`);
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

syncVisitAcquisitionDate();
