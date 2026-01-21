import dotenv from 'dotenv';
import { PropertyService } from './src/services/PropertyService';

dotenv.config();

async function checkCC21PropertyAbout() {
  console.log('🔍 CC21の「こちらの物件について」を確認中...\n');

  try {
    const propertyService = new PropertyService();
    
    // CC21の「こちらの物件について」を取得
    const aboutText = await propertyService.getPropertyAbout('CC21');
    
    console.log('✅ 取得結果:');
    console.log('物件番号: CC21');
    console.log('こちらの物件について:', aboutText || '(データなし)');
    
    if (aboutText) {
      console.log('\n📝 文字数:', aboutText.length);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkCC21PropertyAbout().catch(console.error);
