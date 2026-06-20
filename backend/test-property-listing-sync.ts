import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config();

async function testPropertyListingSync() {
  console.log('🔄 Testing PropertyListingSyncService...\n');

  // PropertyListingSyncServiceを動的インポート
  const { getPropertyListingSyncService } = await import('./api/src/services/PropertyListingSyncService');
  
  const syncService = getPropertyListingSyncService();
  
  console.log('📋 Initializing service...');
  await syncService.initialize();
  
  console.log('🔄 Running full sync...');
  const result = await syncService.runFullSync('manual');
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 Sync Result:');
  console.log(`   Success: ${result.success}`);
  console.log(`   Total processed: ${result.totalProcessed}`);
  console.log(`   ✅ Added: ${result.successfullyAdded}`);
  console.log(`   ✅ Updated: ${result.successfullyUpdated}`);
  console.log(`   ❌ Failed: ${result.failed}`);
  console.log(`   Duration: ${result.endTime.getTime() - result.startTime.getTime()}ms`);
  console.log('═══════════════════════════════════════════════════════════');
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => {
      console.log(`   ${error.propertyNumber}: ${error.message}`);
    });
  }
}

testPropertyListingSync().catch(console.error);
