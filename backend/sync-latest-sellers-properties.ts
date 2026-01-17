/**
 * 最新売主の物件情報をスプレッドシートから同期するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { PropertySyncHandler } from './src/services/PropertySyncHandler';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 同期対象の売主番号
const TARGET_SELLERS = ['AA13236', 'AA13237', 'AA13239', 'AA13240', 'AA13241', 'AA13242', 'AA13243', 'AA13244'];

async function syncLatestSellersProperties() {
  console.log('=== 最新売主の物件情報を同期 ===\n');

  try {
    // Google Sheets クライアントを初期化
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const columnMapper = new ColumnMapper();
    const propertySyncHandler = new PropertySyncHandler(supabase);

    // スプレッドシートから全データを取得
    console.log('📊 スプレッドシートからデータを取得中...');
    const allRows = await sheetsClient.readAll();
    console.log(`✅ ${allRows.length}行のデータを取得しました\n`);

    for (const sellerNumber of TARGET_SELLERS) {
      console.log(`\n【${sellerNumber}】`);
      
      // スプレッドシートから該当行を取得
      const row = allRows.find((r: any) => r['売主番号'] === sellerNumber);
      if (!row) {
        console.log(`  ❌ スプレッドシートに見つかりません`);
        continue;
      }

      // DBから売主IDを取得
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .single();

      if (sellerError || !seller) {
        console.log(`  ❌ DBに売主が見つかりません`);
        continue;
      }

      // スプレッドシートデータをマッピング
      const mappedData = columnMapper.mapToDatabase(row);
      
      console.log(`  スプレッドシートの物件データ:`);
      console.log(`    住所: ${mappedData.property_address || '未設定'}`);
      console.log(`    種別: ${mappedData.property_type || '未設定'}`);
      console.log(`    土地面積: ${mappedData.land_area || '未設定'}`);
      console.log(`    建物面積: ${mappedData.building_area || '未設定'}`);
      console.log(`    築年: ${mappedData.build_year || '未設定'}`);
      console.log(`    構造: ${mappedData.structure || '未設定'}`);
      console.log(`    間取り: ${mappedData.floor_plan || '未設定'}`);

      // 物件情報を同期
      try {
        await propertySyncHandler.syncProperty(seller.id, {
          address: mappedData.property_address,
          property_type: mappedData.property_type,
          land_area: mappedData.land_area,
          building_area: mappedData.building_area,
          build_year: mappedData.build_year,
          structure: mappedData.structure,
          seller_situation: mappedData.seller_situation,
          floor_plan: mappedData.floor_plan,
        });
        console.log(`  ✅ 物件情報を同期しました`);
      } catch (error: any) {
        console.log(`  ❌ 物件同期エラー: ${error.message}`);
      }
    }

    console.log('\n=== 同期完了 ===');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

syncLatestSellersProperties().catch(console.error);
