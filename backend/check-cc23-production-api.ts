import axios from 'axios';

async function checkCC23ProductionAPI() {
  try {
    console.log('🔍 CC23の本番環境APIデータを確認中...\n');

    // 本番環境のバックエンドAPIエンドポイント
    const apiUrl = 'https://baikyaku-property-site3.vercel.app/api/public/properties/CC23';

    console.log('📡 APIエンドポイント:', apiUrl);
    console.log('');

    const response = await axios.get(apiUrl);
    const responseData = response.data;
    const property = responseData.property || responseData;

    console.log('✅ APIレスポンス取得成功\n');
    console.log('=== 基本情報 ===');
    console.log('物件番号:', property.property_number);
    console.log('物件種別:', property.property_type);
    console.log('価格:', property.price);
    console.log('住所:', property.address);
    console.log('');

    console.log('=== property_detailsフィールド ===');
    console.log('property_about:', property.property_about);
    console.log('recommended_comments:', property.recommended_comments);
    console.log('athome_data:', property.athome_data);
    console.log('favorite_comment:', property.favorite_comment);
    console.log('');

    console.log('=== お気に入り文言 ===');
    console.log('favorite_comment:', property.favorite_comment || '(なし)');
    console.log('');

    console.log('=== おすすめコメント ===');
    const recommendedComments = property.recommended_comments || [];
    if (recommendedComments.length > 0) {
      recommendedComments.forEach((comment: any, index: number) => {
        console.log(`${index + 1}. ${comment}`);
      });
    } else {
      console.log('(なし)');
    }
    console.log('');

    console.log('=== パノラマURL ===');
    console.log('panorama_url:', property.panorama_url || '(なし)');
    console.log('');

    console.log('=== 画像 ===');
    const images = property.images || [];
    console.log('画像数:', images.length);
    if (images.length > 0) {
      images.slice(0, 3).forEach((img: any, index: number) => {
        console.log(`${index + 1}. ${img.url}`);
      });
      if (images.length > 3) {
        console.log(`... 他 ${images.length - 3} 件`);
      }
    }
    console.log('');

    // 問題の診断
    console.log('=== 診断結果 ===');
    const issues = [];
    
    if (!property.favorite_comment) {
      issues.push('❌ お気に入り文言が設定されていません');
    } else {
      console.log('✅ お気に入り文言: 設定済み');
    }

    if (!recommendedComments || recommendedComments.length === 0) {
      issues.push('❌ おすすめコメントが設定されていません');
    } else {
      console.log(`✅ おすすめコメント: ${recommendedComments.length}件`);
    }

    if (!property.panorama_url) {
      issues.push('❌ パノラマURLが設定されていません');
    } else {
      console.log('✅ パノラマURL: 設定済み');
    }

    if (images.length === 0) {
      issues.push('❌ 画像が設定されていません');
    } else {
      console.log(`✅ 画像: ${images.length}件`);
    }

    console.log('');
    if (issues.length > 0) {
      console.log('⚠️ 問題が見つかりました:');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('✅ すべてのデータが正常に設定されています');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('ステータスコード:', error.response.status);
      console.error('レスポンス:', error.response.data);
    }
  }
}

checkCC23ProductionAPI();
