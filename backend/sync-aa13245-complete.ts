/**
 * AA13245の物件情報と査定額を同期するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertySyncHandler } from './src/services/PropertySyncHandler';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const str = String(value).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function syncAA13245() {
  console.log('=== AA13245の物件情報・査定額を同期 ===\n');

  // 1. DBから売主を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA13245')
    .single();

  if (sellerError || !seller) {
    console.error('売主が見つかりません:', sellerError?.message);
    return;
  }

  console.log('売主ID:', seller.id);

  // 2. スプレッドシートからデータを取得
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
    console.error('スプレッドシートにAA13245が見つかりません');
    return;
  }

  // 3. 物件情報を同期
  console.log('\n【物件情報を同期】');
  const propertySyncHandler = new PropertySyncHandler(supabase);
  
  const propertyAddress = row['物件所在地'] || '未入力';
  let propertyType = row['種別'];
  if (propertyType) {
    const typeStr = String(propertyType).trim();
    const typeMapping: Record<string, string> = {
      '土': '土地', '戸': '戸建', 'マ': 'マンション', '事': '事業用',
    };
    propertyType = typeMapping[typeStr] || typeStr;
  }

  const result = await propertySyncHandler.syncProperty(seller.id, {
    address: String(propertyAddress),
    property_type: propertyType ? String(propertyType) : undefined,
    land_area: parseNumeric(row['土（㎡）']) ?? undefined,
    building_area: parseNumeric(row['建（㎡）']) ?? undefined,
    build_year: parseNumeric(row['築年']) ?? undefined,
    structure: row['構造'] ? String(row['構造']) : undefined,
    floor_plan: row['間取り'] ? String(row['間取り']) : undefined,
  });

  if (result.success) {
    console.log('✅ 物件情報を同期しました');
    console.log('  物件ID:', result.propertyId);
  } else {
    console.error('❌ 物件同期エラー:', result.error);
  }

  // 4. 査定額を更新
  console.log('\n【査定額を更新】');
  const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
  const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
  const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];

  const updateData: any = {};
  const val1 = parseNumeric(valuation1);
  const val2 = parseNumeric(valuation2);
  const val3 = parseNumeric(valuation3);
  
  if (val1 !== null) updateData.valuation_amount_1 = val1 * 10000;
  if (val2 !== null) updateData.valuation_amount_2 = val2 * 10000;
  if (val3 !== null) updateData.valuation_amount_3 = val3 * 10000;

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('sellers')
      .update(updateData)
      .eq('id', seller.id);

    if (updateError) {
      console.error('❌ 査定額更新エラー:', updateError.message);
    } else {
      console.log('✅ 査定額を更新しました');
      console.log('  査定額1:', updateData.valuation_amount_1 || 'なし');
      console.log('  査定額2:', updateData.valuation_amount_2 || 'なし');
      console.log('  査定額3:', updateData.valuation_amount_3 || 'なし');
    }
  } else {
    console.log('査定額データがスプレッドシートにありません');
  }

  // 5. 確認
  console.log('\n【同期後の確認】');
  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (properties && properties.length > 0) {
    const p = properties[0];
    console.log('物件住所:', p.address);
    console.log('種別:', p.property_type);
    console.log('土地面積:', p.land_area);
    console.log('建物面積:', p.building_area);
    console.log('築年:', p.build_year);
    console.log('間取り:', p.floor_plan);
  }

  console.log('\n✅ 完了');
}

syncAA13245().catch(console.error);
