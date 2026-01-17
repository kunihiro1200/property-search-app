import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyOugiyamaAreaFix() {
  console.log('扇山の物件の配信エリアを確認します...\n');

  // 扇山の物件を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .ilike('address', '%扇山%')
    .order('property_number');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`扇山の物件数: ${properties?.length || 0}\n`);

  if (!properties || properties.length === 0) {
    console.log('扇山の物件が見つかりません');
    return;
  }

  let withArea36 = 0;
  let withoutArea36 = 0;

  properties.forEach(p => {
    const hasArea36 = p.distribution_areas?.includes('㊶');
    if (hasArea36) {
      withArea36++;
      console.log(`✓ ${p.property_number}: ${p.distribution_areas} (㊶を含む)`);
    } else {
      withoutArea36++;
      console.log(`✗ ${p.property_number}: ${p.distribution_areas} (㊶なし)`);
    }
  });

  console.log('\n=== 結果 ===');
  console.log(`㊶を含む物件: ${withArea36}`);
  console.log(`㊶を含まない物件: ${withoutArea36}`);
  console.log(`合計: ${properties.length}`);

  // 買主6432が扇山の物件を受け取れるか確認
  console.log('\n=== 買主6432 (taka844452@icloud.com)の配信テスト ===');
  const { data: buyer } = await supabase
    .from('buyers')
    .select('buyer_number, desired_areas')
    .eq('email', 'taka844452@icloud.com')
    .single();

  if (buyer) {
    console.log(`買主6432の希望エリア: ${buyer.desired_areas}`);
    
    const buyerAreas = buyer.desired_areas?.split('') || [];
    const matchingProperties = properties.filter(p => {
      const propertyAreas = p.distribution_areas?.split('') || [];
      return propertyAreas.some((area: string) => buyerAreas.includes(area));
    });

    console.log(`\n買主6432が受け取れる扇山の物件: ${matchingProperties.length}/${properties.length}`);
    matchingProperties.forEach(p => {
      console.log(`  - ${p.property_number}: ${p.distribution_areas}`);
    });
  } else {
    console.log('買主6432が見つかりません');
  }
}

verifyOugiyamaAreaFix()
  .then(() => {
    console.log('\n確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
