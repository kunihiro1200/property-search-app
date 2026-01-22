// CC23のproperty_detailsレコードを作成
import dotenv from 'dotenv';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

dotenv.config();

async function createCC23PropertyDetails() {
  console.log('=== CC23のproperty_detailsレコードを作成 ===\n');
  
  const propertyNumber = 'CC23';
  
  try {
    const detailsService = new PropertyDetailsService();
    
    // CC23のデータを取得または作成
    console.log(`物件番号 ${propertyNumber} のproperty_detailsを同期中...`);
    await detailsService.syncPropertyDetails(propertyNumber);
    
    // データを取得
    const details = await detailsService.getPropertyDetails(propertyNumber);
    
    console.log('\n✓ 同期完了');
    console.log('property_details ID:', details.id);
    console.log('property_number:', details.property_number);
    console.log('favorite_comment:', details.favorite_comment || '（なし）');
    console.log('recommended_comments:', details.recommended_comments ? 'あり' : '（なし）');
    if (details.recommended_comments) {
      console.log('   内容:', JSON.stringify(details.recommended_comments, null, 2));
    }
    console.log('property_about:', details.property_about || '（なし）');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

createCC23PropertyDetails().catch(console.error);
