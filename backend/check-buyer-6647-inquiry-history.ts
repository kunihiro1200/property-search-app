import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer6647InquiryHistory() {
  console.log('🔍 買主6647の問合せ履歴を確認...\n');

  // Get buyer 6647
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('id, buyer_number, property_number, past_buyer_list, reception_date, name')
    .eq('buyer_number', '6647')
    .single();

  if (buyerError) {
    console.error('❌ Error fetching buyer:', buyerError);
    return;
  }

  console.log('📊 買主6647の情報:');
  console.log('  ID:', buyer.id);
  console.log('  買主番号:', buyer.buyer_number);
  console.log('  氏名:', buyer.name);
  console.log('  物件番号:', buyer.property_number);
  console.log('  過去の買主番号:', buyer.past_buyer_list);
  console.log('  受付日:', buyer.reception_date);
  console.log('');

  // Parse property numbers
  const propertyNumbers: string[] = [];
  if (buyer.property_number) {
    const nums = buyer.property_number.split(',').map((n: string) => n.trim()).filter((n: string) => n);
    propertyNumbers.push(...nums);
  }

  console.log('📋 この買主が問い合わせた物件番号:', propertyNumbers.join(', '));
  console.log('');

  // Check if past buyer numbers exist
  if (buyer.past_buyer_list) {
    const pastNumbers = buyer.past_buyer_list.split(',').map((n: string) => n.trim()).filter((n: string) => n);
    console.log('🔄 過去の買主番号:', pastNumbers.join(', '));
    console.log('');

    for (const pastNum of pastNumbers) {
      const { data: pastBuyer, error: pastError } = await supabase
        .from('buyers')
        .select('buyer_number, property_number, reception_date, name')
        .eq('buyer_number', pastNum)
        .maybeSingle();

      if (pastError) {
        console.error(`  ❌ Error fetching past buyer ${pastNum}:`, pastError);
      } else if (pastBuyer) {
        console.log(`  ✅ 買主番号 ${pastNum} が見つかりました:`);
        console.log('     氏名:', pastBuyer.name);
        console.log('     物件番号:', pastBuyer.property_number);
        console.log('     受付日:', pastBuyer.reception_date);

        // Add past property numbers
        if (pastBuyer.property_number) {
          const pastPropNums = pastBuyer.property_number.split(',').map((n: string) => n.trim()).filter((n: string) => n);
          propertyNumbers.push(...pastPropNums);
        }
      } else {
        console.log(`  ⚠️  買主番号 ${pastNum} は見つかりませんでした`);
      }
      console.log('');
    }
  } else {
    console.log('ℹ️  過去の買主番号はありません\n');
  }

  // Get unique property numbers
  const uniquePropertyNumbers = [...new Set(propertyNumbers)];
  console.log('📦 全ての物件番号（重複除去）:', uniquePropertyNumbers.join(', '));
  console.log('');

  if (uniquePropertyNumbers.length === 0) {
    console.log('⚠️  物件番号が見つかりませんでした');
    return;
  }

  // Fetch property listings
  console.log('🏠 物件情報を取得中...\n');
  const { data: properties, error: propError } = await supabase
    .from('property_listings')
    .select('id, property_number, address, distribution_date')
    .in('property_number', uniquePropertyNumbers);

  if (propError) {
    console.error('❌ Error fetching properties:', propError);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('⚠️  物件が見つかりませんでした');
    console.log('   物件番号:', uniquePropertyNumbers.join(', '));
    return;
  }

  console.log(`✅ ${properties.length}件の物件が見つかりました:\n`);
  properties.forEach((prop, index) => {
    console.log(`  ${index + 1}. 物件番号: ${prop.property_number}`);
    console.log(`     住所: ${prop.address || '(なし)'}`);
    console.log(`     配信日: ${prop.distribution_date || '(なし)'}`);
    console.log('');
  });

  console.log('✅ 確認完了');
}

checkBuyer6647InquiryHistory().catch(console.error);
