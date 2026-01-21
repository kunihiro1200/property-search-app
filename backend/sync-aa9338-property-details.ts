import dotenv from 'dotenv';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function syncAA9338PropertyDetails() {
  const propertyNumber = 'AA9338';
  
  console.log(`\n🔄 Syncing property details for ${propertyNumber}...`);
  
  // Supabaseクライアントを初期化
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // 物件情報を取得
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, property_type')
    .eq('property_number', propertyNumber)
    .single();
  
  if (propertyError || !property) {
    console.error('❌ Property not found:', propertyError?.message);
    return;
  }
  
  console.log(`✅ Found property: ${property.property_number} (${property.property_type})`);
  
  // サービスを初期化
  const recommendedCommentService = new RecommendedCommentService();
  const favoriteCommentService = new FavoriteCommentService();
  const propertyDetailsService = new PropertyDetailsService();
  
  try {
    // おすすめコメントを取得
    console.log('\n📝 Fetching recommended comments...');
    const recommendedCommentsResult = await recommendedCommentService.getRecommendedComment(
      property.property_number,
      property.property_type
    );
    
    // 2次元配列を1次元配列に変換（各行を結合）
    let recommendedComments: string[] | null = null;
    if (recommendedCommentsResult.comments && recommendedCommentsResult.comments.length > 0) {
      recommendedComments = recommendedCommentsResult.comments.map(row => row.join(' '));
      console.log(`✅ Found ${recommendedComments.length} recommended comments`);
      recommendedComments.forEach((comment, index) => {
        console.log(`  ${index + 1}. ${comment}`);
      });
    } else {
      console.log('⚠️ No recommended comments found');
    }
    
    // お気に入り文言を取得
    console.log('\n⭐ Fetching favorite comment...');
    const favoriteCommentResult = await favoriteCommentService.getFavoriteComment(property.property_number);
    
    // 文字列のみを抽出
    const favoriteComment = favoriteCommentResult.comment || null;
    
    if (favoriteComment) {
      console.log(`✅ Found favorite comment: ${favoriteComment}`);
    } else {
      console.log('⚠️ No favorite comment found');
    }
    
    // property_detailsテーブルに保存
    console.log('\n💾 Saving to property_details table...');
    await propertyDetailsService.upsertPropertyDetails(property.property_number, {
      recommended_comments: recommendedComments,
      favorite_comment: favoriteComment,
    });
    
    console.log('✅ Successfully saved to property_details table');
    
    // 確認
    console.log('\n🔍 Verifying saved data...');
    const savedDetails = await propertyDetailsService.getPropertyDetails(property.property_number);
    
    console.log('Saved data:');
    console.log('- recommended_comments:', savedDetails.recommended_comments ? `✅ ${savedDetails.recommended_comments.length} items` : '❌ Missing');
    console.log('- favorite_comment:', savedDetails.favorite_comment || '(empty)');
    
    if (savedDetails.recommended_comments) {
      console.log('\n📝 Saved Recommended Comments:');
      savedDetails.recommended_comments.forEach((comment, index) => {
        console.log(`  ${index + 1}. ${comment}`);
      });
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

syncAA9338PropertyDetails();
