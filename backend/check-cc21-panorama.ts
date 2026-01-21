import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC21Panorama() {
  console.log('🔍 CC21のパノラマURLを確認中...\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // property_listingsテーブルからCC21を取得
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number, panorama_url, storage_location')
      .eq('property_number', 'CC21')
      .single();

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log('✅ 取得結果:');
    console.log('物件番号:', data.property_number);
    console.log('panorama_url:', data.panorama_url || '(null)');
    console.log('storage_location:', data.storage_location || '(null)');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkCC21Panorama();
