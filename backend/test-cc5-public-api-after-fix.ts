import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testCC5PublicAPIAfterFix() {
  try {
    console.log('Testing CC5 in /api/public/properties endpoint after fix...\n');
    
    // 物件番号でフィルタリング
    const response = await axios.get('http://localhost:3000/api/public/properties', {
      params: {
        propertyNumber: 'CC5',
        limit: 1
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('');
    
    if (response.data.properties && response.data.properties.length > 0) {
      const property = response.data.properties[0];
      
      console.log('✅ Found CC5 in API response\n');
      console.log('Property data:');
      console.log('- Property Number:', property.property_number);
      console.log('- Address:', property.address);
      console.log('- ATBB Status:', property.atbb_status);
      console.log('- Badge Type:', property.badge_type);
      console.log('- Is Clickable:', property.is_clickable);
      console.log('- Has storage_location:', !!property.storage_location);
      console.log('- Images array length:', property.images?.length || 0);
      
      if (property.images && property.images.length > 0) {
        console.log('\n✅ Images found!');
        console.log('First image URL:', property.images[0]);
      } else {
        console.log('\n❌ No images in response');
        console.log('   Expected: Images should be fetched from業務リスト（業務依頼）');
      }
    } else {
      console.log('❌ CC5 not found in API response');
    }
    
  } catch (error: any) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCC5PublicAPIAfterFix();
