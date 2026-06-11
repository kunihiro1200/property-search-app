/**
 * バッチ同期スクリプト（0-100件）
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  console.log('🔄 Starting batch sync (0-100)...\n');

  try {
    const { getPropertyListingSyncService } = await import('./api/src/services/PropertyListingSyncService');
    
    const syncService = getPropertyListingSyncService();
    await syncService.initialize();

    const result = await syncService.runFullSync('manual', 100, 0);

    console.log('\n✅ Batch sync completed!');
    console.log(`   Total processed: ${result.totalProcessed}`);
    console.log(`   Added: ${result.successfullyAdded}`);
    console.log(`   Updated: ${result.successfullyUpdated}`);
    console.log(`   Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => {
        console.log(`   ${error.propertyNumber}: ${error.message}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

main();
