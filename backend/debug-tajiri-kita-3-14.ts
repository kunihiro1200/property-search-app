// 大分市田尻北3-14の配信エリア計算をデバッグ
import dotenv from 'dotenv';
dotenv.config();

import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';

async function debugTajiriKita() {
  console.log('=== 大分市田尻北3-14 配信エリア計算デバッグ ===\n');

  const calculator = new PropertyDistributionAreaCalculator();

  // 実際のGoogle Maps URL
  const googleMapUrl = 'https://maps.app.goo.gl/iUwuDk5rfRvBuAAPA';
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
      console.log('  ❌ 座標を取得できませんでした');
    }

    console.log('\n🏙️ 市全域エリア:');
    if (debugInfo.cityWideMatches.length > 0) {
      console.log(`  ${debugInfo.cityWideMatches.join(', ')}`);
    } else {
      console.log('  なし');
    }

    console.log('\n📏 各エリアまでの距離（距離順）:');
    const sortedCalculations = [...debugInfo.distanceCalculations]
      .sort((a, b) => a.distance - b.distance);
    
    sortedCalculations.forEach(calc => {
      const status = calc.withinRadius ? '✅ 3km以内（配信対象）' : '❌ 3km超（範囲外）';
      console.log(`  ${calc.areaNumber}: ${calc.distance.toFixed(2)}km ${status}`);
    });

    console.log('\n📮 最終配信エリア:');
    console.log(`  フォーマット: ${result.formatted}`);
    console.log(`  配列: ${JSON.stringify(result.areas)}`);

    console.log('\n📊 サマリー:');
    console.log(`  市全域エリア: ${result.cityWideAreas.length}個 (${result.cityWideAreas.join(', ')})`);
    console.log(`  半径内エリア: ${result.radiusAreas.length}個 (${result.radiusAreas.join(', ')})`);
    console.log(`  合計: ${result.areas.length}個`);

    // 3km以内のエリアを確認
    const within3km = debugInfo.distanceCalculations.filter(calc => calc.withinRadius);
    console.log(`\n🎯 3km以内のエリア詳細: ${within3km.length}個`);
    within3km.forEach(calc => {
      console.log(`  ${calc.areaNumber}: ${calc.distance.toFixed(2)}km`);
    });

    // 現在の配信エリアと比較
    const currentAreas = ["①","②","③","⑥","⑦","⑧","㊵"];
    console.log('\n🔍 現在の配信エリアとの比較:');
    console.log(`  現在: ${JSON.stringify(currentAreas)}`);
    console.log(`  計算結果: ${JSON.stringify(result.areas)}`);
    
    const shouldNotBeIncluded = currentAreas.filter(area => !result.areas.includes(area));
    const shouldBeIncluded = result.areas.filter(area => !currentAreas.includes(area));
    
    if (shouldNotBeIncluded.length > 0) {
      console.log(`  ⚠️  含まれるべきでないエリア: ${shouldNotBeIncluded.join(', ')}`);
    }
    if (shouldBeIncluded.length > 0) {
      console.log(`  ⚠️  含まれるべきエリア: ${shouldBeIncluded.join(', ')}`);
    }
    if (shouldNotBeIncluded.length === 0 && shouldBeIncluded.length === 0) {
      console.log(`  ✅ 一致しています`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

debugTajiriKita();
