// storage_locationが設定済みの物件を探すスクリプト
const r = await fetch('https://property-site-frontend-kappa.vercel.app/api/public/properties?limit=50');
const d = await r.json();

const withStorage = (d.properties || []).filter(p => p.storage_location);
const withoutStorage = (d.properties || []).filter(p => !p.storage_location);

console.log(`全物件数: ${d.properties?.length ?? 0}`);
console.log(`storage_location設定済み: ${withStorage.length}`);
console.log(`storage_location未設定: ${withoutStorage.length}`);

if (withStorage.length > 0) {
  console.log('\nstorage_location設定済み物件:');
  withStorage.slice(0, 5).forEach(p => {
    console.log(`  ${p.property_number}: ${p.storage_location}`);
  });
} else {
  console.log('\n⚠️ storage_location設定済みの物件が見つかりませんでした');
  console.log('\n最初の5件の物件番号:');
  (d.properties || []).slice(0, 5).forEach(p => {
    console.log(`  ${p.property_number}: storage_location=${p.storage_location}`);
  });
}
