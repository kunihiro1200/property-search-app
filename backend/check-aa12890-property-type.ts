import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12890PropertyType() {
  console.log('=== AA12890の物件種別チェック ===\n');

  try {
    // 1. データベースから売主と物件情報を取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .eq('seller_number', 'AA12890')
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

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // ヘッダー行を取得
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:ZZ1`,
    });

    const headers = headerResponse.data.values?.[0] || [];
    console.log('📋 スプレッドシートのヘッダー（物件関連）:');
    headers.forEach((header, index) => {
      if (header.includes('物件') || header.includes('種別')) {
        console.log(`  列${index + 1}: ${header}`);
      }
    });
    console.log('');

    // AA12890の行を検索
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    });

    const rows = dataResponse.data.values || [];
    
    // 売主番号の列を探す
    const sellerNumberIndex = headers.findIndex(h => h === '売主番号' || h === '番号');
    console.log(`売主番号の列: ${sellerNumberIndex + 1} (${headers[sellerNumberIndex]})\n`);
    
    const aa12890Row = rows.find(row => row[sellerNumberIndex] === 'AA12890');

    if (aa12890Row) {
      console.log('📄 AA12890のスプレッドシートデータ:');
      
      // 物件種別の列を探す（複数のパターンを試す）
      let propertyTypeIndex = headers.findIndex(h => h === '物件種別');
      if (propertyTypeIndex === -1) {
        propertyTypeIndex = headers.findIndex(h => h === '種別');
      }
      
      const addressIndex = headers.findIndex(h => h === '物件所在地');
      const landAreaIndex = headers.findIndex(h => h === '土（㎡）');
      const buildingAreaIndex = headers.findIndex(h => h === '建（㎡）');

      console.log(`  物件所在地 (列${addressIndex + 1}): ${aa12890Row[addressIndex] || '(空)'}`);
      console.log(`  種別/物件種別 (列${propertyTypeIndex + 1}): ${aa12890Row[propertyTypeIndex] || '(空)'}`);
      console.log(`  土地面積 (列${landAreaIndex + 1}): ${aa12890Row[landAreaIndex] || '(空)'}`);
      console.log(`  建物面積 (列${buildingAreaIndex + 1}): ${aa12890Row[buildingAreaIndex] || '(空)'}`);
      console.log('');

      // 比較
      if (properties && properties.length > 0) {
        const dbPropertyType = properties[0].property_type;
        const sheetPropertyType = aa12890Row[propertyTypeIndex];

        console.log('🔍 比較:');
        console.log(`  DB物件種別: ${dbPropertyType || '(空)'}`);
        console.log(`  シート物件種別: ${sheetPropertyType || '(空)'}`);
        
        if (dbPropertyType !== sheetPropertyType) {
          console.log('  ⚠️  不一致が検出されました！');
        } else {
          console.log('  ✅ 一致しています');
        }
      }
    } else {
      console.log('❌ スプレッドシートにAA12890が見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

checkAA12890PropertyType()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
