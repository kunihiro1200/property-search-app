// 画像APIのレスポンス詳細を確認するスクリプト
const r = await fetch('https://property-site-frontend-kappa.vercel.app/api/public/properties/AA13940/images');
const d = await r.json();
console.log('HTTP Status:', r.status);
console.log('Full response:', JSON.stringify(d, null, 2));
