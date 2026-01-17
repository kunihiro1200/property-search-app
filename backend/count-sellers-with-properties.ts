import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function countSellersWithProperties() {
  console.log('=== 売主と物件情報の統計 ===\n');
  
  // 全売主数
  const { count: totalSellers } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });
  
  console.log('全売主数:', totalSellers);
  
  // 全物件数
  const { count: totalProperties } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });
  
  console.log('全物件数:', totalProperties);
  
  // 物件情報がある売主のサンプルを取得
  const { data: sellersWithProperties } = await supabase
    .from('sellers')
    .select(`
      id,
      seller_number,
      site,
      status,
      properties (
        id,
        address,
        property_type
      )
    `)
    .not('properties.id', 'is', null)
    .limit(5);
  
  console.log('\n物件情報がある売主のサンプル:');
  for (const seller of sellersWithProperties || []) {
    const property = Array.isArray(seller.properties) ? seller.properties[0] : seller.properties;
    console.log(`- ${seller.seller_number}: ${property?.address || '住所なし'}`);
  }
  
  process.exit(0);
}

countSellersWithProperties();
