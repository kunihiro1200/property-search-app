// 画像が実際に返される物件を探すスクリプト
const r = await fetch('https://property-site-frontend-kappa.vercel.app/api/public/properties?limit=20');
const d = await r.json();

const properties = d.properties || [];
console.log(`確認対象物件数: ${properties.length}`);
console.log('画像取得テスト中...\n');

let foundCount = 0;
for (const prop of properties.slice(0, 10)) {
  try {
    const imgR = await fetch(`https://property-site-frontend-kappa.vercel.app/api/public/properties/${prop.property_number}/images`);
    const imgD = await imgR.json();
    const count = imgD.images?.length ?? 0;
    const status = count > 0 ? '✅' : '❌';
    console.log(`${status} ${prop.property_number}: images.length=${count}, cached=${imgD.cached}`);
    if (count > 0) {
      foundCount++;
      console.log(`   thumbnailUrl: ${imgD.images[0].thumbnailUrl ? '存在する' : 'なし'}`);
    }
  } catch (e) {
    console.log(`❌ ${prop.property_number}: エラー - ${e.message}`);
  }
}

console.log(`\n画像あり物件数: ${foundCount} / 10`);
