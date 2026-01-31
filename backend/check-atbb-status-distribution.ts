/**
 * atbb_statusの分布を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAtbbStatusDistribution() {
  console.log('📊 atbb_statusの分布を確認中...\n');
  
  // 全物件のatbb_statusを取得
  const { data, error, count } = await supabase
    .from('property_listings')
    .select('atbb_status', { count: 'exact' });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📋 総物件数: ${count}件\n`);
  
  // atbb_statusの分布を集計
  const statusCounts: Record<string, number> = {};
  data?.forEach(row => {
    const status = row.atbb_status || '(null/empty)';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  console.log('📊 atbb_status分布:');
  Object.entries(statusCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .forEach(([status, count]) => {
      // バッジタイプを判定
      let badgeType = 'sold';
      if (status === '(null/empty)') {
        badgeType = 'sold (null)';
      } else if (status.includes('公開中')) {
        badgeType = 'none (公開中)';
      } else if (status.includes('公開前')) {
        badgeType = 'pre_release';
      } else if (status.includes('非公開') && status.includes('配信メール')) {
        badgeType = 'email_only';
      }
      
      console.log(`  ${status}: ${count}件 → バッジ: ${badgeType}`);
    });
  
  // 「公開中」を含む物件の数
  const publicCount = data?.filter(row => row.atbb_status?.includes('公開中')).length || 0;
  const soldCount = (count || 0) - publicCount;
  
  console.log('\n📈 サマリー:');
  console.log(`  公開中（バッジなし）: ${publicCount}件`);
  console.log(`  成約済みバッジ表示: ${soldCount}件`);
  console.log(`  成約済みバッジ率: ${((soldCount / (count || 1)) * 100).toFixed(1)}%`);
}

checkAtbbStatusDistribution();
