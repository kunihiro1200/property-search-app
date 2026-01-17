// AA10424の座標を取得するだけのスクリプト
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function getAA10424Coordinates() {
  console.log('🔄 AA10424の座標を取得中...\n');

  try {
    const address = '別府市山の手町3246番地3';
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEYが設定されていません');
      process.exit(1);
    }

    console.log('📍 住所:', address);
    console.log('📡 Geocoding API呼び出し中...\n');

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await axios.get(geocodeUrl);

    if (response.data.status !== 'OK') {
      console.error('❌ Geocoding APIエラー:', response.data.status);
      if (response.data.error_message) {
        console.error('エラーメッセージ:', response.data.error_message);
      }
      process.exit(1);
    }

    const location = response.data.results[0].geometry.location;
    const latitude = location.lat;
    const longitude = location.lng;

    console.log('✅ 座標を取得しました:');
    console.log('  緯度:', latitude);
    console.log('  経度:', longitude);
    console.log('');
    console.log('📝 次のステップ:');
    console.log('Supabase SQL Editorで以下のSQLを実行してください:');
    console.log('');
    console.log('```sql');
    console.log(`UPDATE property_listings`);
    console.log(`SET`);
    console.log(`  latitude = ${latitude},`);
    console.log(`  longitude = ${longitude},`);
    console.log(`  updated_at = NOW()`);
    console.log(`WHERE property_number = 'AA10424';`);
    console.log('```');
    console.log('');

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
getAA10424Coordinates();
