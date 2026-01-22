import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSyncProgress() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 同期進行状況を確認中...\n');

  // Check sellers with site info
  const { data: sellersWithSite, error: siteError } = await supabase
    .from('sellers')
    .select('id')
    .not('inquiry_site', 'is', null)
    .limit(10);

  if (siteError) {
    console.error('❌ エラー:', siteError);
    return;
  }

  console.log(`✅ サイト情報あり: ${sellersWithSite?.length || 0}件（サンプル）`);

  // Check total properties
  const { count: propertyCount, error: propError } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  if (propError) {
    console.error('❌ エラー:', propError);
    return;
  }

  console.log(`✅ 物件情報: ${propertyCount || 0}件`);

  // Check sellers with status
  const { count: statusCount, error: statusError } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('status', 'is', null);

  if (statusError) {
    console.error('❌ エラー:', statusError);
    return;
  }

  console.log(`✅ ステータスあり: ${statusCount || 0}件`);

  // Sample seller with data
  const { data: sampleSeller, error: sampleError } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_site, status')
    .not('inquiry_site', 'is', null)
    .limit(5);

  if (!sampleError && sampleSeller) {
    console.log('\n📋 サンプルデータ:');
    sampleSeller.forEach(s => {
      console.log(`  ${s.seller_number}: サイト=${s.inquiry_site}, ステータス=${s.status}`);
    });
  }
}

checkSyncProgress().catch(console.error);
