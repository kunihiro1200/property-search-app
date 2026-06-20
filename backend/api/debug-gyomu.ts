import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { GyomuListService } from './src/services/GyomuListService';

async function run() {
  console.log('GYOMU_LIST_SPREADSHEET_ID:', process.env.GYOMU_LIST_SPREADSHEET_ID || '(not set, using fallback)');
  console.log('GYOMU_LIST_SHEET_NAME:', process.env.GYOMU_LIST_SHEET_NAME || '業務依頼 (default)');
  
  try {
    const svc = new GyomuListService();
    console.log('GyomuListService created successfully');
    
    const data = await svc.getByPropertyNumber('AA12495');
    console.log('Result for AA12495:', JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
  }
}

run();
