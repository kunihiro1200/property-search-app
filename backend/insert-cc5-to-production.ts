import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// 本番環境のSupabase接続情報
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertCC5ToProduction() {
  console.log('=== Inserting CC5 to Production ===\n');
  
  const propertyNumber = 'CC5';
  
  // CC5のデータ（先ほど確認したデータ）
  const cc5Data = {
    property_number: propertyNumber,
    favorite_comment: '仲介手数料なんと0円！！！キャンペーン実施中です！\n安心の耐震性能と高い省エネ性に加え、動線の良い間取りと充実した収納で、快適な住まいを提供します。',
    recommended_comments: [
      [ '＼おすすめポイント！／' ],
      [ '●人気の角地' ],
      [ '●駐車場は広々3台' ],
      [ '●WICなど収納が豊富です' ],
      [ '●白を基調とした明るい室内' ],
      [ '●閑静な住宅街' ],
      [ '●支払例' ],
      [ '借入金', '30,980,000', '円 ボーナス返済分無し、３５年ローンの場合' ],
      [ '－－－－－－－－－－－－' ],
      [ '支払額：毎月', '86,732', '円' ],
      [ '－－－－－－－－－－－－' ],
      [ '※上記は金利０．９５％の場合です。金利は金融機関や時機により異なります。' ],
      [ 'お客様にあったプランをご提案いたします。お気軽にご相談ください！' ]
    ],
    property_about: '【こちらの物件について】\n・駐車場は３台となっています。\n※網戸・照明器具・カーテンレール・ＴＶアンテナ等は別途注文をおねがいします。',
    athome_data: null // パノラマURLは後で追加
  };
  
  console.log('Inserting data for:', propertyNumber);
  console.log('Has favorite_comment:', !!cc5Data.favorite_comment);
  console.log('Has recommended_comments:', !!cc5Data.recommended_comments);
  console.log('Has property_about:', !!cc5Data.property_about);
  console.log('Has athome_data:', !!cc5Data.athome_data);
  
  const { data, error } = await supabase
    .from('property_details')
    .upsert(cc5Data, {
      onConflict: 'property_number'
    })
    .select();
  
  if (error) {
    console.error('\n❌ Error:', error);
    return;
  }
  
  console.log('\n✅ Successfully inserted/updated CC5 data!');
  console.log('Data:', data);
  
  // 確認
  console.log('\n🔍 Verifying...');
  const { data: verified, error: verifyError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', propertyNumber)
    .single();
  
  if (verifyError) {
    console.error('Verify error:', verifyError);
    return;
  }
  
  console.log('Verified:', {
    property_number: verified.property_number,
    has_favorite_comment: !!verified.favorite_comment,
    has_recommended_comments: !!verified.recommended_comments,
    recommended_comments_count: Array.isArray(verified.recommended_comments) ? verified.recommended_comments.length : 0,
    has_athome_data: !!verified.athome_data,
    panorama_url: verified.athome_data?.panoramaUrl || 'なし',
    has_property_about: !!verified.property_about
  });
}

insertCC5ToProduction().catch(console.error);
