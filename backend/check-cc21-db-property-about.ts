import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC21DBPropertyAbout() {
  console.log('🔍 CC21のproperty_detailsテーブルを確認中...\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // CC21のproperty_detailsを取得
    const { data, error } = await supabase
      .from('property_details')
      .select('property_number, recommended_comments, favorite_comment, athome_data, property_about')
      .eq('property_number', 'CC21')
      .single();

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log('✅ 取得結果:');
    console.log('物件番号:', data.property_number);
    console.log('\nrecommended_comments:', data.recommended_comments ? `${data.recommended_comments.length}行` : 'null');
    console.log('favorite_comment:', data.favorite_comment || 'null');
    console.log('athome_data:', data.athome_data ? 'あり' : 'null');
    console.log('property_about:', data.property_about || 'null');

    if (data.property_about) {
      console.log('\n📝 property_aboutの内容:');
      console.log(data.property_about);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkCC21DBPropertyAbout().catch(console.error);
