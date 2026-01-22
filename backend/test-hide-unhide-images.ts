// 画像の非表示/復元機能をテスト
import axios from 'axios';
import dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

const API_BASE_URL = 'http://localhost:3000/api';
const PROPERTY_ID = '593c43f9-8e10-4eea-8209-6484911f3364'; // AA13129
const TEST_FILE_ID = '17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA'; // 1205　間取　AA13129.jpg

// Supabase認証トークンを設定
const AUTH_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY;

// axiosのデフォルトヘッダーに認証トークンを設定
axios.defaults.headers.common['Authorization'] = `Bearer ${AUTH_TOKEN}`;

async function testHideUnhideImages() {
  console.log('🧪 画像非表示/復元機能テスト開始\n');

  try {
    // 1. 初期状態を確認
    console.log('1️⃣ 初期状態を確認中...');
    const initialResponse = await axios.get(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/hidden-images`);
    const initialHidden = initialResponse.data.hiddenImages || [];
    console.log(`✅ 初期非表示画像数: ${initialHidden.length}枚`);
    if (initialHidden.length > 0) {
      console.log(`   非表示画像: ${initialHidden.join(', ')}`);
    }
    console.log();

    // 2. 画像を非表示にする
    console.log(`2️⃣ 画像を非表示にする (fileId: ${TEST_FILE_ID})...`);
    const hideResponse = await axios.post(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/hide-image`, {
      fileId: TEST_FILE_ID
    });
    console.log(`✅ ${hideResponse.data.message}`);
    console.log();

    // 3. 非表示後の状態を確認
    console.log('3️⃣ 非表示後の状態を確認中...');
    const afterHideResponse = await axios.get(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/hidden-images`);
    const afterHideHidden = afterHideResponse.data.hiddenImages || [];
    console.log(`✅ 非表示画像数: ${afterHideHidden.length}枚`);
    console.log(`   非表示画像: ${afterHideHidden.join(', ')}`);
    
    if (afterHideHidden.includes(TEST_FILE_ID)) {
      console.log(`✅ テスト画像が非表示リストに含まれています`);
    } else {
      console.error(`❌ テスト画像が非表示リストに含まれていません`);
      return;
    }
    console.log();

    // 4. 画像一覧を取得して、非表示画像が除外されていることを確認
    console.log('4️⃣ 画像一覧を取得中...');
    const imagesResponse = await axios.get(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/images`);
    const images = imagesResponse.data.images || [];
    console.log(`✅ 表示可能画像数: ${images.length}枚`);
    
    const hiddenImage = images.find((img: any) => img.id === TEST_FILE_ID);
    if (!hiddenImage) {
      console.log(`✅ 非表示画像が画像一覧から除外されています`);
    } else {
      console.error(`❌ 非表示画像が画像一覧に含まれています`);
      return;
    }
    console.log();

    // 5. 画像を復元する
    console.log(`5️⃣ 画像を復元する (fileId: ${TEST_FILE_ID})...`);
    const unhideResponse = await axios.post(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/unhide-image`, {
      fileId: TEST_FILE_ID
    });
    console.log(`✅ ${unhideResponse.data.message}`);
    console.log();

    // 6. 復元後の状態を確認
    console.log('6️⃣ 復元後の状態を確認中...');
    const afterUnhideResponse = await axios.get(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/hidden-images`);
    const afterUnhideHidden = afterUnhideResponse.data.hiddenImages || [];
    console.log(`✅ 非表示画像数: ${afterUnhideHidden.length}枚`);
    
    if (!afterUnhideHidden.includes(TEST_FILE_ID)) {
      console.log(`✅ テスト画像が非表示リストから削除されています`);
    } else {
      console.error(`❌ テスト画像が非表示リストに残っています`);
      return;
    }
    console.log();

    // 7. 画像一覧を再取得して、復元された画像が表示されることを確認
    console.log('7️⃣ 画像一覧を再取得中...');
    const finalImagesResponse = await axios.get(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/images`);
    const finalImages = finalImagesResponse.data.images || [];
    console.log(`✅ 表示可能画像数: ${finalImages.length}枚`);
    
    const restoredImage = finalImages.find((img: any) => img.id === TEST_FILE_ID);
    if (restoredImage) {
      console.log(`✅ 復元された画像が画像一覧に含まれています`);
      console.log(`   画像名: ${restoredImage.name}`);
    } else {
      console.error(`❌ 復元された画像が画像一覧に含まれていません`);
      return;
    }
    console.log();

    // 8. 重複防止のテスト
    console.log('8️⃣ 重複防止のテスト...');
    console.log(`   同じ画像を2回非表示にします...`);
    await axios.post(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/hide-image`, {
      fileId: TEST_FILE_ID
    });
    await axios.post(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/hide-image`, {
      fileId: TEST_FILE_ID
    });
    
    const duplicateCheckResponse = await axios.get(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/hidden-images`);
    const duplicateCheckHidden = duplicateCheckResponse.data.hiddenImages || [];
    const occurrences = duplicateCheckHidden.filter((id: string) => id === TEST_FILE_ID).length;
    
    if (occurrences === 1) {
      console.log(`✅ 重複防止が正常に動作しています（出現回数: ${occurrences}）`);
    } else {
      console.error(`❌ 重複が発生しています（出現回数: ${occurrences}）`);
      return;
    }
    console.log();

    // 9. クリーンアップ
    console.log('9️⃣ クリーンアップ中...');
    await axios.post(`${API_BASE_URL}/property-listings/${PROPERTY_ID}/unhide-image`, {
      fileId: TEST_FILE_ID
    });
    console.log(`✅ テスト画像を復元しました`);
    console.log();

    console.log('🎉 すべてのテストが成功しました！\n');
    console.log('📝 確認事項:');
    console.log('   ✅ 画像を非表示にできる');
    console.log('   ✅ 非表示画像が画像一覧から除外される');
    console.log('   ✅ 画像を復元できる');
    console.log('   ✅ 復元された画像が画像一覧に表示される');
    console.log('   ✅ 重複防止が正常に動作する');

  } catch (error: any) {
    console.error('❌ テスト中にエラーが発生:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 バックエンドサーバーが起動していません。');
      console.error('   以下のコマンドでサーバーを起動してください:');
      console.error('   cd backend && npm run dev');
    }
  }
}

testHideUnhideImages();
