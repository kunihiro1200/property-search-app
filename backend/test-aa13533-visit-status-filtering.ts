/**
 * AA13533の訪問ステータスフィルタリングテスト（直接データベース接続）
 * 
 * 目的: visitStatusパラメータが正しく機能することを確認
 * 
 * AA13533のデータ:
 * - 営担: U
 * - 訪問日: 2026-02-07（未来 = 訪問予定）
 * - 次電日: 2026-02-02（過去 = 当日TEL）
 * - 状況: 追客中
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Not set');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testVisitStatusFiltering() {
  console.log('🧪 AA13533の訪問ステータスフィルタリングテスト開始\n');
  
  // 今日の日付（JST）
  const todayJST = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const todayDate = new Date(todayJST);
  console.log(`📅 今日の日付（JST）: ${todayDate.toISOString().split('T')[0]}\n`);
  
  // AA13533のデータを確認
  console.log('📋 AA13533のデータを確認');
  const { data: aa13533, error: aa13533Error } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date, next_call_date, status')
    .eq('seller_number', 'AA13533')
    .single();
  
  if (aa13533Error) {
    console.log('❌ ERROR:', aa13533Error.message);
    return;
  }
  
  console.log('✅ AA13533のデータ:');
  console.log(`   - 営担: ${aa13533.visit_assignee}`);
  console.log(`   - 訪問日: ${aa13533.visit_date}`);
  console.log(`   - 次電日: ${aa13533.next_call_date}`);
  console.log(`   - 状況: ${aa13533.status}`);
  console.log('');
  
  // 訪問日が今日以降かどうかを判定
  const visitDate = new Date(aa13533.visit_date);
  const isScheduled = visitDate >= todayDate;
  console.log(`📊 訪問日判定: ${isScheduled ? '訪問予定（今日以降）' : '訪問済み（昨日以前）'}`);
  console.log('');
  
  // テスト1: 訪問予定(U)の当日TEL(U) - AA13533が含まれるべき
  console.log('📋 テスト1: 訪問予定(U)の当日TEL(U) - AA13533が含まれるべき');
  let query1 = supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date, next_call_date, status')
    .eq('visit_assignee', 'U')
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayDate.toISOString().split('T')[0])
    .gte('visit_date', todayDate.toISOString().split('T')[0]);  // 訪問予定
  
  const { data: scheduled, error: scheduledError } = await query1;
  
  if (scheduledError) {
    console.log('❌ ERROR:', scheduledError.message);
  } else {
    const aa13533InScheduled = scheduled.find(s => s.seller_number === 'AA13533');
    if (aa13533InScheduled) {
      console.log('✅ PASS: AA13533が訪問予定(U)の当日TEL(U)に含まれている');
      console.log(`   取得件数: ${scheduled.length}件`);
    } else {
      console.log('❌ FAIL: AA13533が訪問予定(U)の当日TEL(U)に含まれていない');
      console.log(`   取得件数: ${scheduled.length}件`);
      console.log(`   売主番号一覧: ${scheduled.map(s => s.seller_number).join(', ')}`);
    }
  }
  console.log('');
  
  // テスト2: 訪問済み(U)の当日TEL(U) - AA13533は含まれないべき
  console.log('📋 テスト2: 訪問済み(U)の当日TEL(U) - AA13533は含まれないべき');
  let query2 = supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date, next_call_date, status')
    .eq('visit_assignee', 'U')
    .ilike('status', '%追客中%')
    .lte('next_call_date', todayDate.toISOString().split('T')[0])
    .lt('visit_date', todayDate.toISOString().split('T')[0]);  // 訪問済み
  
  const { data: completed, error: completedError } = await query2;
  
  if (completedError) {
    console.log('❌ ERROR:', completedError.message);
  } else {
    const aa13533InCompleted = completed.find(s => s.seller_number === 'AA13533');
    if (!aa13533InCompleted) {
      console.log('✅ PASS: AA13533が訪問済み(U)の当日TEL(U)に含まれていない（正しい）');
      console.log(`   取得件数: ${completed.length}件`);
    } else {
      console.log('❌ FAIL: AA13533が訪問済み(U)の当日TEL(U)に含まれている（間違い）');
      console.log(`   取得件数: ${completed.length}件`);
    }
  }
  console.log('');
  
  console.log('🎉 テスト完了！');
  console.log('');
  console.log('✅ カテゴリの排他性:');
  console.log('   - 訪問予定の当日TEL: visit_date >= 今日');
  console.log('   - 訪問済みの当日TEL: visit_date < 今日');
}

testVisitStatusFiltering().catch(console.error);
