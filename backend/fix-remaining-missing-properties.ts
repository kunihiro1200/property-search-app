/**
 * 残りの物件なし売主に物件を作成するスクリプト
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

async function fixRemainingMissingProperties() {
  console.log('=== 残りの物件なし売主を修正 ===\n');

  // 1. 全売主を取得（ページネーション対応）
  console.log('📊 全売主を取得中...');
  let allSellers: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: sellers } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (!sellers || sellers.length === 0) break;
    allSellers = allSellers.concat(sellers);
    page++;
  }
  console.log(`  売主数: ${allSellers.length}`);

  // 2. 全物件のseller_idを取得
  console.log('📊 全物件を取得中...');
  let allPropertySellerIds: string[] = [];
  page = 0;
  
  while (true) {
    const { data: properties } = await supabase
      .from('properties')
      .select('seller_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (!properties || properties.length === 0) break;
    allPropertySellerIds = allPropertySellerIds.concat(properties.map(p => p.seller_id));
    page++;
  }
  console.log(`  物件数: ${allPropertySellerIds.length}`);

  // 3. 物件なし売主を特定
  const propertySellerIdSet = new Set(allPropertySellerIds);
  const sellersWithoutProperty = allSellers.filter(s => !propertySellerIdSet.has(s.id));
  console.log(`\n物件なし売主数: ${sellersWithoutProperty.length}`);

  if (sellersWithoutProperty.length === 0) {
    console.log('✅ 全売主に物件が紐付いています');
    return;
  }

  // 4. スプレッドシートからデータを取得
  console.log('\n📊 スプレッドシートからデータを取得中...');
  
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };
  
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();
  const columnMapper = new ColumnMapper();
  
  const allRows = await sheetsClient.readAll();
  console.log(`  スプレッドシート行数: ${allRows.length}`);

  // 5. 物件を作成
  console.log('\n🔧 物件を作成中...');
  
  let created = 0;
  let notFound = 0;
  let errors = 0;

  for (const seller of sellersWithoutProperty) {
    const row = allRows.find((r: any) => r['売主番号'] === seller.seller_number);
    
    if (!row) {
      notFound++;
      continue;
    }

    const mappedData = columnMapper.mapToDatabase(row);

    const { error: createError } = await supabase
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
      });

    if (createError) {
      console.log(`  ❌ ${seller.seller_number}: ${createError.message}`);
      errors++;
    } else {
      created++;
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`作成成功: ${created}件`);
  console.log(`スプレッドシートに見つからず: ${notFound}件`);
  console.log(`エラー: ${errors}件`);

  // 6. 最終確認
  console.log('\n📊 最終確認...');
  
  let finalPropertySellerIds: string[] = [];
  page = 0;
  
  while (true) {
    const { data: properties } = await supabase
      .from('properties')
      .select('seller_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (!properties || properties.length === 0) break;
    finalPropertySellerIds = finalPropertySellerIds.concat(properties.map(p => p.seller_id));
    page++;
  }

  const finalPropertySellerIdSet = new Set(finalPropertySellerIds);
  const stillWithoutProperty = allSellers.filter(s => !finalPropertySellerIdSet.has(s.id));
  
  console.log(`  物件なし売主数: ${stillWithoutProperty.length}`);
  
  if (stillWithoutProperty.length > 0) {
    console.log('\n  残りの物件なし売主:');
    stillWithoutProperty.slice(0, 10).forEach(s => {
      console.log(`    - ${s.seller_number}`);
    });
  }
}

fixRemainingMissingProperties().catch(console.error);
