import dotenv from 'dotenv';
import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

dotenv.config();

async function syncAA13424() {
  console.log('🔄 Manually syncing AA13424...\n');

  const syncService = getEnhancedAutoSyncService();
  await syncService.initialize();

  try {
    // AA13424のみを同期
    const result = await syncService.syncMissingSellers(['AA13424']);
    
    console.log('\n📊 Sync Result:');
    console.log(`   New sellers: ${result.newSellersCount}`);
    console.log(`   Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => {
        console.log(`   ${err.sellerNumber}: ${err.message}`);
      });
    } else {
      console.log('\n✅ AA13424 synced successfully');
    }
  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
  }
}

syncAA13424().catch(console.error);
