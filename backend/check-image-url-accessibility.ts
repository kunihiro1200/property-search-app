/**
 * 画像URLに直接アクセスして、画像が取得できるか確認するスクリプト
 */

async function checkImageUrlAccessibility() {
  console.log('🔍 Checking image URL accessibility...\n');

  const imageUrls = [
    {
      propertyNumber: 'AA12649',
      url: 'https://property-site-frontend-kappa.vercel.app/api/public/images/1pvY-mO6ZfOuK3uwaXcfNfYhv1z5_nmWL/thumbnail'
    },
    {
      propertyNumber: 'AA12495',
      url: 'https://property-site-frontend-kappa.vercel.app/api/public/images/1FRMPsHRMBlGDuKHeTHDB-NDd3x0eDyvt/thumbnail'
    }
  ];

  for (const { propertyNumber, url } of imageUrls) {
    console.log(`\n📋 Checking ${propertyNumber}...`);
    console.log('─'.repeat(60));
    console.log(`🌐 URL: ${url}`);

    try {
      const response = await fetch(url);
      
      console.log(`   - Status: ${response.status} ${response.statusText}`);
      console.log(`   - Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   - Content-Length: ${response.headers.get('content-length')}`);

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          console.log(`   ✅ Image is accessible`);
        } else {
          console.log(`   ❌ Response is not an image (Content-Type: ${contentType})`);
          const text = await response.text();
          console.log(`   Response body (first 200 chars): ${text.substring(0, 200)}`);
        }
      } else {
        console.log(`   ❌ Image is not accessible`);
        const text = await response.text();
        console.log(`   Error response: ${text.substring(0, 200)}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Error fetching image:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Check complete');
}

checkImageUrlAccessibility();
