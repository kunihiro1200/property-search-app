/**
 * 公開物件一覧APIの画像取得をテストするスクリプト
 * 一覧画面で画像が表示されない問題を調査
 */

import dotenv from 'dotenv';
dotenv.config();

async function testPublicPropertiesList() {
  try {
    console.log('🔍 Testing public properties list API...\n');
    
    // 一覧APIを呼び出し（最初の5件のみ）
    const response = await fetch('http://localhost:3000/api/public/properties?limit=5&offset=0');
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 API Response Summary:');
    console.log(`  Total properties: ${data.pagination?.total || 0}`);
    console.log(`  Returned properties: ${data.properties?.length || 0}`);
    console.log('');
    
    // 各物件の画像情報を確認
    if (data.properties && data.properties.length > 0) {
      console.log('🖼️  Image Information for Each Property:\n');
      
      for (const property of data.properties) {
        console.log(`Property: ${property.property_number}`);
        console.log(`  ID: ${property.id}`);
        console.log(`  Address: ${property.address}`);
        console.log(`  Has image_url: ${!!property.image_url}`);
        console.log(`  Has storage_location: ${!!property.storage_location}`);
        console.log(`  Storage location: ${property.storage_location || 'N/A'}`);
        console.log(`  Images array length: ${property.images?.length || 0}`);
        
        if (property.images && property.images.length > 0) {
          console.log(`  ✅ First image URL: ${property.images[0]}`);
        } else {
          console.log(`  ❌ No images in array`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️  No properties returned from API');
    }
    
    // 詳細画面との比較のため、最初の物件の詳細も取得
    if (data.properties && data.properties.length > 0) {
      const firstProperty = data.properties[0];
      console.log(`\n🔍 Comparing with detail page for property: ${firstProperty.property_number}\n`);
      
      const detailResponse = await fetch(`http://localhost:3000/api/public/properties/${firstProperty.id}/complete`);
      
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        
        console.log('Detail Page Data:');
        console.log(`  Property: ${detailData.property_number}`);
        console.log(`  Has storage_location: ${!!detailData.storage_location}`);
        console.log(`  Storage location: ${detailData.storage_location || 'N/A'}`);
        console.log(`  Images array length: ${detailData.images?.length || 0}`);
        
        if (detailData.images && detailData.images.length > 0) {
          console.log(`  ✅ First image URL: ${detailData.images[0].thumbnailUrl}`);
        } else {
          console.log(`  ❌ No images in array`);
        }
        
        // 一覧と詳細で画像が一致するか確認
        const listImage = firstProperty.images?.[0];
        const detailImage = detailData.images?.[0]?.thumbnailUrl;
        
        console.log('\n📊 Comparison:');
        console.log(`  List page image: ${listImage || 'N/A'}`);
        console.log(`  Detail page image: ${detailImage || 'N/A'}`);
        
        if (listImage && detailImage) {
          // URLの末尾のファイルIDを比較
          const listImageId = listImage.split('/').pop()?.split('?')[0];
          const detailImageId = detailImage.split('/').pop()?.split('?')[0];
          
          if (listImageId === detailImageId) {
            console.log(`  ✅ Images match!`);
          } else {
            console.log(`  ⚠️  Images differ`);
          }
        } else if (!listImage && !detailImage) {
          console.log(`  ℹ️  Both pages have no images`);
        } else {
          console.log(`  ❌ One page has image, the other doesn't`);
        }
      } else {
        console.log(`  ⚠️  Failed to fetch detail page: ${detailResponse.status}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// 実行
testPublicPropertiesList();
