// athome_dataを持つ物件を探すスクリプト（complete APIを使用）
const r = await fetch('https://property-site-frontend-kappa.vercel.app/api/public/properties?limit=20');
const d = await r.json();

const properties = d.properties || [];
console.log(`確認対象物件数: ${properties.length}`);
console.log('complete API確認中...\n');

for (const prop of properties.slice(0, 5)) {
  try {
    const detailR = await fetch(`https://property-site-frontend-kappa.vercel.app/api/public/properties/${prop.property_number}/complete`);
    const detailD = await detailR.json();
    const athomeData = detailD.athomeData;
    console.log(`${prop.property_number}:`);
    console.log(`  athomeData: ${JSON.stringify(athomeData)}`);
    console.log(`  property.storage_location: ${detailD.property?.storage_location}`);
  } catch (e) {
    console.log(`❌ ${prop.property_number}: エラー - ${e.message}`);
  }
}
