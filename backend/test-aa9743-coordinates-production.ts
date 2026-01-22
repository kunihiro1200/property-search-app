import axios from 'axios';

async function testAA9743Coordinates() {
  try {
    const apiUrl = 'https://baikyaku-property-site3.vercel.app';
    const response = await axios.get(`${apiUrl}/api/public/properties/AA9743`);
    
    console.log('✅ API Response:');
    console.log('Property Number:', response.data.property?.property_number);
    console.log('Latitude:', response.data.property?.latitude);
    console.log('Longitude:', response.data.property?.longitude);
    console.log('Google Map URL:', response.data.property?.google_map_url);
    
    if (response.data.property?.latitude && response.data.property?.longitude) {
      console.log('\n✅ 座標データが正常に返されています！');
    } else {
      console.log('\n❌ 座標データが返されていません');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAA9743Coordinates();
