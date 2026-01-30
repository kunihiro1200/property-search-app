import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // 2024年以前の次電日を持つ売主を確認
  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, next_call_date, status')
    .lt('next_call_date', '2025-01-01')
    .not('next_call_date', 'is', null)
    .order('next_call_date', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('=== 2024年以前の次電日を持つ売主 ===');
  console.log('件数:', data.length);
  
  // 年ごとの内訳
  const byYear: Record<string, number> = {};
  data.forEach(s => {
    const year = s.next_call_date.substring(0, 4);
    byYear[year] = (byYear[year] || 0) + 1;
  });
  console.log('\n年ごとの内訳:');
  Object.entries(byYear).sort().forEach(([year, count]) => {
    console.log(`  ${year}年: ${count}件`);
  });
  
  // サンプル表示
  console.log('\nサンプル（最新10件）:');
  data.slice(0, 10).forEach(s => {
    console.log(`  ${s.seller_number}: ${s.next_call_date} (status: ${s.status || 'null'})`);
  });
}

check();
