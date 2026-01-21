import axios from 'axios';

async function testCC23APIWithDebug() {
  try {
    console.log('🔍 CC23のAPIをデバッグモードで確認中...\n');

    // デバッグエンドポイントを使用
    const debugUrl = 'https://baikyaku-property-site3.vercel.app/api/public/debug/db-test/CC23';

    console.log('📡 デバッグAPIエンドポイント:', debugUrl);
    console.log('');

    const response = await axios.get(debugUrl);
    const data = response.data;

    console.log('✅ デバッグAPIレスポンス取得成功\n');
    console.log('=== デバッグ情報 ===');
    console.log('Success:', data.success);
    console.log('Property Number:', data.propertyNumber);
    console.log('');
    console.log('=== データ存在確認 ===');
    console.log('property_about:', data.hasData.property_about ? '✅ あり' : '❌ なし');
    console.log('recommended_comments:', data.hasData.recommended_comments ? '✅ あり' : '❌ なし');
    console.log('athome_data:', data.hasData.athome_data ? '✅ あり' : '❌ なし');
    console.log('favorite_comment:', data.hasData.favorite_comment ? '✅ あり' : '❌ なし');
    console.log('');
    console.log('=== 詳細データ ===');
    console.log(JSON.stringify(data.details, null, 2));

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.response) {
      console.error('ステータスコード:', error.response.status);
      console.error('レスポンス:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCC23APIWithDebug();
