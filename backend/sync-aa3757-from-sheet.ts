import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAA3757() {
  console.log('=== AA3757のデータをスプレッドシートから同期 ===\n');
  
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!;
  const resolvedKeyPath = path.resolve(process.cwd(), serviceAccountKeyPath);
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: resolvedKeyPath,
  });
  const columnMapper = new ColumnMapper();
  
  // 認証
  await sheetsClient.authenticate();
  
  // スプレッドシートからデータを取得
  const rows = await sheetsClient.readAll();
  console.log(`✅ スプレッドシートから${rows.length}行を取得\n`);
  
  // AA3757を探す
  const targetRow = rows.find(row => row['売主番号'] === 'AA3757');
  
  if (!targetRow) {
    console.log('❌ AA3757が見つかりませんでした');
    process.exit(1);
  }
  
  console.log('=== スプレッドシートのデータ ===');
  console.log('売主番号:', targetRow['売主番号']);
  console.log('物件住所:', targetRow['物件住所']);
  console.log('物件種別:', targetRow['物件種別']);
  console.log('土地面積:', targetRow['土地面積']);
  console.log('建物面積:', targetRow['建物面積']);
  console.log('築年:', targetRow['築年']);
  console.log('構造:', targetRow['構造']);
  console.log('間取り:', targetRow['間取り']);
  console.log('状況(売主):', targetRow['状況（売主）']);
  console.log('訪問日:', targetRow['訪問日']);
  console.log('訪問時間:', targetRow['訪問時間']);
  console.log('訪問査定取得者:', targetRow['訪問査定取得者']);
  console.log('査定額①:', targetRow['査定額①']);
  console.log('査定額②:', targetRow['査定額②']);
  console.log('査定額③:', targetRow['査定額③']);
  console.log('固定資産税路線価:', targetRow['固定資産税路線価']);
  
  // 売主IDを取得
  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA3757')
    .single();
  
  if (!seller) {
    console.log('\n❌ データベースに売主が見つかりません');
    process.exit(1);
  }
  
  const sellerId = seller.id;
  console.log('\n売主ID:', sellerId);
  
  // 物件情報を抽出
  const propertyData = columnMapper.extractPropertyData(targetRow, sellerId);
  console.log('\n=== 抽出された物件データ ===');
  console.log(JSON.stringify(propertyData, null, 2));
  
  // 物件情報が既に存在するか確認
  const { data: existingProperty } = await supabase
    .from('properties')
    .select('id')
    .eq('seller_id', sellerId)
    .single();
  
  if (existingProperty) {
    console.log('\n✅ 物件情報が既に存在します。更新します...');
    const { error } = await supabase
      .from('properties')
      .update(propertyData)
      .eq('seller_id', sellerId);
    
    if (error) {
      console.error('❌ 更新エラー:', error);
    } else {
      console.log('✅ 物件情報を更新しました');
    }
  } else {
    console.log('\n📝 物件情報を新規作成します...');
    const { error } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        seller_id: sellerId,
      });
    
    if (error) {
      console.error('❌ 作成エラー:', error);
    } else {
      console.log('✅ 物件情報を作成しました');
    }
  }
  
  // 売主情報も更新（訪問予約、査定額など）
  const sellerUpdates = columnMapper.mapToDatabase(targetRow);
  console.log('\n=== 売主情報の更新 ===');
  console.log('更新フィールド:', Object.keys(sellerUpdates));
  
  const { error: sellerError } = await supabase
    .from('sellers')
    .update(sellerUpdates)
    .eq('id', sellerId);
  
  if (sellerError) {
    console.error('❌ 売主更新エラー:', sellerError);
  } else {
    console.log('✅ 売主情報を更新しました');
  }
  
  console.log('\n=== 同期完了 ===');
  process.exit(0);
}

syncAA3757();
