// 既存の全物件の座標を一括でジオコーディングするスクリプト
import { createClient } from '@supabase/supabase-js';
import { GeocodingService } from '../src/services/GeocodingService';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const geocodingService = new GeocodingService();

async function geocodeAllProperties() {
  console.log('🚀 Starting geocoding for all properties...\n');

  try {
    // 全物件を取得（latitudeカラムを参照しない）
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, address')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }

    if (!properties || properties.length === 0) {
      console.log('✅ All properties already have coordinates!');
      return;
    }

    console.log(`📊 Found ${properties.length} properties without coordinates\n`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const progress = `[${i + 1}/${properties.length}]`;

      console.log(`${progress} Processing ${property.property_number}...`);

      // 住所が空の場合はスキップ
      if (!property.address || property.address.trim() === '') {
        console.log(`  ⚠️  Skipped: No address`);
        skipCount++;
        continue;
      }

      // ジオコーディング実行
      const coordinates = await geocodingService.geocodeAddress(property.address);

      if (coordinates) {
        // RPC経由でUPDATE（PostgRESTキャッシュ問題を回避）
        const { error: updateError } = await supabase.rpc('update_property_coordinates', {
          p_property_id: property.id,
          p_latitude: coordinates.latitude,
          p_longitude: coordinates.longitude,
        });

        if (updateError) {
          console.log(`  ❌ Failed to update DB: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`  ✅ Success: (${coordinates.latitude}, ${coordinates.longitude})`);
          successCount++;
        }
      } else {
        console.log(`  ❌ Failed to geocode`);
        failCount++;
      }

      // レート制限対策：200ms待機
      if (i < properties.length - 1) {
        await delay(200);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  ⚠️  Skipped: ${skipCount}`);
    console.log(`  📍 Total: ${properties.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// スクリプト実行
geocodeAllProperties()
  .then(() => {
    console.log('\n✅ Geocoding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Geocoding failed:', error);
    process.exit(1);
  });
