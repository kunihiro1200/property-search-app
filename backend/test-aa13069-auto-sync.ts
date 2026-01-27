// AA13069の自動同期をテスト
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

async function testAutoSync() {
  console.log('🔍 Testing AA13069 auto-sync...\n');

  const propertyNumber = 'AA13069';
  const propertyType = 'detached_house';

  try {
    // 1. 現在のデータベース状態を確認
    console.log('📊 Step 1: Check current database state');
    const propertyDetailsService = new PropertyDetailsService();
    const currentDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    console.log('Current state:', {
      has_favorite_comment: !!currentDetails.favorite_comment,
      has_recommended_comments: !!currentDetails.recommended_comments,
      recommended_comments_is_array: Array.isArray(currentDetails.recommended_comments),
      recommended_comments_length: Array.isArray(currentDetails.recommended_comments) ? currentDetails.recommended_comments.length : 'N/A',
      has_property_about: !!currentDetails.property_about
    });

    // 2. 自動同期条件をチェック
    console.log('\n📋 Step 2: Check auto-sync condition');
    const needsSync = !currentDetails.favorite_comment || 
                     !currentDetails.recommended_comments || 
                     (Array.isArray(currentDetails.recommended_comments) && currentDetails.recommended_comments.length === 0);
    
    console.log('Needs sync:', needsSync);
    console.log('Reason:', {
      no_favorite_comment: !currentDetails.favorite_comment,
      no_recommended_comments: !currentDetails.recommended_comments,
      empty_recommended_comments: Array.isArray(currentDetails.recommended_comments) && currentDetails.recommended_comments.length === 0
    });

    // 3. 手動で同期を実行
    if (needsSync) {
      console.log('\n🔄 Step 3: Execute manual sync');
      const athomeSheetSyncService = new AthomeSheetSyncService();
      const syncSuccess = await athomeSheetSyncService.syncPropertyComments(
        propertyNumber,
        propertyType as 'land' | 'detached_house' | 'apartment'
      );
      
      console.log('Sync success:', syncSuccess);

      // 4. 同期後のデータを確認
      if (syncSuccess) {
        console.log('\n✅ Step 4: Check updated data');
        const updatedDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
        
        console.log('Updated state:', {
          has_favorite_comment: !!updatedDetails.favorite_comment,
          has_recommended_comments: !!updatedDetails.recommended_comments,
          recommended_comments_length: Array.isArray(updatedDetails.recommended_comments) ? updatedDetails.recommended_comments.length : 'N/A',
          has_property_about: !!updatedDetails.property_about
        });

        if (updatedDetails.recommended_comments && Array.isArray(updatedDetails.recommended_comments)) {
          console.log('\nRecommended comments:');
          updatedDetails.recommended_comments.forEach((comment, index) => {
            console.log(`  ${index + 1}. ${comment}`);
          });
        }
      }
    } else {
      console.log('\n⚠️  Auto-sync condition not met - sync will not execute');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAutoSync();
