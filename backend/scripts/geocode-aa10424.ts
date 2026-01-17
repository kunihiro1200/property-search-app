// AA10424のGoogle Map URLから座標を取得するスクリプト
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config();

async function geocodeAA10424() {
  console.log('🔄 AA10424のジオコーディングを開始...\n');

  try {
    // Supabaseクライアントを初期化
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // AA10424のデータを取得
    const { data: property, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, google_map_url, address, latitude, longitude')
      .eq('property_number', 'AA10424')
      .single();

    if (fetchError || !property) {
      console.error('❌ AA10424が見つかりません:', fetchError?.message);
      process.exit(1);
    }

    console.log('✅ AA10424を取得しました');
    console.log('  物件番号:', property.property_number);
    console.log('  住所:', property.address);
    console.log('  Google Map URL:', property.google_map_url);
    console.log('  現在の緯度:', property.latitude || '(未設定)');
    console.log('  現在の経度:', property.longitude || '(未設定)');
    console.log('');

    if (!property.google_map_url) {
      console.error('❌ Google Map URLが設定されていません');
      process.exit(1);
    }

    // Google Map URLから座標を取得
    console.log('🔍 Google Map URLから座標を取得中...');
    
    // Google Maps APIを使用してジオコーディング
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEYが設定されていません');
      process.exit(1);
    }

    // 住所からジオコーディング
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(property.address)}&key=${apiKey}`;
    
    console.log('📡 Geocoding API呼び出し中...');
    const response = await axios.get(geocodeUrl);

    if (response.data.status !== 'OK') {
      console.error('❌ Geocoding APIエラー:', response.data.status);
      console.error('エラーメッセージ:', response.data.error_message);
      process.exit(1);
    }

    const location = response.data.results[0].geometry.location;
    const latitude = location.lat;
    const longitude = location.lng;

    console.log('✅ 座標を取得しました:');
    console.log('  緯度:', latitude);
    console.log('  経度:', longitude);
    console.log('');

    // データベースを更新
    console.log('💾 データベースを更新中...');
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        latitude,
        longitude,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', 'AA10424');

    if (updateError) {
      console.error('❌ データベース更新エラー:', updateError.message);
      process.exit(1);
    }

    console.log('✅ データベースを更新しました');
    console.log('');

    // 確認
    const { data: updated, error: verifyError } = await supabase
      .from('property_listings')
      .select('property_number, latitude, longitude, google_map_url')
      .eq('property_number', 'AA10424')
      .single();

    if (verifyError || !updated) {
      console.error('❌ 確認エラー:', verifyError?.message);
      process.exit(1);
    }

    console.log('✅✅✅ 完了しました！');
    console.log('');
    console.log('📍 最終結果:');
    console.log('  物件番号:', updated.property_number);
    console.log('  緯度:', updated.latitude);
    console.log('  経度:', updated.longitude);
    console.log('  Google Map URL:', updated.google_map_url);
    console.log('');
    console.log('🎉 AA10424が地図上に表示されるようになりました！');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('APIレスポンス:', error.response.data);
    }
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
geocodeAA10424();
