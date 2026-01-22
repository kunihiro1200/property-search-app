/**
 * 物件の座標データ（latitude, longitude）の状況を確認
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPropertyCoordinates() {
  console.log('🔍 物件の座標データ状況を確認中...\n');

  // 1. property_listingsテーブルのスキーマを確認
  console.log('📋 1. property_listingsテーブルのカラムを確認');
  const { data: columns, error: columnsError } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1);

  if (columnsError) {
    console.error('❌ カラム取得エラー:', columnsError);
  } else if (columns && columns.length > 0) {
    const columnNames = Object.keys(columns[0]);
    console.log('✅ カラム一覧:');
    columnNames.forEach(col => {
      if (col.includes('lat') || col.includes('long') || col.includes('map') || col.includes('coord')) {
        console.log(`  🎯 ${col} ← 座標関連`);
      } else {
        console.log(`  - ${col}`);
      }
    });
  }

  console.log('\n📊 2. 座標データの統計');
  
  // latitude, longitudeカラムが存在するか確認
  const { data: withCoords, error: coordsError } = await supabase
    .from('property_listings')
    .select('property_number, latitude, longitude, google_map_url')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(5);

  if (coordsError) {
    console.log('⚠️ latitude/longitudeカラムは存在しないようです');
    console.log('   エラー:', coordsError.message);
  } else {
    console.log(`✅ latitude/longitudeカラムが存在します`);
    console.log(`   座標データを持つ物件数: ${withCoords?.length || 0}`);
    if (withCoords && withCoords.length > 0) {
      console.log('\n   サンプル:');
      withCoords.forEach(prop => {
        console.log(`   - ${prop.property_number}: (${prop.latitude}, ${prop.longitude})`);
      });
    }
  }

  // google_map_urlの状況を確認
  console.log('\n📍 3. google_map_urlの状況');
  const { data: withMapUrl, error: mapUrlError } = await supabase
    .from('property_listings')
    .select('property_number, google_map_url, atbb_status')
    .not('google_map_url', 'is', null)
    .eq('atbb_status', '公開中')
    .limit(10);

  if (mapUrlError) {
    console.error('❌ google_map_url取得エラー:', mapUrlError);
  } else {
    console.log(`✅ google_map_urlを持つ公開中物件: ${withMapUrl?.length || 0}件`);
    if (withMapUrl && withMapUrl.length > 0) {
      console.log('\n   サンプル:');
      withMapUrl.slice(0, 5).forEach(prop => {
        console.log(`   - ${prop.property_number}: ${prop.google_map_url}`);
      });
    }
  }

  // AA9743の状況を確認
  console.log('\n🎯 4. AA9743の座標データ');
  const { data: aa9743, error: aa9743Error } = await supabase
    .from('property_listings')
    .select('property_number, google_map_url, latitude, longitude, address, atbb_status')
    .eq('property_number', 'AA9743')
    .single();

  if (aa9743Error) {
    console.error('❌ AA9743取得エラー:', aa9743Error);
  } else if (aa9743) {
    console.log('✅ AA9743のデータ:');
    console.log(`   物件番号: ${aa9743.property_number}`);
    console.log(`   住所: ${aa9743.address}`);
    console.log(`   ATBB状態: ${aa9743.atbb_status}`);
    console.log(`   google_map_url: ${aa9743.google_map_url || '(未設定)'}`);
    console.log(`   latitude: ${aa9743.latitude || '(未設定)'}`);
    console.log(`   longitude: ${aa9743.longitude || '(未設定)'}`);
  }

  // 全体の統計
  console.log('\n📈 5. 全体統計');
  const { count: totalCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .eq('atbb_status', '公開中');

  const { count: withMapUrlCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .eq('atbb_status', '公開中')
    .not('google_map_url', 'is', null);

  console.log(`   公開中物件総数: ${totalCount || 0}件`);
  console.log(`   google_map_url設定済み: ${withMapUrlCount || 0}件`);
  console.log(`   google_map_url未設定: ${(totalCount || 0) - (withMapUrlCount || 0)}件`);
}

checkPropertyCoordinates()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
