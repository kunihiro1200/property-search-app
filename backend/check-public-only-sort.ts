// 公開中のみ表示した場合のソート順を確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: __dirname + '/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function check() {
  console.log('=== 公開中のみ表示した場合の上位10件 ===\n');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, distribution_date, atbb_status, address')
    .not('atbb_status', 'is', null)
    .ilike('atbb_status', '%公開中%')
    .order('distribution_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('エラー:', error.message);
    return;
  }
  
  data?.forEach((row, i) => {
    console.log(`${i+1}. ${row.property_number}`);
    console.log(`   配信日: ${row.distribution_date || '(null)'}`);
    console.log(`   ステータス: ${row.atbb_status}`);
    console.log(`   住所: ${row.address || '(空)'}`);
    console.log('');
  });
  
  // 配信日がある公開中物件の数
  const { count: withDateCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('atbb_status', 'is', null)
    .ilike('atbb_status', '%公開中%')
    .not('distribution_date', 'is', null);
  
  // 配信日がない公開中物件の数
  const { count: withoutDateCount } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('atbb_status', 'is', null)
    .ilike('atbb_status', '%公開中%')
    .is('distribution_date', null);
  
  console.log(`配信日がある公開中物件: ${withDateCount}件`);
  console.log(`配信日がない公開中物件: ${withoutDateCount}件`);
}

check();
