import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resyncPublicPropertiesStorageLocations() {
  try {
    console.log('🔄 Re-syncing storage_location for public properties...\n');
    
    // ✅ 公開中の物件の定義（絶対に間違えない）
    // 1. atbb_statusに「公開中」が含まれる
    // 2. atbb_statusに「公開前」が含まれる
    // 3. atbb_statusに「非公開（配信メールのみ）」が含まれる
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, atbb_status')
      .or(
        'atbb_status.ilike.%公開中%,' +
        'atbb_status.ilike.%公開前%,' +
        'atbb_status.ilike.%非公開（配信メールのみ）%'
      )
      .order('property_number');
    
    if (error) {
      console.error('❌ Error fetching public properties:', error);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('⚠️ No public properties found');
      return;
    }
    
    console.log(`📋 Found ${properties.length} public properties\n`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Starting re-sync...');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const propertyImageService = new PropertyImageService();
    
    let successCount = 0;
    let unchangedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const progress = `[${i + 1}/${properties.length}]`;
      
      try {
        console.log(`${progress} Processing ${property.property_number}...`);
        
        // Google Driveでフォルダを検索
        const newFolderUrl = await propertyImageService.getImageFolderUrl(property.property_number);
        
        if (!newFolderUrl) {
          console.log(`  ❌ Folder not found in Google Drive`);
          notFoundCount++;
          continue;
        }
        
        // 既存のstorage_locationと比較
        if (property.storage_location === newFolderUrl) {
          console.log(`  ✅ Already correct: ${newFolderUrl}`);
          unchangedCount++;
          continue;
        }
        
        // storage_locationを更新
        const { error: updateError } = await supabase
          .from('property_listings')
          .update({ storage_location: newFolderUrl })
          .eq('id', property.id);
        
        if (updateError) {
          console.log(`  ❌ Error updating: ${updateError.message}`);
          errorCount++;
          continue;
        }
        
        console.log(`  ✅ Updated:`);
        console.log(`     Old: ${property.storage_location || 'null'}`);
        console.log(`     New: ${newFolderUrl}`);
        successCount++;
        
      } catch (error: any) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
      }
      
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`  Total properties: ${properties.length}`);
    console.log(`  ✅ Updated: ${successCount}`);
    console.log(`  ✓ Already correct: ${unchangedCount}`);
    console.log(`  ❌ Not found in Google Drive: ${notFoundCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    if (successCount > 0) {
      console.log('');
      console.log('✅ Re-sync completed successfully!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('  1. Restart the backend server to clear cache');
      console.log('  2. Verify images are displayed correctly on the public property site');
      console.log('  3. Run verify-all-storage-locations.ts to confirm all are correct');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

resyncPublicPropertiesStorageLocations();
