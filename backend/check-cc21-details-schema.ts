import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC21DetailsSchema() {
  console.log('🔍 CC21のproperty_detailsスキーマを確認中...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // property_detailsテーブルからCC21のデータを取得
  const { data, error } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', 'CC21')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!data) {
    console.log('❌ CC21のデータが見つかりません');
    return;
  }

  console.log('✅ CC21のproperty_detailsデータ:');
  console.log(JSON.stringify(data, null, 2));
  
  console.log('\n📋 recommended_commentsの詳細:');
  console.log('- 型:', typeof data.recommended_comments);
  console.log('- 値:', data.recommended_comments);
  console.log('- 配列か:', Array.isArray(data.recommended_comments));
  if (Array.isArray(data.recommended_comments)) {
    console.log('- 長さ:', data.recommended_comments.length);
    console.log('- 最初の要素:', data.recommended_comments[0]);
  }
}

checkCC21DetailsSchema().catch(console.error);
