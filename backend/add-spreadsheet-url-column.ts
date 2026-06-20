import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function addSpreadsheetUrlColumn() {
  console.log('🔄 Adding spreadsheet_url column to property_listings...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // Supabase REST APIではALTER TABLEを直接実行できないため、
    // Supabase Dashboardで手動で実行する必要があります
    
    console.log('📋 SQL to execute in Supabase Dashboard:');
    console.log('');
    console.log('ALTER TABLE property_listings');
    console.log('ADD COLUMN IF NOT EXISTS spreadsheet_url TEXT;');
    console.log('');
    console.log('COMMENT ON COLUMN property_listings.spreadsheet_url IS \'URL of the individual property spreadsheet (from gyomu list)\';');
    console.log('');
    console.log('⚠️ Please execute this SQL in Supabase Dashboard → SQL Editor');
    console.log('   URL: https://supabase.com/dashboard/project/krxhrbtlgfjzsseegaqq/sql');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

addSpreadsheetUrlColumn().catch(console.error);
