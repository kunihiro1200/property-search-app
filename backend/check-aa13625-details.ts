/**
 * AA13625の詳細を確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAA13625() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Checking AA13625 details...\n');

  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13625')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('❌ AA13625 not found');
    return;
  }

  console.log('📊 AA13625 Details:\n');
  console.log('Property Number:', data.property_number);
  console.log('Storage Location:', data.storage_location || '(null)');
  console.log('Address:', data.address);
  console.log('Display Address:', data.display_address);
  console.log('Property Type:', data.property_type);
  console.log('ATBB Status:', data.atbb_status);
  console.log('Status:', data.status);
  console.log('Updated At:', data.updated_at);
  console.log('Created At:', data.created_at);
}

checkAA13625();
