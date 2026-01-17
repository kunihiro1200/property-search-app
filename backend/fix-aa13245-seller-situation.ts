/**
 * AA13245の状況（売主）フィールドを修正するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAA13245SellerSituation() {
  console.log('=== AA13245の状況（売主）フィールド修正 ===\n');

  // 1. スプレッドシートから状況（売主）を取得
  console.log('【1. スプレッドシートから状況（売主）を取得】');
  let sellerSituation: string | null = null;
  
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
      return;
    }
    
    const rawValue = row['状況（売主）'];
    sellerSituation = rawValue ? String(rawValue) : null;
    console.log('スプレッドシートの状況（売主）:', sellerSituation);
  } catch (error: any) {
    console.error('スプレッドシート取得エラー:', error.message);
    return;
  }

  if (!sellerSituation) {
    console.log('⚠️ スプレッドシートに状況（売主）が設定されていません');
    return;
  }

  // 2. DBから売主と物件を取得
  console.log('\n【2. DBから売主と物件を取得】');
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA13245')
    .maybeSingle();

  if (sellerError || !seller) {
    console.error('売主取得エラー:', sellerError?.message || '売主が見つかりません');
    return;
  }

  console.log('売主ID:', seller.id);

  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id, seller_situation')
    .eq('seller_id', seller.id);

  if (propError || !properties || properties.length === 0) {
    console.error('物件取得エラー:', propError?.message || '物件が見つかりません');
    return;
  }

  console.log('物件数:', properties.length);

  // 3. 物件の状況（売主）を更新
  console.log('\n【3. 物件の状況（売主）を更新】');
  for (const prop of properties) {
    console.log(`物件ID: ${prop.id}`);
    console.log(`  現在の状況（売主）: ${prop.seller_situation || '未設定'}`);
    console.log(`  更新後の状況（売主）: ${sellerSituation}`);

    const { error: updateError } = await supabase
      .from('properties')
      .update({ seller_situation: sellerSituation })
      .eq('id', prop.id);

    if (updateError) {
      console.error(`  ❌ 更新エラー: ${updateError.message}`);
    } else {
      console.log('  ✅ 更新成功');
    }
  }

  // 4. 更新後の確認
  console.log('\n【4. 更新後の確認】');
  const { data: updatedProperties } = await supabase
    .from('properties')
    .select('id, seller_situation')
    .eq('seller_id', seller.id);

  if (updatedProperties) {
    updatedProperties.forEach((p, i) => {
      console.log(`物件${i + 1}: 状況（売主）= ${p.seller_situation || '未設定'}`);
    });
  }

  console.log('\n✅ 修正完了');
}

fixAA13245SellerSituation().catch(console.error);
