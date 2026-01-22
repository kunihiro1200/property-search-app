import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAA12369PropertyType() {
  console.log('=== AA12369の物件種別を修正 ===\n');

  try {
    // 1. 売主情報を取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .eq('seller_number', 'AA12369')
      .single();

    if (sellerError || !seller) {
      console.error('❌ 売主が見つかりません:', sellerError?.message);
      return;
    }

    console.log('📋 売主情報:');
    console.log(`  売主番号: ${seller.seller_number}`);
    console.log(`  売主ID: ${seller.id}\n`);

    // 2. 物件情報を取得
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id)
      .single();

    if (propError || !property) {
      console.error('❌ 物件が見つかりません:', propError?.message);
      return;
    }

    console.log('📦 現在の物件情報:');
    console.log(`  ID: ${property.id}`);
    console.log(`  住所: ${property.address}`);
    console.log(`  物件種別: ${property.property_type}\n`);

    // 3. スプレッドシートから最新データを取得
    console.log('📊 スプレッドシートから最新データを取得中...\n');

    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const rows = await sheetsClient.readAll();
    const targetRow = rows.find((row: any) => row['売主番号'] === 'AA12369');

    if (!targetRow) {
      console.error('❌ スプレッドシートにAA12369が見つかりません');
      return;
    }

    // 4. 物件データを抽出
    const columnMapper = new ColumnMapper();
    const propertyData = columnMapper.extractPropertyData(targetRow, seller.id);

    if (!propertyData) {
      console.error('❌ 物件データを抽出できませんでした');
      return;
    }

    console.log('📄 スプレッドシートから抽出した物件データ:');
    console.log(`  住所: ${propertyData.address}`);
    console.log(`  物件種別: ${propertyData.property_type || '(空)'}`);
    console.log(`  土地面積: ${propertyData.land_area || '(空)'}`);
    console.log(`  建物面積: ${propertyData.building_area || '(空)'}\n`);

    // 5. 物件種別を更新
    if (propertyData.property_type) {
      console.log('🔄 物件種別を更新中...\n');

      const { error: updateError } = await supabase
        .from('properties')
        .update({
          property_type: propertyData.property_type,
        })
        .eq('id', property.id);

      if (updateError) {
        console.error('❌ 更新エラー:', updateError.message);
        return;
      }

      console.log('✅ 物件種別を更新しました');
      console.log(`  更新前: ${property.property_type}`);
      console.log(`  更新後: ${propertyData.property_type}`);
    } else {
      console.log('⚠️  スプレッドシートにも物件種別がありません');
    }

    // 6. 更新後の確認
    const { data: updatedProperty } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property.id)
      .single();

    console.log('\n📦 更新後の物件情報:');
    console.log(`  ID: ${updatedProperty?.id}`);
    console.log(`  住所: ${updatedProperty?.address}`);
    console.log(`  物件種別: ${updatedProperty?.property_type}`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

fixAA12369PropertyType()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
