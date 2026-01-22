import { Pool } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyD2igeXY-E_MWtJwMYpiv6CYpEiLJuDeYE';

interface Property {
  id: string;
  property_number: string;
  address: string;
  display_address?: string;
}

/**
 * Google Geocoding APIを使用して住所から座標を取得
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ja',
        region: 'jp',
      },
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      console.warn(`  ⚠️ 座標取得失敗: ${address} (ステータス: ${response.data.status})`);
      return null;
    }
  } catch (error: any) {
    console.error(`  ❌ APIエラー: ${address}`, error.message);
    return null;
  }
}

/**
 * 物件の座標を更新
 */
async function updatePropertyCoordinates(
  client: any,
  propertyId: string,
  lat: number,
  lng: number
): Promise<void> {
  await client.query(
    `UPDATE property_listings 
     SET latitude = $1, longitude = $2 
     WHERE id = $3`,
    [lat, lng, propertyId]
  );
}

/**
 * メイン処理
 */
async function geocodeAllProperties() {
  const client = await pool.connect();

  try {
    console.log('🗺️ 物件の座標取得を開始します...\n');

    // 座標が未設定の物件を取得
    const result = await client.query<Property>(
      `SELECT id, property_number, address, display_address 
       FROM property_listings 
       WHERE (latitude IS NULL OR longitude IS NULL)
       AND address IS NOT NULL
       ORDER BY property_number
       LIMIT 100`
    );

    const properties = result.rows;
    console.log(`📍 対象物件数: ${properties.length}件\n`);

    if (properties.length === 0) {
      console.log('✅ すべての物件に座標が設定されています！');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const address = property.display_address || property.address;

      console.log(`[${i + 1}/${properties.length}] ${property.property_number}: ${address}`);

      // 座標を取得
      const coordinates = await geocodeAddress(address);

      if (coordinates) {
        // データベースを更新
        await updatePropertyCoordinates(client, property.id, coordinates.lat, coordinates.lng);
        console.log(`  ✅ 座標取得成功: (${coordinates.lat}, ${coordinates.lng})`);
        successCount++;
      } else {
        console.log(`  ❌ 座標取得失敗`);
        failCount++;
      }

      // APIレート制限対策（1秒あたり50リクエストまで）
      if (i < properties.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n📊 処理結果:');
    console.log(`  ✅ 成功: ${successCount}件`);
    console.log(`  ❌ 失敗: ${failCount}件`);
    console.log(`  📍 合計: ${properties.length}件\n`);

    if (successCount > 0) {
      console.log('🎉 座標の取得が完了しました！');
      console.log('🗺️ 次のステップ: バックエンドAPIで座標を返すように修正します\n');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// スクリプト実行
geocodeAllProperties().catch(console.error);
