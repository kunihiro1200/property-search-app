/**
 * 削除同期機能の設定確認スクリプト
 * 
 * DELETION_SYNC_ENABLED が false に設定されていることを確認します
 */
import dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

function verifyDeletionSyncConfig() {
  console.log('🔍 削除同期機能の設定を確認中...\n');
  
  const config = {
    enabled: process.env.DELETION_SYNC_ENABLED === 'true',
    strictValidation: process.env.DELETION_VALIDATION_STRICT === 'true',
    recentActivityDays: parseInt(process.env.DELETION_RECENT_ACTIVITY_DAYS || '7'),
    sendAlerts: process.env.DELETION_SEND_ALERTS === 'true',
    maxPerSync: parseInt(process.env.DELETION_MAX_PER_SYNC || '100')
  };
  
  console.log('📋 現在の設定:');
  console.log('─'.repeat(50));
  console.log(`DELETION_SYNC_ENABLED:          ${config.enabled ? '✅ 有効' : '❌ 無効'}`);
  console.log(`DELETION_VALIDATION_STRICT:     ${config.strictValidation ? '✅ 有効' : '❌ 無効'}`);
  console.log(`DELETION_RECENT_ACTIVITY_DAYS:  ${config.recentActivityDays}日`);
  console.log(`DELETION_SEND_ALERTS:           ${config.sendAlerts ? '✅ 有効' : '❌ 無効'}`);
  console.log(`DELETION_MAX_PER_SYNC:          ${config.maxPerSync}件`);
  console.log('─'.repeat(50));
  
  console.log('\n📝 設定の説明:');
  console.log('');
  console.log('DELETION_SYNC_ENABLED = false');
  console.log('  → スプレッドシートから削除された売主を自動的に');
  console.log('     データベースから削除する機能は無効化されています');
  console.log('');
  console.log('この設定により:');
  console.log('  ✅ スプレッドシートから売主が削除されても');
  console.log('     データベースには残り続けます');
  console.log('  ✅ 誤削除のリスクがありません');
  console.log('  ✅ 過去のデータを保持できます');
  console.log('');
  
  if (config.enabled) {
    console.log('⚠️  警告: 削除同期機能が有効になっています！');
    console.log('');
    console.log('本番環境では削除同期機能を使用しない方針です。');
    console.log('backend/.env ファイルで以下のように設定してください:');
    console.log('');
    console.log('  DELETION_SYNC_ENABLED=false');
    console.log('');
    return false;
  } else {
    console.log('✅ 削除同期機能は正しく無効化されています');
    console.log('');
    console.log('🎉 Phase 3 ステップ1 完了！');
    console.log('');
    console.log('次のステップ:');
    console.log('  1. バックエンドサーバーを再起動して設定を反映');
    console.log('     cd backend && npm run dev');
    console.log('');
    console.log('  2. Phase 3 の次の機能（手動更新または自動更新）の');
    console.log('     実装方針を決定');
    console.log('');
    return true;
  }
}

// 実行
const success = verifyDeletionSyncConfig();
process.exit(success ? 0 : 1);
