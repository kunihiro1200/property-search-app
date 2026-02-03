/**
 * AA13434の訪問ステータス確認
 * 
 * 目的: AA13434が訪問予定(U)の当日TEL(U)に表示され、訪問済み(U)の当日TEL(U)には表示されないことを確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13434VisitStatus() {
  console.log('🔍 AA13434の訪問ステータス確認\n');
  
  // 今日の日付（JST）
  const todayJST = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const todayDate = new Date(todayJST);
  console.log(`📅 今日の日付（JST）: ${todayDate.toISOString().split('T')[0]}\n`);
  
  // AA13434のデータを確認
  console.log('📋 AA13434のデータを確認');
  const { data: aa13434, error: aa13434Error } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee, visit_date, next_call_date, status, unreachable_status')
    .eq('seller_number', 'AA13434')
    .single();
  
  if (aa13434Error) {
    console.log('❌ ERROR:', aa13434Error.message);
    return;
  }
  
  if (!aa13434) {
    console.log('❌ AA13434が見つかりません');
    return;
  }
  
  console.log('✅ AA13434のデータ:');
  console.log(`   - 営担: ${aa13434.visit_assignee || '（空欄）'}`);
  console.log(`   - 訪問日: ${aa13434.visit_date || '（空欄）'}`);
  console.log(`   - 次電日: ${aa13434.next_call_date || '（空欄）'}`);
  console.log(`   - 状況: ${aa13434.status || '（空欄）'}`);
  console.log(`   - 不通: ${aa13434.unreachable_status || '（空欄）'}`);
  console.log('');
  
  // 訪問日が今日以降かどうかを判定
  if (aa13434.visit_date) {
    const visitDate = new Date(aa13434.visit_date);
    const isScheduled = visitDate >= todayDate;
    console.log(`📊 訪問日判定: ${isScheduled ? '訪問予定（今日以降）' : '訪問済み（昨日以前）'}`);
  } else {
    console.log('📊 訪問日判定: 訪問日が設定されていません');
  }
  console.log('');
  
  // 次電日が今日以前かどうかを判定
  if (aa13434.next_call_date) {
    const nextCallDate = new Date(aa13434.next_call_date);
    const isTodayOrBefore = nextCallDate <= todayDate;
    console.log(`📊 次電日判定: ${isTodayOrBefore ? '今日以前（当日TEL対象）' : '明日以降（当日TEL対象外）'}`);
  } else {
    console.log('📊 次電日判定: 次電日が設定されていません');
  }
  console.log('');
  
  // 状況に「追客中」が含まれるかを判定
  if (aa13434.status) {
    const hasFollowingUp = aa13434.status.includes('追客中');
    console.log(`📊 状況判定: ${hasFollowingUp ? '追客中が含まれる（当日TEL対象）' : '追客中が含まれない（当日TEL対象外）'}`);
  } else {
    console.log('📊 状況判定: 状況が設定されていません');
  }
  console.log('');
  
  // 当日TEL（担当）の条件を満たすかを判定
  const meetsConditions = 
    aa13434.visit_assignee && 
    aa13434.visit_assignee.trim() !== '' &&
    aa13434.next_call_date && 
    new Date(aa13434.next_call_date) <= todayDate &&
    aa13434.status && 
    aa13434.status.includes('追客中');
  
  console.log(`📊 当日TEL（担当）の条件: ${meetsConditions ? '✅ 満たす' : '❌ 満たさない'}`);
  console.log('');
  
  if (!meetsConditions) {
    console.log('⚠️  AA13434は当日TEL（担当）の条件を満たしていません');
    console.log('');
    console.log('📝 当日TEL（担当）の条件:');
    console.log('   1. 営担に入力がある');
    console.log('   2. 次電日が今日以前');
    console.log('   3. 状況（当社）に「追客中」が含まれる');
    return;
  }
  
  // 訪問予定(U)の当日TEL(U)に含まれるかをテスト
  if (aa13434.visit_assignee === 'U' && aa13434.visit_date) {
    console.log('📋 テスト1: 訪問予定(U)の当日TEL(U) - AA13434が含まれるべきか？');
    
    const visitDate = new Date(aa13434.visit_date);
    const isScheduled = visitDate >= todayDate;
    
    if (isScheduled) {
      console.log('✅ YES: AA13434は訪問予定(U)の当日TEL(U)に含まれるべき');
      console.log(`   理由: 訪問日（${aa13434.visit_date}）が今日以降`);
    } else {
      console.log('❌ NO: AA13434は訪問予定(U)の当日TEL(U)に含まれないべき');
      console.log(`   理由: 訪問日（${aa13434.visit_date}）が昨日以前`);
    }
    console.log('');
    
    console.log('📋 テスト2: 訪問済み(U)の当日TEL(U) - AA13434が含まれるべきか？');
    
    if (!isScheduled) {
      console.log('✅ YES: AA13434は訪問済み(U)の当日TEL(U)に含まれるべき');
      console.log(`   理由: 訪問日（${aa13434.visit_date}）が昨日以前`);
    } else {
      console.log('❌ NO: AA13434は訪問済み(U)の当日TEL(U)に含まれないべき');
      console.log(`   理由: 訪問日（${aa13434.visit_date}）が今日以降`);
    }
  } else {
    console.log('⚠️  AA13434の営担がUではないか、訪問日が設定されていません');
    console.log(`   営担: ${aa13434.visit_assignee || '（空欄）'}`);
    console.log(`   訪問日: ${aa13434.visit_date || '（空欄）'}`);
  }
  
  console.log('');
  console.log('🎉 確認完了！');
}

checkAA13434VisitStatus().catch(console.error);
