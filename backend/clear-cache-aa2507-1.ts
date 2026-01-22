import dotenv from 'dotenv';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config();

async function clearCacheAA2507_1() {
  console.log('=== AA2507-1 キャッシュクリア ===\n');

  try {
    const imageService = new PropertyImageService();
    
    // AA2507-1のフォルダID
    const folderId = '1h1n2w3YosBBBVq9XqJr1abLp63OrHiif';
    
    console.log('キャッシュをクリア中...');
    imageService.clearCache(folderId);
    
    console.log('✅ キャッシュをクリアしました');
    console.log('');
    console.log('ブラウザで以下を試してください：');
    console.log('  1. ページをリロード（Ctrl+R または Cmd+R）');
    console.log('  2. ハードリロード（Ctrl+Shift+R または Cmd+Shift+R）');
    console.log('  3. ブラウザのキャッシュをクリア');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

clearCacheAA2507_1();
