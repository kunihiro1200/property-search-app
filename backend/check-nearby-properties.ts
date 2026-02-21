import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkProperties() {
  // AA278の全カラムを取得
  const { data: aa278, error: error278 } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA278')
    .single();

  if (error278) {
    console.error('AA278取得エラー:', error278);
    return;
  }

  console.log('=== AA278の価格関連カラム ===');
  console.log('sales_price:', aa278.sales_price);
  console.log('price:', aa278.price);
  console.log('listing_price:', aa278.listing_price);
  console.log('total_commission:', aa278.total_commission);

  // AA13249も確認
  const { data: aa13249, error: error13249 } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13249')
    .single();

  if (error13249) {
    console.error('AA13249取得エラー:', error13249);
    return;
  }

  console.log('\n=== AA13249の価格関連カラム ===');
  console.log('sales_price:', aa13249.sales_price);
  console.log('price:', aa13249.price);
  console.log('listing_price:', aa13249.listing_price);
  console.log('total_commission:', aa13249.total_commission);
}

checkProperties().catch(console.error);
