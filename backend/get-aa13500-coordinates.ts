import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function getCoordinates() {
  const address = '大分市星和台2丁目2の18の9';
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  console.log('🗺️ 住所から座標を取得...');
  console.log('  住所:', address);
  console.log('');

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: apiKey,
      },
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      console.log('✅ 座標取得成功:');
      console.log('  緯度:', location.lat);
      console.log('  経度:', location.lng);
      console.log('');
      console.log('📝 Supabase Studioで以下のSQLを実行してください:');
      console.log('');
      console.log(`UPDATE sellers SET latitude = ${location.lat}, longitude = ${location.lng} WHERE seller_number = 'AA13500';`);
    } else {
      console.error('❌ 座標取得失敗:', response.data.status);
      console.error('  エラーメッセージ:', response.data.error_message);
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

getCoordinates();
