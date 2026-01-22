import dotenv from 'dotenv';
import { GyomuListService } from './src/services/GyomuListService';

dotenv.config({ path: '.env' });

async function checkGyomuList() {
  console.log('🔍 AA9743の業務リスト確認\n');

  const gyomuListService = new GyomuListService();
  
  try {
    const gyomuData = await gyomuListService.getByPropertyNumber('AA9743');
    
    if (gyomuData) {
      console.log('✅ 業務リストに登録あり:');
      console.log(`  物件番号: ${gyomuData.propertyNumber}`);
      console.log(`  スプシURL: ${gyomuData.spreadsheetUrl || '(未設定)'}`);
      console.log(`  格納先URL: ${gyomuData.storageUrl || '(未設定)'}`);
    } else {
      console.log('❌ 業務リストに登録なし');
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkGyomuList().catch(console.error);
