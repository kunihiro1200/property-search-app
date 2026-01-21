import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC23AthomeData() {
  try {
    console.log('🔍 CC23のathome_dataを確認中...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', 'CC23')
      .single();

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    console.log('=== CC23のproperty_details ===');
    console.log('');
    console.log('property_number:', data.property_number);
    console.log('');
    console.log('favorite_comment:');
    console.log(data.favorite_comment);
    console.log('');
    console.log('athome_data:');
    console.log(JSON.stringify(data.athome_data, null, 2));
    console.log('');
    console.log('recommended_comments:');
    console.log(JSON.stringify(data.recommended_comments, null, 2));

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkCC23AthomeData();
