// CC23のproperty_detailsを強制的に同期
import dotenv from 'dotenv';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

dotenv.config();

async function forceSyncCC23Details() {
  console.log('=== CC23のproperty_detailsを強制的に同期 ===\n');
  
  const propertyNumber = 'CC23';
  
  try {
    // 1. おすすめコメントを同期
    console.log('1. おすすめコメントを同期中...');
    const recommendedService = new RecommendedCommentService();
    await recommendedService.syncRecommendedComments(propertyNumber);
    console.log('✓ おすすめコメント同期完了');
    
    // 2. お気に入り文言を同期
    console.log('\n2. お気に入り文言を同期中...');
    const favoriteService = new FavoriteCommentService();
    await favoriteService.syncFavoriteComment(propertyNumber);
    console.log('✓ お気に入り文言同期完了');
    
    // 3. 結果を確認
    console.log('\n3. 同期結果を確認中...');
    const detailsService = new PropertyDetailsService();
    const details = await detailsService.getPropertyDetails(propertyNumber);
    
    console.log('\n✓ 同期完了');
    console.log('property_number:', details.property_number);
    console.log('favorite_comment:', details.favorite_comment || '（なし）');
    console.log('recommended_comments:', details.recommended_comments ? 'あり' : '（なし）');
    if (details.recommended_comments) {
      console.log('   件数:', details.recommended_comments.length);
      console.log('   内容:', JSON.stringify(details.recommended_comments, null, 2));
    }
    console.log('property_about:', details.property_about || '（なし）');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
    throw error;
  }
}

forceSyncCC23Details().catch(console.error);
