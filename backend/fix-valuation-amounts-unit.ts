import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixValuationAmounts() {
  console.log('🔧 Fixing valuation amounts unit (万円 → 円)...\n');

  try {
    // 全ての売主で valuation_amount_1/2/3 が設定されているものを取得
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('id, seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3, fixed_asset_tax_road_price')
      .not('valuation_amount_1', 'is', null);

    if (error) {
      console.error('❌ Error fetching sellers:', error);
      return;
    }

    console.log(`📊 Found ${sellers?.length || 0} sellers with valuation amounts\n`);

    let updated = 0;
    let skipped = 0;

    for (const seller of sellers || []) {
      // fixed_asset_tax_road_price が設定されている場合はスキップ（自動計算された査定額）
      if (seller.fixed_asset_tax_road_price) {
        console.log(`⏭️  Skipping ${seller.seller_number} (has fixed_asset_tax_road_price - auto-calculated)`);
        skipped++;
        continue;
      }

      // 査定額が10000未満の場合は、万円単位として扱い、円単位に変換
      const needsConversion = 
        (seller.valuation_amount_1 && seller.valuation_amount_1 < 10000) ||
        (seller.valuation_amount_2 && seller.valuation_amount_2 < 10000) ||
        (seller.valuation_amount_3 && seller.valuation_amount_3 < 10000);

      if (!needsConversion) {
        console.log(`⏭️  Skipping ${seller.seller_number} (amounts already in yen)`);
        skipped++;
        continue;
      }

      const newAmount1 = seller.valuation_amount_1 ? seller.valuation_amount_1 * 10000 : null;
      const newAmount2 = seller.valuation_amount_2 ? seller.valuation_amount_2 * 10000 : null;
      const newAmount3 = seller.valuation_amount_3 ? seller.valuation_amount_3 * 10000 : null;

      console.log(`🔄 Converting ${seller.seller_number}:`);
      console.log(`   ${seller.valuation_amount_1}万円 → ${newAmount1}円`);
      console.log(`   ${seller.valuation_amount_2}万円 → ${newAmount2}円`);
      console.log(`   ${seller.valuation_amount_3}万円 → ${newAmount3}円`);

      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          valuation_amount_1: newAmount1,
          valuation_amount_2: newAmount2,
          valuation_amount_3: newAmount3,
        })
        .eq('id', seller.id);

      if (updateError) {
        console.error(`❌ Error updating ${seller.seller_number}:`, updateError);
      } else {
        console.log(`✅ Updated ${seller.seller_number}\n`);
        updated++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${sellers?.length || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixValuationAmounts().catch(console.error);
