import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAA13500ValuationMethod() {
  try {
    console.log('=== AA13500の査定方法を同期 ===');

    // Google Sheets認証
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // スプレッドシートから全データを取得
    console.log('📊 スプレッドシートからデータを取得中...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!A:BV', // BV列まで取得
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      console.log('⚠️ スプレッドシートにデータがありません');
      return;
    }

    // ヘッダー行を取得
    const headers = rows[0];
    console.log(`📋 ${headers.length}個のカラムを取得`);

    // 査定方法はBV列（インデックス73）
    // A=0, B=1, ..., Z=25, AA=26, ..., BV=73
    const valuationMethodIndex = 73; // BV列
    console.log(`✅ 査定方法カラム: BV列 (インデックス${valuationMethodIndex})`);
    console.log(`   ヘッダー名: ${headers[valuationMethodIndex]}`);

    // 売主番号はB列（インデックス1）
    const sellerNumberIndex = 1;

    let aa13500Row = null;
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[sellerNumberIndex] === 'AA13500') {
        aa13500Row = row;
        rowIndex = i + 1; // スプレッドシートの行番号（1始まり）
        break;
      }
    }

    if (!aa13500Row) {
      console.log('⚠️ AA13500がスプレッドシートに見つかりません');
      return;
    }

    console.log(`✅ AA13500を発見: 行${rowIndex}`);

    // 査定方法を取得
    const valuationMethod = aa13500Row[valuationMethodIndex] || null;
    console.log('📝 スプレッドシートの査定方法:', valuationMethod);

    // データベースの現在の値を確認
    const { data: currentSeller, error: fetchError } = await supabase
      .from('sellers')
      .select('seller_number, valuation_method')
      .eq('seller_number', 'AA13500')
      .single();

    if (fetchError) {
      console.error('❌ データベースからの取得エラー:', fetchError);
      return;
    }

    console.log('📊 データベースの現在の査定方法:', currentSeller?.valuation_method);

    // 同期が必要か確認
    if (currentSeller?.valuation_method === valuationMethod) {
      console.log('✅ 査定方法は既に同期されています');
      return;
    }

    // データベースを更新
    console.log('🔄 データベースを更新中...');
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        valuation_method: valuationMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('seller_number', 'AA13500');

    if (updateError) {
      console.error('❌ 更新エラー:', updateError);
      return;
    }

    console.log('✅ AA13500の査定方法を同期しました');
    console.log('   スプレッドシート:', valuationMethod);
    console.log('   データベース:', valuationMethod);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

syncAA13500ValuationMethod();
