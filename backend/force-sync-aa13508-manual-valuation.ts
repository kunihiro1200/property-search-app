import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function forceSyncAA13508ManualValuation() {
  console.log('🔄 AA13508の手動査定額を強制同期中...\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

  // ヘッダーを取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  // B列（売主番号）からAA13508を検索
  const sellerNumberResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!B:B`,
  });
  const sellerNumbers = sellerNumberResponse.data.values || [];
  
  let foundRow = -1;
  for (let i = 0; i < sellerNumbers.length; i++) {
    if (sellerNumbers[i][0] === 'AA13508') {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow === -1) {
    console.log('❌ AA13508がスプレッドシートに見つかりません');
    return;
  }

  console.log(`✅ AA13508が見つかりました: ${foundRow}行目\n`);

  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${foundRow}:${foundRow}`,
  });
  const rowData = dataResponse.data.values?.[0] || [];

  // スプレッドシートのデータをオブジェクトに変換
  const spreadsheetData: any = {};
  headers.forEach((header, index) => {
    spreadsheetData[header] = rowData[index] || null;
  });

  // 査定額を確認
  const manualValuation1 = spreadsheetData['査定額1'];
  const manualValuation2 = spreadsheetData['査定額2'];
  const manualValuation3 = spreadsheetData['査定額3'];
  const autoValuation1 = spreadsheetData['査定額1（自動計算）v'];
  const autoValuation2 = spreadsheetData['査定額2（自動計算）v'];
  const autoValuation3 = spreadsheetData['査定額3（自動計算）v'];

  console.log('📋 スプレッドシートの査定額:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('手動入力査定額（列80-82）:');
  console.log(`  査定額1: ${manualValuation1 || '(空)'}万円`);
  console.log(`  査定額2: ${manualValuation2 || '(空)'}万円`);
  console.log(`  査定額3: ${manualValuation3 || '(空)'}万円`);
  console.log('\n自動計算査定額（列55-57）:');
  console.log(`  査定額1（自動計算）v: ${autoValuation1 || '(空)'}万円`);
  console.log(`  査定額2（自動計算）v: ${autoValuation2 || '(空)'}万円`);
  console.log(`  査定額3（自動計算）v: ${autoValuation3 || '(空)'}万円`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 優先順位ロジック: 手動入力 > 自動計算
  const valuation1 = manualValuation1 || autoValuation1;
  const valuation2 = manualValuation2 || autoValuation2;
  const valuation3 = manualValuation3 || autoValuation3;

  console.log('✅ 優先順位ロジック適用後:');
  console.log(`  査定額1: ${valuation1}万円 ${manualValuation1 ? '(手動入力)' : '(自動計算)'}`);
  console.log(`  査定額2: ${valuation2}万円 ${manualValuation2 ? '(手動入力)' : '(自動計算)'}`);
  console.log(`  査定額3: ${valuation3}万円 ${manualValuation3 ? '(手動入力)' : '(自動計算)'}`);
  console.log('');

  // 万円→円に変換
  const valuationAmount1 = valuation1 ? parseFloat(valuation1) * 10000 : null;
  const valuationAmount2 = valuation2 ? parseFloat(valuation2) * 10000 : null;
  const valuationAmount3 = valuation3 ? parseFloat(valuation3) * 10000 : null;

  console.log('💰 データベースに保存する値（円単位）:');
  console.log(`  valuation_amount_1: ${valuationAmount1?.toLocaleString()}円`);
  console.log(`  valuation_amount_2: ${valuationAmount2?.toLocaleString()}円`);
  console.log(`  valuation_amount_3: ${valuationAmount3?.toLocaleString()}円`);
  console.log('');

  // データベースを更新
  const { error } = await supabase
    .from('sellers')
    .update({
      valuation_amount_1: valuationAmount1,
      valuation_amount_2: valuationAmount2,
      valuation_amount_3: valuationAmount3,
    })
    .eq('seller_number', 'AA13508');

  if (error) {
    console.error('\n❌ データベース更新エラー:', error);
    return;
  }

  console.log('✅ AA13508の査定額を更新しました！\n');

  // 確認
  const { data: updatedSeller } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
    .eq('seller_number', 'AA13508')
    .single();

  console.log('📋 更新後のデータベースの状態:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`売主番号: ${updatedSeller.seller_number}`);
  console.log(`査定額1: ${updatedSeller.valuation_amount_1?.toLocaleString()}円`);
  console.log(`査定額2: ${updatedSeller.valuation_amount_2?.toLocaleString()}円`);
  console.log(`査定額3: ${updatedSeller.valuation_amount_3?.toLocaleString()}円`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

forceSyncAA13508ManualValuation().catch(console.error);
