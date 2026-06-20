import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testSaveUnreachableStatus() {
  try {
    console.log('🧪 Testing unreachable status save...\n');

    // Test seller ID (AA13472)
    const sellerId = 'd63eac99-490e-446e-830e-fc69609460be';

    // Step 1: Get current seller data
    console.log('📥 Step 1: Getting current seller data...');
    const getResponse = await axios.get(`${API_BASE_URL}/api/sellers/${sellerId}`, {
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });
    
    console.log('Current unreachableStatus:', getResponse.data.unreachableStatus);
    console.log('Current inquiryDate:', getResponse.data.inquiryDate);
    console.log('');

    // Step 2: Update unreachableStatus to '通電OK'
    console.log('📤 Step 2: Updating unreachableStatus to "通電OK"...');
    const updateResponse = await axios.put(
      `${API_BASE_URL}/api/sellers/${sellerId}`,
      {
        unreachableStatus: '通電OK',
      },
      {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Update response status:', updateResponse.status);
    console.log('Updated unreachableStatus:', updateResponse.data.unreachableStatus);
    console.log('');

    // Step 3: Verify the update
    console.log('🔍 Step 3: Verifying the update...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/api/sellers/${sellerId}`, {
      headers: {
        'Authorization': 'Bearer test-token',
      },
    });

    console.log('Verified unreachableStatus:', verifyResponse.data.unreachableStatus);
    
    if (verifyResponse.data.unreachableStatus === '通電OK') {
      console.log('\n✅ SUCCESS: unreachableStatus was saved correctly!');
    } else {
      console.log('\n❌ FAILED: unreachableStatus was not saved correctly');
      console.log('Expected: 通電OK');
      console.log('Got:', verifyResponse.data.unreachableStatus);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSaveUnreachableStatus();
