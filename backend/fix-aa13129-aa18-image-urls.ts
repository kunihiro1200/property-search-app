/**
 * AA13129とAA18の画像表示問題を修正
 * 
 * 問題: PropertyImageServiceが直接Google DriveのURLを返しているため、
 *       認証が必要で🔒アイコンが表示される
 * 
 * 解決策: PropertyImageServiceを修正して、プロキシURLを返すようにする
 */

import * as fs from 'fs';
import * as path from 'path';

const SERVICE_FILE = path.join(__dirname, 'src/services/PropertyImageService.ts');

console.log('=== AA13129とAA18の画像表示問題を修正 ===\n');

// ファイルを読み込む
const content = fs.readFileSync(SERVICE_FILE, 'utf-8');

// 修正前のコード
const oldThumbnailUrl = `thumbnailUrl: \`https://drive.google.com/thumbnail?id=\${file.id}&sz=w400\`,`;
const oldFullImageUrl = `fullImageUrl: \`https://drive.google.com/uc?export=view&id=\${file.id}\`,`;

// 修正後のコード（プロキシURLを使用）
const newThumbnailUrl = `thumbnailUrl: \`/api/public/images/\${file.id}/thumbnail\`,`;
const newFullImageUrl = `fullImageUrl: \`/api/public/images/\${file.id}\`,`;

// 修正を適用
let newContent = content;
let modified = false;

if (content.includes(oldThumbnailUrl)) {
  console.log('✅ thumbnailUrlを修正します...');
  newContent = newContent.replace(oldThumbnailUrl, newThumbnailUrl);
  modified = true;
} else if (content.includes(newThumbnailUrl)) {
  console.log('✅ thumbnailUrlは既に修正済みです');
} else {
  console.log('⚠️ thumbnailUrlのパターンが見つかりません');
}

if (content.includes(oldFullImageUrl)) {
  console.log('✅ fullImageUrlを修正します...');
  newContent = newContent.replace(oldFullImageUrl, newFullImageUrl);
  modified = true;
} else if (content.includes(newFullImageUrl)) {
  console.log('✅ fullImageUrlは既に修正済みです');
} else {
  console.log('⚠️ fullImageUrlのパターンが見つかりません');
}

if (modified) {
  // バックアップを作成
  const backupFile = SERVICE_FILE + '.backup';
  fs.writeFileSync(backupFile, content);
  console.log(`\n📦 バックアップを作成しました: ${backupFile}`);

  // 修正を保存
  fs.writeFileSync(SERVICE_FILE, newContent);
  console.log(`\n✅ 修正を保存しました: ${SERVICE_FILE}`);
  
  console.log('\n📋 修正内容:');
  console.log('  修正前:');
  console.log(`    thumbnailUrl: https://drive.google.com/thumbnail?id={fileId}&sz=w400`);
  console.log(`    fullImageUrl: https://drive.google.com/uc?export=view&id={fileId}`);
  console.log('  修正後:');
  console.log(`    thumbnailUrl: /api/public/images/{fileId}/thumbnail`);
  console.log(`    fullImageUrl: /api/public/images/{fileId}`);
  
  console.log('\n🔧 次のステップ:');
  console.log('  1. バックエンドを再起動してください');
  console.log('     cd backend');
  console.log('     npm run dev');
  console.log('');
  console.log('  2. ブラウザのキャッシュをクリアしてください');
  console.log('     Ctrl + Shift + Delete → キャッシュをクリア');
  console.log('');
  console.log('  3. 公開物件サイトで確認してください');
  console.log('     http://localhost:5173/public/properties');
  console.log('     - AA13129を検索');
  console.log('     - AA18を検索');
  console.log('     - 画像が表示されることを確認');
} else {
  console.log('\n✅ 修正は不要です（既に修正済み）');
  console.log('\n🔧 画像が表示されない場合:');
  console.log('  1. バックエンドを再起動してください');
  console.log('  2. ブラウザのキャッシュをクリアしてください');
}

console.log('\n=== 修正完了 ===');
