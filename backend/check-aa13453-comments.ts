import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA13453Comments() {
  console.log('🔍 Checking AA13453 comments...\n');

  try {
    // property_detailsテーブルから取得
    const { data: details, error: detailsError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', 'AA13453')
      .single();

    if (detailsError) {
      console.error('❌ Error fetching from property_details:', detailsError);
    } else {
      console.log('📊 Property Details Data:');
      console.log('  Property Number:', details.property_number);
      console.log('  Favorite Comment:', details.favorite_comment);
      console.log('  Recommended Comments:', details.recommended_comments);
      console.log('  Property About:', details.property_about);
      console.log('');
    }

    // athome_dataテーブルから取得
    const { data: athome, error: athomeError } = await supabase
      .from('athome_data')
      .select('*')
      .eq('property_number', 'AA13453')
      .single();

    if (athomeError) {
      console.error('❌ Error fetching from athome_data:', athomeError);
    } else {
      console.log('📊 Athome Data:');
      console.log('  Property Number:', athome.property_number);
      console.log('  Panorama URL:', athome.panorama_url);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAA13453Comments();
