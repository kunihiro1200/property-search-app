// CC105のコメントデータを確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC105Comments() {
  console.log('🔍 Checking CC105 comment data...\n');

  // CC105のproperty_detailsを取得
  const { data, error } = await supabase
    .from('property_details')
    .select('property_number, favorite_comment, recommended_comments, athome_data')
    .eq('property_number', 'CC105')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('⚠️ CC105 property_details not found');
    return;
  }

  console.log('📊 CC105 property_details:');
  console.log(JSON.stringify(data, null, 2));

  // コメントの状態を確認
  console.log('\n💬 Comment status:');
  console.log(`  favorite_comment: ${data.favorite_comment ? 'EXISTS' : 'NULL'}`);
  console.log(`  recommended_comments: ${data.recommended_comments ? `${data.recommended_comments.length} items` : 'NULL'}`);
  console.log(`  athome_data: ${data.athome_data ? `${data.athome_data.length} items` : 'NULL'}`);

  if (data.recommended_comments && data.recommended_comments.length > 0) {
    console.log('\n📝 Recommended comments:');
    data.recommended_comments.forEach((comment: string, index: number) => {
      console.log(`  ${index + 1}. ${comment}`);
    });
  } else {
    console.log('\n⚠️ No recommended comments found!');
  }
}

checkCC105Comments().catch(console.error);
