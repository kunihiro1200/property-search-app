import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { supabase } from './src/config/supabase';

async function testSupabaseAuth() {
  console.log('🔍 Testing Supabase Auth Configuration...\n');

  // 1. 環境変数の確認
  console.log('1️⃣ Environment Variables:');
  console.log('   SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
  console.log('');

  // 2. データベース接続テスト
  console.log('2️⃣ Testing Database Connection:');
  try {
    const { error } = await supabase
      .from('employees')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('   ❌ Database connection failed:', error.message);
    } else {
      console.log('   ✅ Database connection successful');
    }
  } catch (error: any) {
    console.log('   ❌ Database connection error:', error.message);
  }
  console.log('');

  // 3. Auth設定の確認
  console.log('3️⃣ Checking Auth Configuration:');
  try {
    // Supabase Authの設定を確認（管理APIを使用）
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('   ❌ Auth admin access failed:', error.message);
    } else {
      console.log('   ✅ Auth admin access successful');
      console.log('   📊 Total users:', data.users.length);
    }
  } catch (error: any) {
    console.log('   ❌ Auth configuration error:', error.message);
  }
  console.log('');

  // 4. OAuth プロバイダーの確認
  console.log('4️⃣ Checking OAuth Providers:');
  console.log('   ℹ️  To enable Google OAuth:');
  console.log('   1. Go to Supabase Dashboard → Authentication → Providers');
  console.log('   2. Enable Google provider');
  console.log('   3. Add Client ID:', process.env.GOOGLE_CLIENT_ID || 'Not set in .env');
  console.log('   4. Add Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '***' : 'Not set in .env');
  console.log('   5. Add Redirect URL: http://localhost:5173/auth/callback');
  console.log('');

  // 5. 推奨事項
  console.log('5️⃣ Recommendations:');
  console.log('   📝 Make sure Google OAuth is enabled in Supabase Dashboard');
  console.log('   📝 Verify redirect URLs match in both Google Console and Supabase');
  console.log('   📝 Check that the frontend VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  console.log('');
}

testSupabaseAuth()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
