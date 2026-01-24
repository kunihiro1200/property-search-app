import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleDriveService } from './src/services/GoogleDriveService';

dotenv.config();

/**
 * CC6のstorage_locationを親フォルダURLからathome公開フォルダURLに更新
 */
async function updateCC6StorageLocation() {
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

    if (!property.storage_location) {
      console.error(`❌ No storage_location found for ${propertyNumber}`);
      return;
    }

    // 2. URLからフォルダIDを抽出
    const folderIdMatch = property.storage_location.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (!folderIdMatch) {
      console.error(`❌ Invalid folder URL format: ${property.storage_location}`);
      return;
    }

    const parentFolderId = folderIdMatch[1];
    console.log(`\n🔍 Parent folder ID: ${parentFolderId}`);

    // 3. サブフォルダ一覧を取得
    const subfolders = await driveService.listSubfolders(parentFolderId);
    console.log(`\n📂 Found ${subfolders.length} subfolders in parent folder`);

    if (subfolders.length === 0) {
      console.error(`❌ No subfolders found in parent folder`);
      return;
    }

    // 4. CC6を含むフォルダを検索
    const propertyFolder = subfolders.find(folder => 
      folder.name && folder.name.includes(propertyNumber)
    );

    if (!propertyFolder) {
      console.error(`❌ Property folder not found for ${propertyNumber}`);
      console.log(`\n📋 Available subfolders:`);
      subfolders.forEach(folder => console.log(`  - ${folder.name}`));
      return;
    }

    console.log(`\n✅ Found property folder: ${propertyFolder.name} (${propertyFolder.id})`);

    // 5. 物件フォルダ内でathome公開フォルダを検索
    const athomeFolderId = await driveService.findFolderByName(propertyFolder.id, 'athome公開', true);

    if (!athomeFolderId) {
      console.error(`❌ athome公開 folder not found in property folder: ${propertyFolder.id}`);
      return;
    }

    console.log(`\n✅ Found athome公開 folder: ${athomeFolderId}`);

    // 6. athome公開フォルダのURLを生成
    const athomePublicUrl = `https://drive.google.com/drive/folders/${athomeFolderId}`;
    console.log(`\n📝 New storage_location: ${athomePublicUrl}`);

    // 7. データベースを更新
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

  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error.stack);
  }
}

updateCC6StorageLocation();
