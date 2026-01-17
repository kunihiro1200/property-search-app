// 常行の物件の配信エリアを修正
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from './src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixTsuneyukiAreas() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== 常行の物件の配信エリアを修正 ===\n');

  // 全ての物件を取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .order('property_number', { ascending: false })
    .limit(500);

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  const tsuneyukiProperties: any[] = [];

  for (const property of properties || []) {
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

  // 正しい配信エリア: ④と㊵
  const correctAreas = ['④', '㊵'];
  
  let fixedCount = 0;

  for (const prop of tsuneyukiProperties) {
    // distribution_areasが配列でない場合は配列に変換
    let areas = prop.distribution_areas || [];
    if (typeof areas === 'string') {
      try {
        areas = JSON.parse(areas);
      } catch {
        areas = [];
      }
    }
    if (!Array.isArray(areas)) {
      areas = [];
    }
    
    const hasArea4 = areas.includes('④');
    const hasArea35 = areas.includes('㊵');
    
    if (!hasArea4 || !hasArea35) {
      console.log(`物件番号: ${prop.property_number}`);
      console.log(`  住所: ${prop.address}`);
      console.log(`  現在の配信エリア: ${areas.length > 0 ? areas.join(', ') : '未設定'}`);
      console.log(`  → 修正中...`);
      
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({
          distribution_areas: correctAreas
        })
        .eq('property_number', prop.property_number);

      if (updateError) {
        console.log(`  ✗ エラー: ${updateError.message}`);
      } else {
        console.log(`  ✓ 配信エリアを④, ㊵に修正しました`);
        fixedCount++;
      }
      console.log('');
    }
  }

  console.log(`\n完了！ ${fixedCount}件の物件を修正しました。`);
}

fixTsuneyukiAreas().catch(console.error);
