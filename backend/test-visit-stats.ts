/**
 * 訪問統計APIテストスクリプト
 * 
 * 使用方法:
 *   npx ts-node test-visit-stats.ts          # 現在の月をテスト
 *   npx ts-node test-visit-stats.ts 2026-01  # 特定の月をテスト
 *   npx ts-node test-visit-stats.ts all      # 全ての月のデータを表示
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface VisitStats {
  month: string;
  totalVisits: number;
  statsByEmployee: Array<{
    count: number;
    name: string;
    initials: string;
    employeeId: string;
  }>;
}

async function getVisitStats(month: string): Promise<VisitStats> {
  console.log(`\n📊 ${month}の訪問統計を取得中...`);
  
  // 月の開始日と終了日を計算
  const startDate = `${month}-01`;
  const endDateObj = new Date(`${month}-01T00:00:00Z`);
  endDateObj.setMonth(endDateObj.getMonth() + 1);
  endDateObj.setDate(0);
  const endDate = endDateObj.toISOString().split('T')[0];

  console.log(`  日付範囲: ${startDate} ～ ${endDate}`);

  // 訪問データを取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number, visit_date, visit_assignee, assigned_to')
    .gte('visit_date', startDate)
    .lte('visit_date', endDate);

  if (error) {
    throw new Error(`クエリエラー: ${error.message}`);
  }

  // 従業員情報を取得
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, initials, email');

  const employeeMap = new Map<string, { id: string; name: string; initials: string }>();
  for (const emp of employees || []) {
    if (emp.initials) {
      employeeMap.set(emp.initials, { id: emp.id, name: emp.name || emp.email, initials: emp.initials });
    }
    if (emp.name) {
      employeeMap.set(emp.name, { id: emp.id, name: emp.name, initials: emp.initials || emp.name });
    }
  }

  // 担当者ごとに集計
  const statsByEmployee: Record<string, { count: number; name: string; initials: string; employeeId: string; sellers: string[] }> = {};
  let totalVisits = 0;

  for (const seller of sellers || []) {
    const assignee = seller.visit_assignee || seller.assigned_to;
    if (assignee) {
      const employee = employeeMap.get(assignee);
      const employeeKey = assignee;
      const employeeName = employee?.name || assignee;
      const employeeInitials = employee?.initials || assignee;
      const employeeId = employee?.id || assignee;

      if (!statsByEmployee[employeeKey]) {
        statsByEmployee[employeeKey] = {
          count: 0,
          name: employeeName,
          initials: employeeInitials,
          employeeId: employeeId,
          sellers: [],
        };
      }

      statsByEmployee[employeeKey].count++;
      statsByEmployee[employeeKey].sellers.push(seller.seller_number);
      totalVisits++;
    }
  }

  return {
    month,
    totalVisits,
    statsByEmployee: Object.values(statsByEmployee).sort((a, b) => b.count - a.count),
  };
}

async function testAllMonths(): Promise<void> {
  console.log('\n🔍 全ての月の訪問データを確認中...\n');

  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('visit_date')
    .not('visit_date', 'is', null)
    .order('visit_date', { ascending: true });

  if (error) {
    throw new Error(`クエリエラー: ${error.message}`);
  }

  // 月ごとにグループ化
  const monthCounts: Record<string, number> = {};
  for (const seller of sellers || []) {
    const month = seller.visit_date.substring(0, 7);
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  }

  console.log('📅 訪問データがある月:');
  for (const [month, count] of Object.entries(monthCounts).sort()) {
    console.log(`  ${month}: ${count}件`);
  }

  // 各月の詳細統計を表示
  for (const month of Object.keys(monthCounts).sort()) {
    const stats = await getVisitStats(month);
    displayStats(stats);
  }
}

function displayStats(stats: VisitStats): void {
  console.log(`\n📊 ${stats.month}の訪問統計:`);
  console.log(`  合計訪問数: ${stats.totalVisits}件`);
  
  if (stats.statsByEmployee.length > 0) {
    console.log('  担当者別:');
    for (const emp of stats.statsByEmployee) {
      console.log(`    - ${emp.name} (${emp.initials}): ${emp.count}件`);
    }
  } else {
    console.log('  訪問データなし');
  }
}

async function main(): Promise<void> {
  const arg = process.argv[2];

  try {
    if (arg === 'all') {
      await testAllMonths();
    } else {
      // 特定の月または現在の月をテスト
      const month = arg || new Date().toISOString().substring(0, 7);
      const stats = await getVisitStats(month);
      displayStats(stats);
    }

    console.log('\n✅ テスト完了');
  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  }
}

main();
