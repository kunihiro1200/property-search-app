import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function syncCC100() {
  console.log('🔄 Syncing CC100 comments from Athome sheet...\n');
  
  const athomeSheetSyncService = new AthomeSheetSyncService();
  
  try {
    const success = await athomeSheetSyncService.syncPropertyComments(
      'CC100',
      'detached_house'
    );
    
    if (success) {
      console.log('\n✅ CC100 sync successful!');
    } else {
      console.log('\n❌ CC100 sync failed');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

syncCC100().catch(console.error);
