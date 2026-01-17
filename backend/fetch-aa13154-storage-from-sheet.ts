import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fetchStorageLocationFromSheet() {
  console.log('🔍 Fetching AA13154 storage_location from spreadsheet...\n');

  // Initialize Google Sheets client
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
    sheetName: '業務依頼',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 
      '/C:/Users/kunih/Downloads/seller-management-personal-618a08796d49.json'
  });

  await sheetsClient.authenticate();
  console.log('✅ Authenticated with Google Sheets\n');

  // Read the specific cell CO275 (CO column is column 93)
  // CO = C(3) + O(15) = 67 + 26 = 93rd column
  // Row 275 in the sheet
  const range = 'CO275';
  console.log(`📋 Reading cell ${range}...`);
  
  const data = await sheetsClient.readRange(range);
  
  if (!data || data.length === 0) {
    console.log('❌ No data found in cell CO275');
    return;
  }

  // Get the first (and only) row
  const row = data[0];
  const storageLocation = Object.values(row)[0] as string;
  
  console.log(`\n📦 Storage Location from spreadsheet:`);
  console.log(`  Value: ${storageLocation || 'NULL'}\n`);

  if (!storageLocation) {
    console.log('⚠️  Cell CO275 is empty in the spreadsheet');
    return;
  }

  // Update property_listings table
  console.log('💾 Updating property_listings table...');
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({ 
      storage_location: storageLocation,
      updated_at: new Date().toISOString()
    })
    .eq('property_number', 'AA13154');

  if (updateError) {
    console.log('❌ Failed to update property_listing:', updateError.message);
    return;
  }

  console.log('✅ Successfully updated AA13154 storage_location!\n');
  
  // Verify the update
  const { data: updated } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'AA13154')
    .single();

  console.log('🔍 Verification:');
  console.log(`  property_number: ${updated?.property_number}`);
  console.log(`  storage_location: ${updated?.storage_location}`);
  console.log(`  Status: ${updated?.storage_location === storageLocation ? '✅ Match' : '❌ Mismatch'}\n`);
}

fetchStorageLocationFromSheet().catch(console.error);
