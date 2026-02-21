import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function syncAA12862() {
  console.log('🔄 Syncing AA12862 comments from Athome sheet...\n');
  
  const athomeSheetSyncService = new AthomeSheetSyncService();
  
  try {
    const success = await athomeSheetSyncService.syncPropertyComments(
      'AA12862',
      'land'
    );
    
    if (success) {
      console.log('\n✅ AA12862 sync successful!');
    } else {
      console.log('\n❌ AA12862 sync failed');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

syncAA12862().catch(console.error);
