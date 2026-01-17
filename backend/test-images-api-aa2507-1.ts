import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testImagesApiAA2507_1() {
  console.log('=== AA2507-1 画像API テスト ===\n');

  try {
    // 1. 物件情報を取得
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .eq('property_number', 'AA2507-1')
      .single();

    if (error || !property) {
      console.error('❌ 物件が見つかりません');
      return;
    }

    console.log('物件情報:');
    console.log('  - 物件ID:', property.id);
    console.log('  - 物件番号:', property.property_number);
    console.log('  - 格納先URL:', property.storage_location);
    console.log('');

    // 2. PropertyImageServiceで画像を取得
    console.log('PropertyImageServiceで画像を取得中...');
    const imageService = new PropertyImageService();
    const result = await imageService.getImagesFromStorageUrl(property.storage_location);

    console.log('✅ 画像取得結果:');
    console.log('  - 使用されたフォルダID:', result.folderId);
    console.log('  - キャッシュから取得:', result.cached);
    console.log('  - 画像数:', result.images.length);
    console.log('');

    if (result.images.length > 0) {
      console.log('画像一覧（最初の5件）:');
      result.images.slice(0, 5).forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.name}`);
        console.log(`     - ID: ${img.id}`);
        console.log(`     - サムネイルURL: ${img.thumbnailUrl}`);
      });
      
      if (result.images.length > 5) {
        console.log(`  ... 他 ${result.images.length - 5}件`);
      }
      
      console.log('');
      console.log('✅ 画像APIは正常に動作しています');
      console.log('');
      console.log('📱 フロントエンドで確認してください：');
      console.log(`   APIエンドポイント: /api/public/properties/${property.id}/images`);
      console.log(`   公開物件サイト: http://localhost:3000/public/properties/${property.id}`);
      console.log('');
      console.log('ブラウザのキャッシュをクリアしてから再度アクセスしてください。');
    } else {
      console.log('❌ 画像が見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

testImagesApiAA2507_1();
