import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 従業員情報とイニシャルの対応を確認
 */
async function debugEmployeeInitials() {
  console.log('=== 従業員情報とイニシャルの確認 ===\n');

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, email, is_active')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching employees:', error);
    return;
  }

  if (!employees || employees.length === 0) {
    console.log('アクティブな従業員が見つかりません');
    return;
  }

  console.log(`アクティブな従業員: ${employees.length}名\n`);

  // イニシャル抽出関数（employeeUtils.tsと同じロジック）
  function extractInitials(name: string): string {
    if (!name) return '';
    
    const parts = name.trim().split(/\s+/);
    
    if (parts.length === 0) return '';
    
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0][0].toUpperCase();
    }
    
    const initials = parts
      .map((part) => {
        if (part.length === 0) return '';
        if (/^[A-Za-z]/.test(part)) {
          return part[0].toUpperCase();
        }
        return part[0];
      })
      .join('');
    
    return initials.toUpperCase();
  }

  // 各従業員の情報を表示
  const initialsMap = new Map<string, Array<{ id: string; name: string; email: string }>>();

  for (const employee of employees) {
    const initials = extractInitials(employee.name);
    console.log(`名前: ${employee.name}`);
    console.log(`  ID: ${employee.id}`);
    console.log(`  Email: ${employee.email || '(未設定)'}`);
    console.log(`  イニシャル: ${initials}`);
    console.log('');

    // 重複チェック用にマップに追加
    if (!initialsMap.has(initials)) {
      initialsMap.set(initials, []);
    }
    initialsMap.get(initials)!.push({
      id: employee.id,
      name: employee.name,
      email: employee.email
    });
  }

  // 重複イニシャルの確認
  console.log('\n=== イニシャルの重複チェック ===\n');
  
  let hasDuplicates = false;
  for (const [initials, employeeList] of initialsMap.entries()) {
    if (employeeList.length > 1) {
      hasDuplicates = true;
      console.log(`⚠️  重複検出: イニシャル "${initials}"`);
      employeeList.forEach(emp => {
        console.log(`   - ${emp.name} (${emp.email})`);
      });
      console.log('');
    }
  }

  if (!hasDuplicates) {
    console.log('✅ イニシャルの重複はありません');
  }
}

/**
 * 最近の予約を確認
 */
async function debugRecentAppointments() {
  console.log('\n\n=== 最近の予約情報 ===\n');

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      seller_id,
      employee_id,
      assigned_employee_id,
      assigned_to,
      start_time,
      calendar_event_id,
      created_at,
      created_by_name
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching appointments:', error);
    return;
  }

  if (!appointments || appointments.length === 0) {
    console.log('予約が見つかりません');
    return;
  }

  console.log(`最近の予約: ${appointments.length}件\n`);

  for (const apt of appointments) {
    console.log(`予約ID: ${apt.id}`);
    console.log(`  作成日時: ${apt.created_at}`);
    console.log(`  作成者: ${apt.created_by_name || '(不明)'}`);
    console.log(`  作成者ID (employee_id): ${apt.employee_id}`);
    console.log(`  担当者イニシャル (assigned_to): ${apt.assigned_to || '(未設定)'}`);
    console.log(`  担当者ID (assigned_employee_id): ${apt.assigned_employee_id || '(未設定)'}`);
    console.log(`  カレンダーイベントID: ${apt.calendar_event_id || '(未作成)'}`);

    // 担当者の情報を取得
    if (apt.assigned_employee_id) {
      const { data: assignedEmp } = await supabase
        .from('employees')
        .select('name, email')
        .eq('id', apt.assigned_employee_id)
        .single();

      if (assignedEmp) {
        console.log(`  → 担当者: ${assignedEmp.name} (${assignedEmp.email})`);
      }
    }

    // 作成者の情報を取得
    if (apt.employee_id) {
      const { data: creatorEmp } = await supabase
        .from('employees')
        .select('name, email')
        .eq('id', apt.employee_id)
        .single();

      if (creatorEmp) {
        console.log(`  → 作成者: ${creatorEmp.name} (${creatorEmp.email})`);
      }
    }

    console.log('');
  }
}

/**
 * メイン実行
 */
async function main() {
  try {
    await debugEmployeeInitials();
    await debugRecentAppointments();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
