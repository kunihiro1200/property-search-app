import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { SpreadsheetSyncService } from './src/services/SpreadsheetSyncService';

// .envファイルを読み込む（backendディレクトリの.env）
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAA13509ValuationMethod() {
  console.log('🔄 AA13509の査定方法を同期します...');

  try {
    // 1. スプレッドシートから査定方法を取得
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // 全データを取得
    const rows = await sheetsClient.readAll();
    console.log(`📊 スプレッドシートから${rows.length}行を取得しました`);

    // AA13509を検索
    const aa13509Row = rows.find((row: any) => row['売主番号'] === 'AA13509');

    if (!aa13509Row) {
      console.error('❌ AA13509がスプレッドシートに見つかりません');
      return;
    }

    console.log('✅ AA13509を発見:');
    console.log('  売主番号:', aa13509Row['売主番号']);
    console.log('  査定方法:', aa13509Row['査定方法']);

    const valuationMethod = aa13509Row['査定方法'] || null;

    // 2. データベースのAA13509を取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number, valuation_method')
      .eq('seller_number', 'AA13509')
      .single();

    if (sellerError || !seller) {
      console.error('❌ データベースでAA13509が見つかりません:', sellerError);
      return;
    }

    console.log('✅ データベースのAA13509:');
    console.log('  ID:', seller.id);
    console.log('  売主番号:', seller.seller_number);
    console.log('  現在の査定方法:', seller.valuation_method);

    // 3. 査定方法を更新
    if (seller.valuation_method === valuationMethod) {
      console.log('✅ 査定方法は既に同期されています');
      return;
    }

    console.log(`🔄 査定方法を更新: "${seller.valuation_method}" → "${valuationMethod}"`);

    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        valuation_method: valuationMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seller.id);

    if (updateError) {
      console.error('❌ 更新に失敗:', updateError);
      return;
    }

    console.log('✅ 査定方法を更新しました');

    // 4. 確認
    const { data: updatedSeller } = await supabase
      .from('sellers')
      .select('seller_number, valuation_method')
      .eq('id', seller.id)
      .single();

    console.log('✅ 更新後の確認:');
    console.log('  売主番号:', updatedSeller?.seller_number);
    console.log('  査定方法:', updatedSeller?.valuation_method);

    console.log('🎉 同期完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

syncAA13509ValuationMethod();
