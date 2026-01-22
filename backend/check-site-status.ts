import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSiteStatus() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase環境変数が設定されていません');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 サイト情報の状態を確認中...\n');

  // サイト情報が欠けている売主の数
  const { count: withoutSite, error: siteError } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('site', null);

  if (siteError) {
    console.error('❌ エラー:', siteError.message);
    process.exit(1);
  }

  // サイト情報がある売主の数
  const { count: withSite, error: siteError2 } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('site', 'is', null);

  if (siteError2) {
    console.error('❌ エラー:', siteError2.message);
    process.exit(1);
  }

  // 物件情報が欠けている売主の数
  const { data: allSellers, error: allError } = await supabase
    .from('sellers')
    .select('id');

  if (allError) {
    console.error('❌ エラー:', allError.message);
    process.exit(1);
  }

  const { count: withProperty, error: propError } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  if (propError) {
    console.error('❌ エラー:', propError.message);
    process.exit(1);
  }

  const totalSellers = allSellers?.length || 0;
  const withoutProperty = totalSellers - (withProperty || 0);

  console.log('📊 結果:');
  console.log(`   総売主数: ${totalSellers}件`);
  console.log(`   サイト情報あり: ${withSite}件`);
  console.log(`   サイト情報なし: ${withoutSite}件`);
  console.log(`   物件情報あり: ${withProperty}件`);
  console.log(`   物件情報なし: ${withoutProperty}件\n`);

  if (withoutSite === 0 && withoutProperty === 0) {
    console.log('✅ 全てのデータが正常です！');
  } else {
    console.log('⚠️  まだ修正が必要なデータがあります');
  }
}

checkSiteStatus().catch(error => {
  console.error('❌ 実行中にエラーが発生しました:', error);
  process.exit(1);
});
