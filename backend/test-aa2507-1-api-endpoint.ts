import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function testAA2507_1ApiEndpoint() {
  console.log('=== AA2507-1 画像APIエンドポイント テスト ===\n');

  const propertyId = 'd145b8a9-721e-417f-b336-fa99fd3018c2';
  const apiUrl = `http://localhost:3000/api/public/properties/${propertyId}/images`;

  try {
    console.log(`APIエンドポイント: ${apiUrl}`);
    console.log('リクエスト送信中...\n');

    const response = await fetch(apiUrl);
    
    console.log('レスポンスステータス:', response.status);
    console.log('レスポンスヘッダー:');
    console.log('  - Content-Type:', response.headers.get('content-type'));
    console.log('  - Cache-Control:', response.headers.get('cache-control'));
    console.log('');

    if (!response.ok) {
      console.error('❌ APIエラー:', response.statusText);
      const errorText = await response.text();
      console.error('エラー詳細:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ APIレスポンス:');
    console.log('  - 画像数:', data.images?.length || 0);
    console.log('  - フォルダID:', data.folderId);
    console.log('  - キャッシュ:', data.cached);
    console.log('  - 表示可能画像数:', data.visibleCount);
    console.log('  - 非表示画像数:', data.hiddenCount);
    console.log('');

    if (data.images && data.images.length > 0) {
      console.log('画像一覧（最初の3件）:');
      data.images.slice(0, 3).forEach((img: any, index: number) => {
        console.log(`  ${index + 1}. ${img.name}`);
        console.log(`     - ID: ${img.id}`);
        console.log(`     - サムネイルURL: ${img.thumbnailUrl}`);
        console.log(`     - フルURL: ${img.fullImageUrl}`);
      });
      
      if (data.images.length > 3) {
        console.log(`  ... 他 ${data.images.length - 3}件`);
      }
      
      console.log('');
      console.log('✅ 画像APIエンドポイントは正常に動作しています');
      console.log('');
      console.log('📱 フロントエンドで確認:');
      console.log(`   http://localhost:5173/public/properties/${propertyId}`);
      console.log('');
      console.log('⚠️ ブラウザで Ctrl+Shift+R でハードリロードしてください');
    } else {
      console.log('❌ 画像が返されていません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

testAA2507_1ApiEndpoint();
