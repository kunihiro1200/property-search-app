import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testPublicApiWithImages() {
  console.log('公開物件API（画像付き）をテスト中...\n');

  try {
    // 1. 公開物件一覧を取得
    console.log('=== 1. 公開物件一覧を取得 ===');
    const response = await axios.get(`${API_URL}/api/public/properties?limit=5`);
    
    console.log(`ステータス: ${response.status}`);
    console.log(`取得件数: ${response.data.properties.length}件`);
    console.log(`総件数: ${response.data.total}件\n`);

    // 各物件の画像情報を確認
    for (const property of response.data.properties) {
      console.log(`\n物件番号: ${property.property_number}`);
      console.log(`  画像配列: ${property.images ? property.images.length : 0}件`);
      if (property.images && property.images.length > 0) {
        console.log(`  最初の画像: ${property.images[0].substring(0, 80)}...`);
      } else {
        console.log(`  ⚠️  画像なし`);
      }
    }

    // 2. データベースから直接確認
    console.log('\n\n=== 2. データベースから直接確認 ===');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: dbProperties } = await supabase
      .from('property_listings')
      .select('property_number, image_url, storage_location')
      .eq('atbb_status', '専任・公開中')
      .limit(5);

    if (dbProperties) {
      for (const property of dbProperties) {
        console.log(`\n物件番号: ${property.property_number}`);
        console.log(`  image_url: ${property.image_url ? '✅ 設定済み' : '❌ 未設定'}`);
        console.log(`  storage_location: ${property.storage_location ? '✅ 設定済み' : '❌ 未設定'}`);
        if (property.image_url) {
          console.log(`  URL: ${property.image_url.substring(0, 80)}...`);
        }
      }
    }

    // 3. 統計情報
    console.log('\n\n=== 3. 統計情報 ===');
    const { count: totalPublic } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .eq('atbb_status', '専任・公開中');

    const { count: withImageUrl } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .eq('atbb_status', '専任・公開中')
      .not('image_url', 'is', null);

    console.log(`公開物件総数: ${totalPublic}件`);
    console.log(`image_url設定済み: ${withImageUrl}件`);
    console.log(`設定率: ${((withImageUrl! / totalPublic!) * 100).toFixed(1)}%`);

  } catch (error: any) {
    console.error('エラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
  }
}

testPublicApiWithImages().catch(console.error);
