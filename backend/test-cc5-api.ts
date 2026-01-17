/**
 * CC5物件のAPIを直接テスト
 */

import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testCC5API(): Promise<void> {
  try {
    const propertyId = '1581123e-4425-476f-a221-8dedb3616dcd'; // CC5
    const propertyNumber = 'CC5';
    const propertyType = 'detached_house';
    
    console.log('CC5物件のAPIを直接テスト中...\n');
    console.log(`物件ID: ${propertyId}`);
    console.log(`物件番号: ${propertyNumber}`);
    console.log(`物件タイプ: ${propertyType}\n`);
    
    // お気に入り文言をテスト
    console.log('='.repeat(80));
    console.log('お気に入り文言APIテスト');
    console.log('='.repeat(80));
    console.log('');
    
    const favoriteCommentService = new FavoriteCommentService();
    
    console.log('リクエスト開始...');
    const startTime = Date.now();
    
    const favoriteResult = await favoriteCommentService.getFavoriteComment(propertyId);
    
    const responseTime = Date.now() - startTime;
    
    console.log(`レスポンスタイム: ${responseTime}ms`);
    console.log(`物件タイプ: ${favoriteResult.propertyType}`);
    console.log(`コメント: ${favoriteResult.comment || 'なし'}`);
    console.log('');
    
    // アピールポイントをテスト
    console.log('='.repeat(80));
    console.log('アピールポイントAPIテスト');
    console.log('='.repeat(80));
    console.log('');
    
    const recommendedCommentService = new RecommendedCommentService();
    
    console.log('リクエスト開始...');
    const startTime2 = Date.now();
    
    const recommendedResult = await recommendedCommentService.getRecommendedComment(
      propertyNumber,
      propertyType,
      propertyId
    );
    
    const responseTime2 = Date.now() - startTime2;
    
    console.log(`レスポンスタイム: ${responseTime2}ms`);
    console.log(`物件タイプ: ${recommendedResult.propertyType}`);
    console.log(`コメント行数: ${recommendedResult.comments.length}`);
    
    if (recommendedResult.comments.length > 0) {
      console.log('コメント内容:');
      recommendedResult.comments.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.join(' ')}`);
      });
    } else {
      console.log('コメント: なし');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('テスト完了');
    console.log('='.repeat(80));
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

testCC5API();
