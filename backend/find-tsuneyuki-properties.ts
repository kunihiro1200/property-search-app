// 常行の物件を検索
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from './src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '.env') });

async function findTsuneyukiProperties() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== 常行の物件を検索 ===\n');

  // 全ての物件を取得
  const { data: sellers, error } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .order('property_number', { ascending: false })
    .limit(500);

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  console.log(`${sellers?.length || 0}件の物件を検索中...\n`);

  const tsuneyukiProperties: any[] = [];

  for (const property of sellers || []) {
    let address = property.address;
    if (address) {
      try {
        address = decrypt(address);
        if (address && address.includes('常行')) {
          tsuneyukiProperties.push({
            property_number: property.property_number,
            address: address,
            distribution_areas: property.distribution_areas
          });
        }
      } catch (e) {
        // 復号化失敗は無視
      }
    }
  }

  console.log(`常行の物件: ${tsuneyukiProperties.length}件\n`);

  tsuneyukiProperties.forEach(prop => {
    console.log(`物件番号: ${prop.property_number}`);
    console.log(`  住所: ${prop.address}`);
    console.log(`  配信エリア: ${prop.distribution_areas || '未設定'}`);
    
    const areas = prop.distribution_areas || [];
    const hasArea4 = areas.includes('④');
    const hasArea35 = areas.includes('㊵');
    
    if (!hasArea4 || !hasArea35) {
      console.log(`  ⚠️ 配信エリアが不正確（④と㊵が必要）`);
    } else {
      console.log(`  ✓ 配信エリア正常`);
    }
    console.log('');
  });
}

findTsuneyukiProperties().catch(console.error);
