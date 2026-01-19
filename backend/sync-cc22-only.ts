import dotenv from 'dotenv';
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';

dotenv.config();

async function syncCC22Only() {
  console.log('🔄 Syncing CC22 from spreadsheet to database...\n');

  const syncService = new PropertyListingSyncService();
  
  try {
    // CC22のみを同期
    await syncService.syncSingleProperty('CC22');
    
    console.log('\n✅ Sync completed!');
    console.log('Please check the database again.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

syncCC22Only().catch(console.error);
