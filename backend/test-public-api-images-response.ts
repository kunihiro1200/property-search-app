import { createClient } from '@supabase/supabase-js';
import { PropertyImageService } from './src/services/PropertyImageService';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testApiResponse() {
  console.log('\n🔍 公開物件APIレスポンステスト\n');
  console.log('='.repeat(80));
  
  // 公開物件を取得（APIと同じロジック）
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, atbb_status')
    .eq('atbb_status', '専任・公開中')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('⚠️ 公開物件が見つかりません');
    return;
  }
  
  console.log(`\n📊 ${properties.length} 件の物件をテスト\n`);
  
  const imageService = new PropertyImageService();
  
  for (const property of properties) {
    console.log(`\n🏠 物件番号: ${property.property_number}`);
    console.log(`   ID: ${property.id}`);
    console.log(`   storage_location: ${property.storage_location || 'なし'}`);
    
    try {
      // APIが返す画像URLを取得
      const images = await imageService.getFirstImage(property.id, property.storage_location);
      
      console.log(`\n   📸 APIレスポンス (images フィールド):`);
      if (images.length > 0) {
        console.log(`   ✅ ${JSON.stringify(images, null, 2)}`);
        console.log(`\n   🌐 フロントエンドで使用されるURL:`);
        console.log(`      ${images[0]}`);
      } else {
        console.log(`   ⚠️ []（空の配列）`);
        console.log(`   → フロントエンドでは placeholder-property.jpg が表示されます`);
      }
    } catch (error: any) {
      console.log(`   ❌ エラー: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 確認ポイント:');
  console.log('   1. images フィールドに /api/public/images/{fileId}/thumbnail 形式のURLが含まれているか');
  console.log('   2. フロントエンドのブラウザコンソールでネットワークタブを確認');
  console.log('   3. /api/public/properties のレスポンスに images フィールドがあるか');
  console.log('');
}

testApiResponse().catch(console.error);
