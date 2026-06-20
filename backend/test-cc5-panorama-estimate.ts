import { PanoramaUrlService } from './src/services/PanoramaUrlService';
import { PropertyService } from './src/services/PropertyService';

async function testCC5() {
  console.log('='.repeat(80));
  console.log('CC5 パノラマ・概算書テスト');
  console.log('='.repeat(80));
  console.log('');

  const propertyNumber = 'CC5';

  // 1. パノラマURLテスト
  console.log('📊 Test 1: パノラマURL取得');
  console.log('-'.repeat(80));
  try {
    const panoramaService = new PanoramaUrlService();
    console.log(`物件番号: ${propertyNumber}`);
    console.log('取得開始...');
    
    const startTime = Date.now();
    const panoramaUrl = await panoramaService.getPanoramaUrl(propertyNumber);
    const endTime = Date.now();
    
    console.log(`取得時間: ${(endTime - startTime) / 1000}秒`);
    
    if (panoramaUrl) {
      console.log('✅ パノラマURL取得成功');
      console.log(`URL: ${panoramaUrl}`);
    } else {
      console.log('❌ パノラマURLが見つかりません');
    }
  } catch (error: any) {
    console.error('❌ パノラマURL取得エラー:', error.message);
    console.error('詳細:', error);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('');

  // 2. 概算書PDF生成テスト
  console.log('📊 Test 2: 概算書PDF生成');
  console.log('-'.repeat(80));
  try {
    const propertyService = new PropertyService();
    console.log(`物件番号: ${propertyNumber}`);
    console.log('生成開始...');
    
    const startTime = Date.now();
    const pdfUrl = await propertyService.generateEstimatePdf(propertyNumber);
    const endTime = Date.now();
    
    console.log(`生成時間: ${(endTime - startTime) / 1000}秒`);
    
    if (pdfUrl) {
      console.log('✅ 概算書PDF生成成功');
      console.log(`PDF URL: ${pdfUrl}`);
    } else {
      console.log('❌ 概算書PDFが生成できませんでした');
    }
  } catch (error: any) {
    console.error('❌ 概算書PDF生成エラー:', error.message);
    console.error('詳細:', error);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('テスト完了');
  console.log('='.repeat(80));
}

testCC5().catch(console.error);
