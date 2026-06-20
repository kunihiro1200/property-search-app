/**
 * 直接SQLを使用して物件詳細情報を更新するスクリプト
 * 
 * スキーマキャッシュ問題を完全にバイパスするため、pg（PostgreSQL）を直接使用します
 */

import { Pool } from 'pg';
import { PropertyService } from '../services/PropertyService';
import { RecommendedCommentService } from '../services/RecommendedCommentService';
import { AthomeDataService } from '../services/AthomeDataService';
import { FavoriteCommentService } from '../services/FavoriteCommentService';

// PostgreSQL接続プール
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const propertyService = new PropertyService();
const recommendedCommentService = new RecommendedCommentService();
const athomeDataService = new AthomeDataService();
const favoriteCommentService = new FavoriteCommentService();

async function updatePropertyDetailsDirectSQL() {
  const client = await pool.connect();
  
  try {
    console.log('物件詳細情報の更新を開始します（直接SQL使用）...');
    
    // テスト用に1件だけ取得
    const result = await client.query(
      `SELECT id, property_number, property_type, storage_location 
       FROM property_listings 
       WHERE id = $1 
       LIMIT 1`,
      ['65909b23-beb3-445e-aa6f-4116e2c02ef9']
    );
    
    if (result.rows.length === 0) {
      console.log('更新する物件がありません');
      return;
    }
    
    const properties = result.rows;
    console.log(`${properties.length}件の物件を更新します`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const property of properties) {
      try {
        console.log(`\n物件 ${property.property_number} を処理中...`);
        
        // 各データを取得
        const [propertyAbout, recommendedComments, athomeData, favoriteComment] = await Promise.all([
          // こちらの物件について
          propertyService.getPropertyAbout(property.property_number).catch(err => {
            console.error(`  property_about取得エラー: ${err.message}`);
            return null;
          }),
          
          // おすすめコメント
          recommendedCommentService.getRecommendedComment(
            property.property_number,
            property.property_type,
            property.id
          ).then(result => result.comments).catch(err => {
            console.error(`  recommended_comments取得エラー: ${err.message}`);
            return [];
          }),
          
          // Athome情報
          athomeDataService.getAthomeData(
            property.property_number,
            property.property_type,
            property.storage_location
          ).then(result => result.data).catch(err => {
            console.error(`  athome_data取得エラー: ${err.message}`);
            return [];
          }),
          
          // お気に入り文言
          favoriteCommentService.getFavoriteComment(property.id).then(result => result.comment).catch(err => {
            console.error(`  favorite_comment取得エラー: ${err.message}`);
            return null;
          })
        ]);
        
        console.log(`  取得したデータ:`);
        console.log(`    property_about: ${propertyAbout ? '✅' : '❌'}`);
        console.log(`    recommended_comments: ${recommendedComments.length}件`);
        console.log(`    athome_data: ${athomeData.length}件`);
        console.log(`    favorite_comment: ${favoriteComment ? '✅' : '❌'}`);
        
        // 直接SQLでデータベースに保存
        await client.query(
          `UPDATE property_listings
           SET 
             property_about = $1,
             recommended_comments = $2,
             athome_data = $3,
             favorite_comment = $4,
             updated_at = now()
           WHERE property_number = $5`,
          [
            propertyAbout,
            JSON.stringify(recommendedComments),
            JSON.stringify(athomeData),
            favoriteComment,
            property.property_number
          ]
        );
        
        console.log(`  ✅ 成功`);
        successCount++;
        
        // レート制限を避けるため、少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`  ❌ エラー: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n完了: 成功 ${successCount}件, エラー ${errorCount}件`);
    
  } catch (error: any) {
    console.error('スクリプト実行エラー:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// スクリプト実行
updatePropertyDetailsDirectSQL()
  .then(() => {
    console.log('\nスクリプトが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nスクリプトが失敗しました:', error);
    process.exit(1);
  });
