// athome_dataにGoogle DriveフォルダURLを持つ物件の画像取得テスト
const testProperties = ['AA13876', 'AA10790-2', 'AA13632', 'AA4160-2'];

for (const prop of testProperties) {
  const r = await fetch(`https://property-site-frontend-kappa.vercel.app/api/public/properties/${prop}/images`);
  const d = await r.json();
  const count = d.images?.length ?? 0;
  console.log(`${prop}: HTTP=${r.status}, images.length=${count}, cached=${d.cached}, error=${d.error ?? 'なし'}`);
  if (count > 0) {
    console.log(`  thumbnailUrl: ${d.images[0].thumbnailUrl ? '存在する' : 'なし'}`);
  }
}
