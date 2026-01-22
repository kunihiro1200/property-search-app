/**
 * Test script to verify auth endpoints are working
 * Run with: npx ts-node test-auth-endpoint.ts
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testAuthEndpoints() {
  console.log('🧪 Testing Auth Endpoints\n');

  // Test 1: Check if /auth/me endpoint exists (should return 401)
  console.log('Test 1: GET /auth/me (without token)');
  try {
    await axios.get(`${API_URL}/auth/me`);
    console.log('❌ Expected 401 but got success');
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('✅ Endpoint exists and returns 401 as expected');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 2: Check if /auth/callback endpoint exists (should return 400 without token)
  console.log('\nTest 2: POST /auth/callback (without token)');
  try {
    await axios.post(`${API_URL}/auth/callback`, {});
    console.log('❌ Expected 400 but got success');
  } catch (error: any) {
    if (error.response?.status === 400) {
      console.log('✅ Endpoint exists and returns 400 as expected');
      console.log('   Error message:', error.response.data.error?.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 3: Check if server is running
  console.log('\nTest 3: Server health check');
  try {
    const response = await axios.get(`${API_URL}/api/sellers`, {
      validateStatus: () => true, // Accept any status
    });
    
    if (response.status === 401) {
      console.log('✅ Server is running (returns 401 for protected route)');
    } else if (response.status === 200) {
      console.log('⚠️  Server is running but route is not protected');
    } else {
      console.log('⚠️  Server returned status:', response.status);
    }
  } catch (error: any) {
    console.log('❌ Cannot connect to server:', error.message);
    console.log('   Make sure backend is running on port 3000');
  }

  console.log('\n📋 Summary:');
  console.log('If all tests pass, the backend auth endpoints are working correctly.');
  console.log('The blank screen issue is likely in the frontend or Supabase configuration.');
  console.log('\nNext steps:');
  console.log('1. Run database migrations from backend/RUN_MIGRATIONS_NOW.md');
  console.log('2. Check browser console for errors when logging in');
  console.log('3. Check Network tab for failed requests');
  console.log('4. Verify Supabase OAuth configuration');
}

testAuthEndpoints().catch(console.error);
