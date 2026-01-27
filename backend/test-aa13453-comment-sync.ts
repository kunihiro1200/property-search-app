// AA13453のコメントデータを同期してテスト
import * as dotenv from 'dotenv';
import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

dotenv.config({ path: '.env' });

async function testAA13453CommentSync() {
  console.log('🔄 Testing AA13453 comment sync...\n');

  const propertyNumber = 'AA13453';
  const propertyType = 'detached_house'; // 戸建て

  try {
    // 同期前のデータを確認
    console.log('📊 Before sync:');
    const propertyDetailsService = new PropertyDetailsService();
    const beforeSync = await propertyDetailsService.getPropertyDetails(propertyNumber);
    console.log('  favorite_comment:', beforeSync.favorite_comment || '(null)');
    console.log('  recommended_comments:', beforeSync.recommended_comments?.length || 0, 'items');
    console.log('  property_about:', beforeSync.property_about || '(null)');
    console.log('  athome_data:', beforeSync.athome_data?.length || 0, 'items');
    console.log('---\n');

    // コメントデータを同期
    console.log('🔄 Syncing comments from Athome sheet...');
    const athomeSheetSyncService = new AthomeSheetSyncService();
    const success = await athomeSheetSyncService.syncPropertyComments(propertyNumber, propertyType);

    if (!success) {
      console.error('❌ Sync failed');
      return;
    }

    console.log('✅ Sync completed\n');

    // 同期後のデータを確認
    console.log('📊 After sync:');
    const afterSync = await propertyDetailsService.getPropertyDetails(propertyNumber);
    console.log('  favorite_comment:', afterSync.favorite_comment ? 'YES' : 'NO');
    if (afterSync.favorite_comment) {
      console.log('    Preview:', afterSync.favorite_comment.substring(0, 50) + '...');
    }
    console.log('  recommended_comments:', afterSync.recommended_comments?.length || 0, 'items');
    if (afterSync.recommended_comments && afterSync.recommended_comments.length > 0) {
      console.log('    First item:', afterSync.recommended_comments[0].substring(0, 50) + '...');
    }
    console.log('  property_about:', afterSync.property_about ? 'YES' : 'NO');
    console.log('  athome_data:', afterSync.athome_data?.length || 0, 'items');
    console.log('---\n');

    console.log('✅ Test completed successfully!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testAA13453CommentSync().catch(console.error);
