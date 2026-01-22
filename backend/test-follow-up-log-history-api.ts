import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function testFollowUpLogHistoryAPI() {
  console.log('=== Testing Follow-Up Log History API ===\n');

  // Test with a known seller number
  const testSellerNumber = 'AA12923'; // Use a seller number you know exists

  try {
    console.log(`Testing GET /api/sellers/${testSellerNumber}/follow-up-logs/history`);
    const response = await axios.get(
      `${API_BASE_URL}/api/sellers/${testSellerNumber}/follow-up-logs/history`,
      {
        headers: {
          'Authorization': 'Bearer test-token' // Add your actual token if needed
        }
      }
    );

    console.log('✅ API Response Status:', response.status);
    console.log('✅ Data received:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testFollowUpLogHistoryAPI();
