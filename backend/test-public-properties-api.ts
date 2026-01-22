/**
 * Test script to check what the public properties API is actually returning
 */

async function testPublicPropertiesAPI() {
  try {
    console.log('Testing public properties API...\n');
    
    const response = await fetch('http://localhost:3000/api/public/properties?limit=5');
    
    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    console.log('API Response Structure:');
    console.log('- Total properties:', data.total);
    console.log('- Properties returned:', data.properties?.length || 0);
    console.log('\n');
    
    if (data.properties && data.properties.length > 0) {
      console.log('First property details:');
      const firstProperty = data.properties[0];
      console.log('- ID:', firstProperty.id);
      console.log('- Property Number:', firstProperty.property_number);
      console.log('- Address:', firstProperty.address);
      console.log('- Images field exists:', 'images' in firstProperty);
      console.log('- Images value:', firstProperty.images);
      console.log('- Images type:', typeof firstProperty.images);
      console.log('- Images is array:', Array.isArray(firstProperty.images));
      console.log('- Images length:', firstProperty.images?.length || 0);
      
      if (firstProperty.images && firstProperty.images.length > 0) {
        console.log('\nFirst image URL:');
        console.log(firstProperty.images[0]);
        
        // Try to fetch the image to see if it's accessible
        console.log('\nTesting image URL accessibility...');
        try {
          const imageResponse = await fetch(firstProperty.images[0]);
          console.log('- Image URL status:', imageResponse.status);
          console.log('- Image URL accessible:', imageResponse.ok);
          console.log('- Content-Type:', imageResponse.headers.get('content-type'));
        } catch (error: any) {
          console.error('- Image URL test failed:', error.message);
        }
      } else {
        console.log('\nNo images found for this property');
        console.log('- storage_location:', firstProperty.storage_location);
      }
      
      console.log('\n\nFull property object:');
      console.log(JSON.stringify(firstProperty, null, 2));
    } else {
      console.log('No properties returned from API');
    }
    
  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
}

testPublicPropertiesAPI();
