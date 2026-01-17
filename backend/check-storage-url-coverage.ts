import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorageUrlCoverage() {
  console.log('=== storage_url設定状況チェック ===\n');

  // 全物件数を取得
  const { count: totalCount } = await supabase
    .from('work_tasks')
    .select('*', { count: 'exact', head: true });

  console.log(`work_tasksテーブルの総レコード数: ${totalCount}\n`);

  // storage_urlが設定されている物件数
  const { count: withUrlCount } = await supabase
    .from('work_tasks')
    .select('*', { count: 'exact', head: true })
    .not('storage_url', 'is', null);

  console.log(`storage_url設定済み: ${withUrlCount}件`);
  console.log(`storage_url未設定: ${(totalCount || 0) - (withUrlCount || 0)}件`);
  console.log(`設定率: ${((withUrlCount || 0) / (totalCount || 1) * 100).toFixed(1)}%\n`);

  // 設定済みの物件をいくつか表示
  console.log('=== storage_url設定済み物件（最新10件） ===');
  const { data: withUrl } = await supabase
    .from('work_tasks')
    .select('property_number, storage_url, created_at')
    .not('storage_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (withUrl && withUrl.length > 0) {
    withUrl.forEach(wt => {
      console.log(`${wt.property_number}: ${wt.storage_url}`);
    });
  }

  // 未設定の物件をいくつか表示
  console.log('\n=== storage_url未設定物件（最新10件） ===');
  const { data: withoutUrl } = await supabase
    .from('work_tasks')
    .select('property_number, created_at')
    .is('storage_url', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (withoutUrl && withoutUrl.length > 0) {
    withoutUrl.forEach(wt => {
      console.log(`${wt.property_number}: 未設定`);
    });
  }

  console.log('\n=== 推奨アクション ===');
  if ((withUrlCount || 0) < (totalCount || 0) * 0.5) {
    console.log('⚠️ storage_urlの設定率が50%未満です');
    console.log('推奨: 一括設定スクリプトの作成を検討してください');
  } else if ((withUrlCount || 0) < (totalCount || 0) * 0.9) {
    console.log('⚠️ storage_urlの設定率が90%未満です');
    console.log('推奨: 未設定の物件を確認し、順次設定してください');
  } else {
    console.log('✅ storage_urlの設定率は良好です');
  }
}

checkStorageUrlCoverage().catch(console.error);
