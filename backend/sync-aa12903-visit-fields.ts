import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAA12903VisitFields() {
  console.log('=== AA12903の訪問フィールドを同期 ===\n');

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

    // AA12903を検索
    const aa12903Row = rows.find(row => row['売主番号'] === 'AA12903');

    if (!aa12903Row) {
      console.log('❌ AA12903が見つかりませんでした');
      return;
    }

    console.log('=== スプレッドシートのデータ ===');
    console.log('売主番号:', aa12903Row['売主番号']);
    console.log('名前:', aa12903Row['名前(漢字のみ）']);
    console.log('訪問日 Y/M/D:', aa12903Row['訪問日 Y/M/D']);
    console.log('訪問時間:', aa12903Row['訪問時間']);
    console.log('営担:', aa12903Row['営担']);
    console.log('訪問査定取得者:', aa12903Row['訪問査定取得者']);
    console.log('査定担当:', aa12903Row['査定担当']);
    console.log('電話担当（任意）:', aa12903Row['電話担当（任意）']);

    // データをマッピング
    const mappedData = mapper.mapToDatabase(aa12903Row);

    console.log('\n=== マッピング後のデータ ===');
    console.log('visit_date:', mappedData.visit_date);
    console.log('visit_time:', mappedData.visit_time);
    console.log('visit_assignee:', mappedData.visit_assignee);
    console.log('visit_valuation_acquirer:', mappedData.visit_valuation_acquirer);
    console.log('valuation_assignee:', mappedData.valuation_assignee);
    console.log('phone_assignee:', mappedData.phone_assignee);

    // 現在のデータベースの状態を確認
    console.log('\n=== 現在のデータベースの状態 ===');
    const { data: currentData, error: selectError } = await supabase
      .from('sellers')
      .select('id, seller_number, name, appointment_date, visit_date, visit_time, visit_assignee, visit_valuation_acquirer, assigned_to, valuation_assignee, phone_assignee')
      .eq('seller_number', 'AA12903')
      .single();

    if (selectError) {
      console.log('❌ データ取得エラー:', selectError.message);
      return;
    }

    console.log('appointment_date:', currentData.appointment_date);
    console.log('visit_date:', currentData.visit_date);
    console.log('visit_time:', currentData.visit_time);
    console.log('visit_assignee:', currentData.visit_assignee);
    console.log('visit_valuation_acquirer:', currentData.visit_valuation_acquirer);
    console.log('assigned_to:', currentData.assigned_to);
    console.log('valuation_assignee:', currentData.valuation_assignee);
    console.log('phone_assignee:', currentData.phone_assignee);

    // データベースを更新
    console.log('\n=== データベースを更新中 ===');
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        visit_date: mappedData.visit_date || null,
        visit_time: mappedData.visit_time || null,
        visit_assignee: mappedData.visit_assignee || null,
        visit_valuation_acquirer: mappedData.visit_valuation_acquirer || null,
        valuation_assignee: mappedData.valuation_assignee || null,
        phone_assignee: mappedData.phone_assignee || null,
      })
      .eq('seller_number', 'AA12903');

    if (updateError) {
      console.log('❌ 更新エラー:', updateError.message);
      return;
    }

    console.log('✓ 更新成功');

    // 更新後のデータを確認
    console.log('\n=== 更新後のデータベースの状態 ===');
    const { data: updatedData, error: selectError2 } = await supabase
      .from('sellers')
      .select('id, seller_number, name, appointment_date, visit_date, visit_time, visit_assignee, visit_valuation_acquirer, assigned_to, valuation_assignee, phone_assignee')
      .eq('seller_number', 'AA12903')
      .single();

    if (selectError2) {
      console.log('❌ データ取得エラー:', selectError2.message);
      return;
    }

    console.log('appointment_date:', updatedData.appointment_date);
    console.log('visit_date:', updatedData.visit_date);
    console.log('visit_time:', updatedData.visit_time);
    console.log('visit_assignee:', updatedData.visit_assignee);
    console.log('visit_valuation_acquirer:', updatedData.visit_valuation_acquirer);
    console.log('assigned_to:', updatedData.assigned_to);
    console.log('valuation_assignee:', updatedData.valuation_assignee);
    console.log('phone_assignee:', updatedData.phone_assignee);

    console.log('\n=== 同期完了 ===');

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

syncAA12903VisitFields()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
