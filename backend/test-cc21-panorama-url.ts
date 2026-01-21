import dotenv from 'dotenv';
import { PanoramaUrlService } from './src/services/PanoramaUrlService';

dotenv.config();

async function testCC21PanoramaUrl() {
  console.log('🔍 CC21のパノラマURLを取得中...\n');

  try {
    const panoramaUrlService = new PanoramaUrlService();
    const panoramaUrl = await panoramaUrlService.getPanoramaUrl('CC21');

    console.log('✅ 取得結果:');
    console.log('物件番号: CC21');
    console.log('パノラマURL:', panoramaUrl || '(取得できませんでした)');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testCC21PanoramaUrl();
