// AA13069を手動で同期
import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import { PropertyService } from './src/services/PropertyService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function manualSyncAA13069() {
  console.log('🔄 Manually syncing AA13069...\n');

  const propertyNumber = 'AA13069';
  const propertyType = 'detached_house'; // 戸建て

  try {
    // 1. Athomeシートから同期
    console.log('📋 Step 1: Sync from Athome sheet');
    console.log('─────────────────────────────────────────────────────────');
    
    const athomeSheetSyncService = new AthomeSheetSyncService();
    const athomeSuccess = await athomeSheetSyncService.syncPropertyComments(
      propertyNumber,
      propertyType
    );

    if (athomeSuccess) {
      console.log('✅ Successfully synced from Athome sheet');
    } else {
      console.error('❌ Failed to sync from Athome sheet');
    }

    // 2. property_aboutを物件スプレッドシートから取得
    console.log('\n📋 Step 2: Sync property_about from property spreadsheet');
    console.log('─────────────────────────────────────────────────────────');
    
    const propertyService = new PropertyService();
    const propertyAbout = await propertyService.getPropertyAbout(propertyNumber);
    
    if (propertyAbout) {
      console.log('✅ Found property_about:', propertyAbout.substring(0, 100) + '...');
      
      const propertyDetailsService = new PropertyDetailsService();
      const aboutSuccess = await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
        property_about: propertyAbout
      });
      
      if (aboutSuccess) {
        console.log('✅ Successfully saved property_about to database');
      } else {
        console.error('❌ Failed to save property_about to database');
      }
    } else {
      console.log('⚠️  property_about not found in property spreadsheet');
    }

    // 3. 結果を確認
    console.log('\n📋 Step 3: Verify synced data');
    console.log('─────────────────────────────────────────────────────────');
    
    const propertyDetailsService = new PropertyDetailsService();
    const details = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    console.log('\n✅ Final state:');
    console.log('  favorite_comment:', details.favorite_comment ? '✅ EXISTS' : '❌ NULL');
    console.log('  recommended_comments:', details.recommended_comments && details.recommended_comments.length > 0 ? `✅ ${details.recommended_comments.length}件` : '❌ EMPTY');
    console.log('  property_about:', details.property_about ? '✅ EXISTS' : '❌ NULL');
    console.log('  athome_data:', details.athome_data && details.athome_data.length > 0 ? `✅ ${details.athome_data.length}件` : '❌ EMPTY');

  } catch (error: any) {
    console.error('\n❌ Error during manual sync:', error.message);
    console.error('Stack:', error.stack);
  }
}

manualSyncAA13069().catch(console.error);
