import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC22Storage() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Checking CC22 storage_location...\n');

  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, storage_location, image_url')
    .eq('property_number', 'CC22')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Property found:');
  console.log('Property Number:', data.property_number);
  console.log('Storage Location:', data.storage_location || '(なし)');
  console.log('Image URL:', data.image_url || '(なし)');
  console.log('\n');

  if (!data.storage_location) {
    console.log('⚠️ storage_locationが設定されていません。');
    console.log('Google Driveで物件番号を検索します...');
  }
}

checkCC22Storage().catch(console.error);
