import axios from 'axios';

async function testCC23CompleteAPI() {
  try {
    console.log('🔍 CC23の/completeエンドポイントを確認中...\n');

    // UUIDを使用
    const uuid = '56793363-ced0-47e1-89e3-db4046281525';
    const completeUrl = `https://baikyaku-property-site3.vercel.app/api/public/properties/${uuid}/complete`;

    console.log('📡 Complete APIエンドポイント:', completeUrl);
    console.log('');

    const response = await axios.get(completeUrl);
    const data = response.data;

    console.log('✅ Complete APIレスポンス取得成功\n');
    console.log('=== 基本情報 ===');
    console.log('物件番号:', data.property.property_number);
    console.log('物件種別:', data.property.property_type);
    console.log('価格:', data.property.price);
    console.log('住所:', data.property.address);
    console.log('');

    console.log('=== property_detailsフィールド ===');
    console.log('property_about:', data.property.property_about || '(なし)');
    console.log('recommended_comments:', data.property.recommended_comments || '(なし)');
    console.log('athome_data:', data.property.athome_data || '(なし)');
    console.log('favorite_comment:', data.property.favorite_comment || '(なし)');
    console.log('');

    console.log('=== Completeエンドポイント専用フィールド ===');
    console.log('favoriteComment:', data.favoriteComment || '(なし)');
    console.log('recommendedComments:', data.recommendedComments || '(なし)');
    console.log('athomeData:', data.athomeData || '(なし)');
    console.log('propertyAbout:', data.propertyAbout || '(なし)');
    console.log('');

    // 診断結果
    console.log('=== 診断結果 ===');
    const issues = [];
    
    if (!data.property.favorite_comment && !data.favoriteComment) {
      issues.push('❌ お気に入り文言が設定されていません');
    } else {
      console.log('✅ お気に入り文言: 設定済み');
    }

    if (!data.property.recommended_comments && !data.recommendedComments) {
      issues.push('❌ おすすめコメントが設定されていません');
    } else {
      const comments = data.property.recommended_comments || data.recommendedComments;
      console.log(`✅ おすすめコメント: ${Array.isArray(comments) ? comments.length : 0}件`);
    }

    if (!data.property.athome_data && !data.athomeData) {
      issues.push('❌ athome_dataが設定されていません');
    } else {
      console.log('✅ athome_data: 設定済み');
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
      console.error('レスポンス:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCC23CompleteAPI();
