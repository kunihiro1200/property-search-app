import axios from 'axios';

async function testUrlRedirect() {
  const shortUrl = 'https://maps.app.goo.gl/xcwnydrSTgM4FmQh8';
  
  console.log('🔗 Testing URL redirect for:', shortUrl);
  
  try {
    // HEADリクエストでリダイレクト先を取得
    const response = await axios.head(shortUrl, {
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    
    const redirectedUrl = response.request.res.responseUrl || shortUrl;
    console.log('✅ Redirected URL:', redirectedUrl);
    
    // 座標を抽出
    const patterns = [
      /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,  // ?q=lat,lng
      /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,  // /place/lat,lng
      /\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/,  // /@lat,lng,zoom
    ];
    
    let coords = null;
    for (const pattern of patterns) {
      const match = redirectedUrl.match(pattern);
      if (match) {
        coords = {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2]),
        };
        console.log('✅ Extracted coordinates:', coords);
        break;
      }
    }
    
    if (!coords) {
      console.log('⚠️ Could not extract coordinates from URL');
      console.log('URL format:', redirectedUrl);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testUrlRedirect();
