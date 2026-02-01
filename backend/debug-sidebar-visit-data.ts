/**
 * サイドバーの訪問予定/訪問済みデータをデバッグ
 * 
 * 問題: サイドバーで訪問予定/訪問済みの件数が0件になっている
 * 
 * 確認事項:
 * 1. APIから返されるデータのフィールド名（visitDate vs visit_date）
 * 2. visitDateの型（Date vs string）
 * 3. フロントエンドのフィルタリングロジックが正しく動作するか
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 複数の.envファイルを試す
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  console.error('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// JST今日の日付を取得
const getTodayJSTString = (): string => {
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const year = jstTime.getUTCFullYear();
  const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 日付文字列を正規化
const normalizeDateString = (dateStr: string | Date | undefined | null): string | null => {
  if (!dateStr) return null;
  
  try {
    let dateString: string;
    
    if (dateStr instanceof Date) {
      const year = dateStr.getFullYear();
      const month = String(dateStr.getMonth() + 1).padStart(2, '0');
      const day = String(dateStr.getDate()).padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
    } else {
      dateString = dateStr;
    }
    
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    if (dateString.includes('-')) {
      const datePart = dateString.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

// 日付が今日以降かどうかを判定
const isTodayOrAfter = (dateStr: string | Date | undefined | null): boolean => {
  const normalized = normalizeDateString(dateStr);
  if (!normalized) return false;
  
  const todayStr = getTodayJSTString();
  return normalized >= todayStr;
};

// 日付が昨日以前かどうかを判定
const isYesterdayOrBefore = (dateStr: string | Date | undefined | null): boolean => {
  const normalized = normalizeDateString(dateStr);
  if (!normalized) return false;
  
  const todayStr = getTodayJSTString();
  return normalized < todayStr;
};

// 営担に有効な入力があるかどうかを判定
const hasVisitAssignee = (seller: any): boolean => {
  const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
  if (!visitAssignee || visitAssignee.trim() === '' || visitAssignee.trim() === '外す') {
    return false;
  }
  return true;
};

// 訪問予定判定
const isVisitScheduled = (seller: any): boolean => {
  if (!hasVisitAssignee(seller)) {
    return false;
  }
  
  const visitDate = seller.visitDate || seller.visit_date;
  if (!visitDate) {
    return false;
  }
  
  return isTodayOrAfter(visitDate);
};

// 訪問済み判定
const isVisitCompleted = (seller: any): boolean => {
  if (!hasVisitAssignee(seller)) {
    return false;
  }
  
  const visitDate = seller.visitDate || seller.visit_date;
  if (!visitDate) {
    return false;
  }
  
  return isYesterdayOrBefore(visitDate);
};

async function main() {
  console.log('=== サイドバー訪問予定/訪問済みデータデバッグ ===');
  console.log('今日の日付（JST）:', getTodayJSTString());
  console.log('');
  
  // 1. データベースから直接訪問予定/訪問済みの売主を取得
  const todayJST = getTodayJSTString();
  
  console.log('=== 1. データベースから直接取得 ===');
  
  // 訪問予定（visit_date >= 今日）
  const { data: visitScheduledDB, error: err1 } = await supabase
    .from('sellers')
    .select('seller_number, name, visit_date, visit_assignee')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .gte('visit_date', todayJST)
    .is('deleted_at', null);
  
  if (err1) {
    console.error('訪問予定取得エラー:', err1);
  } else {
    console.log('訪問予定（DB直接）:', visitScheduledDB?.length || 0, '件');
    visitScheduledDB?.forEach(s => {
      console.log(`  ${s.seller_number}: visit_date=${s.visit_date}, visit_assignee=${s.visit_assignee}`);
    });
  }
  
  console.log('');
  
  // 訪問済み（visit_date < 今日）
  const { data: visitCompletedDB, error: err2 } = await supabase
    .from('sellers')
    .select('seller_number, name, visit_date, visit_assignee')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .neq('visit_assignee', '外す')
    .lt('visit_date', todayJST)
    .is('deleted_at', null);
  
  if (err2) {
    console.error('訪問済み取得エラー:', err2);
  } else {
    console.log('訪問済み（DB直接）:', visitCompletedDB?.length || 0, '件');
    visitCompletedDB?.slice(0, 5).forEach(s => {
      console.log(`  ${s.seller_number}: visit_date=${s.visit_date}, visit_assignee=${s.visit_assignee}`);
    });
    if ((visitCompletedDB?.length || 0) > 5) {
      console.log(`  ... 他 ${(visitCompletedDB?.length || 0) - 5} 件`);
    }
  }
  
  console.log('');
  console.log('=== 2. フロントエンドのフィルタリングロジックをシミュレート ===');
  
  // 全売主を取得（visit_dateとvisit_assigneeがある売主のみ）
  const { data: allSellers, error: err3 } = await supabase
    .from('sellers')
    .select('seller_number, name, visit_date, visit_assignee')
    .not('visit_assignee', 'is', null)
    .neq('visit_assignee', '')
    .is('deleted_at', null)
    .limit(100);
  
  if (err3) {
    console.error('全売主取得エラー:', err3);
    return;
  }
  
  console.log('取得した売主数:', allSellers?.length || 0);
  console.log('');
  
  // フロントエンドのフィルタリングロジックをシミュレート
  // ケース1: スネークケース（visit_date, visit_assignee）
  console.log('--- ケース1: スネークケース（visit_date, visit_assignee） ---');
  const visitScheduledSnake = allSellers?.filter(s => {
    const visitAssignee = s.visit_assignee || '';
    if (!visitAssignee || visitAssignee.trim() === '' || visitAssignee.trim() === '外す') {
      return false;
    }
    const visitDate = s.visit_date;
    if (!visitDate) return false;
    return isTodayOrAfter(visitDate);
  }) || [];
  
  const visitCompletedSnake = allSellers?.filter(s => {
    const visitAssignee = s.visit_assignee || '';
    if (!visitAssignee || visitAssignee.trim() === '' || visitAssignee.trim() === '外す') {
      return false;
    }
    const visitDate = s.visit_date;
    if (!visitDate) return false;
    return isYesterdayOrBefore(visitDate);
  }) || [];
  
  console.log('訪問予定（スネークケース）:', visitScheduledSnake.length, '件');
  console.log('訪問済み（スネークケース）:', visitCompletedSnake.length, '件');
  
  console.log('');
  
  // ケース2: キャメルケース（visitDate, visitAssignee）- APIレスポンスをシミュレート
  console.log('--- ケース2: キャメルケース（visitDate, visitAssignee） ---');
  const sellersWithCamelCase = allSellers?.map(s => ({
    ...s,
    visitDate: s.visit_date ? new Date(s.visit_date) : undefined,
    visitAssignee: s.visit_assignee,
  })) || [];
  
  const visitScheduledCamel = sellersWithCamelCase.filter(isVisitScheduled);
  const visitCompletedCamel = sellersWithCamelCase.filter(isVisitCompleted);
  
  console.log('訪問予定（キャメルケース）:', visitScheduledCamel.length, '件');
  console.log('訪問済み（キャメルケース）:', visitCompletedCamel.length, '件');
  
  console.log('');
  
  // 詳細確認
  if (visitScheduledCamel.length > 0) {
    console.log('=== 訪問予定の売主（キャメルケース） ===');
    visitScheduledCamel.forEach(s => {
      console.log(`  ${s.seller_number}: visitDate=${s.visitDate}, visitAssignee=${s.visitAssignee}`);
      console.log(`    → normalizeDateString(visitDate) = ${normalizeDateString(s.visitDate)}`);
      console.log(`    → isTodayOrAfter(visitDate) = ${isTodayOrAfter(s.visitDate)}`);
    });
  }
  
  if (visitCompletedCamel.length > 0) {
    console.log('=== 訪問済みの売主（キャメルケース、最初の5件） ===');
    visitCompletedCamel.slice(0, 5).forEach(s => {
      console.log(`  ${s.seller_number}: visitDate=${s.visitDate}, visitAssignee=${s.visitAssignee}`);
      console.log(`    → normalizeDateString(visitDate) = ${normalizeDateString(s.visitDate)}`);
      console.log(`    → isYesterdayOrBefore(visitDate) = ${isYesterdayOrBefore(s.visitDate)}`);
    });
  }
  
  console.log('');
  console.log('=== 3. 問題の特定 ===');
  
  // AA13508とAA5039を確認
  const { data: specificSellers, error: err4 } = await supabase
    .from('sellers')
    .select('seller_number, name, visit_date, visit_assignee')
    .in('seller_number', ['AA13508', 'AA5039'])
    .is('deleted_at', null);
  
  if (err4) {
    console.error('特定売主取得エラー:', err4);
  } else {
    console.log('AA13508とAA5039の確認:');
    specificSellers?.forEach(s => {
      console.log(`  ${s.seller_number}:`);
      console.log(`    visit_date = ${s.visit_date}`);
      console.log(`    visit_assignee = ${s.visit_assignee}`);
      
      // キャメルケースに変換
      const camelCase = {
        visitDate: s.visit_date ? new Date(s.visit_date) : undefined,
        visitAssignee: s.visit_assignee,
      };
      console.log(`    visitDate (Date) = ${camelCase.visitDate}`);
      console.log(`    visitAssignee = ${camelCase.visitAssignee}`);
      console.log(`    hasVisitAssignee = ${hasVisitAssignee(camelCase)}`);
      console.log(`    normalizeDateString(visitDate) = ${normalizeDateString(camelCase.visitDate)}`);
      console.log(`    isTodayOrAfter(visitDate) = ${isTodayOrAfter(camelCase.visitDate)}`);
      console.log(`    isVisitScheduled = ${isVisitScheduled(camelCase)}`);
    });
  }
}

main().catch(console.error);
