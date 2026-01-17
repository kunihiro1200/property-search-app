import axios from 'axios';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testGYOSHAExclusion() {
  try {
    console.log('Testing GYOSHA user exclusion in /employees/active endpoint...\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in .env');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // ログイン
    console.log('1. Logging in...');
    let authData;
    let authError;
    
    // 最初のユーザーで試す
    ({ data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'tomoko.kunihiro@ifoo-oita.com',
      password: 'Tomoko2024!'
    }));
    
    // 失敗したら別のユーザーで試す
    if (authError || !authData.session) {
      console.log('First login failed, trying alternative user...');
      ({ data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'GYOSHA@ifoo-oita.com',
        password: 'Admin2024!'
      }));
    }
    
    if (authError || !authData.session) {
      throw new Error(`Authentication failed: ${authError?.message}`);
    }
    
    console.log('✅ Login successful\n');
    
    // APIを呼び出し
    console.log('2. Calling /employees/active API...');
    const response = await axios.get('http://localhost:3000/employees/active', {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    });
    
    const employees = response.data.employees;
    console.log(`✅ API returned ${employees.length} employees\n`);
    
    // 結果を検証
    console.log('3. Verification Results:');
    console.log('='.repeat(80));
    
    // GYOSHA@ifoo-oita.comが除外されているか確認
    const hasGYOSHA = employees.some((emp: any) => 
      emp.email.toLowerCase().includes('gyosha')
    );
    
    if (hasGYOSHA) {
      console.log('❌ FAILED: GYOSHA user is still included!');
      const gyoshaUsers = employees.filter((emp: any) => 
        emp.email.toLowerCase().includes('gyosha')
      );
      gyoshaUsers.forEach((emp: any) => {
        console.log(`   Found: ${emp.name} (${emp.email})`);
      });
    } else {
      console.log('✅ PASSED: GYOSHA users are excluded');
    }
    
    // tenant@ifoo-oita.comが含まれているか確認
    const hasTenant = employees.some((emp: any) => 
      emp.email.toLowerCase() === 'tenant@ifoo-oita.com'
    );
    
    if (hasTenant) {
      console.log('✅ PASSED: tenant@ifoo-oita.com is included');
    } else {
      console.log('❌ FAILED: tenant@ifoo-oita.com is missing!');
    }
    
    console.log('='.repeat(80));
    
    // 全社員リストを表示
    console.log('\n4. Returned Employees:');
    employees.forEach((emp: any, index: number) => {
      console.log(`${index + 1}. ${emp.name} (${emp.email})`);
    });
    
    // サマリー
    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Total employees: ${employees.length}`);
    console.log(`   GYOSHA excluded: ${!hasGYOSHA ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   tenant included: ${hasTenant ? 'Yes ✅' : 'No ❌'}`);
    
    if (!hasGYOSHA && hasTenant) {
      console.log('\n🎉 All tests PASSED!');
    } else {
      console.log('\n⚠️  Some tests FAILED!');
    }
    
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testGYOSHAExclusion();
