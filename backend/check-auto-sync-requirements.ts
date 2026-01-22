/**
 * 自動同期の必要要件チェックスクリプト
 * Phase 3エラーの原因を診断します
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface CheckResult {
  name: string;
  status: 'OK' | 'MISSING' | 'ERROR';
  message: string;
  action?: string;
}

async function checkRequirements(): Promise<void> {
  console.log('🔍 自動同期の必要要件をチェックしています...\n');

  const results: CheckResult[] = [];

  // Check 1: sellers.deleted_at カラム
  try {
    const { error } = await supabase
      .from('sellers')
      .select('deleted_at')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('deleted_at')) {
        results.push({
          name: 'sellers.deleted_at カラム',
          status: 'MISSING',
          message: 'カラムが存在しません',
          action: 'Migration 051を実行してください: npx ts-node migrations/run-051-migration.ts',
        });
      } else {
        results.push({
          name: 'sellers.deleted_at カラム',
          status: 'ERROR',
          message: `エラー: ${error.message}`,
        });
      }
    } else {
      results.push({
        name: 'sellers.deleted_at カラム',
        status: 'OK',
        message: 'カラムが存在します',
      });
    }
  } catch (error: any) {
    results.push({
      name: 'sellers.deleted_at カラム',
      status: 'ERROR',
      message: `チェック失敗: ${error.message}`,
    });
  }

  // Check 2: properties.deleted_at カラム
  try {
    const { error } = await supabase
      .from('properties')
      .select('deleted_at')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('deleted_at')) {
        results.push({
          name: 'properties.deleted_at カラム',
          status: 'MISSING',
          message: 'カラムが存在しません',
          action: 'Migration 051を実行してください',
        });
      } else {
        results.push({
          name: 'properties.deleted_at カラム',
          status: 'ERROR',
          message: `エラー: ${error.message}`,
        });
      }
    } else {
      results.push({
        name: 'properties.deleted_at カラム',
        status: 'OK',
        message: 'カラムが存在します',
      });
    }
  } catch (error: any) {
    results.push({
      name: 'properties.deleted_at カラム',
      status: 'ERROR',
      message: `チェック失敗: ${error.message}`,
    });
  }

  // Check 3: seller_deletion_audit テーブル
  try {
    const { error } = await supabase
      .from('seller_deletion_audit')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        results.push({
          name: 'seller_deletion_audit テーブル',
          status: 'MISSING',
          message: 'テーブルが存在しません',
          action: 'Migration 051を実行してください',
        });
      } else {
        results.push({
          name: 'seller_deletion_audit テーブル',
          status: 'ERROR',
          message: `エラー: ${error.message}`,
        });
      }
    } else {
      results.push({
        name: 'seller_deletion_audit テーブル',
        status: 'OK',
        message: 'テーブルが存在します',
      });
    }
  } catch (error: any) {
    results.push({
      name: 'seller_deletion_audit テーブル',
      status: 'ERROR',
      message: `チェック失敗: ${error.message}`,
    });
  }

  // Check 4: sync_health テーブル
  try {
    const { data, error } = await supabase
      .from('sync_health')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') || 
          error.message.includes('does not exist') ||
          error.message.includes('schema cache')) {
        results.push({
          name: 'sync_health テーブル',
          status: 'MISSING',
          message: 'テーブルが存在しません',
          action: 'Migration 039を実行してください: npx ts-node migrations/run-039-migration.ts',
        });
      } else {
        results.push({
          name: 'sync_health テーブル',
          status: 'ERROR',
          message: `エラー: ${error.message}`,
        });
      }
    } else {
      results.push({
        name: 'sync_health テーブル',
        status: 'OK',
        message: 'テーブルが存在します',
      });
      
      if (data && data.length > 0) {
        console.log(`   📊 現在のヘルス状態: ${data[0].is_healthy ? '正常' : '異常'}`);
        if (data[0].last_sync_time) {
          console.log(`   📅 最終同期: ${new Date(data[0].last_sync_time).toLocaleString('ja-JP')}`);
        }
      }
    }
  } catch (error: any) {
    results.push({
      name: 'sync_health テーブル',
      status: 'ERROR',
      message: `チェック失敗: ${error.message}`,
    });
  }

  // Check 5: sync_logs テーブルの拡張カラム
  try {
    const { error } = await supabase
      .from('sync_logs')
      .select('missing_sellers_detected, triggered_by, health_status')
      .limit(1);

    if (error) {
      if (error.message.includes('column')) {
        results.push({
          name: 'sync_logs 拡張カラム',
          status: 'MISSING',
          message: '一部のカラムが存在しません',
          action: 'Migration 039を実行してください',
        });
      } else {
        results.push({
          name: 'sync_logs 拡張カラム',
          status: 'ERROR',
          message: `エラー: ${error.message}`,
        });
      }
    } else {
      results.push({
        name: 'sync_logs 拡張カラム',
        status: 'OK',
        message: '拡張カラムが存在します',
      });
    }
  } catch (error: any) {
    results.push({
      name: 'sync_logs 拡張カラム',
      status: 'ERROR',
      message: `チェック失敗: ${error.message}`,
    });
  }

  // 結果を表示
  console.log('\n📊 チェック結果:\n');
  
  let hasIssues = false;
  const migration051Needed: string[] = [];
  const migration039Needed: string[] = [];

  for (const result of results) {
    const icon = result.status === 'OK' ? '✅' : result.status === 'MISSING' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}: ${result.message}`);
    
    if (result.status !== 'OK') {
      hasIssues = true;
      
      if (result.action?.includes('051')) {
        migration051Needed.push(result.name);
      }
      if (result.action?.includes('039')) {
        migration039Needed.push(result.name);
      }
    }
  }

  // アクションプランを表示
  if (hasIssues) {
    console.log('\n🔧 必要なアクション:\n');
    
    if (migration051Needed.length > 0) {
      console.log('1️⃣ Migration 051を実行してください:');
      console.log('   npx ts-node migrations/run-051-migration.ts');
      console.log('   対象:');
      for (const item of migration051Needed) {
        console.log(`   - ${item}`);
      }
      console.log('');
    }
    
    if (migration039Needed.length > 0) {
      console.log('2️⃣ Migration 039を実行してください:');
      console.log('   npx ts-node migrations/run-039-migration.ts');
      console.log('   対象:');
      for (const item of migration039Needed) {
        console.log(`   - ${item}`);
      }
      console.log('');
    }
    
    console.log('3️⃣ バックエンドサーバーを再起動してください:');
    console.log('   npm run dev');
    console.log('');
    
    console.log('📖 詳細なガイド: backend/今すぐ実行_自動同期修正_完全ガイド.md');
  } else {
    console.log('\n🎉 すべての要件が満たされています！');
    console.log('   自動同期は正常に動作するはずです。');
    console.log('');
    console.log('📊 バックエンドログで以下を確認してください:');
    console.log('   - Phase 3: Seller Deletion Sync が正常完了');
    console.log('   - Phase 4.5: Property Listing Update Sync が実行');
  }
}

// 実行
checkRequirements()
  .then(() => {
    console.log('\n✅ チェック完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ チェック中にエラーが発生しました:', error.message);
    process.exit(1);
  });
