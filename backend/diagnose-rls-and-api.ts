/**
 * RLSポリシーとAPI接続を診断
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseRLSAndAPI() {
  console.log('🔍 RLSポリシーとAPI接続を診断中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

  // 1. サービスロールでアクセス（RLSをバイパス）
  console.log('1️⃣ サービスロールでアクセス（RLSバイパス）...');
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: serviceData, error: serviceError } = await supabaseService
    .from('sellers')
    .select('id, seller_number, name, status')
    .limit(5);

  if (serviceError) {
    console.error('❌ エラー:', serviceError.message);
  } else {
    console.log('✅ 成功:', serviceData?.length, '件取得');
    if (serviceData && serviceData.length > 0) {
      console.log('   Sample:', serviceData[0]);
    }
  }

  console.log('');

  // 2. Anonキーでアクセス（RLSが適用される）
  console.log('2️⃣ Anonキーでアクセス（RLS適用）...');
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: anonData, error: anonError } = await supabaseAnon
    .from('sellers')
    .select('id, seller_number, name, status')
    .limit(5);

  if (anonError) {
    console.error('❌ エラー:', anonError.message);
    console.error('   Code:', anonError.code);
    console.error('   Details:', anonError.details);
    console.error('   Hint:', anonError.hint);
  } else {
    console.log('✅ 成功:', anonData?.length, '件取得');
    if (anonData && anonData.length > 0) {
      console.log('   Sample:', anonData[0]);
    }
  }

  console.log('');

  // 3. RLSポリシーの確認
  console.log('3️⃣ RLSポリシーの確認...');
  const { data: policies, error: policiesError } = await supabaseService
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'sellers');

  if (policiesError) {
    console.error('❌ エラー:', policiesError.message);
  } else {
    console.log('✅ ポリシー数:', policies?.length || 0);
    if (policies && policies.length > 0) {
      policies.forEach((policy: any) => {
        console.log(`   - ${policy.policyname}`);
        console.log(`     Roles: ${policy.roles}`);
        console.log(`     Command: ${policy.cmd}`);
      });
    } else {
      console.log('   ⚠️  ポリシーが見つかりません');
    }
  }

  console.log('');

  // 4. RLSが有効かどうか確認
  console.log('4️⃣ RLSが有効かどうか確認...');
  const { data: rlsStatus, error: rlsError } = await supabaseService.rpc('check_rls_status', {
    table_name: 'sellers'
  }).single();

  if (rlsError) {
    // RPCが存在しない場合は直接クエリ
    const { data: tableInfo, error: tableError } = await supabaseService
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'sellers')
      .single();

    if (tableError) {
      console.error('❌ エラー:', tableError.message);
    } else {
      console.log('✅ RLS有効:', tableInfo?.relrowsecurity ? 'はい' : 'いいえ');
    }
  } else {
    console.log('✅ RLS有効:', rlsStatus);
  }

  console.log('');

  // 5. 総件数確認
  console.log('5️⃣ 総件数確認...');
  const { count, error: countError } = await supabaseService
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ エラー:', countError.message);
  } else {
    console.log('✅ 総件数:', count, '件');
  }

  console.log('\n📋 診断結果:');
  console.log('---');
  
  if (serviceData && serviceData.length > 0) {
    console.log('✅ データベースにデータが存在します');
  } else {
    console.log('❌ データベースにデータがありません');
  }

  if (anonData && anonData.length > 0) {
    console.log('✅ RLSポリシーが正しく設定されています');
  } else {
    console.log('❌ RLSポリシーに問題があります');
    console.log('');
    console.log('💡 解決策:');
    console.log('1. Supabase SQL Editorで以下を実行:');
    console.log('   ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('2. または、認証済みユーザー用のポリシーを作成:');
    console.log('   CREATE POLICY "Enable read for all" ON sellers FOR SELECT USING (true);');
  }
}

diagnoseRLSAndAPI();
