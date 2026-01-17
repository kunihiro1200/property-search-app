import { createClient } from '@supabase/supabase-js';
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAA13129Distribution() {
  console.log('=== AA13129の配信テスト（修正後） ===\n');

  // 1. 物件情報を取得
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13129')
    .single();

  if (propertyError) {
    console.error('物件取得エラー:', propertyError);
    return;
  }

  console.log('物件情報:');
  console.log('  物件番号:', property.property_number);
  console.log('  住所:', property.address);
  console.log('  物件種別:', property.property_type);
  console.log('  価格:', property.price?.toLocaleString(), '円');
  console.log('  配信エリア:', property.distribution_areas);
  console.log('');

  // 2. 配信サービスを使用して配信対象買主を取得
  const distributionService = new EnhancedBuyerDistributionService();
  
  const result = await distributionService.getQualifiedBuyersWithAllCriteria({
    propertyNumber: 'AA13129',
    propertyType: property.property_type,
    propertyPrice: property.price,
    propertyCity: property.address
  });

  console.log('配信結果:');
  console.log('  配信対象買主数:', result.count);
  console.log('  総買主数:', result.totalBuyers);
  console.log('');

  // 3. 買主6432が含まれているか確認
  const buyer6432 = result.filteredBuyers.find(b => b.buyer_number === '6432');
  
  if (buyer6432) {
    console.log('❌ 買主6432（taka844452@icloud.com）が配信対象に含まれています');
    console.log('  フィルター結果:');
    console.log('    - 地理的マッチング:', buyer6432.filterResults.geography);
    console.log('    - 配信フラグ:', buyer6432.filterResults.distribution);
    console.log('    - ステータス:', buyer6432.filterResults.status);
    console.log('    - 価格帯:', buyer6432.filterResults.priceRange);
  } else {
    console.log('✓ 買主6432（taka844452@icloud.com）は配信対象外です（正しい）');
  }
  console.log('');

  // 4. 配信対象買主のリスト
  if (result.count > 0) {
    console.log('配信対象買主リスト:');
    result.filteredBuyers
      .filter(b => 
        b.filterResults.geography && 
        b.filterResults.distribution && 
        b.filterResults.status && 
        b.filterResults.priceRange
      )
      .forEach((buyer, index) => {
        console.log(`  ${index + 1}. 買主${buyer.buyer_number} (${buyer.email})`);
        console.log(`     希望物件種別: ${buyer.desired_property_type}`);
        console.log(`     希望エリア: ${buyer.desired_area}`);
        if (buyer.desired_property_type === 'マンション' || buyer.desired_property_type === 'アパート') {
          console.log(`     価格帯: ${buyer.price_range_apartment}`);
        } else if (buyer.desired_property_type === '戸建' || buyer.desired_property_type === '戸建て') {
          console.log(`     価格帯: ${buyer.price_range_house}`);
        } else if (buyer.desired_property_type === '土地') {
          console.log(`     価格帯: ${buyer.price_range_land}`);
        }
      });
  } else {
    console.log('配信対象買主はいません');
  }
}

testAA13129Distribution().catch(console.error);
