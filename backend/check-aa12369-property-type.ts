import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12369PropertyType() {
  console.log('=== AA12369の物件種別チェック ===\n');

  try {
    // 1. データベースから売主と物件情報を取得
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
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id);

    if (propError) {
      console.error('❌ 物件取得エラー:', propError.message);
      return;
    }

    console.log(`📦 物件数: ${properties?.length || 0}件\n`);

    if (properties && properties.length > 0) {
      properties.forEach((prop, index) => {
        console.log(`物件 ${index + 1}:`);
        console.log(`  ID: ${prop.id}`);
        console.log(`  住所: ${prop.address || '(空)'}`);
        console.log(`  物件種別: ${prop.property_type || '(空)'}`);
        console.log(`  土地面積: ${prop.land_area || '(空)'}`);
        console.log(`  建物面積: ${prop.building_area || '(空)'}`);
        console.log(`  作成日時: ${prop.created_at}`);
        console.log('');
      });
    }

    // 3. スプレッドシートから物件種別を確認
    console.log('📊 スプレッドシートから確認中...\n');

    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const rows = await sheetsClient.readAll();
    const targetRow = rows.find((row: any) => row['売主番号'] === 'AA12369');

    if (targetRow) {
      console.log('📄 AA12369のスプレッドシートデータ:');
      console.log(`  物件所在地: ${targetRow['物件所在地'] || '(空)'}`);
      console.log(`  種別: ${targetRow['種別'] || '(空)'}`);
      console.log(`  物件種別: ${targetRow['物件種別'] || '(空)'}`);
      console.log(`  土地面積: ${targetRow['土（㎡）'] || '(空)'}`);
      console.log(`  建物面積: ${targetRow['建（㎡）'] || '(空)'}`);
      console.log('');

      // ColumnMapperで抽出してみる
      const columnMapper = new ColumnMapper();
      const propertyData = columnMapper.extractPropertyData(targetRow, seller.id);

      console.log('🔧 ColumnMapperで抽出した結果:');
      if (propertyData) {
        console.log(`  住所: ${propertyData.address}`);
        console.log(`  物件種別: ${propertyData.property_type || '(空)'}`);
        console.log(`  土地面積: ${propertyData.land_area || '(空)'}`);
        console.log(`  建物面積: ${propertyData.building_area || '(空)'}`);
      } else {
        console.log('  物件データを抽出できませんでした');
      }
      console.log('');

      // 比較
      if (properties && properties.length > 0) {
        const dbPropertyType = properties[0].property_type;
        const sheetPropertyType = targetRow['種別'] || targetRow['物件種別'];

        console.log('🔍 比較:');
        console.log(`  DB物件種別: ${dbPropertyType || '(空)'}`);
        console.log(`  シート物件種別: ${sheetPropertyType || '(空)'}`);
        console.log(`  ColumnMapper変換後: ${propertyData?.property_type || '(空)'}`);
        
        if (dbPropertyType !== propertyData?.property_type) {
          console.log('  ⚠️  不一致が検出されました！');
        } else {
          console.log('  ✅ 一致しています');
        }
      }
    } else {
      console.log('❌ スプレッドシートにAA12369が見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

checkAA12369PropertyType()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
