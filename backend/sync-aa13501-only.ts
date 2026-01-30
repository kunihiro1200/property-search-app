import * as dotenv from 'dotenv';
import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function syncAA13501Only() {
  console.log('🔄 Syncing AA13501 only...\n');
  
  const syncService = new EnhancedAutoSyncService(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  try {
    await syncService.initialize();
    
    // フル同期を実行（AA13501が更新対象に含まれる）
    console.log('📊 Running full sync...\n');
    const result = await syncService.runFullSync('manual');
    
    console.log('\n✅ Sync completed!');
    console.log('📊 Updated sellers:', result.updateSync?.updated || 0);
    console.log('📊 Errors:', result.updateSync?.errors || 0);
  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
  }
}

syncAA13501Only().catch(console.error);
