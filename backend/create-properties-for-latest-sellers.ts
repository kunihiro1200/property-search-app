/**
 * 最新売主の物件情報を直接作成するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 同期対象の売主番号
const TARGET_SELLERS = ['AA13236', 'AA13237', 'AA13239', 'AA13240', 'AA13241', 'AA13242', 'AA13243', 'AA13244'];

async function createPropertiesForLatestSellers() {
  console.log('=== 最新売主の物件情報を直接作成 ===\n');

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

      // 既存の物件を確認
      const { data: existingProps } = await supabase
        .from('properties')
        .select('id')
        .eq('seller_id', seller.id);

      if (existingProps && existingProps.length > 0) {
        console.log(`  ⚠️ 既に物件が存在します (${existingProps.length}件)`);
        continue;
      }

      // スプレッドシートデータをマッピング
      const mappedData = columnMapper.mapToDatabase(row);
      
      // 物件を直接作成（addressがNOT NULLなので空の場合は「未入力」を設定）
      const { data: newProperty, error: createError } = await supabase
        .from('properties')
        .insert({
          seller_id: seller.id,
          address: mappedData.property_address || '未入力',
          property_type: mappedData.property_type || null,
          land_area: mappedData.land_area || null,
          building_area: mappedData.building_area || null,
          build_year: mappedData.build_year || null,
          structure: mappedData.structure || null,
          floor_plan: mappedData.floor_plan || null,
        })
        .select()
        .single();

      if (createError) {
        console.log(`  ❌ 物件作成エラー: ${createError.message}`);
      } else {
        console.log(`  ✅ 物件を作成しました (ID: ${newProperty.id})`);
        console.log(`     種別: ${newProperty.property_type || '未設定'}`);
      }
    }

    console.log('\n=== 作成完了 ===');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

createPropertiesForLatestSellers().catch(console.error);
