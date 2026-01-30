import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function forceSyncAA13507() {
  console.log('🔄 AA13507を強制同期します...\n');

  // 1. スプレッドシートからデータを取得
  console.log('📊 Step 1: スプレッドシートからAA13507のデータを取得...');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:CZ`,
  });
  const rows = dataResponse.data.values || [];

  // AA13507を検索
  const sellerNumberIndex = headers.indexOf('売主番号');
  const aa13507Row = rows.find(row => row[sellerNumberIndex] === 'AA13507');

  if (!aa13507Row) {
    console.log('❌ スプレッドシートにAA13507が見つかりません');
    return;
  }

  console.log('✅ スプレッドシートからデータを取得しました');

  // 2. カラムマッピングを使用してデータを抽出
  const getColumnValue = (columnName: string): string | null => {
    const index = headers.indexOf(columnName);
    if (index === -1) return null;
    const value = aa13507Row[index];
    return value ? String(value).trim() : null;
  };

  const updateData = {
    property_address: getColumnValue('物件所在地'),
    comments: getColumnValue('コメント'),
    unreachable_status: getColumnValue('不通'),
    valuation_method: getColumnValue('査定方法'),
    visit_assignee: getColumnValue('営担'),
    visit_valuation_acquirer: getColumnValue('訪問査定取得者'),
    status: getColumnValue('状況（当社）'),
    updated_at: new Date().toISOString(),
  };

  console.log('\n📝 更新するデータ:');
  console.log(`  property_address: ${updateData.property_address || '(null)'}`);
  console.log(`  comments: ${updateData.comments ? updateData.comments.substring(0, 50) + '...' : '(null)'}`);
  console.log(`  unreachable_status: ${updateData.unreachable_status || '(null)'}`);
  console.log(`  valuation_method: ${updateData.valuation_method || '(null)'}`);
  console.log(`  visit_assignee: ${updateData.visit_assignee || '(null)'}`);
  console.log(`  visit_valuation_acquirer: ${updateData.visit_valuation_acquirer || '(null)'}`);
  console.log(`  status: ${updateData.status || '(null)'}`);

  // 3. データベースを更新
  console.log('\n📊 Step 2: データベースを更新...');
  
  const { data, error } = await supabase
    .from('sellers')
    .update(updateData)
    .eq('seller_number', 'AA13507')
    .select();

  if (error) {
    console.log('❌ 更新エラー:', error.message);
    return;
  }

  console.log('✅ データベースを更新しました');

  // 4. 更新後のデータを確認
  console.log('\n📊 Step 3: 更新後のデータを確認...');
  
  const { data: updatedSeller, error: fetchError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13507')
    .single();

  if (fetchError || !updatedSeller) {
    console.log('❌ データ取得エラー:', fetchError?.message);
    return;
  }

  console.log('\n📝 更新後のデータベース:');
  console.log(`  property_address: ${updatedSeller.property_address || '(null)'}`);
  console.log(`  comments: ${updatedSeller.comments ? updatedSeller.comments.substring(0, 50) + '...' : '(null)'}`);
  console.log(`  unreachable_status: ${updatedSeller.unreachable_status || '(null)'}`);
  console.log(`  valuation_method: ${updatedSeller.valuation_method || '(null)'}`);
  console.log(`  visit_assignee: ${updatedSeller.visit_assignee || '(null)'}`);
  console.log(`  visit_valuation_acquirer: ${updatedSeller.visit_valuation_acquirer || '(null)'}`);
  console.log(`  status: ${updatedSeller.status || '(null)'}`);

  console.log('\n✅ AA13507の同期が完了しました！');
}

forceSyncAA13507().catch(console.error);
