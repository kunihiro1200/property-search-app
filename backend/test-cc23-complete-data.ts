// CC23の完全なデータを確認するテストスクリプト
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { PropertyService } from './src/services/PropertyService';

async function testCC23CompleteData() {
  try {
    console.log('=== CC23 Complete Data Test ===\n');
    
    const propertyNumber = 'CC23';
    
    // 1. PropertyDetailsServiceからデータを取得
    console.log('1. Fetching data from PropertyDetailsService...');
    const propertyDetailsService = new PropertyDetailsService();
    const details = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    console.log('\n📊 PropertyDetailsService Results:');
    console.log('- favorite_comment:', details.favorite_comment ? `"${details.favorite_comment}"` : 'null');
    console.log('- recommended_comments:', details.recommended_comments ? `${details.recommended_comments.length} items` : 'null');
    if (details.recommended_comments) {
      details.recommended_comments.forEach((comment: any, index: number) => {
        console.log(`  [${index}]:`, typeof comment === 'string' ? `"${comment}"` : comment);
      });
    }
    console.log('- athome_data:', details.athome_data ? `${details.athome_data.length} items` : 'null');
    if (details.athome_data) {
      details.athome_data.forEach((item: any, index: number) => {
        console.log(`  [${index}]:`, item || '(empty)');
      });
    }
    console.log('- property_about:', details.property_about ? `"${details.property_about.substring(0, 50)}..."` : 'null');
    
    // 2. パノラマURLを確認
    console.log('\n2. Checking panorama URL...');
    let panoramaUrl = null;
    if (details.athome_data && Array.isArray(details.athome_data) && details.athome_data.length > 1) {
      panoramaUrl = details.athome_data[1] || null;
      console.log('✅ Panorama URL found:', panoramaUrl);
    } else {
      console.log('❌ Panorama URL not found');
      console.log('   - athome_data exists:', !!details.athome_data);
      console.log('   - athome_data is array:', Array.isArray(details.athome_data));
      console.log('   - athome_data length:', details.athome_data?.length || 0);
    }
    
    // 3. 概算書PDF生成をテスト
    console.log('\n3. Testing estimate PDF generation...');
    const propertyService = new PropertyService();
    
    try {
      const pdfUrl = await propertyService.generateEstimatePdf(propertyNumber);
      console.log('✅ PDF URL generated:', pdfUrl);
    } catch (error: any) {
      console.log('❌ PDF generation failed:', error.message);
      console.log('   Error details:', {
        code: error.code,
        message: error.message,
      });
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
  }
}

testCC23CompleteData();
