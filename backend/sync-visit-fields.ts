import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncVisitFields() {
  console.log('=== スプレッドシートから訪問フィールドを同期 ===\n');

  try {
    // Google Sheetsクライアントを初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✓ Google Sheets認証成功\n');

    // スプレッドシートからデータを取得
    const rows = await sheetsClient.readAll();
    console.log(`✓ ${rows.length}件のデータを取得\n`);

    // ColumnMapperを初期化
    const mapper = new ColumnMapper();

    // 訪問日が設定されているデータのみを処理
    let processedCount = 0;
    let updatedCount = 0;

    for (const row of rows) {
      const visitDate = row['訪問日 Y/M/D'];
      const visitTime = row['訪問時間'];
      const sellerNumber = row['売主番号'];

      // 訪問日または訪問時間が設定されている場合のみ処理
      if ((visitDate && visitDate !== '') || (visitTime && visitTime !== '')) {
        processedCount++;

        // データをマッピング
        const mappedData = mapper.mapToDatabase(row);

        // 最初の5件のみ詳細を表示
        if (processedCount <= 5) {
          console.log(`\n${processedCount}. 売主番号: ${sellerNumber}`);
          console.log(`   訪問日 Y/M/D: ${visitDate}`);
          console.log(`   訪問時間: ${visitTime}`);
          console.log(`   営担: ${row['営担']}`);
          console.log(`   訪問査定取得者: ${row['訪問査定取得者']}`);
          console.log(`   → visit_date: ${mappedData.visit_date}`);
          console.log(`   → visit_time: ${mappedData.visit_time}`);
          console.log(`   → visit_assignee: ${mappedData.visit_assignee}`);
          console.log(`   → visit_valuation_acquirer: ${mappedData.visit_valuation_acquirer}`);
        }

        // データベースを更新
        if (sellerNumber) {
          const { error } = await supabase
            .from('sellers')
            .update({
              visit_date: mappedData.visit_date || null,
              visit_time: mappedData.visit_time || null,
              visit_assignee: mappedData.visit_assignee || null,
              visit_valuation_acquirer: mappedData.visit_valuation_acquirer || null,
            })
            .eq('seller_number', sellerNumber);

          if (error) {
            if (processedCount <= 5) {
              console.log(`   ❌ 更新エラー: ${error.message}`);
            }
          } else {
            if (processedCount <= 5) {
              console.log(`   ✓ 更新成功`);
            }
            updatedCount++;
          }
        }

        // 進捗表示（100件ごと）
        if (processedCount % 100 === 0) {
          console.log(`\n... ${processedCount}件処理済み`);
        }
      }
    }

    console.log(`\n=== 同期完了 ===`);
    console.log(`処理件数: ${processedCount}件`);
    console.log(`更新件数: ${updatedCount}件`);

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

syncVisitFields()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
