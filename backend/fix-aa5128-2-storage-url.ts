import dotenv from 'dotenv';
import { PropertyService } from './src/services/PropertyService';

dotenv.config();

async function fixAA5128_2StorageUrl() {
  console.log('=== AA5128-2 格納先URL自動取得 ===\n');

  try {
    const propertyService = new PropertyService();
    const propertyNumber = 'AA5128-2';

    console.log(`物件番号: ${propertyNumber}`);
    console.log('Google Driveから格納先URLを検索中...\n');

    const storageUrl = await propertyService.retrieveStorageUrl(propertyNumber);

    if (storageUrl) {
      console.log('✅ 格納先URLを取得しました:');
      console.log(`   ${storageUrl}`);
      console.log('');
      console.log('✅ データベースに保存しました');
    } else {
      console.log('❌ 格納先URLが見つかりませんでした');
      console.log('');
      console.log('考えられる原因:');
      console.log('  1. Google Driveに物件番号のフォルダが存在しない');
      console.log('  2. サービスアカウントに権限がない');
      console.log('  3. フォルダ名が物件番号と一致しない');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

fixAA5128_2StorageUrl();
