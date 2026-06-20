import axios from 'axios';

const GOOGLE_MAP_URL = 'https://maps.app.goo.gl/XGhmyRareMYC9i189';

async function testUrlResolution() {
  console.log('🔗 Testing URL resolution for AA13436...\n');
  console.log('Original URL:', GOOGLE_MAP_URL);
  
  try {
    // ステップ1: バックエンドAPIでリダイレクト先を取得
    console.log('\n📡 Step 1: Resolving shortened URL via backend API...');
    const apiUrl = 'https://property-site-frontend-kappa.vercel.app';
    const response = await axios.get(`${apiUrl}/api/url-redirect/resolve?url=${encodeURIComponent(GOOGLE_MAP_URL)}`);
    
    console.log('✅ Redirected URL:', response.data.redirectedUrl);
    
    // ステップ2: リダイレクト先から座標を抽出
    console.log('\n📍 Step 2: Extracting coordinates from redirected URL...');
    const redirectedUrl = response.data.redirectedUrl;
    
    // パターン1: ?q=lat,lng
    let match = redirectedUrl.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      console.log('✅ Pattern 1 matched (?q=lat,lng)');
      console.log('Coordinates:', { lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
      return;
    }
    
    // パターン2: /search/lat,lng
    match = redirectedUrl.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
    if (match) {
      console.log('✅ Pattern 2 matched (/search/lat,lng)');
      console.log('Coordinates:', { lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
      return;
    }
    
    // パターン3: /place/lat,lng
    match = redirectedUrl.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      console.log('✅ Pattern 3 matched (/place/lat,lng)');
      console.log('Coordinates:', { lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
      return;
    }
    
    // パターン4: /@lat,lng,zoom
    match = redirectedUrl.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
    if (match) {
      console.log('✅ Pattern 4 matched (/@lat,lng,zoom)');
      console.log('Coordinates:', { lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
      return;
    }
    
    console.log('❌ No pattern matched. Could not extract coordinates.');
    console.log('Redirected URL:', redirectedUrl);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testUrlResolution();
