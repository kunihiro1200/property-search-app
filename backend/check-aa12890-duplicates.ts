import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  console.log('=== AA12890の重複物件を詳細確認 ===\n');

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, seller_number')
    .eq('seller_number', 'AA12890')
    .single();

  if (!seller) {
    console.log('❌ 売主が見つかりません');
    return;
  }

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: true });

  if (!properties || properties.length === 0) {
    console.log('❌ 物件が見つかりません');
    return;
  }

  console.log(`物件数: ${properties.length}件\n`);

  properties.forEach((prop: any, index: number) => {
    console.log(`--- 物件 ${index + 1} ---`);
    console.log(`ID: ${prop.id}`);
    console.log(`作成日時: ${prop.created_at}`);
    console.log(`更新日時: ${prop.updated_at}`);
    console.log(`住所: ${prop.address || '(空)'}`);
    console.log(`土地面積: ${prop.land_area || '(空)'}`);
    console.log(`建物面積: ${prop.building_area || '(空)'}`);
    console.log(`物件種別: ${prop.property_type || '(空)'}`);
    console.log();
  });

  console.log('=== 分析 ===');
  
  // 住所でグループ化
  const addressGroups = new Map<string, any[]>();
  properties.forEach((prop: any) => {
    const addr = prop.address || '(空)';
    if (!addressGroups.has(addr)) {
      addressGroups.set(addr, []);
    }
    addressGroups.get(addr)!.push(prop);
  });

  console.log(`異なる住所の数: ${addressGroups.size}`);
  addressGroups.forEach((props, addr) => {
    if (props.length > 1) {
      console.log(`  "${addr}": ${props.length}件の重複`);
    }
  });

  console.log('\n=== 推奨アクション ===');
  
  // 最も良いデータを持つ物件を特定
  const bestProperty = properties.reduce((best: any, current: any) => {
    // データの完全性をスコア化
    const currentScore = 
      (current.address && current.address !== '大分県大分市大字皆春488-1' ? 2 : 0) +
      (current.land_area ? 1 : 0) +
      (current.building_area ? 1 : 0) +
      (current.property_type ? 1 : 0);
    
    const bestScore = 
      (best.address && best.address !== '大分県大分市大字皆春488-1' ? 2 : 0) +
      (best.land_area ? 1 : 0) +
      (best.building_area ? 1 : 0) +
      (best.property_type ? 1 : 0);
    
    return currentScore > bestScore ? current : best;
  });

  console.log(`保持すべき物件: ${bestProperty.id}`);
  console.log(`  住所: ${bestProperty.address}`);
  console.log(`  土地面積: ${bestProperty.land_area}`);
  console.log(`  作成日時: ${bestProperty.created_at}`);
  
  const toDelete = properties.filter((p: any) => p.id !== bestProperty.id);
  console.log(`\n削除すべき物件: ${toDelete.length}件`);
  toDelete.forEach((p: any) => {
    console.log(`  - ${p.id} (${p.address || '住所なし'})`);
  });
}

checkDuplicates()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
