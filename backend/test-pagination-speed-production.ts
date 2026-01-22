import dotenv from 'dotenv';

dotenv.config();

/**
 * 本番環境でページネーションの速度をテスト
 */
async function testPaginationSpeed() {
  const apiUrl = process.env.VERCEL_API_URL || 'https://baikyaku-property-site3.vercel.app';
  
  console.log('🧪 本番環境でページネーション速度をテスト...\n');
  
  // テスト1: 1ページ目（skipImages=true）
  console.log('📄 テスト1: 1ページ目（skipImages=true）');
  const start1 = Date.now();
  const response1 = await fetch(
    `${apiUrl}/api/public/properties?limit=20&offset=0&skipImages=true`
  );
  const data1 = await response1.json();
  const time1 = Date.now() - start1;
  console.log(`✅ 取得時間: ${time1}ms`);
  console.log(`   物件数: ${data1.properties?.length || 0}件\n`);
  
  // テスト2: 2ページ目（skipImages=true）
  console.log('📄 テスト2: 2ページ目（skipImages=true）');
  const start2 = Date.now();
  const response2 = await fetch(
    `${apiUrl}/api/public/properties?limit=20&offset=20&skipImages=true`
  );
  const data2 = await response2.json();
  const time2 = Date.now() - start2;
  console.log(`✅ 取得時間: ${time2}ms`);
  console.log(`   物件数: ${data2.properties?.length || 0}件\n`);
  
  // テスト3: 3ページ目（skipImages=true）
  console.log('📄 テスト3: 3ページ目（skipImages=true）');
  const start3 = Date.now();
  const response3 = await fetch(
    `${apiUrl}/api/public/properties?limit=20&offset=40&skipImages=true`
  );
  const data3 = await response3.json();
  const time3 = Date.now() - start3;
  console.log(`✅ 取得時間: ${time3}ms`);
  console.log(`   物件数: ${data3.properties?.length || 0}件\n`);
  
  // 平均時間を計算
  const avgTime = (time1 + time2 + time3) / 3;
  console.log('📊 結果サマリー:');
  console.log(`   平均取得時間: ${avgTime.toFixed(0)}ms`);
  console.log(`   最速: ${Math.min(time1, time2, time3)}ms`);
  console.log(`   最遅: ${Math.max(time1, time2, time3)}ms`);
  
  // 期待値との比較
  console.log('\n🎯 期待値との比較:');
  if (avgTime < 1000) {
    console.log(`   ✅ 優秀！ 1秒未満で取得できています`);
  } else if (avgTime < 2000) {
    console.log(`   ✅ 良好！ 2秒未満で取得できています`);
  } else if (avgTime < 5000) {
    console.log(`   ⚠️  やや遅い（2-5秒）`);
  } else {
    console.log(`   ❌ 遅い（5秒以上）- さらなる最適化が必要`);
  }
  
  // 比較: skipImages=falseの場合（参考）
  console.log('\n📊 比較: skipImages=false（画像あり）の場合');
  const startWithImages = Date.now();
  const responseWithImages = await fetch(
    `${apiUrl}/api/public/properties?limit=20&offset=0&skipImages=false`
  );
  await responseWithImages.json();
  const timeWithImages = Date.now() - startWithImages;
  console.log(`   取得時間: ${timeWithImages}ms`);
  
  const improvement = ((timeWithImages - avgTime) / timeWithImages * 100).toFixed(1);
  console.log(`   改善率: ${improvement}%`);
}

testPaginationSpeed().catch(console.error);
