/**
 * AA13407のAPIレスポンスを確認するスクリプト
 */

import axios from 'axios';

async function testAA13407ApiResponse() {
  console.log('=== AA13407 APIレスポンス確認 ===\n');
  
  // 本番環境のAPIを確認
  const productionUrl = 'https://backend-kappa-one-30.vercel.app/api/public/properties/complete';
  
  try {
    console.log('📋 本番環境APIを確認中...');
    const response = await axios.get(productionUrl, {
      params: {
        propertyNumber: 'AA13407',
      },
      timeout: 30000,
    });
    
    const properties = response.data.properties || response.data;
    const aa13407 = Array.isArray(properties) 
      ? properties.find((p: any) => p.property_number === 'AA13407')
      : properties;
    
    if (aa13407) {
      console.log('\n📊 AA13407のデータ:');
      console.log('  property_number:', aa13407.property_number);
      console.log('  property_type:', aa13407.property_type);
      console.log('  favorite_comment:', aa13407.favorite_comment ? '✅ あり' : '❌ なし');
      if (aa13407.favorite_comment) {
        console.log('    内容:', aa13407.favorite_comment.substring(0, 50) + '...');
      }
      console.log('  recommended_comments:', aa13407.recommended_comments?.length || 0, '件');
      console.log('  athome_data:', aa13407.athome_data?.length || 0, '件');
    } else {
      console.log('❌ AA13407が見つかりません');
      console.log('レスポンス:', JSON.stringify(response.data, null, 2).substring(0, 500));
    }
  } catch (error: any) {
    console.error('❌ APIエラー:', error.message);
  }
}

testAA13407ApiResponse().catch(console.error);
