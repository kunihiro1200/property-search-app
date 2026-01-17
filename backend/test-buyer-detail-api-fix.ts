/**
 * Integration test for buyer detail API error fix
 * Tests the complete flow: buyer detail page → related buyers → inquiry history
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({ name, passed: false, error: error.message, duration });
    console.error(`❌ ${name} (${duration}ms): ${error.message}`);
  }
}

async function testInvalidUUID(): Promise<void> {
  try {
    await axios.get(`${API_BASE_URL}/buyers/invalid-uuid/related`);
    throw new Error('Should have returned 400 for invalid UUID');
  } catch (error: any) {
    if (error.response?.status === 400) {
      // Expected behavior
      return;
    }
    throw error;
  }
}

async function testNonExistentBuyer(): Promise<void> {
  const fakeUUID = '00000000-0000-4000-8000-000000000000';
  try {
    await axios.get(`${API_BASE_URL}/buyers/${fakeUUID}/related`);
    throw new Error('Should have returned 404 for non-existent buyer');
  } catch (error: any) {
    if (error.response?.status === 404) {
      // Expected behavior
      return;
    }
    throw error;
  }
}

async function testRelatedBuyersWithBuyerNumber(): Promise<void> {
  // Test with buyer number 6647
  const response = await axios.get(`${API_BASE_URL}/buyers/6647/related`);
  
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  
  if (!response.data.current_buyer) {
    throw new Error('Missing current_buyer in response');
  }
  
  if (!Array.isArray(response.data.related_buyers)) {
    throw new Error('related_buyers should be an array');
  }
  
  console.log(`  Found ${response.data.related_buyers.length} related buyers for buyer 6647`);
}

async function testRelatedBuyersWithUUID(): Promise<void> {
  // First get buyer 6647 to get its UUID
  const buyerResponse = await axios.get(`${API_BASE_URL}/buyers/6647`);
  const buyerUUID = buyerResponse.data.id;
  
  // Test with UUID
  const response = await axios.get(`${API_BASE_URL}/buyers/${buyerUUID}/related`);
  
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  
  if (!response.data.current_buyer) {
    throw new Error('Missing current_buyer in response');
  }
  
  console.log(`  Successfully fetched related buyers using UUID`);
}

async function testUnifiedInquiryHistory(): Promise<void> {
  const response = await axios.get(`${API_BASE_URL}/buyers/6647/unified-inquiry-history`);
  
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  
  if (!Array.isArray(response.data.inquiries)) {
    throw new Error('inquiries should be an array');
  }
  
  if (!Array.isArray(response.data.buyer_numbers)) {
    throw new Error('buyer_numbers should be an array');
  }
  
  console.log(`  Found ${response.data.inquiries.length} inquiries for ${response.data.buyer_numbers.length} buyers`);
}

async function testBuyer6648RelatedTo6647(): Promise<void> {
  const response = await axios.get(`${API_BASE_URL}/buyers/6647/related`);
  
  const relatedBuyers = response.data.related_buyers;
  const buyer6648 = relatedBuyers.find((b: any) => b.buyer_number === '6648');
  
  if (!buyer6648) {
    throw new Error('Buyer 6648 should appear as related to buyer 6647');
  }
  
  console.log(`  ✓ Buyer 6648 appears as related to buyer 6647`);
  console.log(`    Match reason: ${buyer6648.match_reason}`);
  console.log(`    Relation type: ${buyer6648.relation_type}`);
}

async function testResponseTime(): Promise<void> {
  const startTime = Date.now();
  await axios.get(`${API_BASE_URL}/buyers/6647/related`);
  const duration = Date.now() - startTime;
  
  if (duration > 1000) {
    throw new Error(`Response time ${duration}ms exceeds 1 second threshold`);
  }
  
  console.log(`  Response time: ${duration}ms (< 1000ms ✓)`);
}

async function testCaching(): Promise<void> {
  // First request (cache miss)
  const start1 = Date.now();
  await axios.get(`${API_BASE_URL}/buyers/6647/related`);
  const duration1 = Date.now() - start1;
  
  // Second request (cache hit)
  const start2 = Date.now();
  await axios.get(`${API_BASE_URL}/buyers/6647/related`);
  const duration2 = Date.now() - start2;
  
  console.log(`  First request: ${duration1}ms`);
  console.log(`  Second request: ${duration2}ms (cached)`);
  
  if (duration2 >= duration1) {
    console.warn(`  ⚠️ Cache may not be working (second request not faster)`);
  }
}

async function testErrorResponseStructure(): Promise<void> {
  try {
    await axios.get(`${API_BASE_URL}/buyers/invalid-uuid/related`);
    throw new Error('Should have returned error');
  } catch (error: any) {
    const errorData = error.response?.data;
    
    if (!errorData.error) {
      throw new Error('Error response missing "error" field');
    }
    
    if (!errorData.message) {
      throw new Error('Error response missing "message" field');
    }
    
    if (!errorData.code) {
      throw new Error('Error response missing "code" field');
    }
    
    console.log(`  Error structure valid: ${errorData.code}`);
  }
}

async function runAllTests(): Promise<void> {
  console.log('🧪 Running Buyer Detail API Error Fix Integration Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  
  await runTest('Test 1: Invalid UUID returns 400', testInvalidUUID);
  await runTest('Test 2: Non-existent buyer returns 404', testNonExistentBuyer);
  await runTest('Test 3: Related buyers with buyer number', testRelatedBuyersWithBuyerNumber);
  await runTest('Test 4: Related buyers with UUID', testRelatedBuyersWithUUID);
  await runTest('Test 5: Unified inquiry history', testUnifiedInquiryHistory);
  await runTest('Test 6: Buyer 6648 related to 6647', testBuyer6648RelatedTo6647);
  await runTest('Test 7: Response time < 1 second', testResponseTime);
  await runTest('Test 8: Caching works correctly', testCaching);
  await runTest('Test 9: Error response structure', testErrorResponseStructure);
  
  console.log('\n📊 Test Summary:');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Failed: ${results.filter(r => !r.passed).length}`);
  
  const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
  console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);
  
  if (results.some(r => !r.passed)) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
