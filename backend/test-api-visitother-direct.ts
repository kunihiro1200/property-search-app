import axios from 'axios';

async function testVisitOtherAPI() {
  console.log('🔍 Testing visitOther API endpoint...\n');

  try {
    // Test: Call visitOther API with visitAssignee=U
    console.log('\nTest: Calling visitOther API with visitAssignee=U...');
    const params = {
      page: 1,
      pageSize: 50,
      sortBy: 'inquiry_date',
      sortOrder: 'desc',
      statusCategory: 'visitOther',
      visitAssignee: 'U'
    };

    console.log('Request params:', JSON.stringify(params, null, 2));

    const response = await axios.get('http://localhost:3000/api/sellers', { params });

    console.log('\n✅ API Response:');
    console.log('  Total sellers:', response.data.total);
    console.log('  Returned sellers:', response.data.data?.length || 0);
    console.log('  Expected: 206 sellers');
    
    if (response.data.total === 206) {
      console.log('\n🎉 SUCCESS! The API is returning the correct count (206 sellers)');
    } else {
      console.log(`\n❌ MISMATCH! Expected 206 but got ${response.data.total}`);
    }

    // Show first 3 sellers
    if (response.data.data && response.data.data.length > 0) {
      console.log('\nFirst 3 sellers:');
      response.data.data.slice(0, 3).forEach((seller: any, index: number) => {
        console.log(`  ${index + 1}. ${seller.sellerNumber} - ${seller.name} (visitAssignee: ${seller.visitAssignee})`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testVisitOtherAPI();
