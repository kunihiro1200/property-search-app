/**
 * AA10106物件を直接テスト
 */

import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAA10106Direct(): Promise<void> {
  try {
    const propertyId = '4e4891b9-0f99-4f03-b1a4-d91ff1193629'; // AA10106
    
    console.log('AA10106物件のお気に入り文言を直接テスト中...\n');
    console.log(`物件ID: ${propertyId}\n`);
    
    const favoriteCommentService = new FavoriteCommentService();
    
    console.log('リクエスト開始...');
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        favoriteCommentService.getFavoriteComment(propertyId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Manual timeout after 30s')), 30000)
        )
      ]);
      
      const responseTime = Date.now() - startTime;
      
      console.log(`\nレスポンスタイム: ${responseTime}ms`);
      console.log(`物件タイプ: ${(result as any).propertyType}`);
      console.log(`コメント: ${(result as any).comment || 'なし'}`);
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.log(`\n❌ エラー: ${error.message}`);
      console.log(`経過時間: ${responseTime}ms`);
    }
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

testAA10106Direct();
