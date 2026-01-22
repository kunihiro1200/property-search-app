// 大分市田尻北3-14の配信エリア計算テスト
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';

async function testTajiriKitaDistribution() {
  console.log('=== 大分市田尻北3-14 配信エリア計算テスト ===\n');

  const calculator = new PropertyDistributionAreaCalculator();

  // 大分市田尻北3-14のGoogle Maps URL
  // 実際のURLを使用してください
  const googleMapUrl = 'https://maps.app.goo.gl/xxxxx'; // ここに実際のURLを入れてください
  const city = '大分市';

  try {
    // デバッグ情報付きで計算
    const { result, debugInfo } = await calculator.calculateWithDebugInfo(
      googleMapUrl,
      city
    );

    console.log('📍 物件座標:');
    if (debugInfo.propertyCoords) {
      console.log(`  緯度: ${debugInfo.propertyCoords.lat}`);
      console.log(`  経度: ${debugInfo.propertyCoords.lng}`);
    } else {
      console.log('  座標を取得できませんでした');
    }

    console.log('\n🏙️ 市全域エリア:');
    console.log(`  ${debugInfo.cityWideMatches.join(', ')}`);

    console.log('\n📏 各エリアまでの距離:');
    debugInfo.distanceCalculations
      .sort((a, b) => a.distance - b.distance)
      .forEach(calc => {
        const status = calc.withinRadius ? '✅ 配信対象' : '❌ 範囲外';
        console.log(`  ${calc.areaNumber}: ${calc.distance.toFixed(2)}km ${status}`);
      });

    console.log('\n📮 最終配信エリア:');
    console.log(`  ${result.formatted}`);
    console.log(`  配列: ${JSON.stringify(result.areas)}`);

    console.log('\n📊 サマリー:');
    console.log(`  市全域エリア: ${result.cityWideAreas.length}個`);
    console.log(`  半径内エリア: ${result.radiusAreas.length}個`);
    console.log(`  合計: ${result.areas.length}個`);

    // 3km以内のエリアを確認
    const within3km = debugInfo.distanceCalculations.filter(calc => calc.distance <= 3);
    console.log(`\n🎯 3km以内のエリア: ${within3km.length}個`);
    within3km.forEach(calc => {
      console.log(`  ${calc.areaNumber}: ${calc.distance.toFixed(2)}km`);
    });

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

testTajiriKitaDistribution();
