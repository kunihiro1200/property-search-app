/**
 * Test to find properties that should have images
 */

async function testPropertiesWithImages() {
  try {
    console.log('Testing public properties API for properties with images...\n');
    
    // Fetch more properties to find ones with images
    const response = await fetch('http://localhost:3000/api/public/properties?limit=50');
    
    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    console.log(`Total properties: ${data.total}`);
    console.log(`Properties fetched: ${data.properties?.length || 0}\n`);
    
    if (!data.properties || data.properties.length === 0) {
      console.log('No properties returned');
      return;
    }
    
    // Find properties with storage_location
    const withStorage = data.properties.filter((p: any) => p.storage_location);
    const withImages = data.properties.filter((p: any) => p.images && p.images.length > 0);
    
    console.log(`Properties with storage_location: ${withStorage.length}`);
    console.log(`Properties with images: ${withImages.length}\n`);
    
    if (withStorage.length > 0) {
      console.log('Sample property WITH storage_location:');
      const sample = withStorage[0];
      console.log(`- Property Number: ${sample.property_number}`);
      console.log(`- Address: ${sample.address}`);
      console.log(`- storage_location: ${sample.storage_location}`);
      console.log(`- Images count: ${sample.images?.length || 0}`);
      if (sample.images && sample.images.length > 0) {
        console.log(`- First image URL: ${sample.images[0]}`);
      }
      console.log('');
    }
    
    if (withImages.length > 0) {
      console.log('Properties with images:');
      withImages.forEach((p: any) => {
        console.log(`- ${p.property_number}: ${p.images.length} image(s)`);
      });
    } else {
      console.log('No properties have images yet');
    }
    
  } catch (error: any) {
    console.error('Test failed:', error.message);
  }
}

testPropertiesWithImages();
