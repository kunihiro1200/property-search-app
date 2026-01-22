/**
 * APIを直接テストするスクリプト
 */

import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAPIDirect(): Promise<void> {
  try {
    const testPropertyId = 'ae9d71a8-4ddc-40e7-8a11-576ce7df1a63'; // 土地
    
    console.log('APIを直接テスト中...\n');
    console.log(`物件ID: ${testPropertyId}\n`);
    
    // お気に入り文言をテスト
    console.log('='.repeat(80));
    console.log('お気に入り文言APIテスト');
    console.log('='.repeat(80));
    console.log('');
    
    const favoriteCommentService = new FavoriteCommentService();
    
    console.log('リクエスト開始...');
    const startTime = Date.now();
    
    const favoriteResult = await favoriteCommentService.getFavoriteComment(testPropertyId);
    
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
      'AA10004',
      'land',
      testPropertyId
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
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

testAPIDirect();
