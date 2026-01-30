/**
 * 2025年の次電日を持つ「追客中」の売主を確認
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';

async function check2025NextCallDatesActive() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('環境変数が設定されていません');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== 2025年の次電日を持つ「追客中」の売主 ===\n');
  
  // 2025年の次電日を持つ「追客中」の売主を取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('seller_number, next_call_date, status')
    .gte('next_call_date', '2025-01-01')
    .lt('next_call_date', '2026-01-01')
    .like('status', '%追客中%')
    .is('deleted_at', null)
    .order('next_call_date', { ascending: true });
  
  if (error) {
    console.error('エラー:', error.message);
    return;
  }
  
  console.log(`📊 2025年の次電日を持つ「追客中」の売主: ${sellers?.length || 0}件\n`);
  
  if (sellers && sellers.length > 0) {
    // 月別に集計
    const byMonth: Record<string, number> = {};
    for (const seller of sellers) {
      const month = seller.next_call_date?.substring(0, 7) || 'unknown';
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
    
    console.log('=== 月別集計 ===');
    for (const [month, count] of Object.entries(byMonth).sort()) {
      console.log(`${month}: ${count}件`);
    }
    
    console.log('\n=== 全件リスト ===');
    for (const seller of sellers) {
      console.log(`${seller.seller_number}: ${seller.next_call_date}`);
    }
  }
}

check2025NextCallDatesActive().catch(console.error);
