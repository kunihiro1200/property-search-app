import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log('🔍 Testing Database Connection...');
  console.log('============================================================');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    process.exit(1);
  }
  
  // Mask password in output
  const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`📝 Connection String: ${maskedUrl}`);
  console.log('');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('🔌 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    console.log('');
    console.log('📊 Testing query...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ Query successful! Current time: ${result.rows[0].current_time}`);
    
    console.log('');
    console.log('🔍 Checking email_history table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'email_history'
      ) as table_exists
    `);
    
    if (tableCheck.rows[0].table_exists) {
      console.log('✅ email_history table exists');
      
      const countResult = await client.query('SELECT COUNT(*) as count FROM email_history');
      console.log(`📝 Current records in email_history: ${countResult.rows[0].count}`);
    } else {
      console.log('❌ email_history table does not exist');
    }
    
    client.release();
    await pool.end();
    
    console.log('');
    console.log('============================================================');
    console.log('✅ All tests passed!');
    
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('');
    console.error('Error details:', error);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
