import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncExclusiveContractsStatus() {
  console.log('=== 専任媒介ステータスの同期 ===\n');

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

    // 2. 専任媒介のデータを抽出
    const exclusiveRows = rows.filter(row => {
      const status = row['状況（当社）'];
      return status && status.includes('専任媒介');
    });

    console.log(`専任媒介のデータ: ${exclusiveRows.length} 件\n`);

    if (exclusiveRows.length === 0) {
      console.log('専任媒介のデータが見つかりませんでした');
      return;
    }

    // 3. データベースを更新
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const row of exclusiveRows) {
      const sellerNumber = row['売主番号'];
      const status = row['状況（当社）'];

      if (!sellerNumber) {
        console.log(`売主番号がありません: ${JSON.stringify(row)}`);
        errorCount++;
        continue;
      }

      // データベースを更新
      const { error } = await supabase
        .from('sellers')
        .update({ status })
        .eq('seller_number', sellerNumber);

      if (error) {
        console.error(`更新エラー (${sellerNumber}):`, error.message);
        errors.push({ sellerNumber, error: error.message });
        errorCount++;
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`進捗: ${successCount} / ${exclusiveRows.length} 件完了`);
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

    // 4. 2025年11月の専任媒介データを確認
    console.log('\n=== 2025年11月の専任媒介件数を確認 ===');
    const startDate = '2025-11-01';
    const endDate = '2025-11-30T23:59:59';

    const { count, error: countError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .eq('status', '専任媒介')
      .not('visit_assignee', 'is', null)
      .neq('visit_assignee', '')
      .gte('visit_date', startDate)
      .lte('visit_date', endDate)
      .not('confidence', 'in', '("D","ダブり")');

    if (countError) {
      console.error('カウントエラー:', countError);
    } else {
      console.log(`専任媒介件数: ${count || 0} 件`);
      console.log(`期待値: 8 件`);
      console.log(`差分: ${8 - (count || 0)} 件`);
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

syncExclusiveContractsStatus();
