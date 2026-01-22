/**
 * 物件数を確認するシンプルなスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPropertyCount() {
  console.log('=== 物件数確認 ===\n');

  // 売主数
  const { count: sellerCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });
  console.log(`売主数: ${sellerCount}`);

  // 物件数
  const { count: propertyCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });
  console.log(`物件数: ${propertyCount}`);

  // 物件がある売主数
  const { data: sellersWithProps } = await supabase
    .from('properties')
    .select('seller_id');
  
  const uniqueSellers = new Set(sellersWithProps?.map(p => p.seller_id) || []);
  console.log(`物件がある売主数: ${uniqueSellers.size}`);

  // 物件がない売主数
  console.log(`物件がない売主数: ${(sellerCount || 0) - uniqueSellers.size}`);

  // 状況（売主）が設定されている物件数
  const { count: withSituation } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('seller_situation', 'is', null);
  console.log(`状況（売主）が設定されている物件数: ${withSituation}`);
}

checkPropertyCount().catch(console.error);
