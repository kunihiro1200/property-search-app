import { PropertyListingSyncService } from './api/src/services/PropertyListingSyncService';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function syncCC105Only() {
  console.log('🔄 Syncing CC105 only...\n');

  const service = new PropertyListingSyncService(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  await service.initialize();

  // runFullSyncを実行（最後の100行を同期）
  const result = await service.runFullSync('manual');

  console.log('\n📊 Sync result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Total processed: ${result.totalProcessed}`);
  console.log(`  Added: ${result.successfullyAdded}`);
  console.log(`  Updated: ${result.successfullyUpdated}`);
  console.log(`  Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => {
      console.log(`  ${error.propertyNumber}: ${error.message}`);
    });
  }
}

syncCC105Only().catch(console.error);
