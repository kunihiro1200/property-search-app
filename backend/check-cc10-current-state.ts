import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC10CurrentState() {
  try {
    console.log('🔍 Checking CC10 current state in database...\n');
    
    // データベースからCC10を取得
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'CC10')
      .single();
    
    if (error) {
      console.error('❌ Error fetching CC10:', error);
      return;
    }
    
    if (!property) {
      console.log('❌ CC10 not found in database');
      return;
    }
    
    console.log('✅ CC10 found in database:');
    console.log('  Property Number:', property.property_number);
    console.log('  Address:', property.address);
    console.log('  Storage Location:', property.storage_location);
    console.log('  ATBB Status:', property.atbb_status);
    console.log('  Price:', property.price);
    console.log('  Property Type:', property.property_type);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCC10CurrentState();
