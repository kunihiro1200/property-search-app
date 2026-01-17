import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ GOOGLE_MAPS_API_KEY is not set in .env file');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase credentials are not set in .env file');
  process.exit(1);
}

// Supabaseクライアント（Service Roleキーを使用）
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Property {
  id: string;
  property_number: string;
  address: string;
  display_address: string | null;
}

/**
 * 住所から座標を取得（Google Geocoding API）
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${GOOGLE_MAPS_API_KEY}&language=ja&region=jp`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      console.error('  ❌ Geocoding failed:', data.status, data.error_message || '');
      return null;
    }
  } catch (error) {
    console.error('  ❌ Geocoding exception:', error);
    return null;
  }
}

/**
 * 座標を直接SQLで保存
 */
async function saveCoordinates(propertyNumber: string, lat: number, lng: number): Promise<boolean> {
  try {
    // Supabase SDKではなく、直接PostgreSQL接続を使用
    // まずは通常のupdateを試す
    const { data, error } = await supabase
      .from('property_listings')
      .update({ 
        latitude: lat, 
        longitude: lng 
      })
      .eq('property_number', propertyNumber)
      .select();
    
    if (error) {
      // エラーの場合、生SQLを試す
      console.error('  ⚠️  通常のupdate失敗、生SQLを試行:', error.message);
      
      // 生SQLで直接実行
      const { error: sqlError } = await supabase.rpc('exec_raw_sql', {
        query: `UPDATE property_listings SET latitude = ${lat}, longitude = ${lng} WHERE property_number = '${propertyNumber}'`
      });
      
      if (sqlError) {
        console.error('  ❌ 生SQL実行失敗:', sqlError.message);
        return false;
      }
    }
    
    return true;
  } catch (error: any) {
    console.error('  ❌ 保存例外:', error.message);
    return false;
  }
}

/**
 * 夜間バッチ：全物件をジオコーディング
 */
async function nightlyGeocoding() {
  const startTime = Date.now();
  console.log('🌙 夜間ジオコーディングバッチを開始します');
  console.log(`⏰ 開始時刻: ${new Date().toLocaleString('ja-JP')}\n`);

  try {
    // 全物件を取得（座標がないものを優先）
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, address, display_address, latitude, longitude')
      .order('property_number');

    if (error) {
      throw error;
    }

    if (!properties || properties.length === 0) {
      console.log('❌ 物件が見つかりませんでした');
      return;
    }

    console.log(`📍 全物件数: ${properties.length}件\n`);

    // 座標がない物件をカウント
    const propertiesWithoutCoords = properties.filter(
      (p: any) => !p.latitude || !p.longitude
    );
    console.log(`🔍 座標がない物件: ${propertiesWithoutCoords.length}件\n`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    let alreadyHasCoords = 0;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i] as any;
      const address = property.display_address || property.address;

      // 既に座標がある場合はスキップ
      if (property.latitude && property.longitude) {
        alreadyHasCoords++;
        if (i % 50 === 0) {
          console.log(`[${i + 1}/${properties.length}] ${property.property_number}: 座標あり（スキップ）`);
        }
        continue;
      }

      console.log(`[${i + 1}/${properties.length}] ${property.property_number}: ${address}`);

      // 住所が空の場合はスキップ
      if (!address || address.trim() === '') {
        console.log('  ⏭️  住所が空のためスキップ');
        skipCount++;
        continue;
      }

      // ジオコーディング実行（リトライ付き）
      let coords = null;
      let retryCount = 0;
      const maxRetries = 2;

      while (!coords && retryCount <= maxRetries) {
        if (retryCount > 0) {
          console.log(`  🔄 リトライ ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        coords = await geocodeAddress(address);
        retryCount++;
      }

      if (coords) {
        // 座標を保存
        const saved = await saveCoordinates(property.property_number, coords.lat, coords.lng);

        if (saved) {
          console.log(`  ✅ 保存成功: (${coords.lat}, ${coords.lng})`);
          successCount++;
        } else {
          console.log('  ❌ 保存失敗');
          failCount++;
        }
      } else {
        console.log('  ❌ ジオコーディング失敗');
        failCount++;
      }

      // APIレート制限対策（500ms待機）
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n📊 結果:');
    console.log(`  ✅ 成功: ${successCount}件`);
    console.log(`  ❌ 失敗: ${failCount}件`);
    console.log(`  ⏭️  スキップ（住所なし）: ${skipCount}件`);
    console.log(`  📍 既に座標あり: ${alreadyHasCoords}件`);
    console.log(`  📍 合計: ${properties.length}件`);
    console.log(`  ⏱️  処理時間: ${duration}秒`);
    console.log(`\n⏰ 終了時刻: ${new Date().toLocaleString('ja-JP')}`);

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    throw error;
  }
}

// スクリプト実行
nightlyGeocoding()
  .then(() => {
    console.log('\n✅ 夜間ジオコーディングバッチ完了！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 夜間ジオコーディングバッチ失敗:', error);
    process.exit(1);
  });
