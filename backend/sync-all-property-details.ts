import dotenv from 'dotenv';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function syncAllPropertyDetails() {
  console.log(`\n🔄 Syncing property details for all properties...`);
  
  // Supabaseクライアントを初期化
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // 公開中の物件を取得
  const { data: properties, error: propertiesError } = await supabase
    .from('property_listings')
    .select('property_number, property_type')
    .in('atbb_status', ['公開中', '一般・公開中', '専任・公開中', '非公開（配信メールのみ）'])
    .order('property_number');
  
  if (propertiesError || !properties) {
    console.error('❌ Properties not found:', propertiesError?.message);
    return;
  }
  
  console.log(`✅ Found ${properties.length} properties to sync`);
  
  // サービスを初期化
  const recommendedCommentService = new RecommendedCommentService();
  const favoriteCommentService = new FavoriteCommentService();
  const propertyDetailsService = new PropertyDetailsService();
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const progress = `[${i + 1}/${properties.length}]`;
    
    try {
      console.log(`\n${progress} ${property.property_number} - Syncing...`);
      
      // おすすめコメントを取得
      const recommendedCommentsResult = await recommendedCommentService.getRecommendedComment(
        property.property_number,
        property.property_type
      );
      
      // 2次元配列を1次元配列に変換
      let recommendedComments: string[] | null = null;
      if (recommendedCommentsResult.comments && recommendedCommentsResult.comments.length > 0) {
        recommendedComments = recommendedCommentsResult.comments.map(row => row.join(' '));
        console.log(`   ✅ Recommended comments: ${recommendedComments.length} items`);
      } else {
        console.log(`   ⏭️  No recommended comments`);
      }
      
      // お気に入り文言を取得
      const favoriteCommentResult = await favoriteCommentService.getFavoriteComment(property.property_number);
      const favoriteComment = favoriteCommentResult.comment || null;
      
      if (favoriteComment) {
        console.log(`   ✅ Favorite comment: ${favoriteComment.substring(0, 50)}...`);
      } else {
        console.log(`   ⏭️  No favorite comment`);
      }
      
      // データがない場合はスキップ
      if (!recommendedComments && !favoriteComment) {
        console.log(`   ⏭️  Skipped: No data to sync`);
        skipCount++;
        continue;
      }
      
      // property_detailsテーブルに保存
      await propertyDetailsService.upsertPropertyDetails(property.property_number, {
        recommended_comments: recommendedComments,
        favorite_comment: favoriteComment,
      });
      
      console.log(`   ✅ Successfully saved`);
      successCount++;
      
      // レート制限対策: 10件ごとに1秒待機
      if ((i + 1) % 10 === 0) {
        console.log(`\n⏸️  10件処理完了、1秒待機...\n`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Sync completed:');
  console.log(`   ✅ Success: ${successCount} properties`);
  console.log(`   ⏭️  Skipped: ${skipCount} properties`);
  console.log(`   ❌ Error: ${errorCount} properties`);
  console.log(`   📈 Success rate: ${((successCount / properties.length) * 100).toFixed(1)}%`);
}

syncAllPropertyDetails();
