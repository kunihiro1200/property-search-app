/**
 * AA13245の状況（売主）フィールドを確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA13245SellerSituation() {
  console.log('=== AA13245の状況（売主）フィールド確認 ===\n');

  // 1. DBから売主情報を取得
  console.log('【1. DB売主情報】');
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13245')
    .maybeSingle();

  if (sellerError) {
    console.error('売主取得エラー:', sellerError.message);
    return;
  }

  if (!seller) {
    console.log('❌ AA13245はDBに存在しません');
    return;
  }

  console.log('売主ID:', seller.id);
  console.log('名前:', seller.name ? decrypt(seller.name) : 'null');
  console.log('ステータス:', seller.status);

  // 2. 物件情報を取得
  console.log('\n【2. DB物件情報】');
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (propError) {
    console.error('物件取得エラー:', propError.message);
  } else if (!properties || properties.length === 0) {
    console.log('❌ 物件情報がありません');
  } else {
    properties.forEach((p, i) => {
      console.log(`\n物件${i + 1}:`);
      console.log('  ID:', p.id);
      console.log('  住所:', p.address);
      console.log('  種別:', p.property_type);
      console.log('  土地面積:', p.land_area);
      console.log('  建物面積:', p.building_area);
      console.log('  築年:', p.build_year);
      console.log('  構造:', p.structure);
      console.log('  間取り:', p.floor_plan);
      console.log('  ★状況（売主）:', p.seller_situation || '【未設定】');
    });
  }

  // 3. スプレッドシートから確認
  console.log('\n【3. スプレッドシートデータ】');
  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const allRows = await sheetsClient.readAll();
    const row = allRows.find((r: any) => r['売主番号'] === 'AA13245');
    
    if (!row) {
      console.log('❌ AA13245はスプレッドシートに存在しません');
    } else {
      console.log('売主番号:', row['売主番号']);
      console.log('名前:', row['名前(漢字のみ）']);
      console.log('物件所在地:', row['物件所在地']);
      console.log('種別:', row['種別']);
      console.log('土（㎡）:', row['土（㎡）']);
      console.log('建（㎡）:', row['建（㎡）']);
      console.log('築年:', row['築年']);
      console.log('構造:', row['構造']);
      console.log('間取り:', row['間取り']);
      console.log('★状況（売主）:', row['状況（売主）'] || '【未設定】');
      console.log('状況（当社）:', row['状況（当社）']);
    }
  } catch (error: any) {
    console.error('スプレッドシート取得エラー:', error.message);
  }
}

checkAA13245SellerSituation().catch(console.error);
