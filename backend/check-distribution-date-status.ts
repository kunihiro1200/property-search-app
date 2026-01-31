/**
 * 配信日（distribution_date）の現在の状況を確認するスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDistributionDateStatus() {
  console.log('📊 配信日（distribution_date）の状況を確認します...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 全体の件数
    const { count: totalCount } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 全物件数: ${totalCount} 件\n`);

    // 配信日がNULLの件数
    const { count: nullCount } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .is('distribution_date', null);

    console.log(`📊 配信日がNULL: ${nullCount} 件`);

    // 配信日がある件数
    const { count: hasDateCount } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .not('distribution_date', 'is', null);

    console.log(`📊 配信日がある: ${hasDateCount} 件\n`);

    // 年別の内訳
    console.log('📊 年別の内訳:');

    // 2026年
    const { count: count2026 } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .gte('distribution_date', '2026-01-01')
      .lt('distribution_date', '2027-01-01');

    console.log(`   2026年: ${count2026} 件`);

    // 2025年
    const { count: count2025 } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .gte('distribution_date', '2025-01-01')
      .lt('distribution_date', '2026-01-01');

    console.log(`   2025年: ${count2025} 件`);

    // 2024年
    const { count: count2024 } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .gte('distribution_date', '2024-01-01')
      .lt('distribution_date', '2025-01-01');

    console.log(`   2024年: ${count2024} 件`);

    // 2023年以前
    const { count: countOlder } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .lt('distribution_date', '2024-01-01');

    console.log(`   2023年以前: ${countOlder} 件\n`);

    // 公開中の物件で配信日がある/ないの内訳
    console.log('📊 公開中の物件（atbb_status = "公開中"）:');

    const { count: publicTotal } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .eq('atbb_status', '公開中');

    console.log(`   全体: ${publicTotal} 件`);

    const { count: publicWithDate } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .eq('atbb_status', '公開中')
      .not('distribution_date', 'is', null);

    console.log(`   配信日あり: ${publicWithDate} 件`);

    const { count: publicWithoutDate } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .eq('atbb_status', '公開中')
      .is('distribution_date', null);

    console.log(`   配信日なし: ${publicWithoutDate} 件\n`);

    // 最新の配信日を持つ物件TOP10
    console.log('📊 最新の配信日を持つ物件TOP10:');

    const { data: latestProperties } = await supabase
      .from('property_listings')
      .select('property_number, distribution_date, atbb_status')
      .not('distribution_date', 'is', null)
      .order('distribution_date', { ascending: false })
      .limit(10);

    if (latestProperties) {
      latestProperties.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.property_number}: ${p.distribution_date} (${p.atbb_status || 'N/A'})`);
      });
    }

    console.log('\n✅ 確認完了');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkDistributionDateStatus().catch(console.error);
