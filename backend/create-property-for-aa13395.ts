import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPropertyForAA13395() {
  console.log('🎯 AA13395の物件データを作成します\n');

  // 1. 売主データを取得
  console.log('📊 ステップ1: 売主データを取得...');
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13395')
    .single();

  if (sellerError || !seller) {
    console.error('❌ 売主が見つかりません:', sellerError?.message);
    return;
  }

  console.log('✅ 売主ID:', seller.id);

  // 2. スプレッドシートから物件情報を取得
  console.log('\n📊 ステップ2: スプレッドシートから物件情報を取得...');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();

  const row = rows.find((r) => r['売主番号'] === 'AA13395');
  if (!row) {
    console.error('❌ スプレッドシートに売主が見つかりません');
    return;
  }

  console.log('✅ スプレッドシートから取得:');
  console.log('   物件所在地:', row['物件所在地']);
  console.log('   種別:', row['種別']);
  console.log('   土地面積:', row['土（㎡）']);
  console.log('   建物面積:', row['建（㎡）']);
  console.log('   築年:', row['築年']);
  console.log('   状況（売主）:', row['状況（売主）']);

  // 3. 物件種別を変換
  const propertyTypeMap: { [key: string]: string } = {
    '戸': '戸建て',
    '土': '土地',
    'マ': 'マンション',
    '戸建て': '戸建て',
    '土地': '土地',
    'マンション': 'マンション',
  };

  const propertyType = propertyTypeMap[row['種別']] || row['種別'];

  // 4. 現況を変換
  const currentStatusMap: { [key: string]: string } = {
    '居': '居住中',
    '空': '空き家',
    '賃': '賃貸中',
    '古': '古屋あり',
    '更': '更地',
    '居住中': '居住中',
    '空き家': '空き家',
    '賃貸中': '賃貸中',
    '古屋あり': '古屋あり',
    '更地': '更地',
  };

  const currentStatus = currentStatusMap[row['状況（売主）']] || null;

  // 5. 物件データを作成
  console.log('\n📊 ステップ3: 物件データを作成...');
  const propertyData = {
    seller_id: seller.id,
    property_address: row['物件所在地'] || null,
    property_type: propertyType || null,
    land_area: row['土（㎡）'] ? parseFloat(row['土（㎡）']) : null,
    building_area: row['建（㎡）'] ? parseFloat(row['建（㎡）']) : null,
    construction_year: row['築年'] ? parseInt(row['築年']) : null,
    current_status: currentStatus,
  };

  console.log('作成する物件データ:', propertyData);

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert(propertyData)
    .select()
    .single();

  if (propertyError) {
    console.error('❌ 物件作成エラー:', propertyError.message);
    return;
  }

  console.log('\n✅ 物件作成成功！');
  console.log('   物件ID:', property.id);
  console.log('   物件所在地:', property.property_address);
  console.log('   物件種別:', property.property_type);
  console.log('   土地面積:', property.land_area);
  console.log('   建物面積:', property.building_area);
  console.log('   築年:', property.construction_year);
  console.log('   現況:', property.current_status);

  console.log('\n🎉 完了！ブラウザでAA13395の詳細画面をリロードしてください。');
}

createPropertyForAA13395()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
