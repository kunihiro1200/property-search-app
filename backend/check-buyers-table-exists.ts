// Check if buyers table exists in Supabase
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkBuyersTable() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    console.log('Checking if buyers table exists...\n');
    
    // Try to query the buyers table
    const { error } = await supabase
      .from('buyers')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ buyers table does NOT exist');
        console.log('\nYou need to run Migration 037 first to create the buyers table.');
        console.log('Please execute the SQL from backend/migrations/037_multi_entity_expansion.sql in Supabase SQL Editor.');
      } else {
        console.error('Error:', error.message);
      }
    } else {
      console.log('✅ buyers table EXISTS');
      console.log('\nYou can now run Migration 050 to fix VARCHAR(50) fields.');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkBuyersTable();
