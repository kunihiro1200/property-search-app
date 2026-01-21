// CC23のproperty_detailsレコードを手動で作成
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function manualCreateCC23Details() {
  console.log('=== CC23のproperty_detailsレコードを手動で作成 ===\n');
  
  const propertyNumber = 'CC23';
  
  try {
    // 1. 既存のレコードを確認
    console.log('1. 既存のレコードを確認中...');
    const { data: existing, error: existingError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propertyNumber)
      .maybeSingle();
    
    if (existingError) {
      console.error('❌ エラー:', existingError);
      throw existingError;
    }
    
    if (existing) {
      console.log('✓ 既存のレコードが見つかりました');
      console.log('   ID:', existing.id);
      console.log('   property_number:', existing.property_number);
      return;
    }
    
    console.log('✓ 既存のレコードなし。新規作成します。');
    
    // 2. 新規レコードを作成
    console.log('\n2. 新規レコードを作成中...');
    const { data: newRecord, error: insertError } = await supabase
      .from('property_details')
      .insert({
        property_number: propertyNumber,
        favorite_comment: null,
        recommended_comments: null,
        property_about: null,
        athome_data: null
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ エラー:', insertError);
      throw insertError;
    }
    
    console.log('✓ 新規レコード作成完了');
    console.log('   ID:', newRecord.id);
    console.log('   property_number:', newRecord.property_number);
    
    // 3. 作成したレコードを確認
    console.log('\n3. 作成したレコードを確認中...');
    const { data: confirmed, error: confirmError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();
    
    if (confirmError) {
      console.error('❌ エラー:', confirmError);
      throw confirmError;
    }
    
    console.log('✓ 確認完了');
    console.log('   ID:', confirmed.id);
    console.log('   property_number:', confirmed.property_number);
    console.log('   favorite_comment:', confirmed.favorite_comment || '（なし）');
    console.log('   recommended_comments:', confirmed.recommended_comments || '（なし）');
    console.log('   property_about:', confirmed.property_about || '（なし）');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

manualCreateCC23Details().catch(console.error);
