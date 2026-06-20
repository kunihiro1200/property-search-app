import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13500ValuationData() {
  console.log('🔍 AA13500の査定額データを確認します...\n');

  try {
    // 1. スプレッドシートからデータを取得
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const rows = await sheetsClient.readAll();
    const aa13500Row = rows.find((row: any) => row['売主番号'] === 'AA13500');

    if (!aa13500Row) {
      console.error('❌ AA13500がスプレッドシートに見つかりません');
      return;
    }

    console.log('📊 スプレッドシートのAA13500:');
    console.log('  売主番号:', aa13500Row['売主番号']);
    console.log('  査定額1（自動計算）:', aa13500Row['査定額1（自動計算）v']);
    console.log('  査定額2（自動計算）:', aa13500Row['査定額2（自動計算）v']);
    console.log('  査定額3（自動計算）:', aa13500Row['査定額3（自動計算）v']);
    console.log('  査定額1（手入力）:', aa13500Row['査定額1']);
    console.log('  査定額2（手入力）:', aa13500Row['査定額2']);
    console.log('  査定額3（手入力）:', aa13500Row['査定額3']);
    console.log('');

    // 2. データベースからデータを取得
    const { data: seller, error } = await supabase
      .from('sellers')
      .select(`
        id,
        seller_number,
        valuation_amount_1,
        valuation_amount_2,
        valuation_amount_3,
        manual_valuation_amount_1,
        manual_valuation_amount_2,
        manual_valuation_amount_3
      `)
      .eq('seller_number', 'AA13500')
      .single();

    if (error || !seller) {
      console.error('❌ データベースでAA13500が見つかりません:', error);
      return;
    }

    console.log('💾 データベースのAA13500:');
    console.log('  売主番号:', seller.seller_number);
    console.log('  査定額1（自動計算）:', seller.valuation_amount_1);
    console.log('  査定額2（自動計算）:', seller.valuation_amount_2);
    console.log('  査定額3（自動計算）:', seller.valuation_amount_3);
    console.log('  査定額1（手入力）:', seller.manual_valuation_amount_1);
    console.log('  査定額2（手入力）:', seller.manual_valuation_amount_2);
    console.log('  査定額3（手入力）:', seller.manual_valuation_amount_3);
    console.log('');

    // 3. マッピングの確認
    console.log('🔍 マッピングの確認:');
    console.log('  スプレッドシート「査定額1（自動計算）v」→ DB「valuation_amount_1」');
    console.log('    スプレッドシート:', aa13500Row['査定額1（自動計算）v']);
    console.log('    データベース:', seller.valuation_amount_1);
    console.log('    一致:', aa13500Row['査定額1（自動計算）v'] == seller.valuation_amount_1 ? '✅' : '❌');
    console.log('');
    console.log('  スプレッドシート「査定額1」→ DB「manual_valuation_amount_1」');
    console.log('    スプレッドシート:', aa13500Row['査定額1']);
    console.log('    データベース:', seller.manual_valuation_amount_1);
    console.log('    一致:', aa13500Row['査定額1'] == seller.manual_valuation_amount_1 ? '✅' : '❌');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

checkAA13500ValuationData();
