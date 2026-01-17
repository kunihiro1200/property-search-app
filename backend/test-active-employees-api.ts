import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testActiveEmployeesAPI() {
  try {
    console.log('Testing active employees query...\n');
    
    // Supabaseクライアントを作成
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // サービスキーを使用
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in .env');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 有効な社員でメールアドレスが存在するものを取得
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, email, name, role, initials')
      .eq('is_active', true)
      .not('email', 'is', null)
      .order('name');
    
    if (error) {
      throw error;
    }
    
    if (!employees) {
      console.log('⚠️ No employees found');
      return;
    }
    
    // メールアドレスが空文字列でないものをフィルタリング
    const validEmployees = employees.filter(emp => emp.email && emp.email.trim() !== '');
    
    console.log('✅ Query successful');
    console.log(`📊 Total active employees with email: ${validEmployees.length}\n`);
    
    // 各社員の情報を表示
    validEmployees.forEach((emp: any, index: number) => {
      console.log(`${index + 1}. ${emp.name}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Role: ${emp.role}`);
      console.log(`   Initials: ${emp.initials}\n`);
    });
    
    // APIレスポンス形式で表示
    console.log('\n📋 API Response format:');
    console.log(JSON.stringify({ employees: validEmployees }, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
  }
}

testActiveEmployeesAPI();
