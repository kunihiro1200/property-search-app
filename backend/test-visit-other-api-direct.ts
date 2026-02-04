import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testVisitOtherAPI() {
  console.log('🔍 Testing visitOther API directly\n');
  
  try {
    // Get session token from environment or use a test token
    const sessionToken = process.env.SESSION_TOKEN || '';
    
    const response = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        page: 1,
        pageSize: 50,
        sortBy: 'inquiry_date',
        sortOrder: 'desc',
        statusCategory: 'visitOther',
        visitAssignee: 'U',
      },
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });
    
    console.log('✅ API Response:');
    console.log('  - Total:', response.data.total);
    console.log('  - Data length:', response.data.data?.length);
    console.log('  - Page:', response.data.page);
    console.log('  - PageSize:', response.data.pageSize);
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 First 5 sellers:');
      response.data.data.slice(0, 5).forEach((seller: any) => {
        console.log(`  - ${seller.sellerNumber}: visitAssignee=${seller.visitAssignee}, nextCallDate=${seller.nextCallDate}, status=${seller.status}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('  - Status:', error.response.status);
      console.error('  - Data:', error.response.data);
    }
  }
}

testVisitOtherAPI();
