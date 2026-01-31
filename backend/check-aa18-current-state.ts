import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA18CurrentState() {
  console.log('\n=== AA18 の現在の状態を確認 ===\n');
  
  // AA18のデータを取得
  const { data: aa18, error: aa18Error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA18')
    .single();
  
  if (aa18Error) {
    console.log(`❌ AA18 エラー: ${aa18Error.message}`);
    return;
  }
  
  console.log('AA18 のデータ:');
  console.log(`  - id: ${aa18.id}`);
  console.log(`  - property_number: ${aa18.property_number}`);
  console.log(`  - address: "${aa18.address || '(空)'}"`);
  console.log(`  - distribution_date: ${aa18.distribution_date || '(null)'}`);
  console.log(`  - created_at: ${aa18.created_at}`);
  console.log(`  - updated_at: ${aa18.updated_at}`);
  console.log(`  - atbb_status: ${aa18.atbb_status}`);
  console.log(`  - property_type: ${aa18.property_type}`);
  console.log(`  - price: ${aa18.price}`);
  console.log(`  - sales_price: ${aa18.sales_price}`);
  console.log(`  - listing_price: ${aa18.listing_price}`);
  
  // 配信日でソートした上位10件を取得
  console.log('\n=== 配信日でソートした上位10件 ===\n');
  
  const { data: topProperties, error: topError } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_date, created_at, atbb_status')
    .order('distribution_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (topError) {
    console.log(`❌ エラー: ${topError.message}`);
    return;
  }
  
  topProperties?.forEach((prop, index) => {
    console.log(`${index + 1}. ${prop.property_number}`);
    console.log(`   配信日: ${prop.distribution_date || '(null)'}`);
    console.log(`   住所: ${prop.address ? prop.address.substring(0, 30) + '...' : '(空)'}`);
    console.log(`   ステータス: ${prop.atbb_status}`);
    console.log('');
  });
  
  // 配信日がnullの物件数を確認
  const { count: nullCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .is('distribution_date', null);
  
  console.log(`\n配信日がnullの物件数: ${nullCount}`);
}

checkAA18CurrentState().catch(console.error);
