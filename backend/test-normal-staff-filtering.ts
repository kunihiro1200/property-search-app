/**
 * 通常スタッフフィルタリングのテスト
 * 訪問予定/訪問済みが通常スタッフのみでフィルタリングされているか確認
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 通常スタッフのイニシャルリスト
const NORMAL_STAFF_INITIALS = ['K', 'Y', 'I', '林', '生', 'U', 'R', '久', '和', 'H'];

async function testNormalStaffFiltering() {
  console.log('=== 通常スタッフフィルタリングのテスト ===\n');
  
  // JST今日の日付を取得
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log(`📅 今日の日付（JST）: ${todayJST}\n`);
  console.log(`👥 通常スタッフ: ${NORMAL_STAFF_INITIALS.join(', ')}\n`);
  
  try {
    // 1. 訪問予定（全て）
    const { data: allVisitScheduled } = await supabase
      .from('sellers')
      .select('seller_number, visit_assignee, visit_date')
      .is('deleted_at', null)
      .not('visit_assignee', 'is', null)
      .neq('visit_assignee', '')
      .neq('visit_assignee', '外す')
      .gte('visit_date', todayJST);
    
    console.log('📊 訪問予定（全て）:');
    console.log(`  件数: ${allVisitScheduled?.length || 0}件`);
    
    // 営担別に集計
    const allScheduledByAssignee: Record<string, number> = {};
    for (const s of allVisitScheduled || []) {
      const assignee = s.visit_assignee || '不明';
      allScheduledByAssignee[assignee] = (allScheduledByAssignee[assignee] || 0) + 1;
    }
    console.log('  営担別:');
    for (const [assignee, count] of Object.entries(allScheduledByAssignee).sort((a, b) => b[1] - a[1])) {
      const isNormal = NORMAL_STAFF_INITIALS.includes(assignee);
      console.log(`    ${assignee}: ${count}件 ${isNormal ? '✅ 通常' : '❌ 通常外'}`);
    }
    console.log('');
    
    // 2. 訪問予定（通常スタッフのみ）
    const normalVisitScheduled = (allVisitScheduled || []).filter(s => 
      NORMAL_STAFF_INITIALS.includes(s.visit_assignee)
    );
    
    console.log('📊 訪問予定（通常スタッフのみ）:');
    console.log(`  件数: ${normalVisitScheduled.length}件`);
    
    // 営担別に集計
    const normalScheduledByAssignee: Record<string, number> = {};
    for (const s of normalVisitScheduled) {
      const assignee = s.visit_assignee || '不明';
      normalScheduledByAssignee[assignee] = (normalScheduledByAssignee[assignee] || 0) + 1;
    }
    console.log('  営担別:');
    for (const [assignee, count] of Object.entries(normalScheduledByAssignee).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${assignee}: ${count}件`);
    }
    console.log('');
    
    // 3. 訪問済み（全て）
    const { data: allVisitCompleted } = await supabase
      .from('sellers')
      .select('seller_number, visit_assignee, visit_date')
      .is('deleted_at', null)
      .not('visit_assignee', 'is', null)
      .neq('visit_assignee', '')
      .neq('visit_assignee', '外す')
      .lt('visit_date', todayJST);
    
    console.log('📊 訪問済み（全て）:');
    console.log(`  件数: ${allVisitCompleted?.length || 0}件`);
    
    // 営担別に集計
    const allCompletedByAssignee: Record<string, number> = {};
    for (const s of allVisitCompleted || []) {
      const assignee = s.visit_assignee || '不明';
      allCompletedByAssignee[assignee] = (allCompletedByAssignee[assignee] || 0) + 1;
    }
    console.log('  営担別:');
    for (const [assignee, count] of Object.entries(allCompletedByAssignee).sort((a, b) => b[1] - a[1])) {
      const isNormal = NORMAL_STAFF_INITIALS.includes(assignee);
      console.log(`    ${assignee}: ${count}件 ${isNormal ? '✅ 通常' : '❌ 通常外'}`);
    }
    console.log('');
    
    // 4. 訪問済み（通常スタッフのみ）
    const normalVisitCompleted = (allVisitCompleted || []).filter(s => 
      NORMAL_STAFF_INITIALS.includes(s.visit_assignee)
    );
    
    console.log('📊 訪問済み（通常スタッフのみ）:');
    console.log(`  件数: ${normalVisitCompleted.length}件`);
    
    // 営担別に集計
    const normalCompletedByAssignee: Record<string, number> = {};
    for (const s of normalVisitCompleted) {
      const assignee = s.visit_assignee || '不明';
      normalCompletedByAssignee[assignee] = (normalCompletedByAssignee[assignee] || 0) + 1;
    }
    console.log('  営担別:');
    for (const [assignee, count] of Object.entries(normalCompletedByAssignee).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${assignee}: ${count}件`);
    }
    console.log('');
    
    // 5. サマリー
    console.log('=== サマリー ===');
    console.log(`訪問予定: ${allVisitScheduled?.length || 0}件 → ${normalVisitScheduled.length}件（通常スタッフのみ）`);
    console.log(`訪問済み: ${allVisitCompleted?.length || 0}件 → ${normalVisitCompleted.length}件（通常スタッフのみ）`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testNormalStaffFiltering();
