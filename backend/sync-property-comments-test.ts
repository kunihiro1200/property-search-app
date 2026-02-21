import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncPropertyCommentsTest() {
  console.log('🔄 Testing property comments sync (first 10 properties)...\n');
  
  const athomeSheetSyncService = new AthomeSheetSyncService();
  
  // テスト対象の物件（CC100とAA5564を含む最初の10件）
  const testProperties = [
    { property_number: 'CC100', property_type: 'detached_house' },
    { property_number: 'CC101', property_type: 'detached_house' },
    { property_number: 'CC102', property_type: 'detached_house' },
    { property_number: 'CC103', property_type: 'detached_house' },
    { property_number: 'CC104', property_type: 'detached_house' },
    { property_number: 'CC105', property_type: 'apartment' },
    { property_number: 'AA10004', property_type: 'detached_house' },
    { property_number: 'AA10016', property_type: 'detached_house' },
    { property_number: 'AA10018', property_type: 'detached_house' },
    { property_number: 'AA10025', property_type: 'detached_house' },
  ];
  
  let successCount = 0;
  let failCount = 0;
  const errors: { propertyNumber: string; error: string }[] = [];
  
  console.log('🔄 Starting test sync...\n');
  
  for (let i = 0; i < testProperties.length; i++) {
    const { property_number, property_type } = testProperties[i];
    
    console.log(`[${i + 1}/${testProperties.length}] ${property_number} (${property_type})...`);
    
    try {
      const success = await athomeSheetSyncService.syncPropertyComments(
        property_number,
        property_type as 'land' | 'detached_house' | 'apartment',
        1,
        500
      );
      
      if (success) {
        console.log(`  ✅ Success`);
        successCount++;
      } else {
        console.log(`  ❌ Failed`);
        failCount++;
        errors.push({ propertyNumber: property_number, error: 'Sync failed' });
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      failCount++;
      errors.push({ propertyNumber: property_number, error: error.message });
    }
    
    // 1秒待機
    if (i < testProperties.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Sync Summary:');
  console.log('='.repeat(60));
  console.log(`Total properties: ${testProperties.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n❌ Failed properties:');
    errors.forEach(e => {
      console.log(`  - ${e.propertyNumber}: ${e.error}`);
    });
  }
}

syncPropertyCommentsTest().catch(console.error);
