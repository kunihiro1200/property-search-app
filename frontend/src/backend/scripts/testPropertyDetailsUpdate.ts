// テスト用スクリプト: 1件の物件の詳細データを更新
import { PropertyService } from '../services/PropertyService';
import { RecommendedCommentService } from '../services/RecommendedCommentService';
import { FavoriteCommentService } from '../services/FavoriteCommentService';
import { AthomeDataService } from '../services/AthomeDataService';
import { PropertyListingService } from '../services/PropertyListingService';

async function testUpdatePropertyDetails() {
  try {
    // テスト対象の物件ID
    const propertyId = '65909b23-beb3-445e-aa6f-4116e2c02ef9';
    
    console.log(`\n🔍 Testing property details update for: ${propertyId}\n`);
    
    // サービスのインスタンスを作成
    const propertyService = new PropertyService();
    const recommendedCommentService = new RecommendedCommentService();
    const favoriteCommentService = new FavoriteCommentService();
    const athomeDataService = new AthomeDataService();
    const propertyListingService = new PropertyListingService();
    
    // 物件情報を取得
    console.log('📥 Fetching property information...');
    const property = await propertyListingService.getPublicPropertyById(propertyId);
    
    if (!property) {
      console.error('❌ Property not found');
      return;
    }
    
    console.log(`✅ Property found: ${property.property_number} (${property.property_type})`);
    
    // 並列でデータを取得
    console.log('\n📥 Fetching additional data from spreadsheets...');
    const startTime = Date.now();
    
    const [propertyAbout, recommendedComment, favoriteComment, athomeData] = await Promise.all([
      propertyService.getPropertyAbout(property.property_number).catch(err => {
        console.error(`❌ Failed to get property_about:`, err.message);
        return null;
      }),
      
      recommendedCommentService.getRecommendedComment(
        property.property_number,
        property.property_type,
        propertyId
      ).catch(err => {
        console.error(`❌ Failed to get recommended_comments:`, err.message);
        return { comments: [] };
      }),
      
      favoriteCommentService.getFavoriteComment(propertyId).catch(err => {
        console.error(`❌ Failed to get favorite_comment:`, err.message);
        return { comment: null };
      }),
      
      athomeDataService.getAthomeData(
        property.property_number,
        property.property_type,
        property.storage_location
      ).catch(err => {
        console.error(`❌ Failed to get athome_data:`, err.message);
        return { data: [] };
      })
    ]);
    
    const fetchTime = Date.now() - startTime;
    console.log(`✅ Data fetched in ${fetchTime}ms`);
    
    // 取得したデータを表示
    console.log('\n📊 Fetched data:');
    console.log(`  - property_about: ${propertyAbout ? `${propertyAbout.substring(0, 50)}...` : 'null'}`);
    console.log(`  - recommended_comments: ${recommendedComment.comments.length} rows`);
    console.log(`  - favorite_comment: ${favoriteComment.comment ? `${favoriteComment.comment.substring(0, 50)}...` : 'null'}`);
    console.log(`  - athome_data: ${athomeData.data.length} rows`);
    
    // データベースに保存（直接SQLで更新、スキーマキャッシュ問題を回避）
    console.log('\n💾 Updating database...');
    const updateStartTime = Date.now();
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // 直接SQLで更新
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        property_about: propertyAbout,
        recommended_comments: recommendedComment.comments,
        athome_data: athomeData.data,
        favorite_comment: favoriteComment.comment,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', property.property_number);
    
    if (updateError) {
      throw new Error(`Failed to update: ${updateError.message}`);
    }
    
    const updateTime = Date.now() - updateStartTime;
    console.log(`✅ Database updated in ${updateTime}ms`);
    
    // 更新後のデータを確認
    console.log('\n🔍 Verifying updated data...');
    const updatedProperty = await propertyListingService.getPublicPropertyById(propertyId);
    
    if (updatedProperty) {
      console.log('✅ Verification successful:');
      console.log(`  - property_about: ${updatedProperty.property_about ? 'saved' : 'null'}`);
      console.log(`  - recommended_comments: ${updatedProperty.recommended_comments ? 'saved' : 'null'}`);
      console.log(`  - favorite_comment: ${updatedProperty.favorite_comment ? 'saved' : 'null'}`);
      console.log(`  - athome_data: ${updatedProperty.athome_data ? 'saved' : 'null'}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log(`\n📊 Total time: ${Date.now() - startTime}ms`);
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// スクリプトを実行
testUpdatePropertyDetails()
  .then(() => {
    console.log('\n👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
