/**
 * google_map_urlから座標（latitude, longitude）を抽出してproperty_listingsテーブルに保存
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GeolocationService } from './src/services/GeolocationService';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PropertyRow {
  id: string;
  property_number: string;
  google_map_url: string;
  latitude: number | null;
  longitude: number | null;
}

async function backfillPropertyCoordinates() {
  console.log('🗺️ 物件の座標データをバックフィル中...\n');

  const geolocationService = new GeolocationService();

  // google_map_urlを持つすべての物件を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, google_map_url, latitude, longitude')
    .not('google_map_url', 'is', null)
    .order('property_number');

  if (error) {
    console.error('❌ 物件取得エラー:', error);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('⚠️ google_map_urlを持つ物件が見つかりません');
    return;
  }

  console.log(`📊 対象物件数: ${properties.length}件\n`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const property of properties as PropertyRow[]) {
    const { id, property_number, google_map_url, latitude, longitude } = property;

    // すでに座標が設定されている場合はスキップ
    if (latitude !== null && longitude !== null) {
      console.log(`⏭️ ${property_number}: 座標設定済み (${latitude}, ${longitude})`);
      skipCount++;
      continue;
    }

    console.log(`🔍 ${property_number}: 座標を抽出中...`);
    console.log(`   URL: ${google_map_url}`);

    try {
      // URLから座標を抽出
      const coords = await geolocationService.extractCoordinatesFromUrl(google_map_url);

      if (!coords) {
        console.log(`   ❌ 座標の抽出に失敗しました`);
        failCount++;
        continue;
      }

      console.log(`   ✅ 座標: (${coords.lat}, ${coords.lng})`);

      // データベースに保存
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          latitude: coords.lat,
          longitude: coords.lng,
        })
        .eq('id', id);

      if (updateError) {
        console.log(`   ❌ 保存エラー:`, updateError.message);
        failCount++;
      } else {
        console.log(`   💾 保存完了`);
        successCount++;
      }
    } catch (error: any) {
      console.log(`   ❌ エラー:`, error.message);
      failCount++;
    }

    console.log('');
  }

  console.log('\n📊 結果サマリー:');
  console.log(`   ✅ 成功: ${successCount}件`);
  console.log(`   ⏭️ スキップ: ${skipCount}件`);
  console.log(`   ❌ 失敗: ${failCount}件`);
  console.log(`   📊 合計: ${properties.length}件`);
}

backfillPropertyCoordinates()
  .then(() => {
    console.log('\n✅ バックフィル完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
