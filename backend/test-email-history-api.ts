/**
 * Test script for Email History API
 * 
 * Tests the email history endpoints to verify they work correctly
 */

import dotenv from 'dotenv';
dotenv.config();

import { EmailHistoryService } from './src/services/EmailHistoryService';

async function testEmailHistoryService() {
  console.log('🧪 Testing Email History Service\n');
  console.log('='.repeat(60));

  const service = new EmailHistoryService();

  try {
    // Test 1: Save email history
    console.log('\n📝 Test 1: Save email history');
    console.log('-'.repeat(60));
    
    const testBuyerId = '6647';
    const testPropertyNumbers = ['AA12345', 'AA12346'];
    
    const historyId = await service.saveEmailHistory({
      buyerId: testBuyerId,
      propertyNumbers: testPropertyNumbers,
      recipientEmail: 'test@example.com',
      subject: 'Test Email',
      body: 'This is a test email',
      senderEmail: 'test@ifoo-oita.com',
      emailType: 'test',
    });

    console.log('✅ Email history saved successfully');
    console.log(`   Created record ID: ${historyId}`);

    // Test 2: Get email history
    console.log('\n📋 Test 2: Get email history');
    console.log('-'.repeat(60));
    
    const history = await service.getEmailHistory(testBuyerId);
    
    console.log(`✅ Retrieved ${history.length} email history records`);
    history.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`);
      console.log(`   - ID: ${record.id}`);
      console.log(`   - Properties: ${record.propertyNumbers.join(', ')}`);
      console.log(`   - Sent At: ${record.sentAt}`);
      console.log(`   - Email Type: ${record.emailType}`);
    });

    // Test 3: Check if property has been emailed
    console.log('\n🔍 Test 3: Check if property has been emailed');
    console.log('-'.repeat(60));
    
    const hasBeenEmailed = await service.hasBeenEmailed(testBuyerId, 'AA12345');
    console.log(`✅ Property AA12345 has been emailed: ${hasBeenEmailed}`);

    const notEmailed = await service.hasBeenEmailed(testBuyerId, 'AA99999');
    console.log(`✅ Property AA99999 has been emailed: ${notEmailed}`);

    // Test 4: Get emailed properties
    console.log('\n📬 Test 4: Get all emailed properties');
    console.log('-'.repeat(60));
    
    const emailedProperties = await service.getEmailedProperties(testBuyerId);
    console.log(`✅ Found ${emailedProperties.length} emailed properties:`);
    emailedProperties.forEach(prop => {
      console.log(`   - ${prop}`);
    });

    // Test 5: Test duplicate constraint
    console.log('\n🔄 Test 5: Test duplicate constraint');
    console.log('-'.repeat(60));
    
    try {
      await service.saveEmailHistory({
        buyerId: testBuyerId,
        propertyNumbers: ['AA12345'], // Same property
        recipientEmail: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
        senderEmail: 'test@ifoo-oita.com',
        emailType: 'test', // Same email type
      });
      console.log('✅ Duplicate constraint handled gracefully (no error thrown)');
    } catch (error: any) {
      console.log('⚠️  Duplicate constraint error (expected):', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testEmailHistoryService();
