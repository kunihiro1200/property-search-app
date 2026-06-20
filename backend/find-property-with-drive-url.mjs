// Google DriveフォルダURLを持つ物件を探すスクリプト
const r = await fetch('https://property-site-frontend-kappa.vercel.app/api/public/properties?limit=50');
const d = await r.json();

const properties = d.properties || [];
console.log(`確認対象物件数: ${properties.length}`);
console.log('complete API確認中（最大20件）...\n');

let foundCount = 0;
for (const prop of properties.slice(0, 20)) {
  try {
    const detailR = await fetch(`https://property-site-frontend-kappa.vercel.app/api/public/properties/${prop.property_number}/complete`);
    const detailD = await detailR.json();
    const athomeData = detailD.athomeData;
    const storageLocation = detailD.property?.storage_location;
    
    // Google DriveフォルダURLを持つ物件を探す
    const hasDriveUrl = storageLocation?.includes('/folders/') || 
                        (Array.isArray(athomeData) && athomeData.some(url => typeof url === 'string' && url.includes('/folders/')));
    
    if (hasDriveUrl) {
      foundCount++;
      console.log(`✅ ${prop.property_number}:`);
      console.log(`   storage_location: ${storageLocation}`);
      console.log(`   athomeData: ${JSON.stringify(athomeData)}`);
    }
  } catch (e) {
    // エラーは無視
  }
}

if (foundCount === 0) {
  console.log('⚠️ Google DriveフォルダURLを持つ物件が見つかりませんでした');
  console.log('\nAA13601のcomplete APIを確認します...');
  
  const r2 = await fetch('https://property-site-frontend-kappa.vercel.app/api/public/properties/AA13601/complete');
  const d2 = await r2.json();
  console.log('AA13601 athomeData:', JSON.stringify(d2.athomeData));
  console.log('AA13601 storage_location:', d2.property?.storage_location);
}
