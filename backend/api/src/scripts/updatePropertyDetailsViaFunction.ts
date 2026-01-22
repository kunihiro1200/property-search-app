/**
 * ストアドファンクションを使用して物件詳細情報を更新するスクリプト
 * 
 * スキーマキャッシュ問題を回避するため、update_property_detailsファンクションを使用します
 */

import { createClient } from '@supabase/supabase-js';
import { PropertyService } from '../services/PropertyService';
import { RecommendedCommentService } from '../services/RecommendedCommentService';
import { AthomeDataService } from '../services/AthomeDataService';
import { FavoriteCommentService } from '../services/FavoriteCommentService';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const propertyService = new PropertyService();
const recommendedCommentService = new RecommendedCommentService();
const athomeDataService = new AthomeDataService();
const favoriteCommentService = new FavoriteCommentService();

async function updatePropertyDetailsViaFunction() {
  try {
    console.log('物件詳細情報の更新を開始します（ストアドファンクション使用）...');
    
    // テスト用に1件だけ取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, storage_location')
      .eq('id', '65909b23-beb3-445e-aa6f-4116e2c02ef9')
      .limit(1);
    
    if (error) {
      throw new Error(`物件の取得に失敗しました: ${error.message}`);
    }
    
    if (!properties || properties.length === 0) {
      console.log('更新する物件がありません');
      return;
    }
    
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
        
        // ストアドファンクションを使用してデータベースに保存
        const { data: result, error: updateError } = await supabase.rpc('update_property_details', {
          p_property_number: property.property_number,
          p_property_about: propertyAbout,
          p_recommended_comments: recommendedComments,
          p_athome_data: athomeData,
          p_favorite_comment: favoriteComment
        });
        
        if (updateError) {
          throw new Error(`更新エラー: ${updateError.message}`);
        }
        
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
    process.exit(1);
  }
}

// スクリプト実行
updatePropertyDetailsViaFunction()
  .then(() => {
    console.log('\nスクリプトが正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nスクリプトが失敗しました:', error);
    process.exit(1);
  });
