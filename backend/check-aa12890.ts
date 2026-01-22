import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12890() {
  console.log('=== AA12890 データ確認 ===\n');

  // 売主データを取得
  const { data: sellers, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12890');

  if (sellerError) {
    console.error('エラー:', sellerError);
    return;
  }

  if (!sellers || sellers.length === 0) {
    console.log('❌ AA12890が見つかりません');
    return;
  }

  const seller = sellers[0];
  console.log('📋 売主情報:');
  console.log(`  ID: ${seller.id}`);
  console.log(`  売主番号: ${seller.seller_number}`);
  console.log(`  名前: ${decrypt(seller.name)}`);
  console.log(`  住所: ${seller.address ? decrypt(seller.address) : 'なし'}`);
  console.log(`  都道府県: ${seller.prefecture || 'なし'}`);
  console.log(`  市区町村: ${seller.city || 'なし'}`);
  console.log(`  町名: ${seller.town || 'なし'}`);
  console.log(`  建物名: ${seller.building || 'なし'}`);
  console.log();

  // 物件データを取得
  const { data: properties, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (propertyError) {
    console.error('物件取得エラー:', propertyError);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('❌ 物件データが見つかりません');
    return;
  }

  console.log(`🏠 物件情報 (${properties.length}件):`);
  properties.forEach((property: any, index: number) => {
    console.log(`\n  物件 ${index + 1}:`);
    console.log(`    ID: ${property.id}`);
    console.log(`    住所: ${property.address || 'なし'}`);
    console.log(`    都道府県: ${property.prefecture || 'なし'}`);
    console.log(`    市区町村: ${property.city || 'なし'}`);
    console.log(`    町名: ${property.town || 'なし'}`);
    console.log(`    建物名: ${property.building || 'なし'}`);
    console.log(`    土地面積: ${property.land_area || 'なし'}`);
    console.log(`    建物面積: ${property.building_area || 'なし'}`);
    console.log(`    物件種別: ${property.property_type || 'なし'}`);
    
    // 住所が売主と同じかチェック
    const sellerAddress = seller.address ? decrypt(seller.address) : '';
    if (property.address === sellerAddress) {
      console.log(`    ⚠️  物件住所が売主住所と同じです！`);
    }
    if (property.prefecture === seller.prefecture && 
        property.city === seller.city && 
        property.town === seller.town) {
      console.log(`    ⚠️  物件の都道府県・市区町村・町名が売主と同じです！`);
    }
    
    // 面積データのチェック
    if (!property.land_area && !property.building_area) {
      console.log(`    ⚠️  土地面積・建物面積の両方が空です！`);
    }
  });

  console.log('\n=== 問題の原因を調査 ===\n');
  console.log('次のステップ:');
  console.log('1. スプレッドシートの該当行を確認');
  console.log('2. PropertySyncHandlerのマッピングロジックを確認');
  console.log('3. 同期ログを確認');
}

checkAA12890()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
