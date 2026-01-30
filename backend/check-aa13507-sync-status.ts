import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13507SyncStatus() {
  console.log('🔍 AA13507 同期状態診断\n');

  // 1. スプレッドシートからデータを取得
  console.log('📊 Step 1: スプレッドシートからAA13507を検索...');
  
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
  console.log(`📋 ヘッダー数: ${headers.length}`);

  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:CZ`,
  });
  const rows = dataResponse.data.values || [];
  console.log(`📊 総行数: ${rows.length}`);

  // AA13507を検索
  const sellerNumberIndex = headers.indexOf('売主番号');
  const aa13507Row = rows.find(row => row[sellerNumberIndex] === 'AA13507');

  if (!aa13507Row) {
    console.log('❌ スプレッドシートにAA13507が見つかりません');
  } else {
    console.log('✅ スプレッドシートにAA13507が存在します');
    console.log('\n📝 スプレッドシートのデータ:');
    
    // 重要なフィールドを表示
    const importantFields = [
      '売主番号',
      '名前(漢字のみ）',
      '物件所在地',
      'コメント',
      '不通',
      '査定方法',
      '営担',
      '訪問査定取得者',
      '状況（当社）',
    ];

    importantFields.forEach(field => {
      const index = headers.indexOf(field);
      if (index !== -1) {
        const value = aa13507Row[index] || '(空)';
        console.log(`  ${field}: ${value}`);
      } else {
        console.log(`  ${field}: (カラムが見つかりません)`);
      }
    });
  }

  // 2. データベースからデータを取得
  console.log('\n📊 Step 2: データベースからAA13507を検索...');
  
  const { data: dbSeller, error: dbError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13507')
    .single();

  if (dbError || !dbSeller) {
    console.log('❌ データベースにAA13507が見つかりません');
    console.log('エラー:', dbError?.message);
  } else {
    console.log('✅ データベースにAA13507が存在します');
    console.log('\n📝 データベースのデータ:');
    console.log(`  seller_number: ${dbSeller.seller_number}`);
    console.log(`  name: ${dbSeller.name || '(null)'}`);
    console.log(`  property_address: ${dbSeller.property_address || '(null)'}`);
    console.log(`  comments: ${dbSeller.comments || '(null)'}`);
    console.log(`  unreachable_status: ${dbSeller.unreachable_status || '(null)'}`);
    console.log(`  valuation_method: ${dbSeller.valuation_method || '(null)'}`);
    console.log(`  visit_assignee: ${dbSeller.visit_assignee || '(null)'}`);
    console.log(`  visit_valuation_acquirer: ${dbSeller.visit_valuation_acquirer || '(null)'}`);
    console.log(`  status: ${dbSeller.status || '(null)'}`);
    console.log(`  created_at: ${dbSeller.created_at}`);
    console.log(`  updated_at: ${dbSeller.updated_at}`);
  }

  // 3. APIレスポンスを確認（SellerServiceを使用）
  console.log('\n📊 Step 3: APIレスポンスを確認...');
  
  if (dbSeller) {
    // SellerServiceのdecryptSellerメソッドをシミュレート
    // 実際のAPIレスポンスと同じ形式で表示
    console.log('\n📝 APIレスポンス（予想）:');
    console.log(`  sellerNumber: ${dbSeller.seller_number}`);
    console.log(`  name: ${dbSeller.name || '(undefined)'}`);
    console.log(`  property.address: ${dbSeller.property_address || '(undefined)'}`);
    console.log(`  comments: ${dbSeller.comments || '(undefined)'}`);
    console.log(`  unreachableStatus: ${dbSeller.unreachable_status || '(undefined)'}`);
    console.log(`  valuationMethod: ${dbSeller.valuation_method || '(undefined)'}`);
    console.log(`  visitAssignee: ${dbSeller.visit_assignee || '(undefined)'}`);
    console.log(`  visitValuationAcquirer: ${dbSeller.visit_valuation_acquirer || '(undefined)'}`);
    console.log(`  status: ${dbSeller.status || '(undefined)'}`);
  }

  // 4. 比較分析
  console.log('\n📊 Step 4: 比較分析...');
  
  if (aa13507Row && dbSeller) {
    console.log('\n🔍 スプレッドシート vs データベース:');
    
    const comparisons = [
      { field: '名前', spreadsheetIndex: headers.indexOf('名前(漢字のみ）'), dbField: 'name' },
      { field: '物件所在地', spreadsheetIndex: headers.indexOf('物件所在地'), dbField: 'property_address' },
      { field: 'コメント', spreadsheetIndex: headers.indexOf('コメント'), dbField: 'comments' },
      { field: '不通', spreadsheetIndex: headers.indexOf('不通'), dbField: 'unreachable_status' },
      { field: '査定方法', spreadsheetIndex: headers.indexOf('査定方法'), dbField: 'valuation_method' },
      { field: '営担', spreadsheetIndex: headers.indexOf('営担'), dbField: 'visit_assignee' },
      { field: '訪問査定取得者', spreadsheetIndex: headers.indexOf('訪問査定取得者'), dbField: 'visit_valuation_acquirer' },
      { field: '状況（当社）', spreadsheetIndex: headers.indexOf('状況（当社）'), dbField: 'status' },
    ];

    comparisons.forEach(({ field, spreadsheetIndex, dbField }) => {
      const spreadsheetValue = spreadsheetIndex !== -1 ? (aa13507Row[spreadsheetIndex] || '(空)') : '(カラムなし)';
      const dbValue = dbSeller[dbField] || '(null)';
      const match = spreadsheetValue === dbValue || (spreadsheetValue === '(空)' && dbValue === '(null)');
      
      console.log(`\n  ${field}:`);
      console.log(`    スプレッドシート: ${spreadsheetValue}`);
      console.log(`    データベース: ${dbValue}`);
      console.log(`    ${match ? '✅ 一致' : '❌ 不一致'}`);
    });
  }

  // 5. 結論
  console.log('\n📊 診断結果:');
  
  if (!aa13507Row) {
    console.log('❌ AA13507はスプレッドシートに存在しません');
    console.log('   → 新規追加が必要です');
  } else if (!dbSeller) {
    console.log('❌ AA13507はデータベースに存在しません');
    console.log('   → 自動同期で追加されるはずです（5分以内）');
  } else {
    console.log('✅ AA13507はスプレッドシートとデータベースの両方に存在します');
    console.log('   → フィールドの不一致を確認してください');
  }
}

checkAA13507SyncStatus().catch(console.error);
