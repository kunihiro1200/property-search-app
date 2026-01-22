/**
 * Simple test for email_history table using direct PostgreSQL connection
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function testEmailHistory() {
  console.log('🧪 Testing email_history table\n');
  console.log('='.repeat(60));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test 1: Check if table exists
    console.log('\n📋 Test 1: Check if table exists');
    console.log('-'.repeat(60));
    
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_history'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table does NOT exist');
      console.log('\n📝 Please execute the migration SQL in Supabase SQL Editor:');
      console.log('   File: backend/migrations/056_add_email_history.sql');
      console.log('   Guide: backend/今すぐ実行_テーブル作成.md');
      await pool.end();
      process.exit(1);
    }

    console.log('✅ Table EXISTS');

    // Test 2: Check table structure
    console.log('\n📊 Test 2: Check table structure');
    console.log('-'.repeat(60));
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'email_history'
      ORDER BY ordinal_position;
    `);

    console.log('   Columns:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Test 3: Try to insert a test record
    console.log('\n📝 Test 3: Insert test record');
    console.log('-'.repeat(60));
    
    const insertResult = await pool.query(`
      INSERT INTO email_history (
        buyer_id, 
        property_numbers, 
        recipient_email, 
        subject, 
        body, 
        sender_email, 
        email_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      'TEST_BUYER_001',
      ['AA12345', 'AA12346'],
      'test@example.com',
      'Test Email Subject',
      'Test email body content',
      'sender@example.com',
      'test'
    ]);

    const insertedId = insertResult.rows[0].id;
    console.log(`✅ Test record inserted with ID: ${insertedId}`);

    // Test 4: Query the test record
    console.log('\n🔍 Test 4: Query test record');
    console.log('-'.repeat(60));
    
    const queryResult = await pool.query(`
      SELECT * FROM email_history WHERE id = $1
    `, [insertedId]);

    if (queryResult.rows.length > 0) {
      const record = queryResult.rows[0];
      console.log('✅ Test record retrieved:');
      console.log(`   - ID: ${record.id}`);
      console.log(`   - Buyer ID: ${record.buyer_id}`);
      console.log(`   - Property Numbers: ${record.property_numbers.join(', ')}`);
      console.log(`   - Recipient: ${record.recipient_email}`);
      console.log(`   - Sender: ${record.sender_email}`);
      console.log(`   - Email Type: ${record.email_type}`);
    }

    // Test 5: Clean up test record
    console.log('\n🧹 Test 5: Clean up test record');
    console.log('-'.repeat(60));
    
    await pool.query(`DELETE FROM email_history WHERE id = $1`, [insertedId]);
    console.log('✅ Test record deleted');

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed! email_history table is ready to use.');
    console.log('='.repeat(60));
    console.log('\n📞 Next steps:');
    console.log('   1. Report success to continue with Task 3');
    console.log('   2. Test the EmailHistoryService API endpoints');
    console.log('   3. Proceed to frontend implementation\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testEmailHistory();
