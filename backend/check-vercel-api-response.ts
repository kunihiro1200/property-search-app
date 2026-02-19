/**
 * Vercel本番環境のAPIレスポンスを確認するスクリプト
 * 
 * AA12649とAA12495の画像データが正しく返されているか確認
 */

async function checkVercelApiResponse() {
  console.log('🔍 Checking Vercel API response...\n');

  const propertyNumbers = ['AA12649', 'AA12495'];

  for (const propertyNumber of propertyNumbers) {
    console.log(`\n📋 Checking ${propertyNumber}...`);
    console.log('─'.repeat(60));

    try {
      // Vercel本番環境のAPIエンドポイント
      const url = `https://property-site-frontend-kappa.vercel.app/api/public/properties?propertyNumber=${propertyNumber}`;
      
      console.log(`🌐 URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();

      console.log(`\n📊 Response:`, JSON.stringify(data, null, 2));

      if (data.success && data.properties && data.properties.length > 0) {
        const property = data.properties[0];
        
        console.log(`\n✅ Property found: ${property.property_number}`);
        console.log(`   - image_url: ${property.image_url || '(empty)'}`);
        console.log(`   - storage_location: ${property.storage_location || '(empty)'}`);
        console.log(`   - images array length: ${property.images?.length || 0}`);
        
        if (property.images && property.images.length > 0) {
          console.log(`   - First image:`);
          console.log(`     - thumbnailUrl: ${property.images[0].thumbnailUrl}`);
          console.log(`     - fullImageUrl: ${property.images[0].fullImageUrl}`);
        } else {
          console.log(`   ❌ No images in response`);
        }
      } else {
        console.log(`❌ Property not found or error in response`);
      }
    } catch (error: any) {
      console.error(`❌ Error fetching ${propertyNumber}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Check complete');
}

checkVercelApiResponse();
