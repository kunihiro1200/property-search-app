import axios from 'axios';

/**
 * 本番環境のパノラマURL APIを直接テスト
 */

async function testProductionPanoramaApi() {
  console.log('🔍 本番環境のパノラマURL APIをテスト中...\n');

  try {
    // 1. Complete APIをテスト
    console.log('📊 Test 1: Complete API');
    const completeUrl = 'https://baikyaku-property-site3.vercel.app/api/public/properties/AA9743/complete';
    console.log(`URL: ${completeUrl}\n`);
    
    const completeStart = Date.now();
    const completeResponse = await axios.get(completeUrl);
    const completeTime = Date.now() - completeStart;
    
    console.log(`✅ Complete API レスポンス (${completeTime}ms):`);
    console.log('- panoramaUrl:', completeResponse.data.panoramaUrl || '❌ NULL');
    console.log('');

    // 2. 専用のパノラマURL APIをテスト
    console.log('📊 Test 2: Panorama URL API (専用エンドポイント)');
    const panoramaUrl = 'https://baikyaku-property-site3.vercel.app/api/public/properties/AA9743/panorama-url';
    console.log(`URL: ${panoramaUrl}\n`);
    
    const panoramaStart = Date.now();
    const panoramaResponse = await axios.get(panoramaUrl);
    const panoramaTime = Date.now() - panoramaStart;
    
    console.log(`✅ Panorama URL API レスポンス (${panoramaTime}ms):`);
    console.log('- success:', panoramaResponse.data.success);
    console.log('- panoramaUrl:', panoramaResponse.data.panoramaUrl || '❌ NULL');
    console.log('');

    // 3. 結果の比較
    console.log('📊 結果の比較:');
    const completeHasPanorama = !!completeResponse.data.panoramaUrl;
    const dedicatedHasPanorama = !!panoramaResponse.data.panoramaUrl;
    
    if (completeHasPanorama && dedicatedHasPanorama) {
      console.log('✅ 両方のAPIでパノラマURLが取得できています');
    } else if (!completeHasPanorama && !dedicatedHasPanorama) {
      console.log('❌ 両方のAPIでパノラマURLがnullです');
      console.log('\n考えられる原因:');
      console.log('1. PanoramaUrlServiceの初期化に失敗している');
      console.log('2. GyomuListServiceのキャッシュが空');
      console.log('3. Google Sheets APIの認証エラー');
      console.log('4. 環境変数が正しく設定されていない');
    } else {
      console.log('⚠️ APIによって結果が異なります');
      console.log('- Complete API:', completeHasPanorama ? '✅' : '❌');
      console.log('- Dedicated API:', dedicatedHasPanorama ? '✅' : '❌');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testProductionPanoramaApi();
