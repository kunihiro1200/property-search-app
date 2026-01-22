import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA6381Buyers() {
  console.log('=== AA6381の買主データを確認 ===\n');

  // 1. buyersテーブルでAA6381を検索
  const { data: buyers, error: error1 } = await supabase
    .from('buyers')
    .select('*')
    .ilike('property_number', '%AA6381%');

  if (error1) {
    console.error('Error:', error1);
    return;
  }

  console.log(`buyersテーブルでAA6381を含む買主: ${buyers?.length || 0}件`);
  
  if (buyers && buyers.length > 0) {
    console.log('\n買主リスト:');
    buyers.forEach(b => {
      console.log(`  ID: ${b.id}`);
      console.log(`  買主番号: ${b.buyer_number}`);
      console.log(`  氏名: ${b.name}`);
      console.log(`  物件番号: ${b.property_number}`);
      console.log(`  確度: ${b.inquiry_confidence}`);
      console.log(`  ステータス: ${b.latest_status}`);
      console.log('  ---');
    });
  }

  // 2. property_listingsテーブルでAA6381を検索
  const { data: property, error: error2 } = await supabase
    .from('property_listings')
    .select('property_number, address, sales_assignee')
    .eq('property_number', 'AA6381')
    .single();

  if (error2) {
    console.log('\nAA6381が見つかりません:', error2.message);
  } else {
    console.log('\n物件情報:');
    console.log(`  物件番号: ${property.property_number}`);
    console.log(`  住所: ${property.address}`);
    console.log(`  担当: ${property.sales_assignee}`);
  }

  // 3. APIエンドポイントをシミュレート
  console.log('\n=== APIエンドポイントのシミュレーション ===');
  console.log(`GET /api/property-listings/AA6381/buyers`);
  
  const { data: apiBuyers, error: error3 } = await supabase
    .from('buyers')
    .select('id, buyer_number, name, phone_number, email, latest_status, inquiry_confidence, reception_date, latest_viewing_date, next_call_date')
    .ilike('property_number', '%AA6381%')
    .order('reception_date', { ascending: false });

  if (error3) {
    console.error('Error:', error3);
    return;
  }

  console.log(`結果: ${apiBuyers?.length || 0}件`);
  
  if (apiBuyers && apiBuyers.length > 0) {
    console.log('\nAPI結果:');
    apiBuyers.forEach(b => {
      console.log(`  ${b.buyer_number} - ${b.name} (確度: ${b.inquiry_confidence})`);
    });
  }

  // 4. 他の物件番号パターンも確認
  console.log('\n=== 他の物件番号パターンを確認 ===');
  const patterns = ['AA6381', 'AA 6381', 'AA-6381', 'aa6381'];
  
  for (const pattern of patterns) {
    const { data, error } = await supabase
      .from('buyers')
      .select('buyer_number, property_number')
      .ilike('property_number', `%${pattern}%`);
    
    if (!error && data && data.length > 0) {
      console.log(`\nパターン "${pattern}": ${data.length}件`);
      data.slice(0, 3).forEach(b => {
        console.log(`  ${b.buyer_number} - property_number: "${b.property_number}"`);
      });
    }
  }
}

checkAA6381Buyers().then(() => {
  console.log('\n完了');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
