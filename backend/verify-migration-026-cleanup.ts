/**
 * Migration 026 Cleanup Verification Script
 * 
 * このスクリプトは、マイグレーション026のクリーンアップが正しく完了したことを確認します。
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  passed: boolean;
  message: string;
}

class Migration026CleanupVerifier {
  private results: VerificationResult[] = [];

  /**
   * すべての検証を実行
   */
  async verify(): Promise<void> {
    console.log('🔍 Verifying Migration 026 Cleanup...\n');

    // 1. マイグレーションファイルが無効化されているか確認
    this.verifyMigrationFilesDisabled();

    // 2. SyncLogServiceの変更を確認
    this.verifySyncLogServiceChanges();

    // 3. EnhancedAutoSyncServiceの変更を確認
    this.verifyEnhancedAutoSyncServiceChanges();

    // 4. ドキュメントの存在を確認
    this.verifyDocumentation();

    // 結果を表示
    this.displayResults();
  }

  /**
   * マイグレーションファイルが無効化されているか確認
   */
  private verifyMigrationFilesDisabled(): void {
    const migrationsDir = path.join(__dirname, 'migrations');
    const expectedDisabledFiles = [
      '026_add_sync_logs.sql.disabled',
      '026_add_sync_logs_fixed.sql.disabled',
      'run-026-migration.ts.disabled',
    ];

    for (const filename of expectedDisabledFiles) {
      const filePath = path.join(migrationsDir, filename);
      if (fs.existsSync(filePath)) {
        this.results.push({
          passed: true,
          message: `✅ ${filename} is disabled`,
        });
      } else {
        this.results.push({
          passed: false,
          message: `❌ ${filename} is NOT disabled`,
        });
      }
    }

    // 元のファイルが存在しないことを確認
    const originalFiles = [
      '026_add_sync_logs.sql',
      '026_add_sync_logs_fixed.sql',
      'run-026-migration.ts',
    ];

    for (const filename of originalFiles) {
      const filePath = path.join(migrationsDir, filename);
      if (!fs.existsSync(filePath)) {
        this.results.push({
          passed: true,
          message: `✅ ${filename} does not exist (correctly disabled)`,
        });
      } else {
        this.results.push({
          passed: false,
          message: `❌ ${filename} still exists (should be disabled)`,
        });
      }
    }
  }

  /**
   * SyncLogServiceの変更を確認
   */
  private verifySyncLogServiceChanges(): void {
    const filePath = path.join(__dirname, 'src', 'services', 'SyncLogService.ts');
    
    if (!fs.existsSync(filePath)) {
      this.results.push({
        passed: false,
        message: '❌ SyncLogService.ts not found',
      });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // sync_logsテーブルへの参照がないことを確認（コメント除く）
    const lines = content.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('//') && !trimmed.startsWith('*');
    });
    const codeContent = codeLines.join('\n');

    if (!codeContent.includes('.from(\'sync_logs\')')) {
      this.results.push({
        passed: true,
        message: '✅ SyncLogService has no sync_logs table references',
      });
    } else {
      this.results.push({
        passed: false,
        message: '❌ SyncLogService still has sync_logs table references',
      });
    }

    // メモリベースのログ管理に変更されていることを確認
    if (content.includes('メモリベースのログ管理')) {
      this.results.push({
        passed: true,
        message: '✅ SyncLogService uses memory-based logging',
      });
    } else {
      this.results.push({
        passed: false,
        message: '❌ SyncLogService does not mention memory-based logging',
      });
    }
  }

  /**
   * EnhancedAutoSyncServiceの変更を確認
   */
  private verifyEnhancedAutoSyncServiceChanges(): void {
    const filePath = path.join(__dirname, 'src', 'services', 'EnhancedAutoSyncService.ts');
    
    if (!fs.existsSync(filePath)) {
      this.results.push({
        passed: false,
        message: '❌ EnhancedAutoSyncService.ts not found',
      });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // getSyncLogServiceのimportがないことを確認
    if (!content.includes('import { getSyncLogService }')) {
      this.results.push({
        passed: true,
        message: '✅ EnhancedAutoSyncService does not import getSyncLogService',
      });
    } else {
      this.results.push({
        passed: false,
        message: '❌ EnhancedAutoSyncService still imports getSyncLogService',
      });
    }

    // logCompleteSyncの呼び出しがないことを確認（コメント除く）
    const lines = content.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('//') && !trimmed.startsWith('*');
    });
    const codeContent = codeLines.join('\n');

    if (!codeContent.includes('logCompleteSync(')) {
      this.results.push({
        passed: true,
        message: '✅ EnhancedAutoSyncService does not call logCompleteSync',
      });
    } else {
      this.results.push({
        passed: false,
        message: '❌ EnhancedAutoSyncService still calls logCompleteSync',
      });
    }
  }

  /**
   * ドキュメントの存在を確認
   */
  private verifyDocumentation(): void {
    const docs = [
      'MIGRATION_026_CLEANUP_COMPLETE.md',
      'MIGRATION_026_CLEANUP_SUMMARY.md',
      'MIGRATION_026_QUICK_REFERENCE.md',
    ];

    for (const doc of docs) {
      const filePath = path.join(__dirname, doc);
      if (fs.existsSync(filePath)) {
        this.results.push({
          passed: true,
          message: `✅ ${doc} exists`,
        });
      } else {
        this.results.push({
          passed: false,
          message: `❌ ${doc} is missing`,
        });
      }
    }
  }

  /**
   * 結果を表示
   */
  private displayResults(): void {
    console.log('\n📊 Verification Results:\n');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    for (const result of this.results) {
      console.log(result.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Total: ${total} checks`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('\n🎉 All verification checks passed!');
      console.log('Migration 026 cleanup is complete and correct.\n');
    } else {
      console.log('\n⚠️  Some verification checks failed.');
      console.log('Please review the failed checks above.\n');
      process.exit(1);
    }
  }
}

// スクリプトを実行
const verifier = new Migration026CleanupVerifier();
verifier.verify().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
