/**
 * AA13499のステータスを確認するスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 通常スタッフのイニシャル（sidebar-status-definition.mdより）
const NORMAL_STAFF_INITIALS = ['K', 'Y', 'I', '林', '生', 'U', 'R', '久', '和', 'H'];

async function checkAA13499Status() {
  console.log('=== AA13499のステータス確認 ===\n');
  
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13499')
    .single();
  
  if (error) {
    console.error('エラー:', error);
    return;
  }
  
  if (!seller) {
    console.log('AA13499が見つかりません');
    return;
  }
  
  console.log('=== 基本情報 ===');
  console.log('売主番号:', seller.seller_number);
  console.log('名前:', seller.name);
  console.log('状況（当社）:', seller.status);
  
  console.log('\n=== 訪問関連フィールド ===');
  console.log('visit_date:', seller.visit_date);
  console.log('visit_assignee:', seller.visit_assignee);
  console.log('visit_time:', seller.visit_time);
  
  console.log('\n=== 訪問済み判定 ===');
  
  // 訪問日の判定
  const visitDate = seller.visit_date;
  const visitAssignee = seller.visit_assignee;
  
  console.log('1. visit_dateが存在するか:', !!visitDate);
  console.log('2. visit_assigneeが存在するか:', !!visitAssignee);
  
  if (visitDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const vDate = new Date(visitDate);
    vDate.setHours(0, 0, 0, 0);
    
    console.log('3. 訪問日:', vDate.toISOString().split('T')[0]);
    console.log('4. 今日:', today.toISOString().split('T')[0]);
    console.log('5. 訪問日 < 今日（昨日以前）:', vDate.getTime() < today.getTime());
  }
  
  if (visitAssignee) {
    const trimmedAssignee = visitAssignee.trim();
    console.log('6. 営担（トリム後）:', `"${trimmedAssignee}"`);
    console.log('7. 通常スタッフに含まれるか:', NORMAL_STAFF_INITIALS.includes(trimmedAssignee));
  }
  
  // 訪問済みの条件を確認
  const isVisitCompleted = (() => {
    if (!visitDate || !visitAssignee) return false;
    
    const trimmedAssignee = visitAssignee.trim();
    if (!NORMAL_STAFF_INITIALS.includes(trimmedAssignee)) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const vDate = new Date(visitDate);
    vDate.setHours(0, 0, 0, 0);
    
    return vDate.getTime() < today.getTime();
  })();
  
  console.log('\n=== 判定結果 ===');
  console.log('訪問済みか:', isVisitCompleted);
  
  if (!isVisitCompleted) {
    console.log('\n=== 訪問済みでない理由 ===');
    if (!visitDate) {
      console.log('- visit_dateが空');
    }
    if (!visitAssignee) {
      console.log('- visit_assigneeが空');
    }
    if (visitAssignee && !NORMAL_STAFF_INITIALS.includes(visitAssignee.trim())) {
      console.log(`- 営担「${visitAssignee}」が通常スタッフに含まれない`);
      console.log(`  通常スタッフ: ${NORMAL_STAFF_INITIALS.join(', ')}`);
    }
    if (visitDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const vDate = new Date(visitDate);
      vDate.setHours(0, 0, 0, 0);
      if (vDate.getTime() >= today.getTime()) {
        console.log('- 訪問日が今日以降（訪問予定）');
      }
    }
  }
}

checkAA13499Status().catch(console.error);
