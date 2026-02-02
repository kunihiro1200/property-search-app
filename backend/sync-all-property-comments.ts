import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAllPropertyComments() {
  console.log('🔄 Syncing all property comments from Athome sheets...\n');
  
  const athomeSheetSyncService = new AthomeSheetSyncService();
  const propertyDetailsService = new PropertyDetailsService();
  
  // 業務リストからspreadsheet_urlが入っている物件を取得
  console.log('📊 Fetching properties with spreadsheet_url from work_tasks...');
  const { data: workTasks, error: workTasksError } = await supabase
    .from('work_tasks')
    .select('property_number, spreadsheet_url')
    .not('spreadsheet_url', 'is', null)
    .order('property_number');
  
  if (workTasksError) {
    console.error('❌ Error fetching work_tasks:', workTasksError);
    return;
  }
  
  console.log(`✅ Found ${workTasks.length} properties with spreadsheet_url\n`);
  
  // これらの物件のproperty_detailsを取得
  console.log('📊 Fetching property_details for these properties...');
  const propertyNumbers = workTasks.map(wt => wt.property_number);
  
  const { data: properties, error } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, recommended_comments, athome_data')
    .in('property_number', propertyNumbers)
    .order('property_number');
  
  if (error) {
    console.error('❌ Error fetching properties:', error);
    return;
  }
  
  // コメントデータが空の物件をフィルタリング
  const emptyCommentProperties = properties.filter(p => 
    !p.favorite_comment && 
    (!p.recommended_comments || p.recommended_comments.length === 0) &&
    (!p.athome_data || p.athome_data.length === 0)
  );
  
  console.log(`✅ Found ${emptyCommentProperties.length} properties with empty comments (out of ${workTasks.length} with spreadsheet_url)\n`);
  
  // 物件種別を取得（バッチ処理で100件ずつ）
  console.log('📊 Fetching property types in batches...');
  const propertyTypeMap = new Map<string, string>();
  const batchSize = 100;
  
  for (let i = 0; i < emptyCommentProperties.length; i += batchSize) {
    const batch = emptyCommentProperties.slice(i, i + batchSize);
    const propertyNumbers = batch.map(p => p.property_number);
    
    const { data: listings, error: listingsError } = await supabase
      .from('property_listings')
      .select('property_number, property_type')
      .in('property_number', propertyNumbers);
    
    if (listingsError) {
      console.error(`❌ Error fetching property listings (batch ${i / batchSize + 1}):`, listingsError);
      continue;
    }
    
    listings.forEach(l => {
      propertyTypeMap.set(l.property_number, l.property_type);
    });
    
    console.log(`  Batch ${i / batchSize + 1}/${Math.ceil(emptyCommentProperties.length / batchSize)}: ${listings.length} properties`);
  }
  
  console.log(`✅ Fetched property types for ${propertyTypeMap.size} properties\n`);
  
  // 統計情報
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const errors: { propertyNumber: string; error: string }[] = [];
  
  console.log('🔄 Starting sync...\n');
  console.log('⏱️  Syncing 1 property every 3 seconds to avoid API quota limits\n');
  console.log(`⏱️  Estimated time: ${Math.ceil(emptyCommentProperties.length * 3 / 60)} minutes\n`);
  
  for (let i = 0; i < emptyCommentProperties.length; i++) {
    const property = emptyCommentProperties[i];
    const propertyNumber = property.property_number;
    const propertyType = propertyTypeMap.get(propertyNumber);
    
    // 進捗表示
    console.log(`[${i + 1}/${emptyCommentProperties.length}] ${propertyNumber}...`);
    
    // 物件種別が不明な場合はスキップ
    if (!propertyType) {
      console.log(`  ⚠️  Skipped (property type unknown)`);
      skipCount++;
      continue;
    }
    
    // 物件種別を変換
    let mappedPropertyType: 'land' | 'detached_house' | 'apartment';
    if (propertyType === '土地') {
      mappedPropertyType = 'land';
    } else if (propertyType === '戸建') {
      mappedPropertyType = 'detached_house';
    } else if (propertyType === 'マンション') {
      mappedPropertyType = 'apartment';
    } else {
      console.log(`  ⚠️  Skipped (unsupported property type: ${propertyType})`);
      skipCount++;
      continue;
    }
    
    try {
      // 同期実行
      const success = await athomeSheetSyncService.syncPropertyComments(
        propertyNumber,
        mappedPropertyType,
        1, // リトライ回数を1回に制限（時間短縮のため）
        500 // リトライ間隔を500msに短縮
      );
      
      if (success) {
        console.log(`  ✅ Success`);
        successCount++;
      } else {
        console.log(`  ❌ Failed`);
        failCount++;
        errors.push({ propertyNumber, error: 'Sync failed' });
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      failCount++;
      errors.push({ propertyNumber, error: error.message });
    }
    
    // APIクォータ制限を回避するため、3秒待機
    if (i < emptyCommentProperties.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 Sync Summary:');
  console.log('='.repeat(60));
  console.log(`Total properties: ${emptyCommentProperties.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Skipped: ${skipCount}`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n❌ Failed properties:');
    errors.forEach(e => {
      console.log(`  - ${e.propertyNumber}: ${e.error}`);
    });
  }
}

syncAllPropertyComments().catch(console.error);
