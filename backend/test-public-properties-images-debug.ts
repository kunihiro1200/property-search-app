import axios from 'axios';

async function testPublicPropertiesImages() {
  try {
    console.log('Testing public properties API with images...\n');
    
    const response = await axios.get('http://localhost:3000/api/public/properties', {
      params: {
        limit: 5,
        offset: 0
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Total properties:', response.data.pagination.total);
    console.log('Properties returned:', response.data.properties.length);
    console.log('\n=== First 3 Properties ===\n');
    
    response.data.properties.slice(0, 3).forEach((property: any, index: number) => {
      console.log(`\n--- Property ${index + 1}: ${property.property_number} ---`);
      console.log('ID:', property.id);
      console.log('Address:', property.address);
      console.log('Has image_url:', !!property.image_url);
      console.log('Has storage_location:', !!property.storage_location);
      console.log('Images array length:', property.images?.length || 0);
      console.log('Images:', property.images);
      
      if (property.images && property.images.length > 0) {
        console.log('First image URL:', property.images[0]);
        console.log('Is absolute URL:', property.images[0].startsWith('http'));
        console.log('Is relative URL:', property.images[0].startsWith('/'));
      }
    });
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPublicPropertiesImages();
