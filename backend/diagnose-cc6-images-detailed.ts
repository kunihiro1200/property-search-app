import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';
import { PropertyImageService } from './src/services/PropertyImageService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function diagnoseCC6Images() {
  console.log('=== CC6 画像診断（詳細版） ===\n');

  const propertyListingService = new PropertyListingService();
  const propertyImageService = new PropertyImageService(60, 60, 2, 3);

  // 1. 物件情報を取得
  console.log('1. 物件情報を取得中...');
  const property = await propertyListingService.getPublicPropertyByNumber('CC6');
  
  if (!property) {
    console.error('❌ CC6が見つかりません');
    return;
  }

  console.log('✅ 物件情報:');
  console.log('   - property_number:', property.property_number);
  console.log('   - id:', property.id);
  console.log('   - storage_location:', property.storage_location || '(空)');
  console.log('   - athome_data:', property.athome_data || '(空)');
  console.log('');

  // 2. 業務リストから格納先URLを取得
  console.log('2. 業務リスト（業務依頼）から格納先URLを取得中...');
  try {
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await gyomuListClient.authenticate();
    const rows = await gyomuListClient.readAll();

    const cc6Row = rows.find(row => row['物件番号'] === 'CC6');

    if (cc6Row) {
      const storageUrl = cc6Row['格納先URL'];
      console.log('✅ 業務リストにCC6が見つかりました');
      console.log('   - 格納先URL:', storageUrl);
      console.log('');

      if (storageUrl) {
        // 3. 格納先URLから画像を取得
        console.log('3. 格納先URLから画像を取得中...');
        console.log('   URL:', storageUrl);
        
        try {
          const result = await propertyImageService.getImagesFromStorageUrl(storageUrl as string);
          
          console.log('✅ 画像取得結果:');
          console.log('   - 画像数:', result.images.length);
          console.log('   - キャッシュ:', result.cached ? 'あり' : 'なし');
          console.log('   - フォルダID:', result.folderId || '(不明)');
          
          if (result.images.length > 0) {
            console.log('');
            console.log('   最初の5枚:');
            result.images.slice(0, 5).forEach((img, index) => {
              console.log(`   ${index + 1}. ${img.name}`);
              console.log(`      - ID: ${img.id}`);
              console.log(`      - サムネイル: ${img.thumbnailUrl}`);
            });
          } else {
            console.log('');
            console.log('❌ 画像が見つかりませんでした');
            console.log('');
            console.log('📝 考えられる原因:');
            console.log('   1. フォルダ内に画像ファイルがない');
            console.log('   2. フォルダのアクセス権限がない');
            console.log('   3. フォルダIDの抽出に失敗している');
          }
        } catch (error: any) {
          console.error('❌ 画像取得エラー:', error.message);
          console.error('   スタック:', error.stack);
        }
      } else {
        console.log('❌ 格納先URLが空です');
      }
    } else {
      console.log('❌ 業務リストにCC6が見つかりませんでした');
    }
  } catch (error: any) {
    console.error('❌ 業務リストの読み取りエラー:', error.message);
  }

  console.log('');
  console.log('=== 診断完了 ===');
}

diagnoseCC6Images().catch(console.error);
