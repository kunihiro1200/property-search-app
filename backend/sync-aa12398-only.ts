import { getPropertyListingSyncService } from './api/src/services/PropertyListingSyncService';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function syncAA12398() {
  console.log('🔄 Syncing AA12398 only...\n');

  const service = getPropertyListingSyncService();
  await service.initialize();

  // 手動同期を実行
  const result = await service.runFullSync('manual');

  console.log('\n✅ Sync completed');
  console.log(`   Total processed: ${result.totalProcessed}`);
  console.log(`   Added: ${result.successfullyAdded}`);
  console.log(`   Updated: ${result.successfullyUpdated}`);
  console.log(`   Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(err => {
      console.log(`   ${err.propertyNumber}: ${err.message}`);
    });
  }
}

syncAA12398().catch(console.error);
