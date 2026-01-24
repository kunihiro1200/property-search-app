import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleDriveService } from './src/services/GoogleDriveService';

dotenv.config();

/**
 * CC6のstorage_locationをathome公開フォルダURLに更新
 * searchFolderByName()を使用（全角・半角対応）
 */
async function updateCC6StorageLocationFinal() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const driveService = new GoogleDriveService();
  const propertyNumber = 'CC6';

  try {
    console.log(`\n🔍 Updating storage_location for ${propertyNumber}...`);

    // 1. 現在のstorage_locationを取得
    const { data: property, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', propertyNumber)
      .single();

    if (fetchError || !property) {
      console.error(`❌ Property not found: ${propertyNumber}`);
      return;
    }

    console.log(`\n📋 Current storage_location: ${property.storage_location}`);

    // 2. searchFolderByName()を使用してCC6フォルダを検索
    const propertyFolderId = await driveService.searchFolderByName(propertyNumber);

    if (!propertyFolderId) {
      console.error(`❌ Property folder not found for ${propertyNumber}`);
      return;
    }

    console.log(`\n✅ Found property folder ID: ${propertyFolderId}`);

    // 3. 物件フォルダ内でathome公開フォルダを検索
    const athomeFolderId = await driveService.findFolderByName(propertyFolderId, 'athome公開', true);

    if (!athomeFolderId) {
      console.error(`❌ athome公開 folder not found in property folder: ${propertyFolderId}`);
      return;
    }

    console.log(`\n✅ Found athome公開 folder: ${athomeFolderId}`);

    // 4. athome公開フォルダのURLを生成
    const athomePublicUrl = `https://drive.google.com/drive/folders/${athomeFolderId}`;
    console.log(`\n📝 New storage_location: ${athomePublicUrl}`);

    // 5. データベースを更新
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        storage_location: athomePublicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', propertyNumber);

    if (updateError) {
      console.error(`❌ Failed to update database:`, updateError);
      return;
    }

    console.log(`\n✅ Successfully updated storage_location for ${propertyNumber}`);
    console.log(`\n📊 Summary:`);
    console.log(`  Old URL: ${property.storage_location}`);
    console.log(`  New URL: ${athomePublicUrl}`);
    console.log(`\n🎉 Done! Images should now display correctly.`);

  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error.stack);
  }
}

updateCC6StorageLocationFinal();
