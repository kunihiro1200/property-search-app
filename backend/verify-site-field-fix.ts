/**
 * サイトフィールド修正の最終検証スクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifySiteFieldFix() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 サイトフィールド修正の検証\n');
  console.log('='.repeat(80));

  // 1. site が null のレコード数を確認
  const { count: nullSiteCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('site', null);

  console.log(`\n📊 site が null の売主: ${nullSiteCount}件`);

  // 2. site が設定されているレコード数を確認
  const { count: withSiteCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('site', 'is', null);

  console.log(`📊 site が設定されている売主: ${withSiteCount}件`);

  // 3. 最新10件のサイト情報を確認
  const { data: latestSellers } = await supabase
    .from('sellers')
    .select('seller_number, site, created_at')
    .order('seller_number', { ascending: false })
    .limit(10);

  console.log('\n📋 最新10件の売主のサイト情報:');
  console.log('-'.repeat(80));
  latestSellers?.forEach((seller) => {
    const siteDisplay = seller.site || '❌ null';
    const status = seller.site ? '✅' : '⚠️';
    console.log(`${status} ${seller.seller_number}: ${siteDisplay}`);
  });

  // 4. サイト別の集計
  const { data: siteCounts } = await supabase
    .from('sellers')
    .select('site')
    .not('site', 'is', null);

  if (siteCounts) {
    const siteMap = new Map<string, number>();
    siteCounts.forEach((row) => {
      const count = siteMap.get(row.site) || 0;
      siteMap.set(row.site, count + 1);
    });

    console.log('\n📊 サイト別の集計:');
    console.log('-'.repeat(80));
    Array.from(siteMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([site, count]) => {
        console.log(`  ${site}: ${count}件`);
      });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ 検証完了');
  
  if (nullSiteCount === 0 || (nullSiteCount && nullSiteCount < 30)) {
    console.log('✅ サイトフィールドは正常に同期されています');
  } else {
    console.log(`⚠️ ${nullSiteCount}件の売主でサイトが未設定です`);
  }
}

verifySiteFieldFix().catch(console.error);
