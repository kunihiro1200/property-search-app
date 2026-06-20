import * as dotenv from 'dotenv';
import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

// 環境変数を読み込む
dotenv.config({ path: '.env.local' });
dotenv.config();

async function syncAA13501() {
  console.log('🔄 Manually syncing AA13501 from spreadsheet to database...\n');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing environment variables');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set');
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Not set');
    return;
  }
  
  const syncService = new EnhancedAutoSyncService(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // 初期化
    await syncService.initialize();
    
    // フル同期を実行
    const result = await syncService.runFullSync('manual');
    
    console.log('\n✅ Sync completed!');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncAA13501().catch(console.error);
