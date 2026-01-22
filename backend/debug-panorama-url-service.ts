import dotenv from 'dotenv';
import { PanoramaUrlService } from './src/services/PanoramaUrlService';

dotenv.config();

/**
 * PanoramaUrlServiceのデバッグ
 * ローカル環境で動作確認
 */

async function debugPanoramaUrlService() {
  console.log('🔍 PanoramaUrlServiceのデバッグ中...\n');

  try {
    const panoramaUrlService = new PanoramaUrlService();
    
    console.log('📊 AA9743のパノラマURLを取得中...');
    const panoramaUrl = await panoramaUrlService.getPanoramaUrl('AA9743');
    
    if (panoramaUrl) {
      console.log('✅ パノラマURL取得成功:');
      console.log('   URL:', panoramaUrl);
    } else {
      console.log('❌ パノラマURLがnullです');
    }
    
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugPanoramaUrlService();
