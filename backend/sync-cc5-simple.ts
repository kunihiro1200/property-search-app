import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { AthomeDataService } from './src/services/AthomeDataService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncCC5() {
  console.log('=== CC5 Sync ===\n');
  
  const propertyNumber = 'CC5';
  
  try {
    // 1. 業務リストから個別物件スプレッドシートURLを取得
    console.log('📋 Fetching spreadsheet URL...');
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: './google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    const gyomuData = await gyomuListClient.readAll();
    const cc5Row = gyomuData.find((row: any) => row['物件番号'] === propertyNumber);
    
    if (!cc5Row) {
      console.log('❌ CC5 not found');
      return;
    }
    
    const spreadsheetUrl = cc5Row['スプシURL'];
    console.log('✅ Spreadsheet URL:', spreadsheetUrl);
    
    // 2. 物件リストからお気に入り文言とこちらの物件についてを取得
    console.log('\n📝 Fetching from 物件リスト...');
    const propertyListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
      sheetName: '物件',
      serviceAccountKeyPath: './google-service-account.json',
    });
    
    await propertyListClient.authenticate();
    const propertyData = await propertyListClient.readAll();
    const cc5Property = propertyData.find((row: any) => row['物件番号'] === propertyNumber);
    
    const favoriteComment = cc5Property?.['お気に入り文言'] || null;
    const propertyAbout = cc5Property?.['こちらの物件について'] || null;
    
    console.log('Favorite comment:', favoriteComment ? '✅' : '❌');
    console.log('Property about:', propertyAbout ? '✅' : '❌');
    
    // 3. おすすめコメントを取得
    console.log('\n💬 Fetching recommended comments...');
    const recommendedCommentService = new RecommendedCommentService();
    const recommendedComments = await recommendedCommentService.getRecommendedCommentsFromSpreadsheet(
      propertyNumber,
      spreadsheetUrl
    );
    console.log('Recommended comments:', recommendedComments ? `✅ (${recommendedComments.length} items)` : '❌');
    
    // 4. パノラマURLを取得
    console.log('\n🌐 Fetching panorama URL...');
    const athomeDataService = new AthomeDataService();
    const athomeData = await athomeDataService.getAthomeDataFromSpreadsheet(propertyNumber, spreadsheetUrl);
    console.log('Panorama URL:', athomeData.panoramaUrl ? '✅' : '❌');
    if (athomeData.panoramaUrl) {
      console.log('URL:', athomeData.panoramaUrl);
    }
    
    // 5. データベースを更新
    console.log('\n💾 Updating database...');
    const { data, error } = await supabase
      .from('property_details')
      .upsert({
        property_number: propertyNumber,
        favorite_comment: favoriteComment,
        recommended_comments: recommendedComments,
        athome_data: athomeData.panoramaUrl ? { panoramaUrl: athomeData.panoramaUrl } : null,
        property_about: propertyAbout,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'property_number'
      });
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log('✅ Database updated successfully!');
    
    // 6. 確認
    console.log('\n🔍 Verifying...');
    const { data: verified } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();
    
    console.log('Verified:', {
      favorite_comment: !!verified?.favorite_comment,
      recommended_comments: !!verified?.recommended_comments,
      athome_data: !!verified?.athome_data,
      panorama_url: verified?.athome_data?.panoramaUrl || 'なし',
      property_about: !!verified?.property_about
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

syncCC5().catch(console.error);
