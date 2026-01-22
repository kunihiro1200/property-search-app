import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function testLocationFilter() {
  try {
    console.log('\n=== Testing Location Filter ===');
    
    // Test 1: Search for properties in Beppu
    const response1 = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { location: '別府' }
    });
    
    console.log(`Found ${response1.data.properties.length} properties in 別府`);
    console.log('Sample addresses:', response1.data.properties.slice(0, 3).map((p: any) => p.address));
    
    const allContainBeppu = response1.data.properties.every((p: any) => 
      p.address && p.address.includes('別府')
    );
    
    results.push({
      name: 'Location Filter - 別府',
      passed: allContainBeppu,
      message: allContainBeppu 
        ? `All ${response1.data.properties.length} properties contain '別府' in address`
        : 'Some properties do not contain 別府 in address'
    });
    
    // Test 2: Search for properties in Oita
    const response2 = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { location: '大分市' }
    });
    
    console.log(`\nFound ${response2.data.properties.length} properties in 大分市`);
    
    const allContainOita = response2.data.properties.every((p: any) => 
      p.address && p.address.includes('大分市')
    );
    
    results.push({
      name: 'Location Filter - 大分市',
      passed: allContainOita,
      message: allContainOita 
        ? `All ${response2.data.properties.length} properties contain '大分市' in address`
        : 'Some properties do not contain 大分市 in address'
    });
    
  } catch (error: any) {
    console.error('Location filter test failed:', error.message);
    results.push({
      name: 'Location Filter',
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testBuildingAgeFilter() {
  try {
    console.log('\n=== Testing Building Age Filter ===');
    
    // Test 1: Properties 0-5 years old
    const response1 = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { minAge: 0, maxAge: 5 }
    });
    
    console.log(`Found ${response1.data.properties.length} properties aged 0-5 years`);
    console.log('Sample construction dates:', response1.data.properties.slice(0, 3).map((p: any) => p.construction_year_month));
    
    results.push({
      name: 'Building Age Filter - 0-5 years',
      passed: true,
      message: `Found ${response1.data.properties.length} properties`
    });
    
    // Test 2: Properties 10-20 years old
    const response2 = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { minAge: 10, maxAge: 20 }
    });
    
    console.log(`\nFound ${response2.data.properties.length} properties aged 10-20 years`);
    
    results.push({
      name: 'Building Age Filter - 10-20 years',
      passed: true,
      message: `Found ${response2.data.properties.length} properties`
    });
    
    // Test 3: Only minAge
    const response3 = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { minAge: 30 }
    });
    
    console.log(`\nFound ${response3.data.properties.length} properties aged 30+ years`);
    
    results.push({
      name: 'Building Age Filter - minAge only',
      passed: true,
      message: `Found ${response3.data.properties.length} properties`
    });
    
    // Test 4: Only maxAge
    const response4 = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { maxAge: 3 }
    });
    
    console.log(`\nFound ${response4.data.properties.length} properties aged 0-3 years`);
    
    results.push({
      name: 'Building Age Filter - maxAge only',
      passed: true,
      message: `Found ${response4.data.properties.length} properties`
    });
    
  } catch (error: any) {
    console.error('Building age filter test failed:', error.message);
    results.push({
      name: 'Building Age Filter',
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testCombinedFilters() {
  try {
    console.log('\n=== Testing Combined Filters ===');
    
    // Test: Location + Building Age
    const response = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { 
        location: '別府',
        minAge: 0,
        maxAge: 10
      }
    });
    
    console.log(`Found ${response.data.properties.length} properties in 別府 aged 0-10 years`);
    console.log('Sample properties:', response.data.properties.slice(0, 2).map((p: any) => ({
      address: p.address,
      construction_year_month: p.construction_year_month
    })));
    
    const allMatch = response.data.properties.every((p: any) => 
      p.address && p.address.includes('別府')
    );
    
    results.push({
      name: 'Combined Filters - Location + Age',
      passed: allMatch,
      message: allMatch 
        ? `Found ${response.data.properties.length} matching properties`
        : 'Some properties do not match filters'
    });
    
  } catch (error: any) {
    console.error('Combined filters test failed:', error.message);
    results.push({
      name: 'Combined Filters',
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testErrorHandling() {
  try {
    console.log('\n=== Testing Error Handling ===');
    
    // Test 1: Invalid age range (minAge > maxAge)
    try {
      await axios.get(`${API_BASE_URL}/api/public/properties`, {
        params: { minAge: 20, maxAge: 10 }
      });
      results.push({
        name: 'Error Handling - Invalid age range',
        passed: false,
        message: 'Should have returned 400 error'
      });
    } catch (error: any) {
      const is400 = error.response?.status === 400;
      results.push({
        name: 'Error Handling - Invalid age range',
        passed: is400,
        message: is400 
          ? `Correctly returned 400: ${error.response.data.error}`
          : `Wrong status code: ${error.response?.status}`
      });
    }
    
    // Test 2: Negative age
    try {
      await axios.get(`${API_BASE_URL}/api/public/properties`, {
        params: { minAge: -5 }
      });
      results.push({
        name: 'Error Handling - Negative age',
        passed: false,
        message: 'Should have returned 400 error'
      });
    } catch (error: any) {
      const is400 = error.response?.status === 400;
      results.push({
        name: 'Error Handling - Negative age',
        passed: is400,
        message: is400 
          ? `Correctly returned 400: ${error.response.data.error}`
          : `Wrong status code: ${error.response?.status}`
      });
    }
    
  } catch (error: any) {
    console.error('Error handling test failed:', error.message);
    results.push({
      name: 'Error Handling',
      passed: false,
      message: `Unexpected error: ${error.message}`
    });
  }
}

async function testMetadata() {
  try {
    console.log('\n=== Testing Response Metadata ===');
    
    const response = await axios.get(`${API_BASE_URL}/api/public/properties`, {
      params: { 
        location: '別府',
        minAge: 5,
        maxAge: 15
      }
    });
    
    const hasMetadata = response.data.filters !== undefined;
    const hasLocationFilter = response.data.filters?.location === '別府';
    const hasBuildingAgeRange = response.data.filters?.buildingAgeRange !== undefined;
    
    console.log('Response metadata:', JSON.stringify(response.data.filters, null, 2));
    
    results.push({
      name: 'Response Metadata',
      passed: hasMetadata && hasLocationFilter && hasBuildingAgeRange,
      message: hasMetadata 
        ? 'Metadata correctly included in response'
        : 'Metadata missing from response'
    });
    
  } catch (error: any) {
    console.error('Metadata test failed:', error.message);
    results.push({
      name: 'Response Metadata',
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function runAllTests() {
  console.log('Starting Public Property Filters Tests...');
  console.log('API Base URL:', API_BASE_URL);
  
  await testLocationFilter();
  await testBuildingAgeFilter();
  await testCombinedFilters();
  await testErrorHandling();
  await testMetadata();
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${result.name}`);
    console.log(`  ${result.message}`);
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passedCount}/${totalCount} tests passed`);
  console.log('='.repeat(60));
  
  process.exit(passedCount === totalCount ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
