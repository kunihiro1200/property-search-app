// AA12649のstorage_locationを確認するスクリプト
const r = await fetch('https://property-site-frontend-kappa.vercel.app/api/public/properties/AA12649');
const d = await r.json();
console.log('storage_location:', d.property?.storage_location);
console.log('atbb_status:', d.property?.atbb_status);
console.log('is_hidden:', d.property?.is_hidden);
