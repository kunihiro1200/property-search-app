/**
 * 訪問済み(生)のAPIテスト
 * サイドバーで「訪問済み(生) 2件」と表示されているのに、クリックすると0件になる問題を調査
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testVisitCompletedSei() {
  console.log('=== 訪問済み(生)のテスト ===\n');
  
  // 今日の日付（JST）
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const todayStr = jstNow.toISOString().split('T')[0];
  console.log('今日の日付（JST）:', todayStr);
  
  // 1. サイドバーカウントの確認（visit_assignee = '生' で訪問済みの件数）
  console.log('\n1. データベースから直接カウント...');
  
  const { data: visitCompletedSei, error: countError } = await supabase
    .from('sellers')
    .select('seller_number, name, visit_date, visit_assignee, status')
    .eq('visit_assignee', '生')
    .lt('visit_date', todayStr)
    .is('deleted_at', null);
  
  if (countError) {
    console.error('エラー:', countError);
    return;
  }
  
  console.log(`訪問済み(生)の件数: ${visitCompletedSei?.length || 0}件`);
  
  if (visitCompletedSei && visitCompletedSei.length > 0) {
    console.log('\n該当する売主:');
    visitCompletedSei.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.seller_number}: ${s.name}, 訪問日=${s.visit_date}, 営担=${s.visit_assignee}`);
    });
  }
  
  // 2. listSellersのシミュレーション（statusCategory=visitCompleted, visitAssignee=生）
  console.log('\n2. listSellersのシミュレーション（statusCategory=visitCompleted, visitAssignee=生）...');
  
  let query = supabase
    .from('sellers')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .eq('visit_assignee', '生')
    .lt('visit_date', todayStr)
    .order('visit_date', { ascending: false })
    .range(0, 49);
  
  const { data: listData, count, error: listError } = await query;
  
  if (listError) {
    console.error('エラー:', listError);
    return;
  }
  
  console.log(`取得件数: ${listData?.length || 0}件（合計: ${count}件）`);
  
  if (listData && listData.length > 0) {
    console.log('\n取得した売主:');
    listData.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.seller_number}: ${s.name}, 訪問日=${s.visit_date}, 営担=${s.visit_assignee}`);
    });
  }
  
  // 3. 通常スタッフの確認
  console.log('\n3. 通常スタッフの確認...');
  const NORMAL_STAFF_INITIALS = ['K', 'Y', 'I', '林', '生', 'U', 'R', '久', '和', 'H'];
  console.log('通常スタッフ:', NORMAL_STAFF_INITIALS.join(', '));
  console.log('「生」は通常スタッフに含まれる:', NORMAL_STAFF_INITIALS.includes('生'));
  
  console.log('\n=== テスト完了 ===');
}

testVisitCompletedSei().catch(console.error);
