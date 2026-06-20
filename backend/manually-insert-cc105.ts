import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function manuallyInsertCC105() {
  console.log('🔄 Manually inserting CC105 to property_listings...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // CC105のデータ
  const cc105Data = {
    property_number: 'CC105',
    atbb_status: '一般・公開前',
    storage_location: null,
    spreadsheet_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('📝 Inserting CC105...');
  const { data, error } = await supabase
    .from('property_listings')
    .insert(cc105Data)
    .select();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ CC105 added successfully!');
  console.log('');
  console.log('📋 Data:');
  console.log(data);
}

manuallyInsertCC105().catch(console.error);
