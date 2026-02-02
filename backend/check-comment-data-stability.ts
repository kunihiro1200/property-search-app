// コメントデータの安定性確認スクリプト
// 数日後に実行して、コメントデータが消失していないか確認する

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkCommentDataStability() {
  console.log('🔍 コメントデータの安定性を確認中...\n');

  // 1. AA5564のコメントデータを確認
  console.log('📊 AA5564のコメントデータ:');
  const { data: aa5564, error: aa5564Error } = await supabase
    .from('property_details')
    .select('property_number, property_about, recommended_comments, athome_data, favorite_comment')
    .eq('property_number', 'AA5564')
    .single();

  if (aa5564Error) {
    console.error('❌ AA5564の取得エラー:', aa5564Error.message);
  } else if (!aa5564) {
    console.log('❌ AA5564が見つかりません');
  } else {
    console.log(`  property_about: ${aa5564.property_about ? '✅ あり' : '❌ なし'}`);
    console.log(`  recommended_comments: ${aa5564.recommended_comments && aa5564.recommended_comments.length > 0 ? `✅ あり (${aa5564.recommended_comments.length}件)` : '❌ なし'}`);
    console.log(`  athome_data: ${aa5564.athome_data && aa5564.athome_data.length > 0 ? `✅ あり (${aa5564.athome_data.length}件)` : '❌ なし'}`);
    console.log(`  favorite_comment: ${aa5564.favorite_comment ? '✅ あり' : '❌ なし'}`);
  }

  console.log('\n');

  // 2. 全物件のコメントデータ状況を確認
  console.log('📊 全物件のコメントデータ状況:');
  
  const { data: allDetails, error: allError } = await supabase
    .from('property_details')
    .select('property_number, property_about, recommended_comments, athome_data, favorite_comment');

  if (allError) {
    console.error('❌ 全物件の取得エラー:', allError.message);
    return;
  }

  if (!allDetails || allDetails.length === 0) {
    console.log('❌ property_detailsテーブルにデータがありません');
    return;
  }

  const total = allDetails.length;
  const withPropertyAbout = allDetails.filter(d => d.property_about).length;
  const withRecommendedComments = allDetails.filter(d => d.recommended_comments && d.recommended_comments.length > 0).length;
  const withAthomeData = allDetails.filter(d => d.athome_data && d.athome_data.length > 0).length;
  const withFavoriteComment = allDetails.filter(d => d.favorite_comment).length;

  console.log(`  総物件数: ${total}`);
  console.log(`  property_about あり: ${withPropertyAbout} (${(withPropertyAbout / total * 100).toFixed(1)}%)`);
  console.log(`  recommended_comments あり: ${withRecommendedComments} (${(withRecommendedComments / total * 100).toFixed(1)}%)`);
  console.log(`  athome_data あり: ${withAthomeData} (${(withAthomeData / total * 100).toFixed(1)}%)`);
  console.log(`  favorite_comment あり: ${withFavoriteComment} (${(withFavoriteComment / total * 100).toFixed(1)}%)`);

  console.log('\n');

  // 3. 空のコメントデータを持つ物件をリストアップ（最大10件）
  const emptyComments = allDetails.filter(d => 
    !d.property_about && 
    (!d.recommended_comments || d.recommended_comments.length === 0) &&
    (!d.athome_data || d.athome_data.length === 0) &&
    !d.favorite_comment
  );

  if (emptyComments.length > 0) {
    console.log(`⚠️  全てのコメントデータが空の物件: ${emptyComments.length}件`);
    console.log('  最初の10件:');
    emptyComments.slice(0, 10).forEach(d => {
      console.log(`    - ${d.property_number}`);
    });
  } else {
    console.log('✅ 全ての物件に何らかのコメントデータがあります');
  }

  console.log('\n');

  // 4. 判定
  console.log('📝 判定:');
  if (aa5564 && aa5564.favorite_comment && aa5564.recommended_comments && aa5564.recommended_comments.length > 0) {
    console.log('✅ AA5564のコメントデータは正常です');
    console.log('✅ 修正が効果を発揮しています！');
  } else {
    console.log('❌ AA5564のコメントデータが消失しています');
    console.log('⚠️  さらなる調査が必要です');
  }
}

checkCommentDataStability().catch(console.error);
