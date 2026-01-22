import { GoogleDriveService } from './src/services/GoogleDriveService';

async function debugImageSelection() {
  try {
    console.log('🔍 Debugging Image Selection Issue...\n');
    
    const driveService = new GoogleDriveService();
    
    // 1. ルートフォルダの内容を確認
    console.log('1️⃣ Checking root folder contents...');
    const rootResult = await driveService.listFolderContents(null);
    console.log(`   Found ${rootResult.files.length} items in root`);
    
    if (rootResult.files.length > 0) {
      console.log('   Items:');
      rootResult.files.forEach(f => {
        console.log(`     ${f.isFolder ? '📁' : '📄'} ${f.name} (${f.mimeType})`);
      });
      
      // 最初のフォルダを探す
      const firstFolder = rootResult.files.find(f => f.isFolder);
      if (firstFolder) {
        console.log(`\n2️⃣ Checking first folder: ${firstFolder.name}`);
        const folderResult = await driveService.listFolderContents(firstFolder.id);
        console.log(`   Found ${folderResult.files.length} items`);
        
        // 画像ファイルを探す
        const images = folderResult.files.filter(f => 
          !f.isFolder && f.mimeType.startsWith('image/')
        );
        console.log(`   Found ${images.length} images`);
        
        if (images.length > 0) {
          console.log('   Images:');
          images.forEach(img => {
            console.log(`     🖼️  ${img.name}`);
            console.log(`        Size: ${(img.size / 1024).toFixed(2)} KB`);
            console.log(`        Thumbnail: ${img.thumbnailLink ? 'Yes' : 'No'}`);
          });
        }
      }
    } else {
      console.log('   ⚠️  Root folder is empty');
      console.log('   This might be why no images are showing up');
    }
    
    console.log('\n✅ Diagnostic complete');
    
  } catch (error: any) {
    console.error('\n❌ Error during diagnostic:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugImageSelection();
