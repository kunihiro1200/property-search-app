import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

async function syncAA5564Comments() {
  console.log('🔄 Syncing AA5564 comments from Athome sheet...\n');
  
  const athomeSheetSyncService = new AthomeSheetSyncService();
  const propertyDetailsService = new PropertyDetailsService();
  
  // 同期前の状態を確認
  console.log('📊 Before sync:');
  const beforeDetails = await propertyDetailsService.getPropertyDetails('AA5564');
  console.log('- favorite_comment:', beforeDetails.favorite_comment ? `"${beforeDetails.favorite_comment}"` : 'NULL');
  console.log('- recommended_comments:', beforeDetails.recommended_comments ? JSON.stringify(beforeDetails.recommended_comments, null, 2) : 'NULL');
  
  // Athomeシートから同期
  console.log('\n🔄 Syncing from Athome sheet...');
  const syncSuccess = await athomeSheetSyncService.syncPropertyComments('AA5564', 'detached_house');
  
  if (syncSuccess) {
    console.log('✅ Sync successful');
    
    // 同期後の状態を確認
    console.log('\n📊 After sync:');
    const afterDetails = await propertyDetailsService.getPropertyDetails('AA5564');
    console.log('- favorite_comment:', afterDetails.favorite_comment ? `"${afterDetails.favorite_comment}"` : 'NULL');
    console.log('- recommended_comments:', afterDetails.recommended_comments ? JSON.stringify(afterDetails.recommended_comments, null, 2) : 'NULL');
    console.log('- athome_data:', afterDetails.athome_data ? JSON.stringify(afterDetails.athome_data, null, 2) : 'NULL');
  } else {
    console.error('❌ Sync failed');
  }
}

syncAA5564Comments().catch(console.error);
