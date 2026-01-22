import dotenv from 'dotenv';
import { GoogleDriveService } from './src/services/GoogleDriveService';

dotenv.config();

async function diagnoseCC9Images() {
  console.log('🔍 Diagnosing CC9 image retrieval...\n');

  const driveService = new GoogleDriveService();
  
  const storageLocation = 'https://drive.google.com/drive/folders/12kmTkUNsGX47EIYT0GCsL-MBpTYDzEBa?usp=sharing';
  const propertyNumber = 'CC9';

  console.log('📂 Storage Location:', storageLocation);
  console.log('🏠 Property Number:', propertyNumber);
  console.log('');

  try {
    // getImagesFromAthomePublicFolderを呼び出し
    console.log('📸 Calling getImagesFromAthomePublicFolder...\n');
    const images = await driveService.getImagesFromAthomePublicFolder(
      storageLocation,
      propertyNumber
    );

    console.log('\n✅ Result:');
    console.log(`Found ${images.length} images`);
    
    if (images.length > 0) {
      console.log('\n📋 Images:');
      images.slice(0, 5).forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.name}`);
        console.log(`     ID: ${img.id}`);
      });
      if (images.length > 5) {
        console.log(`  ... and ${images.length - 5} more images`);
      }
    } else {
      console.log('\n⚠️ No images found');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

diagnoseCC9Images().catch(console.error);
