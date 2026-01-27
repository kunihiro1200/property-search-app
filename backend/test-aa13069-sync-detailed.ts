// AA13069の同期を詳細ログ付きで実行
import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testAA13069SyncDetailed() {
  console.log('🔍 Testing AA13069 sync with detailed logs...\n');

  const athomeSheetSyncService = new AthomeSheetSyncService();
  
  const propertyNumber = 'AA13069';
  const propertyType = 'detached_house'; // 戸建て

  console.log(`Property Number: ${propertyNumber}`);
  console.log(`Property Type: ${propertyType}`);
  console.log('');

  try {
    const success = await athomeSheetSyncService.syncPropertyComments(
      propertyNumber,
      propertyType
    );

    console.log('\n📊 Sync Result:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`Success: ${success ? '✅' : '❌'}`);

    if (!success) {
      console.log('\n⚠️  Sync failed. Check logs above for details.');
    }
  } catch (error: any) {
    console.error('\n❌ Error during sync:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAA13069SyncDetailed().catch(console.error);
