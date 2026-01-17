import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyPropertyListingsTable() {
  console.log('Verifying property_listings table...\n');

  try {
    // Check if table exists and get count
    const { error, count } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error accessing property_listings table:', error.message);
      return;
    }

    console.log('✅ property_listings table exists!');
    console.log(`📊 Current record count: ${count || 0}`);

    // Get a sample record if any exist
    if (count && count > 0) {
      const { data: sample } = await supabase
        .from('property_listings')
        .select('*')
        .limit(1)
        .single();

      console.log('\n📝 Sample record structure:');
      console.log(JSON.stringify(sample, null, 2));
    } else {
      console.log('\n📝 Table is empty (no records yet)');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

verifyPropertyListingsTable();
