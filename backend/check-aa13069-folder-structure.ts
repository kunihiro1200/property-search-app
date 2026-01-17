import { GoogleDriveService } from './src/services/GoogleDriveService';
import dotenv from 'dotenv';

dotenv.config();

async function checkFolderStructure() {
  const driveService = new GoogleDriveService();
  
  // AA13069のstorage_location
  const folderId = '1koHdBU_2UnhkGxaZP3OoNS1AYracP5Vg';
  
  console.log('🔍 Checking folder structure for AA13069...\n');
  console.log(`Folder ID: ${folderId}`);
  console.log(`URL: https://drive.google.com/drive/folders/${folderId}\n`);
  
  // フォルダ名を取得
  const metadata = await driveService.getFileMetadata(folderId);
  console.log(`📁 Folder name: ${metadata?.name}\n`);
  
  // サブフォルダを取得
  console.log('📂 Subfolders:');
  const subfolders = await driveService.listSubfolders(folderId);
  if (subfolders.length === 0) {
    console.log('  (No subfolders)');
  } else {
    subfolders.forEach(folder => {
      console.log(`  - ${folder.name} (${folder.id})`);
    });
  }
  
  // 画像ファイルを取得
  console.log('\n🖼️ Images in this folder:');
  const images = await driveService.listImagesWithThumbnails(folderId);
  if (images.length === 0) {
    console.log('  (No images)');
  } else {
    images.slice(0, 5).forEach(img => {
      console.log(`  - ${img.name}`);
    });
    if (images.length > 5) {
      console.log(`  ... and ${images.length - 5} more`);
    }
  }
}

checkFolderStructure().catch(console.error);
