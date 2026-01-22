import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13231SyncStatus() {
  console.log('=== AA13231 の同期状況確認 ===\n');

  // 1. 同期ログを確認
  console.log('1. 同期ログを確認...\n');
  const { data: syncLogs, error: syncError } = await supabase
    .from('sync_logs')
    .select('*')
    .or('entity_id.eq.AA13231,details.ilike.%AA13231%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (syncError) {
    console.error('同期ログ取得エラー:', syncError);
  } else if (syncLogs && syncLogs.length > 0) {
    console.log(`同期ログ: ${syncLogs.length}件\n`);
    syncLogs.forEach(log => {
      console.log(`- ${log.created_at}`);
      console.log(`  操作: ${log.operation}`);
      console.log(`  ステータス: ${log.status}`);
      console.log(`  詳細: ${log.details || '(なし)'}`);
      console.log('');
    });
  } else {
    console.log('AA13231に関する同期ログが見つかりませんでした。\n');
  }

  // 2. 最新の同期実行を確認
  console.log('\n2. 最新の同期実行を確認...\n');
  const { data: recentSyncs, error: recentError } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('entity_type', 'seller')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!recentError && recentSyncs) {
    console.log(`最新の同期: ${recentSyncs.length}件\n`);
    recentSyncs.forEach(log => {
      console.log(`- ${log.created_at}`);
      console.log(`  売主番号: ${log.entity_id}`);
      console.log(`  ステータス: ${log.status}`);
      console.log('');
    });
  }

  // 3. AA13231のupdated_atを確認
  console.log('\n3. AA13231の最終更新日時を確認...\n');
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('seller_number, updated_at, created_at')
    .eq('seller_number', 'AA13231')
    .single();

  if (!sellerError && seller) {
    console.log(`売主番号: ${seller.seller_number}`);
    console.log(`作成日時: ${seller.created_at || '(なし)'}`);
    console.log(`更新日時: ${seller.updated_at}`);
  }

  // 4. 自動同期の設定を確認
  console.log('\n\n4. 自動同期サービスの状態確認...\n');
  console.log('EnhancedAutoSyncServiceが動作しているか確認が必要です。');
  console.log('バックエンドのログを確認してください。');
}

checkAA13231SyncStatus().catch(console.error);
