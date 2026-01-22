import { EmployeeUtils } from './src/utils/employeeUtils';
import { createClient } from '@supabase/supabase-js';

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAppointmentCreation() {
  const employeeUtils = new EmployeeUtils();
  
  console.log('=== Simulating Appointment Creation Flow ===\n');
  
  // Step 1: ユーザーが「生」を選択
  const selectedInitials = '生';
  console.log(`Step 1: User selects initials: "${selectedInitials}"`);
  
  // Step 2: employeeUtils.getEmployeeByInitials を呼び出し
  console.log(`\nStep 2: Looking up employee by initials...`);
  const assignedEmployee = await employeeUtils.getEmployeeByInitials(selectedInitials);
  
  if (!assignedEmployee) {
    console.error('❌ Employee not found!');
    process.exit(1);
  }
  
  console.log('✅ Employee found:', {
    id: assignedEmployee.id,
    name: assignedEmployee.name,
    email: assignedEmployee.email,
    initials: assignedEmployee.initials
  });
  
  // Step 3: データベースから従業員情報を再取得（CalendarServiceが行うのと同じ）
  console.log(`\nStep 3: Fetching employee from database (as CalendarService does)...`);
  const { data: employee, error } = await supabase
    .from('employees')
    .select('id, name, email')
    .eq('id', assignedEmployee.id)
    .single();
  
  if (error || !employee) {
    console.error('❌ Error fetching employee from database:', error);
    process.exit(1);
  }
  
  console.log('✅ Employee from database:', {
    id: employee.id,
    name: employee.name,
    email: employee.email
  });
  
  // Step 4: カレンダーIDとして使用されるメールアドレスを確認
  console.log(`\nStep 4: Calendar ID that would be used: ${employee.email}`);
  
  // Step 5: 全従業員のメールアドレスを表示
  console.log(`\nStep 5: All active employees and their emails:`);
  const { data: allEmployees } = await supabase
    .from('employees')
    .select('id, name, email')
    .eq('is_active', true)
    .order('name');
  
  if (allEmployees) {
    allEmployees.forEach(emp => {
      const initials = extractInitials(emp.name);
      const marker = emp.id === assignedEmployee.id ? '👉' : '  ';
      console.log(`${marker} ${initials.padEnd(5)} | ${emp.name.padEnd(20)} | ${emp.email}`);
    });
  }
  
  console.log('\n=== Summary ===');
  console.log(`Selected initials: "${selectedInitials}"`);
  console.log(`Resolved employee: ${assignedEmployee.name} (${assignedEmployee.id})`);
  console.log(`Calendar that SHOULD be used: ${employee.email}`);
  console.log('\n✅ If the calendar event is created in a different calendar,');
  console.log('   there is a bug in the calendar creation logic.');
  
  process.exit(0);
}

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

debugAppointmentCreation().catch(console.error);
