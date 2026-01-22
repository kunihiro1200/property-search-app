import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkTotalCount() {
  console.log('=== 物件リストの総数を確認 ===\n');

  const { count, error } = await supabase
    .from('property_listings')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`物件リストの総数: ${count}件`);
  
  if (count && count > 2000) {
    console.log('\n⚠️ 警告: 物件数が2000件を超えています！');
    console.log('フロントエンドで limit: 2000 を指定しているため、すべてのデータが取得されていない可能性があります。');
  }
}

checkTotalCount().then(() => {
  console.log('\n完了');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
