import dotenv from 'dotenv';
import { supabaseClient } from '../config/supabase';

dotenv.config();

async function checkSupabaseAuth() {
  console.log('🔍 Supabase認証設定チェック\n');

  // 1. 環境変数の確認
  console.log('📋 環境変数:');
  console.log('  SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '設定済み (' + process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...)' : '❌ 未設定');
  console.log('  SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み (' + process.env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...)' : '❌ 未設定');
  console.log('');

  // 2. Supabase接続テスト
  console.log('🔌 Supabase接続テスト:');
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.log('  ❌ エラー:', error.message);
    } else {
      console.log('  ✅ 接続成功');
      console.log('  セッション:', data.session ? 'あり' : 'なし（正常）');
    }
  } catch (error: any) {
    console.log('  ❌ 接続失敗:', error.message);
  }
  console.log('');

  // 3. employeesテーブルの確認
  console.log('📊 employeesテーブルの確認:');
  try {
    const { data, error } = await supabaseClient
      .from('employees')
      .select('id, name, email')
      .limit(1);

    if (error) {
      console.log('  ❌ エラー:', error.message);
      console.log('  ヒント: RLSポリシーまたはテーブルが存在しない可能性があります');
    } else {
      console.log('  ✅ テーブルアクセス成功');
      console.log('  レコード数:', data?.length || 0);
    }
  } catch (error: any) {
    console.log('  ❌ アクセス失敗:', error.message);
  }
  console.log('');

  // 4. 推奨事項
  console.log('📝 確認事項:');
  console.log('');
  console.log('1. Supabaseダッシュボードで以下を確認:');
  console.log('   https://supabase.com/dashboard');
  console.log('');
  console.log('2. Authentication → URL Configuration:');
  console.log('   - Site URL: http://localhost:5173');
  console.log('   - Redirect URLs:');
  console.log('     • http://localhost:5173/auth/callback');
  console.log('     • http://localhost:5173/**');
  console.log('');
  console.log('3. Authentication → Providers → Google:');
  console.log('   - Enabled: ✅');
  console.log('   - Client ID: 設定済み');
  console.log('   - Client Secret: 設定済み');
  console.log('');
  console.log('4. Google Cloud Console:');
  console.log('   https://console.cloud.google.com/apis/credentials');
  console.log('   - Authorized redirect URIs:');
  console.log('     • https://[your-project-id].supabase.co/auth/v1/callback');
  console.log('     • http://localhost:5173/auth/callback');
  console.log('');
}

checkSupabaseAuth()
  .then(() => {
    console.log('✅ チェック完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
