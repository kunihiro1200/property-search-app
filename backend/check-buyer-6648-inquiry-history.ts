import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuyer6648InquiryHistory() {
  console.log('=== 買主6648の問合せ履歴データ確認 ===\n');

  // 1. 買主6648の基本情報を取得
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648')
    .single();

  if (buyerError) {
    console.error('買主6648の取得エラー:', buyerError);
    return;
  }

  if (!buyer) {
    console.log('買主6648が見つかりません');
    return;
  }

  console.log('買主6648の基本情報:');
  console.log('- ID:', buyer.id);
  console.log('- 買主番号:', buyer.buyer_number);
  console.log('- 氏名:', buyer.name);
  console.log('- 物件番号:', buyer.property_number);
  console.log('- 過去の買主リスト:', buyer.past_buyer_list);
  console.log('- 受付日:', buyer.reception_date);
  console.log('- 住居表示:', buyer.display_address);
  console.log('- 価格:', buyer.price);
  console.log('');

  // 2. property_numberが存在する場合、物件情報を取得
  if (buyer.property_number) {
    const propertyNumbers = buyer.property_number
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n);

    console.log(`物件番号リスト (${propertyNumbers.length}件):`, propertyNumbers);
    console.log('');

    for (const propNum of propertyNumbers) {
      const { data: property, error: propError } = await supabase
        .from('property_listings')
        .select('*')
        .eq('property_number', propNum)
        .single();

      if (propError) {
        console.log(`物件 ${propNum} の取得エラー:`, propError.message);
      } else if (property) {
        console.log(`物件 ${propNum} の情報:`);
        console.log('- ID:', property.id);
        console.log('- 住所:', property.address);
        console.log('- 住居表示:', property.display_address);
        console.log('- 価格:', property.sales_price);
        console.log('- ステータス:', property.status);
      } else {
        console.log(`物件 ${propNum} が見つかりません`);
      }
      console.log('');
    }
  } else {
    console.log('物件番号が設定されていません');
    console.log('');
  }

  // 3. 過去の買主番号がある場合、それらの情報を取得
  if (buyer.past_buyer_list) {
    const pastBuyerNumbers = buyer.past_buyer_list
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n);

    console.log(`過去の買主番号リスト (${pastBuyerNumbers.length}件):`, pastBuyerNumbers);
    console.log('');

    for (const pastBuyerNum of pastBuyerNumbers) {
      const { data: pastBuyer, error: pastBuyerError } = await supabase
        .from('buyers')
        .select('buyer_number, property_number, reception_date, name')
        .eq('buyer_number', pastBuyerNum)
        .single();

      if (pastBuyerError) {
        console.log(`過去の買主 ${pastBuyerNum} の取得エラー:`, pastBuyerError.message);
      } else if (pastBuyer) {
        console.log(`過去の買主 ${pastBuyerNum} の情報:`);
        console.log('- 氏名:', pastBuyer.name);
        console.log('- 物件番号:', pastBuyer.property_number);
        console.log('- 受付日:', pastBuyer.reception_date);

        // 過去の買主の物件情報も取得
        if (pastBuyer.property_number) {
          const pastPropertyNumbers = pastBuyer.property_number
            .split(',')
            .map((n: string) => n.trim())
            .filter((n: string) => n);

          for (const propNum of pastPropertyNumbers) {
            const { data: property, error: propError } = await supabase
              .from('property_listings')
              .select('id, property_number, address, display_address')
              .eq('property_number', propNum)
              .single();

            if (!propError && property) {
              console.log(`  - 物件 ${propNum}: ${property.address || property.display_address || '住所なし'}`);
            }
          }
        }
      } else {
        console.log(`過去の買主 ${pastBuyerNum} が見つかりません`);
      }
      console.log('');
    }
  } else {
    console.log('過去の買主番号が設定されていません');
    console.log('');
  }

  // 4. APIエンドポイントの動作をシミュレート
  console.log('=== APIエンドポイントのシミュレーション ===\n');
  
  // 問合せ履歴を構築
  const allPropertyNumbers: string[] = [];
  const propertyToBuyerMap = new Map<string, { 
    buyerNumber: string; 
    status: 'current' | 'past';
    inquiryDate: string;
  }>();

  // 現在の買主の物件番号
  if (buyer.property_number) {
    const currentPropertyNumbers = buyer.property_number
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n);
    
    currentPropertyNumbers.forEach((propNum: string) => {
      allPropertyNumbers.push(propNum);
      propertyToBuyerMap.set(propNum, {
        buyerNumber: buyer.buyer_number,
        status: 'current',
        inquiryDate: buyer.reception_date || ''
      });
    });
  }

  // 過去の買主の物件番号
  if (buyer.past_buyer_list) {
    const pastBuyerNumbers = buyer.past_buyer_list
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n);

    for (const pastBuyerNum of pastBuyerNumbers) {
      const { data: pastBuyer } = await supabase
        .from('buyers')
        .select('buyer_number, property_number, reception_date')
        .eq('buyer_number', pastBuyerNum)
        .single();

      if (pastBuyer && pastBuyer.property_number) {
        const pastPropertyNumbers = pastBuyer.property_number
          .split(',')
          .map((n: string) => n.trim())
          .filter((n: string) => n);
        
        pastPropertyNumbers.forEach((propNum: string) => {
          allPropertyNumbers.push(propNum);
          propertyToBuyerMap.set(propNum, {
            buyerNumber: pastBuyer.buyer_number,
            status: 'past',
            inquiryDate: pastBuyer.reception_date || ''
          });
        });
      }
    }
  }

  const uniquePropertyNumbers = Array.from(new Set(allPropertyNumbers));
  console.log(`ユニークな物件番号 (${uniquePropertyNumbers.length}件):`, uniquePropertyNumbers);
  console.log('');

  if (uniquePropertyNumbers.length === 0) {
    console.log('問合せ履歴に表示する物件がありません');
    return;
  }

  // 物件情報を取得
  const { data: properties, error: propertiesError } = await supabase
    .from('property_listings')
    .select('id, property_number, address, display_address')
    .in('property_number', uniquePropertyNumbers);

  if (propertiesError) {
    console.error('物件情報の取得エラー:', propertiesError);
    return;
  }

  console.log(`取得された物件情報 (${properties?.length || 0}件):`);
  if (properties) {
    properties.forEach(prop => {
      const buyerInfo = propertyToBuyerMap.get(prop.property_number);
      console.log(`- ${prop.property_number}: ${prop.address || prop.display_address || '住所なし'}`);
      console.log(`  買主番号: ${buyerInfo?.buyerNumber}, ステータス: ${buyerInfo?.status}, 問合せ日: ${buyerInfo?.inquiryDate || 'なし'}`);
    });
  }
  console.log('');

  // 5. 見つからない物件番号を特定
  const foundPropertyNumbers = new Set(properties?.map(p => p.property_number) || []);
  const missingPropertyNumbers = uniquePropertyNumbers.filter(pn => !foundPropertyNumbers.has(pn));
  
  if (missingPropertyNumbers.length > 0) {
    console.log(`⚠️ property_listingsテーブルに見つからない物件番号 (${missingPropertyNumbers.length}件):`);
    missingPropertyNumbers.forEach(pn => console.log(`- ${pn}`));
    console.log('');
  }
}

checkBuyer6648InquiryHistory()
  .then(() => {
    console.log('確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
