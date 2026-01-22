// AA13129の配信エリア計算診断スクリプト
import { createClient } from '@supabase/supabase-js';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';
import { AreaMapConfigService } from './src/services/AreaMapConfigService';
import { EnhancedGeolocationService } from './src/services/EnhancedGeolocationService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnose() {
  console.log('=== AA13129 配信エリア計算診断 ===\n');

  // 1. AA13129の物件情報を取得
  console.log('1. AA13129の物件情報を取得中...');
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13129')
    .single();

  if (sellerError || !seller) {
    console.error('❌ 売主が見つかりません:', sellerError);
    return;
  }

  console.log('✅ 売主情報:');
  console.log('  - 売主番号:', seller.seller_number);
  console.log('  - 住所:', seller.address);
  console.log('  - 市:', seller.city);
  console.log('  - Google Map URL:', seller.google_map_url);
  console.log('');

  // 2. 物件リスティング情報を取得
  console.log('2. 物件リスティング情報を取得中...');
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('seller_id', seller.id)
    .single();

  if (listingError || !listing) {
    console.log('⚠️  物件リスティングが見つかりません');
  } else {
    console.log('✅ 物件リスティング情報:');
    console.log('  - 配信エリア:', listing.distribution_areas);
    console.log('  - Google Map URL:', listing.google_map_url);
    console.log('');
  }

  // 3. Google Map URLから座標を抽出
  console.log('3. Google Map URLから座標を抽出中...');
  const geoService = new EnhancedGeolocationService();
  const propertyUrl = listing?.google_map_url || seller.google_map_url;
  
  if (!propertyUrl) {
    console.error('❌ Google Map URLが設定されていません');
    return;
  }

  const propertyCoords = await geoService.extractCoordinatesFromUrl(propertyUrl);
  if (!propertyCoords) {
    console.error('❌ 座標の抽出に失敗しました');
    return;
  }

  console.log('✅ 物件の座標:');
  console.log('  - 緯度:', propertyCoords.lat);
  console.log('  - 経度:', propertyCoords.lng);
  console.log('');

  // 4. area_map_configテーブルから⑦の設定を取得
  console.log('4. ★エリアの⑦の設定を確認中...');
  const { data: area7Config, error: area7Error } = await supabase
    .from('area_map_config')
    .select('*')
    .eq('area_number', '⑦');

  if (area7Error) {
    console.error('❌ エリア設定の取得に失敗:', area7Error);
    return;
  }

  if (!area7Config || area7Config.length === 0) {
    console.error('❌ ★エリアの⑦の設定が見つかりません');
    console.log('\n💡 解決策: area_map_configテーブルに⑦の設定を追加してください');
    return;
  }

  console.log('✅ ★エリアの⑦の設定:');
  area7Config.forEach((config, index) => {
    console.log(`  [${index + 1}]`);
    console.log('    - ID:', config.id);
    console.log('    - エリア番号:', config.area_number);
    console.log('    - Google Map URL:', config.google_map_url);
    console.log('    - 市名:', config.city_name);
    console.log('    - アクティブ:', config.is_active);
  });
  console.log('');

  // 5. ⑦の座標を抽出
  console.log('5. ★エリアの⑦の座標を抽出中...');
  const activeArea7 = area7Config.find(c => c.is_active);
  
  if (!activeArea7) {
    console.error('❌ アクティブな⑦の設定が見つかりません');
    return;
  }

  if (!activeArea7.google_map_url) {
    console.error('❌ ⑦のGoogle Map URLが設定されていません');
    return;
  }

  const area7Coords = await geoService.extractCoordinatesFromUrl(activeArea7.google_map_url);
  if (!area7Coords) {
    console.error('❌ ⑦の座標の抽出に失敗しました');
    console.log('  URL:', activeArea7.google_map_url);
    return;
  }

  console.log('✅ ★エリアの⑦の座標:');
  console.log('  - 緯度:', area7Coords.lat);
  console.log('  - 経度:', area7Coords.lng);
  console.log('');

  // 6. 距離を計算
  console.log('6. 物件と⑦の距離を計算中...');
  const distance = geoService.calculateDistance(propertyCoords, area7Coords);
  console.log('✅ 距離:', distance.toFixed(2), 'km');
  console.log('');

  // 7. 10km以内かチェック
  console.log('7. 10km以内かチェック...');
  if (distance <= 10.0) {
    console.log('✅ 10km以内です！⑦が含まれるべきです');
  } else {
    console.log('❌ 10kmを超えています。⑦は含まれません');
    console.log('  - 実際の距離:', distance.toFixed(2), 'km');
  }
  console.log('');

  // 8. 配信エリア計算サービスを実行
  console.log('8. 配信エリア計算サービスを実行中...');
  const calculator = new PropertyDistributionAreaCalculator();
  const result = await calculator.calculateDistributionAreas(
    propertyUrl,
    seller.city
  );

  console.log('✅ 計算結果:');
  console.log('  - 全エリア:', result.areas.join(','));
  console.log('  - 半径エリア:', result.radiusAreas.join(','));
  console.log('  - 市全体エリア:', result.cityWideAreas.join(','));
  console.log('  - フォーマット:', result.formatted);
  console.log('');

  // 9. ⑦が含まれているかチェック
  console.log('9. 計算結果に⑦が含まれているかチェック...');
  if (result.areas.includes('⑦')) {
    console.log('✅ ⑦が含まれています！');
  } else {
    console.log('❌ ⑦が含まれていません');
    console.log('\n🔍 デバッグ情報:');
    console.log('  - 物件座標:', propertyCoords);
    console.log('  - ⑦座標:', area7Coords);
    console.log('  - 距離:', distance.toFixed(2), 'km');
    console.log('  - 10km以内:', distance <= 10.0);
  }
  console.log('');

  // 10. すべてのエリア設定を確認
  console.log('10. すべてのアクティブなエリア設定を確認中...');
  const areaMapService = new AreaMapConfigService();
  const allConfigs = await areaMapService.loadAreaMaps();
  
  console.log(`✅ アクティブなエリア設定: ${allConfigs.length}件`);
  allConfigs.forEach(config => {
    const hasCoords = config.coordinates ? '✓' : '✗';
    console.log(`  ${config.areaNumber}: ${hasCoords} 座標`);
  });
  console.log('');

  // 11. ヘルスチェック
  console.log('11. 設定の健全性チェック...');
  const healthCheck = await areaMapService.healthCheck();
  console.log('健全性:', healthCheck.healthy ? '✅ 正常' : '❌ 異常');
  console.log('総設定数:', healthCheck.totalConfigs);
  console.log('有効設定数:', healthCheck.validConfigs);
  if (healthCheck.errors.length > 0) {
    console.log('エラー:');
    healthCheck.errors.forEach(err => console.log('  -', err));
  }
}

diagnose()
  .then(() => {
    console.log('\n診断完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n診断中にエラーが発生しました:', error);
    process.exit(1);
  });
