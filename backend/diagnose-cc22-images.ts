import dotenv from 'dotenv';
import { GoogleDriveService } from './src/services/GoogleDriveService';

dotenv.config();

async function diagnoseCC22Images() {
  console.log('🔍 Diagnosing CC22 image retrieval...\n');

  const driveService = new GoogleDriveService();
  
  const storageLocation = 'https://drive.google.com/drive/folders/18kS4tddOp2vwKJNmyvv_qTLBVKFKI7rd?usp=sharing';
  const propertyNumber = 'CC22';

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
      images.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.name}`);
        console.log(`     ID: ${img.id}`);
        console.log(`     Thumbnail: ${img.thumbnailUrl.substring(0, 80)}...`);
        console.log('');
      });
    } else {
      console.log('\n⚠️ No images found');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

diagnoseCC22Images().catch(console.error);
