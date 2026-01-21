import dotenv from 'dotenv';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { AthomeDataService } from './src/services/AthomeDataService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function syncCC5PropertyDetails() {
  console.log('=== CC5 Property Details Sync ===\n');
  
  const propertyNumber = 'CC5';
  
  try {
    // 1. 業務リストから個別物件スプレッドシートURLを取得
    console.log('📋 Step 1: Fetching spreadsheet URL from 業務リスト...');
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    const gyomuData = await gyomuListClient.readAll();
    
    const cc5Row = gyomuData.find((row: any) => row['物件番号'] === propertyNumber);
    
    if (!cc5Row) {
      console.log('❌ CC5 not found in 業務リスト');
      return;
    }
    
    const spreadsheetUrl = cc5Row['スプシURL'];
    console.log('✅ Found spreadsheet URL:', spreadsheetUrl);
    
    // 2. お気に入り文言を取得（物件リストスプレッドシートから）
    console.log('\n⭐ Step 2: Fetching favorite comment from 物件リスト...');
    const favoriteCommentService = new FavoriteCommentService();
    const favoriteCommentResult = await favoriteCommentService.getFavoriteComment(propertyNumber);
    const favoriteComment = favoriteCommentResult.comment || null;
    console.log('Favorite comment:', favoriteComment || 'なし');
    
    // 3. おすすめコメントを取得（個別物件スプレッドシートのathomeシートから）
    console.log('\n💬 Step 3: Fetching recommended comments from athome sheet...');
    const recommendedCommentService = new RecommendedCommentService();
    const recommendedCommentsResult = await recommendedCommentService.getRecommendedComment(
      propertyNumber,
      'マンション' // CC5はマンション
    );
    
    // 2次元配列を1次元配列に変換
    let recommendedComments: string[] | null = null;
    if (recommendedCommentsResult.comments && recommendedCommentsResult.comments.length > 0) {
      recommendedComments = recommendedCommentsResult.comments.map(row => row.join(' '));
    }
    console.log('Recommended comments count:', recommendedComments?.length || 0);
    
    // 4. パノラマURLを取得（個別物件スプレッドシートのathomeシートから）
    console.log('\n🌐 Step 4: Fetching panorama URL from athome sheet...');
    const athomeDataService = new AthomeDataService();
    const athomeDataResult = await athomeDataService.getAthomeData(propertyNumber);
    const panoramaUrl = athomeDataResult.panoramaUrl || null;
    console.log('Panorama URL:', panoramaUrl || 'なし');
    
    // 5. こちらの物件について を取得（物件リストスプレッドシートから）
    console.log('\n📝 Step 5: Fetching property_about from 物件リスト...');
    const propertyListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
      sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await propertyListClient.authenticate();
    const propertyData = await propertyListClient.readAll();
    const cc5Property = propertyData.find((row: any) => row['物件番号'] === propertyNumber);
    const propertyAbout = cc5Property?.['こちらの物件について'] || null;
    console.log('Property about:', propertyAbout || 'なし');
    
    // 6. property_detailsテーブルを更新
    console.log('\n💾 Step 6: Updating property_details table...');
    const propertyDetailsService = new PropertyDetailsService();
    
    await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
      favorite_comment: favoriteComment,
      recommended_comments: recommendedComments,
      athome_data: panoramaUrl ? { panoramaUrl: panoramaUrl } : null,
      property_about: propertyAbout
    });
    
    console.log('\n✅ Successfully synced CC5 property details!');
    
    // 7. 確認
    console.log('\n🔍 Step 7: Verifying updated data...');
    const updatedDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
    console.log('Updated details:', {
      has_favorite_comment: !!updatedDetails.favorite_comment,
      has_recommended_comments: !!updatedDetails.recommended_comments,
      recommended_comments_count: Array.isArray(updatedDetails.recommended_comments) ? updatedDetails.recommended_comments.length : 0,
      has_athome_data: !!updatedDetails.athome_data,
      panorama_url: updatedDetails.athome_data?.panoramaUrl || 'なし',
      has_property_about: !!updatedDetails.property_about
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

syncCC5PropertyDetails().catch(console.error);
