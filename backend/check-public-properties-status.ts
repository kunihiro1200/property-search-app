/**
 * 公開物件のステータスを確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('公開物件のステータスを確認中...\n');

  // すべての atbb_status の値を取得
  const { data: statuses, error } = await supabase
    .from('property_listings')
    .select('atbb_status')
    .not('property_number', 'like', 'TEST%');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  // ステータスごとにカウント
  const statusCount: Record<string, number> = {};
  statuses?.forEach(item => {
    const status = item.atbb_status || '(null)';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  console.log('atbb_status の分布:');
  console.log('='.repeat(50));
  Object.entries(statusCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`${status}: ${count}件`);
    });
  console.log('');

  // 各ステータスで favorite_comment の有無を確認
  console.log('各ステータスでの favorite_comment の状況:');
  console.log('='.repeat(50));
  
  for (const [status, count] of Object.entries(statusCount)) {
    const { data: props } = await supabase
      .from('property_listings')
      .select('id, property_number, favorite_comment')
      .eq('atbb_status', status)
      .not('property_number', 'like', 'TEST%')
      .limit(5);

    const withFavorite = props?.filter(p => p.favorite_comment).length || 0;
    const total = props?.length || 0;
    
    console.log(`\n${status} (${count}件):`);
    console.log(`  favorite_comment あり: ${withFavorite}/${total}`);
    
    if (props && props.length > 0) {
      console.log('  サンプル物件:');
      props.slice(0, 3).forEach(p => {
        console.log(`    - ${p.property_number}: ${p.favorite_comment ? '✅' : '❌'}`);
      });
    }
  }
}

check().catch(console.error);
