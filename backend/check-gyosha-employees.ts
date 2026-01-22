import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkGYOSHAEmployees() {
  try {
    console.log('Checking employees table for GYOSHA identification...\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not found in .env');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 全ての有効な社員を取得
    console.log('Fetching all active employees...\n');
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, email, name, role, is_active, initials')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      throw error;
    }
    
    if (!employees || employees.length === 0) {
      console.log('No active employees found');
      return;
    }
    
    console.log(`Total active employees: ${employees.length}\n`);
    console.log('='.repeat(80));
    
    // 各社員の情報を表示
    employees.forEach((emp, index) => {
      console.log(`\n${index + 1}. ${emp.name}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Role: ${emp.role}`);
      console.log(`   Initials: ${emp.initials || 'N/A'}`);
      console.log(`   Is Active: ${emp.is_active}`);
      
      // GYOSHAの可能性がある社員を強調表示
      if (emp.email && (
        emp.email.toLowerCase().includes('gyosha') ||
        emp.name.includes('業者') ||
        emp.name.includes('GYOSHA')
      )) {
        console.log(`   ⚠️  POTENTIAL GYOSHA USER`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    
    // GYOSHAユーザーの候補を表示
    const gyoshaUsers = employees.filter(emp => 
      emp.email && (
        emp.email.toLowerCase().includes('gyosha') ||
        emp.name.includes('業者') ||
        emp.name.includes('GYOSHA')
      )
    );
    
    if (gyoshaUsers.length > 0) {
      console.log(`\n🔍 Found ${gyoshaUsers.length} potential GYOSHA user(s):`);
      gyoshaUsers.forEach(emp => {
        console.log(`   - ${emp.name} (${emp.email})`);
      });
    } else {
      console.log('\n✅ No obvious GYOSHA users found by email/name pattern');
    }
    
    // roleの種類を集計
    const roleCount = employees.reduce((acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📊 Role distribution:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkGYOSHAEmployees();
