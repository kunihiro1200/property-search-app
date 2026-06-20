/**
 * distribution_dateの同期状態を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDistributionDateStatus() {
  console.log('📊 distribution_dateの同期状態を確認中...\n');
  
  // 1. 全物件数を取得
  const { count: totalCount, error: countError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ エラー:', countError);
    return;
  }
  
  console.log(`📋 全物件数: ${totalCount}`);
  
  // 2. distribution_dateがnullの物件数
  const { count: nullCount, error: nullError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .is('distribution_date', null);
  
  if (nullError) {
    console.error('❌ エラー:', nullError);
    return;
  }
  
  console.log(`❌ distribution_dateがnull: ${nullCount}`);
  
  // 3. distribution_dateが設定されている物件数
  const { count: setCount, error: setError } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true })
    .not('distribution_date', 'is', null);
  
  if (setError) {
    console.error('❌ エラー:', setError);
    return;
  }
  
  console.log(`✅ distribution_dateが設定済み: ${setCount}`);
  
  // 4. distribution_dateが設定されている物件のサンプル
  const { data: samples, error: sampleError } = await supabase
    .from('property_listings')
    .select('property_number, distribution_date, created_at')
    .not('distribution_date', 'is', null)
    .order('distribution_date', { ascending: false })
    .limit(10);
  
  if (sampleError) {
    console.error('❌ エラー:', sampleError);
    return;
  }
  
  console.log('\n📅 distribution_dateが設定されている物件（最新10件）:');
  samples?.forEach(s => {
    console.log(`  - ${s.property_number}: ${s.distribution_date}`);
  });
  
  // 5. 公開中の物件でdistribution_dateがnullの物件
  const { data: publicNullSamples, error: publicNullError } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, created_at')
    .is('distribution_date', null)
    .in('atbb_status', ['公開中', ''])
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (publicNullError) {
    console.error('❌ エラー:', publicNullError);
    return;
  }
  
  console.log('\n⚠️ 公開中でdistribution_dateがnullの物件（最新10件）:');
  publicNullSamples?.forEach(s => {
    console.log(`  - ${s.property_number}: atbb_status=${s.atbb_status}, created_at=${s.created_at}`);
  });
}

checkDistributionDateStatus().catch(console.error);
