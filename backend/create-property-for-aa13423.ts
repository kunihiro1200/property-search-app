import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPropertyForAA13423() {
  const targetSellerNumber = 'AA13423';
  
  console.log(`🏠 ${targetSellerNumber}の物件を作成します\n`);

  // 1. 売主IDを取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, seller_number')
    .eq('seller_number', targetSellerNumber)
    .single();

  if (sellerError || !seller) {
    console.error(`❌ 売主が見つかりません:`, sellerError);
    return;
  }

  console.log(`✅ 売主を確認: ${seller.seller_number} (ID: ${seller.id})`);

  // 2. スプレッドシートから物件情報を取得
  console.log('📊 スプレッドシートから物件情報を取得...');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();
  
  const targetRow = rows.find(row => row['売主番号'] === targetSellerNumber);
  
  if (!targetRow) {
    console.error(`❌ スプレッドシートに${targetSellerNumber}が見つかりません`);
    return;
  }

  // 物件情報を抽出
  const propertyData = {
    seller_id: seller.id,
    property_address: targetRow['物件所在地'] || '住所不明',
    property_type: targetRow['種別'] === '戸' ? '戸建て' : 
                   targetRow['種別'] === '土' ? '土地' : 
                   targetRow['種別'] === 'マ' ? 'マンション' : '戸建て',
    land_area: targetRow['土（㎡）'] ? parseFloat(targetRow['土（㎡）']) : null,
    building_area: targetRow['建（㎡）'] ? parseFloat(targetRow['建（㎡）']) : null,
    construction_year: targetRow['築年'] ? parseInt(targetRow['築年']) : null,
    structure: targetRow['構造'] || null,
    floor_plan: targetRow['間取り'] || null,
    current_status: targetRow['状況（売主）'] || null, // スプレッドシートの値をそのまま保存
  };

  console.log('📋 物件情報:');
  console.log(`   住所: ${propertyData.property_address}`);
  console.log(`   種別: ${propertyData.property_type}`);
  console.log(`   土地面積: ${propertyData.land_area || '(なし)'}`);
  console.log(`   建物面積: ${propertyData.building_area || '(なし)'}`);
  console.log(`   現況: ${propertyData.current_status || '(なし)'}`);
  console.log('');

  // 3. 既存の物件があるか確認
  const { data: existingProperties } = await supabase
    .from('properties')
    .select('id')
    .eq('seller_id', seller.id);

  if (existingProperties && existingProperties.length > 0) {
    console.log(`⚠️  既に${existingProperties.length}件の物件が存在します`);
    console.log('   既存の物件を更新しますか？ (このスクリプトは新規作成のみ対応)');
    return;
  }

  // 4. 物件を作成
  console.log('📊 物件を作成中...');
  const { data: newProperty, error: propertyError } = await supabase
    .from('properties')
    .insert(propertyData)
    .select()
    .single();

  if (propertyError) {
    console.error(`❌ 物件作成エラー:`, propertyError);
    return;
  }

  console.log(`✅ 物件を作成しました (ID: ${newProperty.id})`);
  console.log('');
  console.log('🎉 完了！');
  console.log('');
  console.log('次のステップ:');
  console.log('1. ブラウザで売主詳細画面をリロード（F5）');
  console.log(`2. ${targetSellerNumber}の詳細画面を開く`);
  console.log('3. 物件情報セクションにデータが表示されているか確認');
}

createPropertyForAA13423()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
