import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkAA10424DirectPG() {
  console.log('🔍 Checking AA10424 using direct PostgreSQL connection...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const result = await pool.query(`
      SELECT 
        property_number,
        address,
        latitude,
        longitude,
        google_map_url
      FROM property_listings
      WHERE property_number = 'AA10424'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ AA10424 not found');
      return;
    }
    
    const data = result.rows[0];
    console.log('📊 AA10424 Data:');
    console.log(`  Property Number: ${data.property_number}`);
    console.log(`  Address: ${data.address}`);
    console.log(`  Latitude: ${data.latitude || 'NULL'}`);
    console.log(`  Longitude: ${data.longitude || 'NULL'}`);
    console.log(`  Google Map URL: ${data.google_map_url || 'NULL'}`);
    
    if (!data.latitude || !data.longitude) {
      console.log('\n⚠️ Coordinates are NULL - need to geocode!');
      console.log('\n📍 Google Map URL exists, we can extract coordinates from it.');
    } else {
      console.log('\n✅ Coordinates are already set!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAA10424DirectPG().catch(console.error);
