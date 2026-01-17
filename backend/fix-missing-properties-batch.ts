/**
 * 物件なし売主に物件を一括作成するスクリプト（バッチ処理版）
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

async function fixMissingPropertiesBatch() {
  console.log('=== 物件なし売主を一括修正 ===\n');

  // 1. 全売主IDを取得
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

  // 2. 物件を持つ売主IDを取得
  console.log('📊 物件を持つ売主IDを取得中...');
  let propertySellerIds: string[] = [];
  page = 0;
  
  while (true) {
    const { data: properties } = await supabase
      .from('properties')
      .select('seller_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (!properties || properties.length === 0) break;
    propertySellerIds = propertySellerIds.concat(properties.map(p => p.seller_id));
    page++;
  }
  
  const propertySellerIdSet = new Set(propertySellerIds);
  console.log(`  物件を持つ売主数: ${propertySellerIdSet.size}`);

  // 3. 物件なし売主を特定
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

  // 売主番号 -> 行データのマップ
  const rowMap = new Map<string, any>();
  allRows.forEach((row: any) => {
    if (row['売主番号']) {
      rowMap.set(row['売主番号'], row);
    }
  });

  // 5. 物件を一括作成
  console.log('\n🔧 物件を一括作成中...');
  
  const propertiesToInsert: any[] = [];
  let notFoundCount = 0;

  for (const seller of sellersWithoutProperty) {
    const row = rowMap.get(seller.seller_number);
    
    if (row) {
      const mappedData = columnMapper.mapToDatabase(row);
      propertiesToInsert.push({
        seller_id: seller.id,
        address: mappedData.property_address || '未入力',
        property_type: mappedData.property_type || null,
        land_area: mappedData.land_area || null,
        building_area: mappedData.building_area || null,
        build_year: mappedData.build_year || null,
        structure: mappedData.structure || null,
        floor_plan: mappedData.floor_plan || null,
      });
    } else {
      // スプレッドシートにない場合は空の物件を作成
      propertiesToInsert.push({
        seller_id: seller.id,
        address: '未入力',
      });
      notFoundCount++;
    }
  }

  console.log(`  作成予定: ${propertiesToInsert.length}件`);
  console.log(`  うちスプレッドシートになし: ${notFoundCount}件`);

  // バッチで挿入（100件ずつ）
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < propertiesToInsert.length; i += batchSize) {
    const batch = propertiesToInsert.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('properties')
      .insert(batch);
    
    if (error) {
      console.log(`  ❌ バッチ ${Math.floor(i / batchSize) + 1} エラー: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
    
    console.log(`  進捗: ${Math.min(i + batchSize, propertiesToInsert.length)}/${propertiesToInsert.length}`);
  }

  console.log(`\n=== 完了 ===`);
  console.log(`挿入成功: ${inserted}件`);
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
  
  if (stillWithoutProperty.length > 0 && stillWithoutProperty.length <= 10) {
    console.log('\n  残りの物件なし売主:');
    stillWithoutProperty.forEach(s => {
      console.log(`    - ${s.seller_number}`);
    });
  }
}

fixMissingPropertiesBatch().catch(console.error);
