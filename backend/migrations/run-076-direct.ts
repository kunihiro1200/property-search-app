import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('Running migration 076 via direct PostgreSQL connection...');
  
  const client = await pool.connect();
  
  try {
    const sqlPath = path.join(__dirname, '076_add_hidden_images_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL:');
    console.log(sql);
    
    await client.query(sql);
    
    console.log('Migration executed successfully!');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'property_listings' 
      AND column_name = 'hidden_images'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verified:', result.rows[0]);
    } else {
      console.log('❌ Column not found!');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
