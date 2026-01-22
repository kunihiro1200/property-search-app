// AA5852に対応する物件リストの配信エリアを修正
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from './src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixAA5852PropertyListing() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== AA5852に対応する物件リストを修正 ===\n');

  // AA5852に関連する物件を探す
  // property_numberに「AA5852」が含まれるか、addressに「常行180」が含まれる物件を探す
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('*')
    .or('property_number.ilike.%AA5852%,property_number.ilike.%常行%');

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  console.log(`${properties?.length || 0}件の候補物件が見つかりました\n`);

  // 常行180を含む物件を探す
  let targetProperty = null;
  
  for (const prop of properties || []) {
    let address = prop.address;
    if (address) {
      try {
        address = decrypt(address);
      } catch (e) {
        // 復号化失敗時はそのまま
      }
    }
    
    console.log(`物件番号: ${prop.property_number}`);
    console.log(`  住所: ${address}`);
    console.log(`  配信エリア: ${prop.distribution_areas || '未設定'}`);
    
    if (address && (address.includes('常行180') || address.includes('常行　180'))) {
      targetProperty = prop;
      console.log(`  → これがAA5852の物件です！`);
    }
    console.log('');
  }

  if (!targetProperty) {
    console.log('⚠️ AA5852に対応する物件が見つかりませんでした');
    console.log('物件番号で直接検索してみます...\n');
    
    // 売主番号から物件を探す
    const { data: seller } = await supabase
      .from('sellers')
      .select('seller_number, property_number')
      .eq('seller_number', 'AA5852')
      .single();
    
    if (seller?.property_number) {
      console.log(`売主AA5852の物件番号: ${seller.property_number}`);
      
      const { data: prop } = await supabase
        .from('property_listings')
        .select('*')
        .eq('property_number', seller.property_number)
        .single();
      
      if (prop) {
        targetProperty = prop;
        let address = prop.address;
        try {
          address = decrypt(address);
        } catch (e) {}
        console.log(`物件住所: ${address}`);
        console.log(`配信エリア: ${prop.distribution_areas || '未設定'}\n`);
      }
    }
  }

  if (!targetProperty) {
    console.log('物件が見つかりませんでした');
    return;
  }

  // 配信エリアを修正
  const correctAreas = ['④', '㊵'];
  
  console.log('配信エリアを修正中...');
  const { error: updateError } = await supabase
    .from('property_listings')
    .update({
      distribution_areas: correctAreas
    })
    .eq('property_number', targetProperty.property_number);

  if (updateError) {
    console.error('更新エラー:', updateError.message);
    return;
  }

  console.log('✓ 配信エリアを④, ㊵に修正しました');
  console.log('\n完了！');
}

fixAA5852PropertyListing().catch(console.error);
