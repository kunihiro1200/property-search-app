import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixAutoSyncIssues() {
  console.log('\n=== 自動同期問題の自動修正 ===\n');

  let issuesFixed = 0;
  let issuesRemaining = 0;

  try {
    // 問題1: sync_logsテーブルの確認と作成
    console.log('【問題1】sync_logsテーブルの確認...');
    const { error: syncLogsError } = await supabase
      .from('sync_logs')
      .select('id')
      .limit(1);

    if (syncLogsError && (syncLogsError.code === '42P01' || syncLogsError.message.includes('does not exist'))) {
      console.log('❌ sync_logsテーブルが存在しません');
      console.log('   マイグレーション026を実行します...');
      
      try {
        execSync('npx ts-node migrations/run-026-migration.ts', { 
          cwd: __dirname,
          stdio: 'inherit'
        });
        console.log('✅ マイグレーション026を実行しました');
        issuesFixed++;
      } catch (error) {
        console.log('⚠️  マイグレーション026の実行に失敗しました');
        console.log('   手動で実行してください: npx ts-node migrations/run-026-migration.ts');
        issuesRemaining++;
      }
    } else if (syncLogsError) {
      console.log('⚠️  sync_logsテーブルへのアクセスエラー:', syncLogsError.message);
      issuesRemaining++;
    } else {
      console.log('✅ sync_logsテーブルは既に存在します');
    }

    // 問題2: buyers.updated_atカラムの確認
    console.log('\n【問題2】buyers.updated_atカラムの確認...');
    const { error: updatedAtError } = await supabase
      .from('buyers')
      .select('buyer_id, updated_at')
      .limit(1);

    if (updatedAtError && updatedAtError.message.includes('updated_at')) {
      console.log('❌ buyers.updated_atカラムが存在しません');
      console.log('   マイグレーション042を実行します...');
      
      try {
        execSync('npx ts-node migrations/run-042-migration.ts', { 
          cwd: __dirname,
          stdio: 'inherit'
        });
        console.log('✅ マイグレーション042を実行しました');
        issuesFixed++;
      } catch (error) {
        console.log('⚠️  マイグレーション042の実行に失敗しました');
        console.log('   手動で実行してください: npx ts-node migrations/run-042-migration.ts');
        issuesRemaining++;
      }
    } else if (updatedAtError) {
      console.log('⚠️  buyersテーブルへのアクセスエラー:', updatedAtError.message);
      issuesRemaining++;
    } else {
      console.log('✅ buyers.updated_atカラムは既に存在します');
    }

    // 問題3: Google認証情報の確認と設定
    console.log('\n【問題3】Google認証情報の確認...');
    const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const hasPrivateKey = !!process.env.GOOGLE_PRIVATE_KEY;

    if (!hasEmail || !hasPrivateKey) {
      console.log('❌ Google認証情報が未設定です');
      console.log(`   GOOGLE_SERVICE_ACCOUNT_EMAIL: ${hasEmail ? '✅' : '❌'}`);
      console.log(`   GOOGLE_PRIVATE_KEY: ${hasPrivateKey ? '✅' : '❌'}`);
      console.log('   認証情報を抽出します...');
      
      try {
        execSync('npx ts-node extract-google-credentials.ts', { 
          cwd: __dirname,
          stdio: 'inherit'
        });
        console.log('✅ Google認証情報を設定しました');
        issuesFixed++;
      } catch (error) {
        console.log('⚠️  認証情報の抽出に失敗しました');
        console.log('   手動で実行してください: npx ts-node extract-google-credentials.ts');
        issuesRemaining++;
      }
    } else {
      console.log('✅ Google認証情報は既に設定されています');
    }

    // 結果のサマリー
    console.log('\n=== 修正結果 ===\n');
    console.log(`修正した問題: ${issuesFixed} 件`);
    console.log(`残っている問題: ${issuesRemaining} 件`);

    if (issuesFixed > 0) {
      console.log('\n✅ 問題を修正しました！');
      console.log('\n次のステップ:');
      console.log('1. バックエンドサーバーを再起動してください');
      console.log('2. 診断ツールを再実行して確認:');
      console.log('   npx ts-node diagnose-auto-sync-status.ts');
    }

    if (issuesRemaining > 0) {
      console.log('\n⚠️  一部の問題が残っています');
      console.log('   詳細は AUTO_SYNC_DIAGNOSTIC_FIX_GUIDE.md を参照してください');
    }

    if (issuesFixed === 0 && issuesRemaining === 0) {
      console.log('\n✅ すべての問題は既に解決されています！');
      console.log('   診断ツールを実行して確認:');
      console.log('   npx ts-node diagnose-auto-sync-status.ts');
    }

  } catch (error) {
    console.error('\n❌ 修正中にエラーが発生しました:', error);
  }
}

fixAutoSyncIssues();
