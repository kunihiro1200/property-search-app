import axios from 'axios';

async function checkAA9743ProductionAPI() {
  console.log('=== AA9743 本番環境API確認 ===\n');

  const baseUrl = 'https://baikyaku-property-site3.vercel.app/api/public';

  try {
    // 1. 公開物件一覧APIで取得できるか確認
    console.log('1️⃣ 公開物件一覧APIで検索...');
    const listResponse = await axios.get(`${baseUrl}/properties`, {
      params: {
        propertyNumber: 'AA9743',
        limit: 1
      }
    });

    console.log('  取得件数:', listResponse.data.total);
    if (listResponse.data.properties && listResponse.data.properties.length > 0) {
      const property = listResponse.data.properties[0];
      console.log('  ✅ 取得できました');
      console.log('  物件番号:', property.property_number);
      console.log('  ATBB状態:', property.atbb_status);
      console.log('  価格:', property.price);
      console.log('  住所:', property.address);
      console.log('  物件種別:', property.property_type);
      console.log('  画像URL:', property.image_url ? '✅ あり' : '❌ なし');
      console.log('  格納先URL:', property.storage_location ? '✅ あり' : '❌ なし');
      console.log();

      // 2. 物件詳細APIで取得できるか確認
      console.log('2️⃣ 物件詳細APIで取得...');
      const detailResponse = await axios.get(`${baseUrl}/properties/${property.id}`);
      const detail = detailResponse.data.property;
      console.log('  ✅ 取得できました');
      console.log('  物件番号:', detail.property_number);
      console.log('  ATBB状態:', detail.atbb_status);
      console.log('  画像URL:', detail.image_url ? '✅ あり' : '❌ なし');
      console.log();

      // 3. 画像APIで取得できるか確認
      console.log('3️⃣ 画像APIで取得...');
      try {
        const imagesResponse = await axios.get(`${baseUrl}/properties/${property.id}/images`);
        console.log('  ✅ 取得できました');
        console.log('  画像数:', imagesResponse.data.images?.length || 0);
        if (imagesResponse.data.images && imagesResponse.data.images.length > 0) {
          console.log('  最初の画像:', imagesResponse.data.images[0].thumbnailUrl);
        }
      } catch (error: any) {
        console.log('  ❌ 取得できませんでした');
        console.log('  エラー:', error.response?.data?.message || error.message);
      }
    } else {
      console.log('  ❌ 取得できませんでした');
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.response?.data || error.message);
  }
}

checkAA9743ProductionAPI().catch(console.error);
