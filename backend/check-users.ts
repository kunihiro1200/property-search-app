/**
 * Supabaseのユーザーを確認
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkUsers() {
  try {
    console.log('👥 Checking Supabase users...\n');

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // auth.usersテーブルを確認
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      process.exit(1);
    }

    console.log(`📊 Total auth users: ${authUsers.users.length}\n`);

    if (authUsers.users.length === 0) {
      console.log('⚠️  No users found in auth.users');
      console.log('\n💡 To create a test user, run:');
      console.log('   npx ts-node create-test-user.ts');
    } else {
      console.log('📋 Users:');
      authUsers.users.forEach((user, index) => {
        console.log(`\n${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${user.created_at}`);
        console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
      });
    }

    // employeesテーブルも確認
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .limit(10);

    if (empError) {
      console.error('\n❌ Error fetching employees:', empError.message);
    } else {
      console.log(`\n\n📊 Total employees: ${employees?.length || 0}`);
      if (employees && employees.length > 0) {
        console.log('\n📋 Sample employees:');
        employees.slice(0, 5).forEach((emp, index) => {
          console.log(`\n${index + 1}. ${emp.name}`);
          console.log(`   Email: ${emp.email}`);
          console.log(`   Role: ${emp.role}`);
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
