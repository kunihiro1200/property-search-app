import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';
import { CityNameExtractor } from './src/services/CityNameExtractor';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const calculator = new PropertyDistributionAreaCalculator();
  const cityExtractor = new CityNameExtractor();

  console.log('=== AA13129 配信エリア修正 ===\n');

  // Get property listing data
  const { data: listing, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13129')
    .maybeSingle();

  if (error || !listing) {
    console.error('物件リスティングが見つかりません');
    return;
  }

  console.log('物件情報:');
  console.log('  - property_number:', listing.property_number);
  console.log('  - address:', listing.address);
  console.log('  - google_map_url:', listing.google_map_url);
  console.log('  - 現在のcity:', listing.city || '(未設定)');
  console.log('  - 現在のdistribution_areas:', listing.distribution_areas || '(空)');
  console.log();

  // Extract city from address
  let city = listing.city;
  if (!city && listing.address) {
    console.log('住所から市名を抽出中...');
    const extractedCity = cityExtractor.extractCityFromAddress(listing.address);
    if (extractedCity) {
      city = extractedCity;
      console.log(`✅ 市名を抽出: ${city}`);
      
      // Update city in property_listings
      await supabase
        .from('property_listings')
        .update({ city })
        .eq('property_number', 'AA13129');
      
      console.log('✅ property_listingsのcityフィールドを更新しました');
    }
  }
  console.log();

  // Calculate distribution areas with debug info
  console.log('配信エリアを計算中...');
  const { result, debugInfo } = await calculator.calculateWithDebugInfo(
    listing.google_map_url,
    city
  );

  console.log();
  console.log('計算結果:');
  console.log('  - 配信エリア:', result.formatted);
  console.log('  - 市全体エリア:', result.cityWideAreas.join(',') || '(なし)');
  console.log('  - 半径ベースエリア:', result.radiusAreas.join(',') || '(なし)');
  console.log();

  console.log('デバッグ情報:');
  console.log('  - 物件座標:', debugInfo.propertyCoords 
    ? `${debugInfo.propertyCoords.lat}, ${debugInfo.propertyCoords.lng}`
    : '(取得できず)');
  console.log('  - 市全体マッチ:', debugInfo.cityWideMatches.join(', ') || '(なし)');
  console.log();

  console.log('距離計算 (10km以内):');
  const withinRadius = debugInfo.distanceCalculations
    .filter(calc => calc.withinRadius)
    .sort((a, b) => a.distance - b.distance);
  
  if (withinRadius.length === 0) {
    console.log('  (なし)');
  } else {
    withinRadius.forEach(calc => {
      console.log(`  ✓ ${calc.areaNumber}: ${calc.distance.toFixed(2)}km`);
    });
  }
  console.log();

  console.log('距離計算 (10km超、近い順に5件):');
  const beyondRadius = debugInfo.distanceCalculations
    .filter(calc => !calc.withinRadius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);
  
  if (beyondRadius.length === 0) {
    console.log('  (なし)');
  } else {
    beyondRadius.forEach(calc => {
      console.log(`  ✗ ${calc.areaNumber}: ${calc.distance.toFixed(2)}km`);
    });
  }
  console.log();

  // Update distribution_areas
  if (result.areas.length > 0) {
    console.log('配信エリアを更新中...');
    await supabase
      .from('property_listings')
      .update({ distribution_areas: result.areas })
      .eq('property_number', 'AA13129');
    
    console.log(`✅ 配信エリアを更新しました: ${result.formatted}`);
  } else {
    console.log('⚠️  配信エリアが空です。更新をスキップします。');
  }
}

main();
