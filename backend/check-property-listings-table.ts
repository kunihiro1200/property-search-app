import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTable() {
  try {
    const { error } = await supabase
      .from('property_listings')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Table does not exist or error:', error.message);
      console.log('Error code:', error.code);
      return false;
    }
    
    console.log('✅ Table exists!');
    return true;
  } catch (err) {
    console.log('❌ Exception:', err);
    return false;
  }
}

checkTable();
