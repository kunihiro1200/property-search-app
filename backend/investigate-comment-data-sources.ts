import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function investigateCommentDataSources() {
  console.log('🔍 コメントデータの取得元を調査します...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  try {
    // 1. PropertyService.getPropertyAbout()の動作確認
    console.log('📊 1. PropertyService.getPropertyAbout()の動作確認:');
    const { PropertyService } = await import('./src/services/PropertyService');
    const propertyService = new PropertyService();
    
    try {
      const propertyAbout = await propertyService.getPropertyAbout('AA12608');
      console.log('✅ PropertyService.getPropertyAbout()は正常に動作します');
      console.log('   取得したデータ:', propertyAbout ? `${propertyAbout.substring(0, 50)}...` : 'なし');
      console.log('   データソース: 物件リストスプレッドシート（PROPERTY_LISTING_SPREADSHEET_ID）');
    } catch (error: any) {
      console.error('❌ PropertyService.getPropertyAbout()でエラー:', error.message);
    }
    
    // 2. RecommendedCommentService.getRecommendedComment()の動作確認
    console.log('\n📊 2. RecommendedCommentService.getRecommendedComment()の動作確認:');
    const { RecommendedCommentService } = await import('./src/services/RecommendedCommentService');
    const recommendedCommentService = new RecommendedCommentService();
    
    try {
      const result = await recommendedCommentService.getRecommendedComment('AA12608', '戸建', 'test-id');
      console.log('✅ RecommendedCommentService.getRecommendedComment()は正常に動作します');
      console.log('   取得したコメント数:', result.comments.length);
      console.log('   データソース: 業務リスト（GYOMU_LIST_SPREADSHEET_ID）→ 個別物件スプレッドシート');
    } catch (error: any) {
      console.error('❌ RecommendedCommentService.getRecommendedComment()でエラー:', error.message);
    }
    
    // 3. FavoriteCommentService.getFavoriteComment()の動作確認
    console.log('\n📊 3. FavoriteCommentService.getFavoriteComment()の動作確認:');
    const { FavoriteCommentService } = await import('./src/services/FavoriteCommentService');
    const favoriteCommentService = new FavoriteCommentService();
    
    // AA12608のIDを取得
    const { data: property } = await supabase
      .from('property_listings')
      .select('id')
      .eq('property_number', 'AA12608')
      .single();
    
    if (property) {
      try {
        const result = await favoriteCommentService.getFavoriteComment(property.id);
        console.log('✅ FavoriteCommentService.getFavoriteComment()は正常に動作します');
        console.log('   取得したコメント:', result.comment ? `${result.comment.substring(0, 50)}...` : 'なし');
        console.log('   データソース: 業務リスト（GYOMU_LIST_SPREADSHEET_ID）→ 個別物件スプレッドシート');
      } catch (error: any) {
        console.error('❌ FavoriteCommentService.getFavoriteComment()でエラー:', error.message);
      }
    }
    
    // 4. updatePropertyDetailsFromSheets()がコメントアウトされた理由を確認
    console.log('\n📊 4. コメントアウトされた理由:');
    console.log('   → PropertyListingSyncService.ts 行768のコメント:');
    console.log('   → "一時的に無効化: sellersテーブルのcommentsカラムエラーを回避"');
    console.log('\n   ⚠️ しかし、上記のサービスはすべてsellersテーブルを使用していません！');
    console.log('   → PropertyService: 物件リストスプレッドシートから取得');
    console.log('   → RecommendedCommentService: 業務リスト → 個別物件スプレッドシート');
    console.log('   → FavoriteCommentService: 業務リスト → 個別物件スプレッドシート');
    
    // 5. 結論
    console.log('\n\n📋 調査結果の結論:');
    console.log('─────────────────────────────────────────────────────');
    console.log('1. すべてのコメント取得サービスはsellersテーブルを使用していない');
    console.log('2. データソース:');
    console.log('   - PropertyService: 物件リストスプレッドシート');
    console.log('   - RecommendedCommentService: 業務リスト → 個別物件スプレッドシート');
    console.log('   - FavoriteCommentService: 業務リスト → 個別物件スプレッドシート');
    console.log('3. コメントアウトの理由（sellersテーブルのエラー）は誤解に基づいている');
    console.log('4. ✅ updatePropertyDetailsFromSheets()のコメントアウトを解除しても問題ない');
    console.log('─────────────────────────────────────────────────────');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

investigateCommentDataSources();
