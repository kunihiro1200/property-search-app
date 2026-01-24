import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyListingService } from './src/services/PropertyListingService';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { PropertyService } from './src/services/PropertyService';
import { GyomuListService } from './src/services/GyomuListService';

dotenv.config();

async function checkAA12608Comments() {
  const propertyNumber = 'AA12608';
  
  console.log(`\n🔍 AA12608のコメントデータを確認します...\n`);
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // 1. property_listingsテーブルのデータを確認
    console.log('📊 1. property_listingsテーブルのデータ:');
    const { data: propertyListing, error: plError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();
    
    if (plError) {
      console.error('❌ property_listingsテーブルのエラー:', plError.message);
    } else if (!propertyListing) {
      console.log('❌ property_listingsテーブルにデータがありません');
    } else {
      console.log('✅ property_listingsテーブルにデータがあります');
      console.log('   - ID:', propertyListing.id);
      console.log('   - 物件番号:', propertyListing.property_number);
      console.log('   - 物件種別:', propertyListing.property_type);
      console.log('   - 格納先URL:', propertyListing.storage_location || '(なし)');
    }
    
    // 2. property_detailsテーブルのデータを確認
    console.log('\n📊 2. property_detailsテーブルのデータ:');
    const { data: propertyDetails, error: pdError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();
    
    if (pdError) {
      console.log('❌ property_detailsテーブルにデータがありません:', pdError.message);
    } else if (!propertyDetails) {
      console.log('❌ property_detailsテーブルにデータがありません');
    } else {
      console.log('✅ property_detailsテーブルにデータがあります');
      console.log('   - property_about:', propertyDetails.property_about ? '✅ あり' : '❌ なし');
      console.log('   - recommended_comments:', propertyDetails.recommended_comments ? `✅ あり (${JSON.stringify(propertyDetails.recommended_comments).length}文字)` : '❌ なし');
      console.log('   - favorite_comment:', propertyDetails.favorite_comment ? '✅ あり' : '❌ なし');
      console.log('   - athome_data:', propertyDetails.athome_data ? '✅ あり' : '❌ なし');
      
      if (propertyDetails.property_about) {
        console.log('\n   📝 こちらの物件について:');
        console.log('   ', propertyDetails.property_about.substring(0, 100) + '...');
      }
      
      if (propertyDetails.recommended_comments) {
        console.log('\n   ⭐ おすすめコメント:');
        console.log('   ', JSON.stringify(propertyDetails.recommended_comments, null, 2).substring(0, 200) + '...');
      }
      
      if (propertyDetails.favorite_comment) {
        console.log('\n   ❤️ お気に入り文言:');
        console.log('   ', propertyDetails.favorite_comment);
      }
    }
    
    // 3. 業務リストを確認
    console.log('\n📊 3. 業務リスト（業務依頼シート）のデータ:');
    const gyomuListService = new GyomuListService();
    const gyomuData = await gyomuListService.getByPropertyNumber(propertyNumber);
    
    if (!gyomuData) {
      console.log('❌ 業務リストにデータがありません');
    } else {
      console.log('✅ 業務リストにデータがあります');
      console.log('   - スプシURL:', gyomuData.spreadsheetUrl || '(なし)');
      console.log('   - 格納先URL:', gyomuData.storageUrl || '(なし)');
    }
    
    // 4. サービスを使って実際に取得してみる
    if (propertyListing) {
      console.log('\n📊 4. サービスを使って実際にデータを取得:');
      
      // PropertyService
      console.log('\n   🔹 PropertyService (こちらの物件について):');
      const propertyService = new PropertyService();
      const propertyAbout = await propertyService.getPropertyAbout(propertyNumber);
      console.log('   ', propertyAbout ? `✅ 取得成功 (${propertyAbout.length}文字)` : '❌ 取得失敗');
      if (propertyAbout) {
        console.log('   ', propertyAbout.substring(0, 100) + '...');
      }
      
      // RecommendedCommentService
      console.log('\n   🔹 RecommendedCommentService (おすすめコメント):');
      const recommendedCommentService = new RecommendedCommentService();
      const recommendedResult = await recommendedCommentService.getRecommendedComment(
        propertyNumber,
        propertyListing.property_type,
        propertyListing.id
      );
      console.log('   ', recommendedResult.comments.length > 0 ? `✅ 取得成功 (${recommendedResult.comments.length}行)` : '❌ 取得失敗');
      if (recommendedResult.comments.length > 0) {
        console.log('   ', JSON.stringify(recommendedResult.comments, null, 2).substring(0, 200) + '...');
      }
      
      // FavoriteCommentService
      console.log('\n   🔹 FavoriteCommentService (お気に入り文言):');
      const favoriteCommentService = new FavoriteCommentService();
      const favoriteResult = await favoriteCommentService.getFavoriteComment(propertyListing.id);
      console.log('   ', favoriteResult.comment ? `✅ 取得成功` : '❌ 取得失敗');
      if (favoriteResult.comment) {
        console.log('   ', favoriteResult.comment);
      }
    }
    
    // 5. 結論
    console.log('\n\n📋 結論:');
    if (!propertyDetails || !propertyDetails.property_about) {
      console.log('❌ property_detailsテーブルにデータがないか、コメントが空です');
      console.log('   → PropertyListingSyncServiceの同期処理が実行されていない可能性があります');
      console.log('   → または、業務リストにスプシURLがない可能性があります');
    } else {
      console.log('✅ property_detailsテーブルにデータがあります');
      console.log('   → フロントエンドの表示ロジックに問題がある可能性があります');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkAA12608Comments();
