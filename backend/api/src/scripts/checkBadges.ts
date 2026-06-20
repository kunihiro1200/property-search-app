import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkBadges() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  console.log('Checking property counts...\n');
  
  // atbb_statusの種類を確認
  const { data: allData, error } = await supabase
    .from('property_listings')
    .select('atbb_status, property_type');
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log('Total properties:', allData?.length);
  
  // atbb_statusの種類
  const statuses = [...new Set(allData?.map(d => d.atbb_status) || [])];
  console.log('\natbb_statusの種類:');
  
  for (const status of statuses) {
    const count = allData?.filter(d => d.atbb_status === status).length || 0;
    console.log(`  ${status || '(null)'}: ${count}件`);
  }
  
  // 成約済み以外の件数（atbb_statusで判定）
  const notSeiyakuCount = allData?.filter(d => 
    d.atbb_status !== '成約済み' && 
    d.atbb_status !== '成約済' &&
    d.atbb_status !== null
  ).length || 0;
  console.log(`\n成約済み以外: ${notSeiyakuCount}件`);
  
  // 公開中の件数
  const koukaiCount = allData?.filter(d => d.atbb_status === '公開中').length || 0;
  console.log(`公開中: ${koukaiCount}件`);
  
  process.exit(0);
}

checkBadges();
