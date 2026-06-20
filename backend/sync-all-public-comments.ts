import { createClient } from '@supabase/supabase-js';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAllPublicComments() {
  console.log('Syncing all public property comments...\n');
  
  // 1. 公開物件でコメントデータが未設定の物件を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, property_type, atbb_status, favorite_comment, recommended_comments')
    .not('atbb_status', 'is', null)
    .ilike('atbb_status', '%公開中%')
    .order('property_number', { ascending: false });
  
  if (error || !properties) {
    console.error('Error fetching properties:', error);
    return;
  }
  
  console.log(`Found ${properties.length} public properties\n`);
  
  // コメントデータが未設定の物件をフィルタリング
  const propertiesNeedingSync = properties.filter(p => 
    !p.favorite_comment || !p.recommended_comments || p.recommended_comments.length === 0
  );
  
  console.log(`${propertiesNeedingSync.length} properties need comment sync\n`);
  
  if (propertiesNeedingSync.length === 0) {
    console.log('All public properties already have comment data!');
    return;
  }
  
  // サービスを初期化
  const favoriteCommentService = new FavoriteCommentService();
  const recommendedCommentService = new RecommendedCommentService();
  
  let successCount = 0;
  let errorCount = 0;
  
  // 各物件のコメントデータを同期
  for (let i = 0; i < propertiesNeedingSync.length; i++) {
    const property = propertiesNeedingSync[i];
    console.log(`\n[${i + 1}/${propertiesNeedingSync.length}] Processing ${property.property_number}...`);
    
    try {
      // お気に入り文言を取得
      const favoriteCommentResult = await favoriteCommentService.getFavoriteComment(property.property_number);
      const favoriteComment = favoriteCommentResult && typeof favoriteCommentResult === 'object' && 'comment' in favoriteCommentResult
        ? favoriteCommentResult.comment
        : favoriteCommentResult;
      
      // おすすめコメントを取得
      const recommendedResult = await recommendedCommentService.getRecommendedComment(
        property.property_number,
        property.property_type
      );
      const recommendedComments = recommendedResult.comments.map(row => row.join(' '));
      
      // データベースを更新
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          favorite_comment: favoriteComment,
          recommended_comments: recommendedComments,
          updated_at: new Date().toISOString()
        })
        .eq('id', property.id);
      
      if (updateError) {
        console.error(`  ❌ Error updating ${property.property_number}:`, updateError.message);
        errorCount++;
      } else {
        console.log(`  ✅ Updated ${property.property_number}`);
        console.log(`     - Favorite: ${favoriteComment ? 'Set' : 'Not found'}`);
        console.log(`     - Recommended: ${recommendedComments.length} items`);
        successCount++;
      }
      
      // レート制限を避けるため、少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.error(`  ❌ Error processing ${property.property_number}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Sync completed!');
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Error: ${errorCount}`);
  console.log('='.repeat(50));
}

syncAllPublicComments().catch(console.error);
