import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyBuyer2064() {
  console.log('=== 買主番号2064の存在確認 ===\n');

  // 買主番号2064を検索
  const { data: buyer2064, error: error2064 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', 2064)
    .single();

  if (error2064) {
    console.log('❌ 買主番号2064は存在しません');
    console.log('エラー:', error2064.message);
  } else {
    console.log('✅ 買主番号2064が見つかりました:');
    console.log(JSON.stringify(buyer2064, null, 2));
  }

  console.log('\n=== kouten0909@icloud.comの全レコード ===\n');

  // メールアドレスで検索
  const { data: allBuyers, error: emailError } = await supabase
    .from('buyers')
    .select('*')
    .eq('email', 'kouten0909@icloud.com')
    .order('buyer_number');

  if (emailError) {
    console.log('エラー:', emailError.message);
  } else {
    console.log(`見つかったレコード数: ${allBuyers?.length || 0}`);
    allBuyers?.forEach((buyer) => {
      console.log(`\n買主番号: ${buyer.buyer_number}`);
      console.log(`名前: ${buyer.name}`);
      console.log(`希望エリア: ${buyer.desired_area || 'なし'}`);
      console.log(`配信タイプ: ${buyer.distribution_type || 'なし'}`);
      console.log(`Pinrich: ${buyer.pinrich || 'なし'}`);
      console.log(`ステータス: ${buyer.status || 'なし'}`);
    });
  }

  console.log('\n=== 物件AA4160の情報 ===\n');

  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA4160')
    .single();

  if (propError) {
    console.log('エラー:', propError.message);
  } else {
    console.log(`物件番号: ${property.property_number}`);
    console.log(`住所: ${property.address}`);
    console.log(`配信エリア: ${property.distribution_areas || 'なし'}`);
    console.log(`物件タイプ: ${property.property_type || 'なし'}`);
  }
}

verifyBuyer2064().catch(console.error);
