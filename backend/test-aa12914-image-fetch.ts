import dotenv from 'dotenv';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config();

async function testAA12914ImageFetch() {
  try {
    console.log('Testing AA12914 image fetch from storage_url...\n');
    
    const storageUrl = 'https://drive.google.com/drive/u/0/folders/1WCwCm1Y1jTu5XDyqucrdQEiSNU1s3v9G';
    const propertyId = 'test-aa12914';
    
    console.log('Storage URL:', storageUrl);
    console.log('');
    
    const propertyImageService = new PropertyImageService();
    
    console.log('Fetching first image...');
    const images = await propertyImageService.getFirstImage(propertyId, storageUrl);
    
    console.log('\n📊 Result:');
    console.log('- Images found:', images.length);
    if (images.length > 0) {
      console.log('- First image URL:', images[0]);
      console.log('\n✅ Image fetch successful!');
    } else {
      console.log('\n⚠️  No images found in the folder');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testAA12914ImageFetch();
