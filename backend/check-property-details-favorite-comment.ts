/**
 * property_details テーブルの favorite_comment を確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('property_details テーブルの favorite_comment を確認中...\n');

  // property_details テーブルの構造を確認
  const { data: details, error } = await supabase
    .from('property_details')
    .select('*')
    .limit(5);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!details || details.length === 0) {
    console.log('⚠️ property_details テーブルにデータがありません');
    return;
  }

  console.log('property_details テーブルのカラム:');
  console.log(Object.keys(details[0]));
  console.log('');

  // favorite_comment の有無を確認
  console.log('サンプルデータ:');
  console.log('='.repeat(80));
  details.forEach(detail => {
    console.log(`property_number: ${detail.property_number}`);
    console.log(`  favorite_comment: ${detail.favorite_comment ? '✅ "' + detail.favorite_comment + '"' : '❌ なし'}`);
    console.log(`  recommended_comments: ${detail.recommended_comments ? '✅ あり' : '❌ なし'}`);
    console.log(`  athome_data: ${detail.athome_data ? '✅ あり' : '❌ なし'}`);
    console.log(`  property_about: ${detail.property_about ? '✅ あり' : '❌ なし'}`);
    console.log('');
  });

  // 公開中の物件で favorite_comment の状況を確認
  console.log('='.repeat(80));
  console.log('公開中の物件での favorite_comment の状況:');
  console.log('='.repeat(80));
  console.log('');

  // property_listings と property_details を JOIN
  const { data: publicProperties, error: publicError } = await supabase
    .from('property_listings')
    .select(`
      id,
      property_number,
      property_type,
      atbb_status,
      property_details (
        favorite_comment,
        recommended_comments,
        athome_data,
        property_about
      )
    `)
    .in('atbb_status', ['一般・公開中', '専任・公開中', '非公開（配信メールのみ）'])
    .limit(10);

  if (publicError) {
    console.error('エラー:', publicError);
    return;
  }

  if (!publicProperties || publicProperties.length === 0) {
    console.log('⚠️ 公開中の物件が見つかりません');
    return;
  }

  console.log(`${publicProperties.length}件の公開中物件を取得しました\n`);

  let withFavoriteComment = 0;
  let withRecommendedComments = 0;
  let withAthomeData = 0;
  let withPropertyAbout = 0;

  publicProperties.forEach(prop => {
    const details = Array.isArray(prop.property_details) ? prop.property_details[0] : prop.property_details;
    
    const hasFavorite = details?.favorite_comment;
    const hasRecommended = details?.recommended_comments;
    const hasAthome = details?.athome_data;
    const hasAbout = details?.property_about;

    if (hasFavorite) withFavoriteComment++;
    if (hasRecommended) withRecommendedComments++;
    if (hasAthome) withAthomeData++;
    if (hasAbout) withPropertyAbout++;

    console.log(`${prop.property_number} (${prop.atbb_status}):`);
    console.log(`  favorite_comment: ${hasFavorite ? '✅' : '❌'}`);
    console.log(`  recommended_comments: ${hasRecommended ? '✅' : '❌'}`);
    console.log(`  athome_data: ${hasAthome ? '✅' : '❌'}`);
    console.log(`  property_about: ${hasAbout ? '✅' : '❌'}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('集計結果:');
  console.log(`  favorite_comment あり: ${withFavoriteComment}/${publicProperties.length} (${Math.round(withFavoriteComment/publicProperties.length*100)}%)`);
  console.log(`  recommended_comments あり: ${withRecommendedComments}/${publicProperties.length} (${Math.round(withRecommendedComments/publicProperties.length*100)}%)`);
  console.log(`  athome_data あり: ${withAthomeData}/${publicProperties.length} (${Math.round(withAthomeData/publicProperties.length*100)}%)`);
  console.log(`  property_about あり: ${withPropertyAbout}/${publicProperties.length} (${Math.round(withPropertyAbout/publicProperties.length*100)}%)`);
  console.log('');
}

check().catch(console.error);
