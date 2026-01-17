import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
});

async function runMigration() {
  console.log('Attempting to add hidden_images column via Supabase...');
  
  // Try using raw SQL via the REST API
  const sql = `
    ALTER TABLE property_listings
    ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';
  `;
  
  try {
    // Method 1: Try using the sql function if available
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });
    
    if (error) {
      console.log('RPC exec_sql failed:', error.message);
      console.log('');
      console.log('=== 手動実行が必要です ===');
      console.log('');
      console.log('Supabase Dashboard の SQL Editor で以下を実行してください:');
      console.log('');
      console.log('```sql');
      console.log('ALTER TABLE property_listings');
      console.log("ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';");
      console.log('');
      console.log("COMMENT ON COLUMN property_listings.hidden_images IS 'Array of Google Drive file IDs that should be hidden from public display';");
      console.log('');
      console.log('CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images');
      console.log('ON property_listings USING GIN (hidden_images);');
      console.log('```');
      console.log('');
      console.log('URL: https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql');
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
  
  // Check if column exists
  console.log('');
  console.log('Checking if column exists...');
  const { error: checkError } = await supabase
    .from('property_listings')
    .select('id')
    .limit(1);
    
  if (checkError) {
    console.log('Table check error:', checkError.message);
  } else {
    console.log('Table accessible, checking for hidden_images column...');
    
    // Try to select the hidden_images column
    const { error: colError } = await supabase
      .from('property_listings')
      .select('hidden_images')
      .limit(1);
      
    if (colError && colError.message.includes('does not exist')) {
      console.log('❌ hidden_images column does NOT exist yet');
      console.log('');
      console.log('Please run the SQL manually in Supabase Dashboard');
    } else if (colError) {
      console.log('Column check error:', colError.message);
    } else {
      console.log('✅ hidden_images column EXISTS!');
    }
  }
}

runMigration();
