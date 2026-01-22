/**
 * 全ての物件なし売主に物件を作成するスクリプト（改良版）
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

async function fixAllMissingProperties() {
  console.log('=== 全物件なし売主を修正（改良版） ===\n');

  // 1. 全売主を取得
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

  // 2. 各売主に対して物件があるか確認し、なければ作成
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

  // 3. 各売主をチェック
  console.log('\n🔧 物件なし売主をチェック中...');
  
  let checked = 0;
  let created = 0;
  let alreadyHas = 0;
  let notFound = 0;
  let errors = 0;

  for (const seller of allSellers) {
    checked++;
    
    // この売主の物件があるか確認
    const { data: existingProps, error: checkError } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', seller.id)
      .limit(1);
    
    if (checkError) {
      console.log(`  ❌ ${seller.seller_number}: チェックエラー - ${checkError.message}`);
      errors++;
      continue;
    }

    if (existingProps && existingProps.length > 0) {
      alreadyHas++;
      continue;
    }

    // 物件がない場合、スプレッドシートから作成
    const row = allRows.find((r: any) => r['売主番号'] === seller.seller_number);
    
    if (!row) {
      // スプレッドシートにない場合は空の物件を作成
      const { error: createError } = await supabase
        .from('properties')
        .insert({
          seller_id: seller.id,
          address: '未入力',
        });

      if (createError) {
        console.log(`  ❌ ${seller.seller_number}: 作成エラー - ${createError.message}`);
        errors++;
      } else {
        created++;
        notFound++;
      }
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
      console.log(`  ❌ ${seller.seller_number}: 作成エラー - ${createError.message}`);
      errors++;
    } else {
      created++;
    }

    if (checked % 500 === 0) {
      console.log(`  進捗: ${checked}/${allSellers.length} (作成: ${created}, 既存: ${alreadyHas})`);
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`チェック数: ${checked}`);
  console.log(`既に物件あり: ${alreadyHas}`);
  console.log(`新規作成: ${created}`);
  console.log(`  うちスプレッドシートになし: ${notFound}`);
  console.log(`エラー: ${errors}`);

  // 4. 最終確認
  console.log('\n📊 最終確認...');
  
  let missingCount = 0;
  for (const seller of allSellers) {
    const { data: props } = await supabase
      .from('properties')
      .select('id')
      .eq('seller_id', seller.id)
      .limit(1);
    
    if (!props || props.length === 0) {
      missingCount++;
      if (missingCount <= 5) {
        console.log(`  物件なし: ${seller.seller_number}`);
      }
    }
  }
  
  console.log(`\n物件なし売主数: ${missingCount}`);
}

fixAllMissingProperties().catch(console.error);
