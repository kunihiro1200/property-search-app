import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testGYOSHAExclusionDirect() {
  try {
    console.log('Testing GYOSHA user exclusion logic directly...\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not found in .env');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 全ての有効な社員を取得（フィルタリング前）
    console.log('1. Fetching all active employees from database...');
    const { data: allEmployees, error } = await supabase
      .from('employees')
      .select('id, email, name, role, initials')
      .eq('is_active', true)
      .not('email', 'is', null)
      .order('name');
    
    if (error) {
      throw error;
    }
    
    if (!allEmployees) {
      console.log('No employees found');
      return;
    }
    
    console.log(`✅ Found ${allEmployees.length} active employees with email\n`);
    
    // フィルタリングロジックを適用
    console.log('2. Applying filtering logic...');
    const validEmployees = allEmployees.filter(emp => {
      if (!emp.email || emp.email.trim() === '') {
        return false;
      }
      
      // tenant@ifoo-oita.comは常に含める
      if (emp.email.toLowerCase() === 'tenant@ifoo-oita.com') {
        console.log(`   ✅ Including tenant: ${emp.name} (${emp.email})`);
        return true;
      }
      
      // GYOSHAを含むメールアドレスは除外
      if (emp.email.toLowerCase().includes('gyosha')) {
        console.log(`   ❌ Excluding GYOSHA user: ${emp.name} (${emp.email})`);
        return false;
      }
      
      return true;
    });
    
    console.log(`\n✅ After filtering: ${validEmployees.length} employees\n`);
    
    // 結果を検証
    console.log('3. Verification Results:');
    console.log('='.repeat(80));
    
    // GYOSHA@ifoo-oita.comが除外されているか確認
    const hasGYOSHA = validEmployees.some(emp => 
      emp.email.toLowerCase().includes('gyosha')
    );
    
    if (hasGYOSHA) {
      console.log('❌ FAILED: GYOSHA user is still included!');
      const gyoshaUsers = validEmployees.filter(emp => 
        emp.email.toLowerCase().includes('gyosha')
      );
      gyoshaUsers.forEach(emp => {
        console.log(`   Found: ${emp.name} (${emp.email})`);
      });
    } else {
      console.log('✅ PASSED: GYOSHA users are excluded');
    }
    
    // tenant@ifoo-oita.comが含まれているか確認
    const hasTenant = validEmployees.some(emp => 
      emp.email.toLowerCase() === 'tenant@ifoo-oita.com'
    );
    
    if (hasTenant) {
      console.log('✅ PASSED: tenant@ifoo-oita.com is included');
    } else {
      console.log('❌ FAILED: tenant@ifoo-oita.com is missing!');
    }
    
    console.log('='.repeat(80));
    
    // 全社員リストを表示
    console.log('\n4. Final Employee List:');
    validEmployees.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.name} (${emp.email})`);
    });
    
    // 除外された社員を表示
    const excludedEmployees = allEmployees.filter(emp => 
      !validEmployees.some(valid => valid.id === emp.id)
    );
    
    if (excludedEmployees.length > 0) {
      console.log('\n5. Excluded Employees:');
      excludedEmployees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.name} (${emp.email})`);
      });
    }
    
    // サマリー
    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`   Total active employees: ${allEmployees.length}`);
    console.log(`   After filtering: ${validEmployees.length}`);
    console.log(`   Excluded: ${excludedEmployees.length}`);
    console.log(`   GYOSHA excluded: ${!hasGYOSHA ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   tenant included: ${hasTenant ? 'Yes ✅' : 'No ❌'}`);
    
    if (!hasGYOSHA && hasTenant) {
      console.log('\n🎉 All tests PASSED!');
    } else {
      console.log('\n⚠️  Some tests FAILED!');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testGYOSHAExclusionDirect();
