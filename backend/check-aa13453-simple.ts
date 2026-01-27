// AA13453のproperty_detailsテーブルのデータを確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13453() {
  console.log('🔍 Checking AA13453 in property_details table...\n');
  
  // property_detailsテーブルから取得
  const { data, error } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'AA13453')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (!data) {
    console.log('❌ AA13453 not found in property_details table');
    return;
  }
  
  console.log('✅ Found AA13453 in property_details:');
  console.log('---');
  console.log('property_number:', data.property_number);
  console.log('favorite_comment:', data.favorite_comment);
  console.log('recommended_comments:', data.recommended_comments);
  console.log('athome_data:', data.athome_data);
  console.log('property_about:', data.property_about);
  console.log('---');
  
  // 各フィールドの詳細
  console.log('\n📊 Field Details:');
  console.log('favorite_comment:', {
    type: typeof data.favorite_comment,
    value: data.favorite_comment,
    is_null: data.favorite_comment === null,
  });
  
  console.log('recommended_comments:', {
    type: typeof data.recommended_comments,
    is_array: Array.isArray(data.recommended_comments),
    length: Array.isArray(data.recommended_comments) ? data.recommended_comments.length : 0,
    value: data.recommended_comments,
    is_null: data.recommended_comments === null,
  });
  
  console.log('athome_data:', {
    type: typeof data.athome_data,
    is_array: Array.isArray(data.athome_data),
    length: Array.isArray(data.athome_data) ? data.athome_data.length : 0,
    value: data.athome_data,
    is_null: data.athome_data === null,
  });
  
  console.log('property_about:', {
    type: typeof data.property_about,
    value: data.property_about,
    is_null: data.property_about === null,
  });
}

checkAA13453().catch(console.error);
