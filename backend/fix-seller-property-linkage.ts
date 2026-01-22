/**
 * 売主と物件の紐付けを修正するスクリプト
 * 孤立した物件を正しい売主に再紐付けする
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

async function fixSellerPropertyLinkage() {
  console.log('=== 売主-物件紐付け修正スクリプト ===\n');

  // 1. 現状確認
  console.log('📊 現状確認中...');
  
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, seller_number');
  
  const { data: properties } = await supabase
    .from('properties')
    .select('id, seller_id, address, property_type');

  if (!sellers || !properties) {
    console.error('データ取得エラー');
    return;
  }

  console.log(`  売主数: ${sellers.length}`);
  console.log(`  物件数: ${properties.length}`);

  // 売主番号 -> 売主ID のマップ
  const sellerNumberToId = new Map<string, string>();
  sellers.forEach(s => {
    if (s.seller_number) {
      sellerNumberToId.set(s.seller_number, s.id);
    }
  });

  // 現在の売主IDセット
  const validSellerIds = new Set(sellers.map(s => s.id));

  // 孤立物件を特定
  const orphanedProperties = properties.filter(p => !validSellerIds.has(p.seller_id));
  console.log(`\n孤立物件数: ${orphanedProperties.length}`);

  if (orphanedProperties.length === 0) {
    console.log('✅ 孤立物件はありません');
    return;
  }

  // 2. スプレッドシートから売主番号と物件情報を取得
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

  // 3. 物件なし売主に対して物件を作成
  console.log('\n🔧 物件なし売主に物件を作成中...');
  
  const sellersWithoutProperty = sellers.filter(s => {
    return !properties.some(p => p.seller_id === s.id);
  });

  console.log(`  物件なし売主数: ${sellersWithoutProperty.length}`);

  let created = 0;
  let errors = 0;

  for (const seller of sellersWithoutProperty) {
    // スプレッドシートから該当行を取得
    const row = allRows.find((r: any) => r['売主番号'] === seller.seller_number);
    
    if (!row) {
      console.log(`  ⚠️ ${seller.seller_number}: スプレッドシートに見つかりません`);
      continue;
    }

    // マッピング
    const mappedData = columnMapper.mapToDatabase(row);

    // 物件を作成
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
      if (created % 100 === 0) {
        console.log(`  ✅ ${created}件作成完了...`);
      }
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`作成成功: ${created}件`);
  console.log(`エラー: ${errors}件`);

  // 4. 孤立物件の削除（オプション）
  console.log('\n🗑️ 孤立物件の削除...');
  
  const { error: deleteError } = await supabase
    .from('properties')
    .delete()
    .not('seller_id', 'in', `(${sellers.map(s => `'${s.id}'`).join(',')})`);

  if (deleteError) {
    console.log(`  ❌ 削除エラー: ${deleteError.message}`);
  } else {
    console.log(`  ✅ 孤立物件を削除しました`);
  }

  // 5. 最終確認
  console.log('\n📊 最終確認...');
  
  const { data: finalSellers } = await supabase
    .from('sellers')
    .select('id');
  
  const { data: finalProperties } = await supabase
    .from('properties')
    .select('seller_id');

  const finalSellerIds = new Set(finalSellers?.map(s => s.id) || []);
  const finalPropertySellerIds = new Set(finalProperties?.map(p => p.seller_id) || []);

  const stillOrphaned = finalProperties?.filter(p => !finalSellerIds.has(p.seller_id)) || [];
  const stillWithoutProperty = finalSellers?.filter(s => !finalPropertySellerIds.has(s.id)) || [];

  console.log(`  売主数: ${finalSellers?.length}`);
  console.log(`  物件数: ${finalProperties?.length}`);
  console.log(`  孤立物件: ${stillOrphaned.length}`);
  console.log(`  物件なし売主: ${stillWithoutProperty.length}`);
}

fixSellerPropertyLinkage().catch(console.error);
