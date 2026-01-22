/**
 * 公開物件詳細画面の画像取得をテストするスクリプト
 */

import dotenv from 'dotenv';
dotenv.config();

async function testPropertyDetailImages() {
  try {
    console.log('🔍 Testing property detail images API...\n');
    
    // まず一覧から物件を取得
    const listResponse = await fetch('http://localhost:3000/api/public/properties?limit=1&offset=0');
    
    if (!listResponse.ok) {
      throw new Error(`List API request failed: ${listResponse.status}`);
    }
    
    const listData = await listResponse.json();
    
    if (!listData.properties || listData.properties.length === 0) {
      console.log('⚠️  No properties found');
      return;
    }
    
    const property = listData.properties[0];
    console.log(`Testing property: ${property.property_number} (${property.id})\n`);
    
    // 一覧画面の画像情報
    console.log('📊 List Page:');
    console.log(`  Images array length: ${property.images?.length || 0}`);
    if (property.images && property.images.length > 0) {
      console.log(`  ✅ First image: ${property.images[0]}`);
    } else {
      console.log(`  ❌ No images`);
    }
    console.log('');
    
    // 詳細画面の画像APIを呼び出し
    console.log('📊 Detail Page (Images API):');
    const imagesResponse = await fetch(`http://localhost:3000/api/public/properties/${property.id}/images`);
    
    if (!imagesResponse.ok) {
      console.log(`  ❌ Images API failed: ${imagesResponse.status}`);
    } else {
      const imagesData = await imagesResponse.json();
      console.log(`  Images array length: ${imagesData.images?.length || 0}`);
      console.log(`  Visible count: ${imagesData.visibleCount || 0}`);
      console.log(`  Hidden count: ${imagesData.hiddenCount || 0}`);
      
      if (imagesData.images && imagesData.images.length > 0) {
        console.log(`  ✅ First image: ${imagesData.images[0].thumbnailUrl}`);
      } else {
        console.log(`  ❌ No images`);
      }
    }
    console.log('');
    
    // 比較
    console.log('📊 Comparison:');
    const listImage = property.images?.[0];
    const detailResponse = await fetch(`http://localhost:3000/api/public/properties/${property.id}/images`);
    const detailData = await detailResponse.json();
    const detailImage = detailData.images?.[0]?.thumbnailUrl;
    
    console.log(`  List image: ${listImage || 'N/A'}`);
    console.log(`  Detail image: ${detailImage || 'N/A'}`);
    
    if (listImage && detailImage) {
      // URLの末尾のファイルIDを比較
      const listImageId = listImage.split('/').filter(Boolean).pop()?.split('?')[0];
      const detailImageId = detailImage.split('/').filter(Boolean).pop()?.split('?')[0];
      
      console.log(`  List image ID: ${listImageId}`);
      console.log(`  Detail image ID: ${detailImageId}`);
      
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
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

// 実行
testPropertyDetailImages();
