import { PropertyListingService } from './src/services/PropertyListingService';

/**
 * 物件番号から物件情報を検索するスクリプト
 */
async function checkProperty() {
  try {
    const propertyNumber = process.argv[2];

    if (!propertyNumber) {
      console.error('使用方法: ts-node check-property-by-number.ts <物件番号>');
      console.error('例: ts-node check-property-by-number.ts AA13129');
      process.exit(1);
    }

    console.log(`物件番号: ${propertyNumber} を検索中...\n`);

    const propertyService = new PropertyListingService();
    const property = await propertyService.getByPropertyNumber(propertyNumber);

    if (!property) {
      console.error('❌ 物件が見つかりません');
      process.exit(1);
    }

    console.log('✅ 物件情報:');
    console.log(`   - ID: ${property.id}`);
    console.log(`   - 物件番号: ${property.property_number}`);
    console.log(`   - 物件タイプ: ${property.property_type}`);
    console.log(`   - 住所: ${property.address}`);
    console.log(`   - 表示住所: ${property.display_address || '(なし)'}`);
    console.log(`   - storage_location: ${property.storage_location || '(なし)'}`);
    console.log(`   - サイト表示: ${property.site_display}`);
    console.log('');

    console.log('診断スクリプトを実行するには:');
    console.log(`ts-node diagnose-favorite-recommended-comments.ts ${property.id}`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkProperty();
