import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testInquirySubmission() {
  try {
    console.log('🧪 Testing inquiry submission...');
    
    const apiUrl = 'https://property-site-frontend-kappa.vercel.app';
    
    const inquiryData = {
      name: 'テスト太郎',
      email: 'test@example.com',
      phone: '090-1234-5678',
      message: 'テスト問合せです。このメッセージは自動テストによるものです。',
      propertyId: null, // 物件を指定しない場合
    };
    
    console.log('📤 Sending inquiry:', inquiryData);
    
    const response = await axios.post(`${apiUrl}/api/public/inquiries`, inquiryData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('✅ Response:', response.data);
    console.log('📊 Status:', response.status);
    
    if (response.data.success) {
      console.log('✅ Inquiry submitted successfully!');
    } else {
      console.error('❌ Inquiry submission failed:', response.data.message);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testInquirySubmission();
