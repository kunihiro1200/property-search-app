import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { PanoramaUrlService } from './src/services/PanoramaUrlService';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncAA9743Details() {
  console.log('=== AA9743 詳細データ同期 ===\n');

  const propertyNumber = 'AA9743';
  const propertyType = 'マンション'; // AA9743はマンション

  try {
    // 1. おすすめコメントを取得
    console.log('1️⃣ おすすめコメントを取得中...');
    const recommendedCommentService = new RecommendedCommentService();
    
    const recommendedCommentResult = await recommendedCommentService.getRecommendedComment(
      propertyNumber,
      propertyType
    );
    
    if (recommendedCommentResult.comments && recommendedCommentResult.comments.length > 0) {
      console.log('  ✅ おすすめコメント取得成功');
      console.log('  コメント数:', recommendedCommentResult.comments.length);
    } else {
      console.log('  ⚠️  おすすめコメントが見つかりませんでした');
    }

    // 2. パノラマURLを取得
    console.log('\n2️⃣ パノラマURLを取得中...');
    const panoramaUrlService = new PanoramaUrlService();
    
    const panoramaUrl = await panoramaUrlService.getPanoramaUrl(propertyNumber);
    
    if (panoramaUrl) {
      console.log('  ✅ パノラマURL取得成功');
      console.log('  URL:', panoramaUrl);
    } else {
      console.log('  ⚠️  パノラマURLが見つかりませんでした');
    }

    // 3. property_detailsテーブルを更新
    console.log('\n3️⃣ property_detailsテーブルを更新中...');
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (recommendedCommentResult.comments && recommendedCommentResult.comments.length > 0) {
      updateData.recommended_comments = recommendedCommentResult.comments;
    }

    if (panoramaUrl) {
      // athome_dataにパノラマURLを追加
      const { data: currentData } = await supabase
        .from('property_details')
        .select('athome_data')
        .eq('property_number', propertyNumber)
        .single();

      const athomeData = currentData?.athome_data || [];
      if (!athomeData.includes(panoramaUrl)) {
        athomeData.push(panoramaUrl);
      }
      updateData.athome_data = athomeData;
    }

    const { data, error } = await supabase
      .from('property_details')
      .update(updateData)
      .eq('property_number', propertyNumber)
      .select()
      .single();

    if (error) {
      console.error('  ❌ 更新エラー:', error);
    } else {
      console.log('  ✅ 更新成功');
      console.log('\n📊 更新後のデータ:');
      console.log('  おすすめコメント:', data.recommended_comments ? `${data.recommended_comments.length}件` : 'なし');
      console.log('  athome_data:', data.athome_data ? `${data.athome_data.length}件` : 'なし');
    }

    console.log('\n✅ 同期完了！');
    console.log('\n🌐 確認URL:');
    console.log('  https://property-site-frontend-kappa.vercel.app/public/properties/AA9743');
    console.log('\n💡 ブラウザのキャッシュをクリアしてから確認してください（Ctrl + Shift + Delete）');

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

syncAA9743Details().catch(console.error);
