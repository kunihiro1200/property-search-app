// Google Map URLから座標を抽出するスクリプト
import axios from 'axios';

async function extractCoordinatesFromGoogleMap(shortUrl: string) {
  console.log('🔍 Extracting coordinates from Google Map URL...\n');
  console.log(`Short URL: ${shortUrl}\n`);

  try {
    // 短縮URLをリダイレクトして実際のURLを取得
    const response = await axios.get(shortUrl, {
      maxRedirects: 5,
      validateStatus: () => true, // すべてのステータスコードを許可
    });

    const finalUrl = response.request.res.responseUrl || shortUrl;
    console.log(`Final URL: ${finalUrl}\n`);

    // URLから座標を抽出
    // パターン1: /search/lat,+lng
    const pattern1 = /\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/;
    const match1 = finalUrl.match(pattern1);

    if (match1) {
      const latitude = parseFloat(match1[1]);
      const longitude = parseFloat(match1[2]);
      console.log('✅ Coordinates extracted successfully!');
      console.log(`  Latitude: ${latitude}`);
      console.log(`  Longitude: ${longitude}`);
      return { latitude, longitude };
    }

    // パターン2: @lat,lng,zoom
    const pattern2 = /@(-?\d+\.\d+),(-?\d+\.\d+),/;
    const match2 = finalUrl.match(pattern2);

    if (match2) {
      const latitude = parseFloat(match2[1]);
      const longitude = parseFloat(match2[2]);
      console.log('✅ Coordinates extracted successfully!');
      console.log(`  Latitude: ${latitude}`);
      console.log(`  Longitude: ${longitude}`);
      return { latitude, longitude };
    }

    // パターン3: /place/.../@lat,lng
    const pattern3 = /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match3 = finalUrl.match(pattern3);

    if (match3) {
      const latitude = parseFloat(match3[1]);
      const longitude = parseFloat(match3[2]);
      console.log('✅ Coordinates extracted successfully!');
      console.log(`  Latitude: ${latitude}`);
      console.log(`  Longitude: ${longitude}`);
      return { latitude, longitude };
    }

    console.log('⚠️ Could not extract coordinates from URL');
    console.log('URL format not recognized');
    return null;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

// CC105のGoogle Map URL
const cc105Url = 'https://maps.app.goo.gl/xcwnydrSTgM4FmQh8';

extractCoordinatesFromGoogleMap(cc105Url).catch(console.error);
