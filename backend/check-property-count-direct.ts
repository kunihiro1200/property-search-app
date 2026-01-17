/**
 * 物件数を直接確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkPropertyCount() {
  console.log('=== 物件数直接確認 ===\n');

  // 物件の総数
  const { count: totalCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });
  
  console.log(`物件総数: ${totalCount}`);

  // 売主の総数
  const { count: sellerCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });
  
  console.log(`売主総数: ${sellerCount}`);

  // 有効な売主IDを持つ物件数
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id');
  
  const sellerIds = sellers?.map(s => s.id) || [];
  
  const { data: validProperties } = await supabase
    .from('properties')
    .select('id')
    .in('seller_id', sellerIds);
  
  console.log(`有効な売主IDを持つ物件数: ${validProperties?.length}`);

  // 物件を持つ売主数
  const { data: properties } = await supabase
    .from('properties')
    .select('seller_id');
  
  const uniqueSellerIds = new Set(properties?.map(p => p.seller_id) || []);
  const sellersWithProperty = sellerIds.filter(id => uniqueSellerIds.has(id));
  
  console.log(`物件を持つ売主数: ${sellersWithProperty.length}`);
  console.log(`物件なし売主数: ${sellerIds.length - sellersWithProperty.length}`);

  // サンプル: 物件なし売主の最初の5件
  const sellersWithoutProperty = sellerIds.filter(id => !uniqueSellerIds.has(id));
  
  if (sellersWithoutProperty.length > 0) {
    console.log('\n物件なし売主サンプル:');
    const { data: sampleSellers } = await supabase
      .from('sellers')
      .select('seller_number')
      .in('id', sellersWithoutProperty.slice(0, 5));
    
    sampleSellers?.forEach(s => console.log(`  - ${s.seller_number}`));
  }
}

checkPropertyCount().catch(console.error);
