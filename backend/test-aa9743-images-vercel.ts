import fetch from 'node-fetch';

async function testProductionImagesAPI() {
  console.log('=== Testing AA9743 Images API on Vercel ===\n');

  const propertyNumber = 'AA9743';
  // 本番環境URL
  const baseUrl = 'https://baikyaku-property-site3.vercel.app';
  
  try {
    console.log(`Fetching: ${baseUrl}/api/public/properties/${propertyNumber}/images`);
    
    const response = await fetch(`${baseUrl}/api/public/properties/${propertyNumber}/images`);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`\nResponse body (first 1000 chars):`);
    console.log(text.substring(0, 1000));
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log(`\nParsed JSON:`, JSON.stringify(data, null, 2));
      } catch (e) {
        console.log(`\nFailed to parse as JSON`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testProductionImagesAPI();
