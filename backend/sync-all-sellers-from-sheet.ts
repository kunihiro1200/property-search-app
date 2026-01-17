/**
 * スプレッドシートから全売主データをDBに同期
 * 
 * 使用方法:
 * npx ts-node sync-all-sellers-from-sheet.ts
 */
import dotenv from 'dotenv';
import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

dotenv.config();

async function syncAllSellers() {
  console.log('🔄 Starting full seller sync from spreadsheet...\n');
  
  try {
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();
    
    // 不足している売主を検出
    console.log('📊 Step 1: Detecting missing sellers...');
    const missingSellers = await syncService.detectMissingSellers();
    
    if (missingSellers.length === 0) {
      console.log('✅ No missing sellers found. Database is up to date.');
      return;
    }
    
    console.log(`\n📥 Step 2: Syncing ${missingSellers.length} sellers...`);
    console.log(`   First few: ${missingSellers.slice(0, 10).join(', ')}${missingSellers.length > 10 ? '...' : ''}\n`);
    
    // 売主を同期
    const result = await syncService.syncMissingSellers(missingSellers);
    
    console.log('\n📊 Sync Results:');
    console.log(`   ✅ Successfully added: ${result.newSellersCount}`);
    console.log(`   ❌ Failed: ${result.errors.length}`);
    console.log(`   ⏱️  Duration: ${((result.endTime.getTime() - result.startTime.getTime()) / 1000).toFixed(2)}s`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.slice(0, 10).forEach(error => {
        console.log(`   ${error.sellerNumber}: ${error.message}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more errors`);
      }
    }
    
    console.log('\n✅ Sync completed!');
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

syncAllSellers();
