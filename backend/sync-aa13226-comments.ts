import { createClient } from '@supabase/supabase-js';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAA13226Comments() {
  console.log('Syncing AA13226 comments...\n');
  
  // 1. 物件情報を取得
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('id, property_number, property_type')
    .eq('property_number', 'AA13226')
    .single();
  
  if (propertyError || !property) {
    console.error('Error fetching property:', propertyError);
    return;
  }
  
  console.log('Property found:');
  console.log('- ID:', property.id);
  console.log('- Property Number:', property.property_number);
  console.log('- Property Type:', property.property_type);
  console.log('');
  
  // 2. お気に入り文言を取得
  console.log('Fetching favorite comment...');
  const favoriteCommentService = new FavoriteCommentService();
  const favoriteCommentResult = await favoriteCommentService.getFavoriteComment(property.property_number);
  
  // オブジェクトの場合はcommentプロパティを取得
  const favoriteComment = favoriteCommentResult && typeof favoriteCommentResult === 'object' && 'comment' in favoriteCommentResult
    ? favoriteCommentResult.comment
    : favoriteCommentResult;
  
  if (favoriteComment) {
    const commentText = typeof favoriteComment === 'string' ? favoriteComment : JSON.stringify(favoriteComment);
    console.log('✅ Favorite comment found:', commentText.substring(0, 100) + '...');
  } else {
    console.log('⚠️ No favorite comment found');
  }
  console.log('');
  
  // 3. おすすめコメントを取得
  console.log('Fetching recommended comments...');
  const recommendedCommentService = new RecommendedCommentService();
  const recommendedResult = await recommendedCommentService.getRecommendedComment(
    property.property_number,
    property.property_type
  );
  
  // 2次元配列を1次元配列に変換（各行を結合）
  const recommendedComments = recommendedResult.comments.map(row => row.join(' '));
  
  if (recommendedComments && recommendedComments.length > 0) {
    console.log(`✅ Found ${recommendedComments.length} recommended comments:`);
    recommendedComments.forEach((comment, index) => {
      console.log(`   ${index + 1}. ${comment.substring(0, 80)}...`);
    });
  } else {
    console.log('⚠️ No recommended comments found');
  }
  console.log('');
  
  // 4. データベースを更新
  console.log('Updating database...');
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({
      favorite_comment: favoriteComment,
      recommended_comments: recommendedComments,
      updated_at: new Date().toISOString()
    })
    .eq('id', property.id);
  
  if (updateError) {
    console.error('❌ Error updating database:', updateError);
    return;
  }
  
  console.log('✅ Database updated successfully!');
  console.log('');
  
  // 5. 更新後のデータを確認
  const { data: updatedProperty } = await supabase
    .from('property_listings')
    .select('favorite_comment, recommended_comments')
    .eq('id', property.id)
    .single();
  
  console.log('Updated data:');
  console.log('- Favorite Comment:', updatedProperty?.favorite_comment ? 'Set' : 'Not set');
  console.log('- Recommended Comments:', updatedProperty?.recommended_comments?.length || 0, 'items');
}

syncAA13226Comments().catch(console.error);
