import axios from 'axios';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testActiveEmployeesEndpoint() {
  try {
    console.log('Testing /employees/active API endpoint...\n');
    
    // Supabaseクライアントを作成
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in .env');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Supabase Authでログイン
    console.log('1. Logging in with Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'tomoko.kunihiro@ifoo-oita.com',
      password: 'Tomoko2024!'
    });
    
    if (authError) {
      // 別のユーザーで試す
      console.log('First login failed, trying alternative user...');
      const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
        email: 'GYOSHA@ifoo-oita.com',
        password: 'Admin2024!'
      });
      
      if (authError2 || !authData2.session) {
        throw new Error(`Authentication failed: ${authError2?.message}`);
      }
      
      console.log('✅ Login successful (alternative user)\n');
      
      // 有効な社員一覧を取得
      console.log('2. Fetching active employees...');
      const response = await axios.get('http://localhost:3000/employees/active', {
        headers: {
          Authorization: `Bearer ${authData2.session.access_token}`
        }
      });
      
      await displayResults(response);
      return;
    }
    
    if (!authData.session) {
      throw new Error('No session returned from Supabase');
    }
    
    console.log('✅ Login successful\n');
    
    // 有効な社員一覧を取得
    console.log('2. Fetching active employees...');
    const response = await axios.get('http://localhost:3000/employees/active', {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    });
    
    await displayResults(response);
    
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function displayResults(response: any) {
  console.log('✅ API call successful\n');
  console.log(`📊 Total active employees with email: ${response.data.employees.length}\n`);
  
  // 各社員の情報を表示
  response.data.employees.forEach((emp: any, index: number) => {
    console.log(`${index + 1}. ${emp.name}`);
    console.log(`   Email: ${emp.email}`);
    console.log(`   Role: ${emp.role}`);
    console.log(`   Initials: ${emp.initials}\n`);
  });
  
  // tenant@ifoo-oita.comが含まれているか確認
  const hasTenant = response.data.employees.some((emp: any) => emp.email === 'tenant@ifoo-oita.com');
  console.log(`✅ tenant@ifoo-oita.com is ${hasTenant ? 'included' : 'NOT included'}`);
}

testActiveEmployeesEndpoint();
