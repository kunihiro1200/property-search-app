import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { decrypt } from './src/utils/encryption';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA9845() {
  console.log('🔍 Checking AA9845...\n');

  // スプレッドシートから取得
  console.log('📊 スプレッドシートのデータ:');
  console.log('='.repeat(60));
  
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();
  
  const sheetRow = rows.find(r => r['売主番号'] === 'AA9845');
  
  if (sheetRow) {
    console.log('売主番号:', sheetRow['売主番号']);
    console.log('名前:', sheetRow['名前(漢字のみ）']);
    console.log('\n【問い合わせ】');
    console.log('  サイト:', sheetRow['サイト']);
    console.log('  反響日付:', sheetRow['反響日付']);
    console.log('  査定方法:', sheetRow['査定方法']);
    console.log('  連絡方法:', sheetRow['連絡方法']);
    console.log('  査定理由:', sheetRow['査定理由（査定サイトから転記）']);
    console.log('\n【ステータス】');
    console.log('  状況（当社）:', sheetRow['状況（当社）']);
    console.log('  確度:', sheetRow['確度']);
    console.log('  次電日:', sheetRow['次電日']);
    console.log('\n【査定】');
    console.log('  査定額1:', sheetRow['査定額1（自動計算）v']);
    console.log('  査定額2:', sheetRow['査定額2（自動計算）v']);
    console.log('  査定額3:', sheetRow['査定額3（自動計算）v']);
    console.log('  査定担当:', sheetRow['査定担当']);
    console.log('\n【訪問】');
    console.log('  訪問日:', sheetRow['訪問日 Y/M/D']);
    console.log('  訪問時間:', sheetRow['訪問時間']);
    console.log('  営担:', sheetRow['営担']);
    console.log('  訪問査定取得者:', sheetRow['訪問査定取得者']);
    console.log('\n【物件】');
    console.log('  物件所在地:', sheetRow['物件所在地']);
    console.log('  種別:', sheetRow['種別']);
    console.log('  土（㎡）:', sheetRow['土（㎡）']);
    console.log('  建（㎡）:', sheetRow['建（㎡）']);
    console.log('  築年:', sheetRow['築年']);
    console.log('  構造:', sheetRow['構造']);
    console.log('  状況（売主）:', sheetRow['状況（売主）']);
    console.log('  間取り:', sheetRow['間取り']);
  } else {
    console.log('❌ スプレッドシートにAA9845が見つかりません');
  }

  // Supabaseから取得
  console.log('\n\n💾 Supabaseのデータ:');
  console.log('='.repeat(60));
  
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA9845')
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (seller) {
    console.log('売主番号:', seller.seller_number);
    console.log('名前:', seller.name ? decrypt(seller.name) : 'なし');
    console.log('\n【問い合わせ】');
    console.log('  サイト (inquiry_site):', seller.inquiry_site || '空');
    console.log('  反響日付 (inquiry_date):', seller.inquiry_date || '空');
    console.log('  査定方法 (inquiry_source):', seller.inquiry_source || '空');
    console.log('  連絡方法 (inquiry_medium):', seller.inquiry_medium || '空');
    console.log('  査定理由 (inquiry_content):', seller.inquiry_content || '空');
    console.log('\n【ステータス】');
    console.log('  状況 (status):', seller.status || '空');
    console.log('  確度 (confidence):', seller.confidence || '空');
    console.log('  次電日 (next_call_date):', seller.next_call_date || '空');
    console.log('\n【査定】');
    console.log('  査定額1 (valuation_amount_1):', seller.valuation_amount_1 || '空');
    console.log('  査定額2 (valuation_amount_2):', seller.valuation_amount_2 || '空');
    console.log('  査定額3 (valuation_amount_3):', seller.valuation_amount_3 || '空');
    console.log('  査定担当 (valuation_assignee):', seller.valuation_assignee || '空');
    console.log('\n【訪問】');
    console.log('  訪問日 (visit_date):', seller.visit_date || '空');
    console.log('  訪問時間 (visit_time):', seller.visit_time || '空');
    console.log('  営担 (visit_assignee):', seller.visit_assignee || '空');
    console.log('  訪問査定取得者 (visit_valuation_acquirer):', seller.visit_valuation_acquirer || '空');
    console.log('\n【売主希望】');
    console.log('  売却理由 (sale_reason):', seller.sale_reason || '空');
    console.log('  希望時期 (desired_timing):', seller.desired_timing || '空');
    console.log('  希望価格 (desired_price):', seller.desired_price || '空');
    console.log('  訪問時注意点 (notes):', seller.notes || '空');

    // 物件情報
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id)
      .single();

    console.log('\n【物件】');
    if (property) {
      console.log('  住所 (address):', property.address || '空');
      console.log('  種別 (property_type):', property.property_type || '空');
      console.log('  土地面積 (land_area):', property.land_area || '空');
      console.log('  建物面積 (building_area):', property.building_area || '空');
      console.log('  築年 (build_year):', property.build_year || '空');
      console.log('  構造 (structure):', property.structure || '空');
      console.log('  状況（売主） (seller_situation):', property.seller_situation || '空');
      console.log('  間取り (floor_plan):', property.floor_plan || '空');
    } else {
      console.log('  ❌ 物件情報なし');
    }
  } else {
    console.log('❌ SupabaseにAA9845が見つかりません');
  }
}

checkAA9845().catch(console.error);
