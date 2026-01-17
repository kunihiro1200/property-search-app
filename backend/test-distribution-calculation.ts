import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';
import { EnhancedGeolocationService } from './src/services/EnhancedGeolocationService';
import { AreaMapConfigService } from './src/services/AreaMapConfigService';

interface TestCase {
  name: string;
  address: string;
  googleMapUrl: string;
  city: string;
  expectedAreas: string[];
}

async function main() {
  console.log('='.repeat(80));
  console.log('配信エリア計算テスト');
  console.log('='.repeat(80));
  console.log();

  const calculator = new PropertyDistributionAreaCalculator();
  const geolocationService = new EnhancedGeolocationService();
  const areaMapConfigService = new AreaMapConfigService();

  // Test cases
  const testCases: TestCase[] = [
    {
      name: 'AA13129 - 大分市田尻北3-14',
      address: '大分市田尻北3-14',
      googleMapUrl: 'https://www.google.com/maps/place/33.2394,131.6447',
      city: '大分市',
      expectedAreas: ['㊵', '⑦'] // City-wide + area 7
    },
    // Add more test cases as needed
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const testCase of testCases) {
    console.log('テストケース:', testCase.name);
    console.log('住所:', testCase.address);
    console.log('市:', testCase.city);
    console.log('期待される配信エリア:', testCase.expectedAreas.join(','));
    console.log();

    try {
      // Calculate with debug info
      const { result, debugInfo } = await calculator.calculateWithDebugInfo(
        testCase.googleMapUrl,
        testCase.city
      );

      console.log('計算結果:', result.formatted);
      console.log();

      // Show debug info
      if (debugInfo.propertyCoords) {
        console.log('物件座標:', `${debugInfo.propertyCoords.lat}, ${debugInfo.propertyCoords.lng}`);
      } else {
        console.log('物件座標: 取得できず');
      }
      console.log();

      console.log('市全体マッチ:', debugInfo.cityWideMatches.join(', ') || 'なし');
      console.log();

      console.log('距離計算 (10km以内):');
      const withinRadius = debugInfo.distanceCalculations
        .filter(calc => calc.withinRadius)
        .sort((a, b) => a.distance - b.distance);
      
      if (withinRadius.length === 0) {
        console.log('  なし');
      } else {
        withinRadius.forEach(calc => {
          console.log(`  ${calc.areaNumber}: ${calc.distance.toFixed(2)}km`);
        });
      }
      console.log();

      console.log('距離計算 (10km超):');
      const beyondRadius = debugInfo.distanceCalculations
        .filter(calc => !calc.withinRadius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5); // Show first 5
      
      if (beyondRadius.length === 0) {
        console.log('  なし');
      } else {
        beyondRadius.forEach(calc => {
          console.log(`  ${calc.areaNumber}: ${calc.distance.toFixed(2)}km`);
        });
      }
      console.log();

      // Compare with expected
      const actualAreas = result.areas;
      const missing = testCase.expectedAreas.filter(area => !actualAreas.includes(area));
      const unexpected = actualAreas.filter(area => !testCase.expectedAreas.includes(area));

      if (missing.length === 0 && unexpected.length === 0) {
        console.log('✅ テスト合格');
        passedCount++;
      } else {
        console.log('❌ テスト不合格');
        if (missing.length > 0) {
          console.log('  不足しているエリア:', missing.join(','));
        }
        if (unexpected.length > 0) {
          console.log('  余分なエリア:', unexpected.join(','));
        }
        failedCount++;
      }

    } catch (error) {
      console.error('❌ エラー:', error);
      failedCount++;
    }

    console.log();
    console.log('-'.repeat(80));
    console.log();
  }

  // Summary
  console.log('='.repeat(80));
  console.log('テスト結果');
  console.log('='.repeat(80));
  console.log();
  console.log('総テスト数:', testCases.length);
  console.log('合格:', passedCount);
  console.log('不合格:', failedCount);
  console.log();

  if (failedCount === 0) {
    console.log('✅ すべてのテストが合格しました');
  } else {
    console.log('❌ 一部のテストが不合格です');
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

main();
