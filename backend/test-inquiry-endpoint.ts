import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface InquiryRequest {
  name: string;
  email: string;
  phone: string;
  message: string;
  propertyId?: string;
}

async function testInquiryEndpoint() {
  console.log('Testing Inquiry Submission Endpoint\n');
  console.log('='.repeat(50));

  // Test 1: Valid inquiry submission
  console.log('\n1. Testing valid inquiry submission...');
  try {
    const validInquiry: InquiryRequest = {
      name: 'テスト太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      message: 'この物件について詳しく知りたいです。'
    };

    const response = await axios.post(
      `${API_URL}/api/public/inquiries`,
      validInquiry
    );

    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  // Test 2: Missing required fields
  console.log('\n2. Testing missing required fields...');
  try {
    const invalidInquiry = {
      name: 'テスト太郎',
      // email missing
      phone: '090-1234-5678',
      message: 'メッセージ'
    };

    const response = await axios.post(
      `${API_URL}/api/public/inquiries`,
      invalidInquiry
    );

    console.log('❌ Should have failed but got:', response.status);
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected with 400');
      console.log('✅ Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 3: Invalid email format
  console.log('\n3. Testing invalid email format...');
  try {
    const invalidEmailInquiry: InquiryRequest = {
      name: 'テスト太郎',
      email: 'invalid-email',
      phone: '090-1234-5678',
      message: 'メッセージ'
    };

    const response = await axios.post(
      `${API_URL}/api/public/inquiries`,
      invalidEmailInquiry
    );

    console.log('❌ Should have failed but got:', response.status);
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected with 400');
      console.log('✅ Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 4: Message too long
  console.log('\n4. Testing message length validation...');
  try {
    const longMessageInquiry: InquiryRequest = {
      name: 'テスト太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      message: 'あ'.repeat(1001) // 1001 characters
    };

    const response = await axios.post(
      `${API_URL}/api/public/inquiries`,
      longMessageInquiry
    );

    console.log('❌ Should have failed but got:', response.status);
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected with 400');
      console.log('✅ Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 5: Rate limiting (make 4 requests quickly)
  console.log('\n5. Testing rate limiting (3 requests per hour)...');
  console.log('Making 4 rapid requests...');
  
  for (let i = 1; i <= 4; i++) {
    try {
      const inquiry: InquiryRequest = {
        name: `テスト太郎${i}`,
        email: `test${i}@example.com`,
        phone: '090-1234-5678',
        message: `テストメッセージ ${i}`
      };

      const response = await axios.post(
        `${API_URL}/api/public/inquiries`,
        inquiry
      );

      console.log(`  Request ${i}: ✅ Status ${response.status}`);
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log(`  Request ${i}: ✅ Rate limited (429)`);
        console.log('  ✅ Rate limit message:', error.response.data.message);
      } else {
        console.log(`  Request ${i}: ❌ Unexpected error:`, error.response?.data || error.message);
      }
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Test 6: With property ID
  console.log('\n6. Testing inquiry with property ID...');
  try {
    const inquiryWithProperty: InquiryRequest = {
      name: 'テスト太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      message: 'この物件について詳しく知りたいです。',
      propertyId: '123e4567-e89b-12d3-a456-426614174000' // Valid UUID format
    };

    const response = await axios.post(
      `${API_URL}/api/public/inquiries`,
      inquiryWithProperty
    );

    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Testing complete!');
}

// Run tests
testInquiryEndpoint().catch(console.error);
