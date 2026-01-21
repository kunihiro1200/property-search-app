import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testCC21ProductionApi() {
  console.log('🔍 本番環境でCC21の完全なデータを確認中...\n');

  try {
    const url = 'https://baikyaku-property-site3.vercel.app/api/public/properties/CC21/complete';
    console.log('📊 URL:', url);

    const response = await fetch(url);
    const data = await response.json() as any;

    console.log('\n✅ レスポンス:');
    console.log('- property.property_number:', data.property?.property_number);
    console.log('- property.atbb_status:', data.property?.atbb_status);
    console.log('- recommendedComments:', data.recommendedComments ? `${data.recommendedComments.length}件` : 'null');
    console.log('- favoriteComment:', data.favoriteComment ? `"${data.favoriteComment.substring(0, 50)}..."` : 'null');
    console.log('- propertyAbout:', data.propertyAbout ? `"${data.propertyAbout.substring(0, 50)}..."` : 'null');
    console.log('- panoramaUrl:', data.panoramaUrl || 'null');

    if (data.recommendedComments) {
      console.log('\n📋 おすすめコメント:');
      data.recommendedComments.forEach((comment: any, index: number) => {
        console.log(`  ${index + 1}. ${comment.title}: ${comment.content.substring(0, 50)}...`);
      });
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

testCC21ProductionApi();
