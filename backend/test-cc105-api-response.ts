import axios from 'axios';

async function testCC105API() {
  console.log('🔍 Testing CC105 API response...\n');

  try {
    // 本番環境のAPIエンドポイントをテスト
    // フロントエンドと同じドメイン（相対パス）
    const apiUrl = 'https://property-site-frontend-kappa.vercel.app/api/public/properties';
    
    console.log('📡 Fetching from:', apiUrl);
    console.log('   Filter: propertyNumber=CC105\n');

    const response = await axios.get(apiUrl, {
      params: {
        propertyNumber: 'CC105',
        limit: 1
        // skipImages: 'true'  // コメントアウト：デフォルト（false）でテスト
      }
    });

    console.log('📦 Raw API Response:', JSON.stringify(response.data, null, 2));

    const properties = response.data.properties || response.data;
    
    if (!properties || (Array.isArray(properties) && properties.length === 0)) {
      console.log('❌ CC105 not found in API response');
      return;
    }

    const cc105 = Array.isArray(properties) ? properties[0] : properties;
    
    console.log('📊 API Response for CC105:');
    console.log('  property_number:', cc105.property_number);
    console.log('  price:', cc105.price);
    console.log('  sales_price:', cc105.sales_price);
    console.log('  listing_price:', cc105.listing_price);
    console.log('  atbb_status:', cc105.atbb_status);
    console.log('  badge_type:', cc105.badge_type);
    console.log('  is_clickable:', cc105.is_clickable);

    console.log('\n💰 Price Analysis:');
    if (cc105.price === undefined) {
      console.log('  ❌ price field is UNDEFINED');
    } else if (cc105.price === null) {
      console.log('  ❌ price field is NULL');
    } else if (cc105.price === 0) {
      console.log('  ❌ price field is 0');
    } else {
      console.log('  ✅ price field:', cc105.price.toLocaleString('ja-JP'), '円');
      console.log('  ✅ Expected display:', (cc105.price / 10000).toFixed(0), '万円');
    }

    console.log('\n🔧 Diagnosis:');
    if (!cc105.price || cc105.price === 0) {
      console.log('  ⚠️ PROBLEM: price is missing or 0 in API response');
      console.log('  ⚠️ This will show "価格応談" on frontend');
      console.log('  ⚠️ Backend API is not returning price field correctly');
      console.log('  ⚠️ Check PropertyListingService.ts');
    } else {
      console.log('  ✅ API is returning price correctly');
      console.log('  ✅ If still showing "価格応談", check frontend code');
    }

  } catch (error: any) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }

  console.log('\n✨ Test completed!');
}

testCC105API().catch(console.error);
