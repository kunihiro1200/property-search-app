import { GoogleDriveService } from './src/services/GoogleDriveService';

async function testDriveFolderContents() {
  try {
    console.log('🔍 Testing Google Drive folder contents API...');
    
    const driveService = new GoogleDriveService();
    
    // ルートフォルダの内容を取得
    console.log('📂 Fetching root folder contents...');
    const result = await driveService.listFolderContents(null);
    
    console.log('✅ Success!');
    console.log(`Found ${result.files.length} items`);
    console.log('\nFiles and folders:');
    result.files.forEach(f => {
      console.log(`  ${f.isFolder ? '📁' : '📄'} ${f.name}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error details:');
    console.error(error);
  }
}

testDriveFolderContents();
