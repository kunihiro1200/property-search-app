/**
 * Phase 4.6: 新規物件追加同期のテストスクリプト
 * 
 * スプレッドシートに存在するがDBに存在しない物件を検出し、追加します。
 * 
 * 使用方法:
 *   npx ts-node backend/test-new-property-addition.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '.env') });

import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

async function testNewPropertyAddition() {
  console.log('🧪 Testing Phase 4.6: New Property Addition Sync\n');

  try {
    // Initialize service
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();

    console.log('✅ Service initialized\n');

    // Execute new property addition sync
    console.log('🆕 Executing new property addition sync...\n');
    const result = await syncService.syncNewPropertyAddition();

    // Display results
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Added: ${result.added}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Duration: ${result.duration_ms}ms`);

    if (result.added > 0) {
      console.log('\n✅ New properties were successfully added to the database!');
      console.log('   You can now verify them in the property listings page.');
    } else if (result.failed > 0) {
      console.log('\n⚠️  Some properties failed to add. Check the logs above for details.');
    } else {
      console.log('\n✅ No new properties detected - database is up to date!');
    }

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testNewPropertyAddition();
