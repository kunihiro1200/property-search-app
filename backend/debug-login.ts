import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

async function debugLogin() {
  console.log('🔍 Login Debug Information\n');

  // 1. 環境変数チェック
  console.log('📋 Environment Variables:');
  console.log('  SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('  SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  console.log('  SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set');
  console.log();

  // 2. Supabase接続テスト
  console.log('🔌 Testing Supabase Connection...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { error } = await supabase.from('employees').select('count').limit(1);
    if (error) {
      console.log('  ❌ Connection failed:', error.message);
    } else {
      console.log('  ✅ Connection successful');
    }
  } catch (error) {
    console.log('  ❌ Connection error:', error);
  }
  console.log();

  // 3. Google OAuth設定チェック（Supabase Dashboard）
  console.log('🔐 Google OAuth Configuration Check:');
  console.log('  Please verify in Supabase Dashboard:');
  console.log('  1. Go to Authentication > Providers > Google');
  console.log('  2. Ensure "Enable Sign in with Google" is ON');
  console.log('  3. Client ID should be:', process.env.GOOGLE_CLIENT_ID);
  console.log('  4. Client Secret should be set');
  console.log('  5. Authorized redirect URIs should include:');
  console.log('     - http://localhost:5174/auth/callback');
  console.log('     - https://fzcuexscuwhoywcicdqq.supabase.co/auth/v1/callback');
  console.log();

  // 4. 社員テーブルチェック
  console.log('👥 Checking employees table...');
  try {
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name, email, google_id, is_active')
      .limit(5);

    if (error) {
      console.log('  ❌ Error:', error.message);
    } else {
      console.log(`  ✅ Found ${employees?.length || 0} employees`);
      if (employees && employees.length > 0) {
        console.log('  Sample employees:');
        employees.forEach((emp) => {
          console.log(`    - ${emp.name} (${emp.email}) - Active: ${emp.is_active}`);
        });
      }
    }
  } catch (error) {
    console.log('  ❌ Error:', error);
  }
  console.log();

  // 5. フロントエンド設定チェック
  console.log('🌐 Frontend Configuration:');
  console.log('  Check frontend/.env file:');
  console.log('  - VITE_API_URL should be: http://localhost:3000');
  console.log('  - VITE_SUPABASE_URL should be:', supabaseUrl);
  console.log('  - VITE_SUPABASE_ANON_KEY should be set');
  console.log();

  // 6. トラブルシューティング手順
  console.log('🔧 Troubleshooting Steps:');
  console.log('  1. Clear browser cache and localStorage');
  console.log('  2. Check browser console for errors');
  console.log('  3. Verify Google OAuth consent screen is configured');
  console.log('  4. Ensure your Google account email is authorized');
  console.log('  5. Check Supabase Auth logs in Dashboard');
  console.log();

  console.log('💡 Common Issues:');
  console.log('  - "Invalid redirect URI": Check Google Cloud Console OAuth settings');
  console.log('  - "Access blocked": Configure OAuth consent screen');
  console.log('  - "No session found": Clear browser storage and try again');
  console.log('  - "Employee not found": First login creates employee record');
}

debugLogin().catch(console.error);
