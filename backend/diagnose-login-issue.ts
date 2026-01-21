// ログイン問題の診断
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function diagnoseLoginIssue() {
  console.log('=== ログイン問題の診断 ===\n');
  
  try {
    // 1. 環境変数の確認
    console.log('1. 環境変数の確認:');
    console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '❌ 未設定');
    console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '設定済み' : '❌ 未設定');
    console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '設定済み' : '❌ 未設定');
    
    // 2. Supabase接続テスト
    console.log('\n2. Supabase接続テスト:');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // employeesテーブルの確認
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, email, name, role')
      .limit(5);
    
    if (employeesError) {
      console.log('  ❌ employeesテーブルへのアクセスエラー:', employeesError.message);
    } else {
      console.log('  ✓ employeesテーブルへのアクセス成功');
      console.log(`  従業員数: ${employees?.length || 0}件`);
      if (employees && employees.length > 0) {
        console.log('  最初の従業員:', employees[0].email);
      }
    }
    
    // 3. ログインAPIエンドポイントのテスト
    console.log('\n3. ログインAPIエンドポイントのテスト:');
    const apiUrl = 'http://localhost:3000';
    
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123'
        })
      });
      
      console.log(`  HTTPステータス: ${response.status}`);
      
      const data = await response.json();
      console.log('  レスポンス:', JSON.stringify(data, null, 2));
      
    } catch (fetchError: any) {
      console.log('  ❌ APIエンドポイントへのアクセスエラー:', fetchError.message);
    }
    
    // 4. フロントエンドの確認
    console.log('\n4. フロントエンドの確認:');
    console.log('  ローカルURL: http://localhost:5174');
    console.log('  本番URL: https://property-site-frontend-kappa.vercel.app');
    
    console.log('\n=== 診断完了 ===');
    console.log('\n推奨事項:');
    console.log('1. ブラウザのコンソールでエラーの詳細を確認');
    console.log('2. ネットワークタブでAPIリクエストを確認');
    console.log('3. フロントエンドのログインコンポーネントを確認');
    
  } catch (error: any) {
    console.error('❌ 診断エラー:', error.message);
    throw error;
  }
}

diagnoseLoginIssue().catch(console.error);
