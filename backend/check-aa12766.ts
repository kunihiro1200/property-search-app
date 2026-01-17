import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA12766() {
  console.log('=== Checking AA12766 ===\n');

  // sellersテーブルから物件情報を取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('seller_number, address, distribution_areas')
    .eq('seller_number', 'AA12766')
    .single();

  if (error) {
    console.log('エラー:', error);
  }

  if (!seller) {
    console.log('AA12766が見つかりません');
    
    // property_listingsテーブルも確認
    const { data: listing, error: listingError } = await supabase
      .from('property_listings')
      .select('property_number, address, distribution_areas')
      .eq('property_number', 'AA12766')
      .single();
    
    if (listingError) {
      console.log('property_listingsエラー:', listingError);
    }
    
    if (listing) {
      console.log('\nproperty_listingsで見つかりました:');
      console.log(`  物件番号: ${listing.property_number}`);
      console.log(`  住所: ${listing.address}`);
      console.log(`  配信エリア: ${listing.distribution_areas}`);
      
      // 住所から地域名を抽出（別府市を除去）
      let address = listing.address || '';
      address = address.replace(/^別府市/, '');
      
      // 数字の前までを地域名として抽出（全角・半角両対応）
      const regionMatch = address.match(/^([^\d０-９]+)/);
      const region = regionMatch ? regionMatch[1] : null;
      console.log(`  抽出された地域名: ${region}`);
      
      if (region) {
        const { data: mappings } = await supabase
          .from('beppu_area_mapping')
          .select('*')
          .eq('region_name', region);
        
        console.log(`\n${region}のマッピング:`);
        if (mappings && mappings.length > 0) {
          mappings.forEach((m) => {
            console.log(`  学校区: ${m.school_district}`);
            console.log(`  配信エリア: ${m.distribution_areas}`);
            console.log(`  その他: ${m.other_region || 'なし'}`);
            console.log();
          });
        } else {
          console.log('  マッピングが見つかりません');
        }
      }
    }
    
    return;
  }

  const property = {
    seller_number: seller.seller_number,
    address: seller.address,
    distribution_areas: seller.distribution_areas
  };

  console.log('物件情報:');
  console.log(`  売主番号: ${property.seller_number}`);
  console.log(`  住所: ${property.address}`);
  console.log(`  配信エリア: ${property.distribution_areas}`);
  console.log();

  // 石垣東のマッピングを確認
  const { data: mappings } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .eq('region_name', '石垣東');

  console.log('石垣東のマッピング:');
  if (mappings && mappings.length > 0) {
    mappings.forEach((m) => {
      console.log(`  学校区: ${m.school_district}`);
      console.log(`  配信エリア: ${m.distribution_areas}`);
      console.log(`  その他: ${m.other_region || 'なし'}`);
      console.log();
    });
  } else {
    console.log('  マッピングが見つかりません');
  }

  // BeppuAreaMappingServiceを使って配信エリアを計算
  const fullAddress = `大分県別府市${property.address}`;
  console.log(`\nBeppuAreaMappingServiceでの計算:`);
  console.log(`  入力住所: ${fullAddress}`);
  
  // 地域名を抽出（簡易版）
  const regionMatch = property.address.match(/^([^0-9]+)/);
  const region = regionMatch ? regionMatch[1] : null;
  console.log(`  抽出された地域名: ${region}`);

  if (region) {
    const { data: areaData } = await supabase
      .from('beppu_area_mapping')
      .select('*')
      .eq('region_name', region)
      .single();

    if (areaData) {
      console.log(`  マッピング結果: ${areaData.distribution_areas} (${areaData.school_district})`);
    } else {
      console.log(`  マッピングなし → フォールバック: ㊶`);
    }
  }
}

checkAA12766().catch(console.error);
