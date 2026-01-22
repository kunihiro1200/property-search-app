#!/usr/bin/env ts-node
// 買主データ復旧CLIツール
import dotenv from 'dotenv';
import { BuyerDataRecoveryService } from './src/services/BuyerDataRecoveryService';
import { BuyerBackupService } from './src/services/BuyerBackupService';

dotenv.config();

interface CLIOptions {
  dryRun: boolean;
  createBackup: boolean;
  recover: boolean;
  verify: boolean;
  restore: string | null;
  listBackups: boolean;
}

/**
 * コマンドライン引数をパース
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  
  const options: CLIOptions = {
    dryRun: false,
    createBackup: false,
    recover: false,
    verify: false,
    restore: null,
    listBackups: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--create-backup':
        options.createBackup = true;
        break;
      case '--recover':
        options.recover = true;
        break;
      case '--verify':
        options.verify = true;
        break;
      case '--restore':
        options.restore = args[++i] || null;
        break;
      case '--list-backups':
        options.listBackups = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        console.error(`不明なオプション: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

/**
 * ヘルプメッセージを表示
 */
function printHelp(): void {
  console.log(`
買主データ復旧ツール

使用方法:
  npx ts-node recover-buyer-data.ts [オプション]

オプション:
  --dry-run           ドライラン（検証のみ、実際の挿入は行わない）
  --create-backup     既存データのバックアップを作成
  --recover           実際の復元を実行
  --verify            データ検証のみ実行
  --restore <ID>      指定したバックアップからリストア
  --list-backups      バックアップ一覧を表示
  --help, -h          このヘルプメッセージを表示

実行例:
  # 1. ドライランで検証
  npx ts-node recover-buyer-data.ts --dry-run

  # 2. バックアップを作成
  npx ts-node recover-buyer-data.ts --create-backup

  # 3. 実際の復元（バックアップ付き）
  npx ts-node recover-buyer-data.ts --recover --create-backup

  # 4. バックアップからリストア
  npx ts-node recover-buyer-data.ts --restore <backup-id>

  # 5. バックアップ一覧を表示
  npx ts-node recover-buyer-data.ts --list-backups

推奨手順:
  1. まずドライランで検証: --dry-run
  2. 問題なければバックアップ作成: --create-backup
  3. 本番復元: --recover --create-backup
  4. 問題があればリストア: --restore <backup-id>
`);
}

/**
 * メイン処理
 */
async function main() {
  const options = parseArgs();
  const recoveryService = new BuyerDataRecoveryService();
  const backupService = new BuyerBackupService();

  try {
    // バックアップ一覧表示
    if (options.listBackups) {
      console.log('=== バックアップ一覧 ===\n');
      const backups = await backupService.listBackups(20);
      
      if (backups.length === 0) {
        console.log('バックアップが見つかりません');
      } else {
        console.log('ID                                   | 作成日時                | 件数  | 説明');
        console.log('─'.repeat(100));
        for (const backup of backups) {
          const date = new Date(backup.created_at).toLocaleString('ja-JP');
          const desc = backup.description || '-';
          console.log(`${backup.id} | ${date} | ${backup.record_count.toString().padStart(5)} | ${desc}`);
        }
      }
      return;
    }

    // バックアップからリストア
    if (options.restore) {
      console.log('⚠️  警告: バックアップからリストアすると、現在のデータが上書きされます');
      console.log('');
      
      const result = await recoveryService.restoreFromBackup(options.restore);
      
      if (result.success) {
        console.log('✅ リストアが正常に完了しました');
        process.exit(0);
      } else {
        console.error('❌ リストアに失敗しました');
        process.exit(1);
      }
    }

    // バックアップのみ作成
    if (options.createBackup && !options.recover) {
      console.log('=== バックアップ作成 ===\n');
      const backupResult = await backupService.createBackup('手動バックアップ');
      
      if (backupResult.success) {
        console.log('✅ バックアップが正常に作成されました');
        console.log(`バックアップID: ${backupResult.backupId}`);
        console.log(`レコード数: ${backupResult.recordCount}件`);
        process.exit(0);
      } else {
        console.error('❌ バックアップの作成に失敗しました');
        process.exit(1);
      }
    }

    // 検証のみ
    if (options.verify) {
      console.log('=== データ検証 ===\n');
      const validationResult = await recoveryService.validateSpreadsheetData();
      
      console.log(`総行数: ${validationResult.totalRows}`);
      console.log(`有効行数: ${validationResult.validRows}`);
      console.log(`無効行数: ${validationResult.invalidRows}`);
      console.log(`エラー数: ${validationResult.errors.length}`);
      console.log(`警告数: ${validationResult.warnings.length}`);
      
      if (validationResult.isValid) {
        console.log('\n✅ すべてのデータが検証に合格しました');
        process.exit(0);
      } else {
        console.log('\n❌ 検証エラーがあります');
        
        // 最初の10件のエラーを表示
        if (validationResult.errors.length > 0) {
          console.log('\n最初の10件のエラー:');
          validationResult.errors.slice(0, 10).forEach(error => {
            console.log(`  行${error.row}: ${error.field} - ${error.message}`);
          });
        }
        
        process.exit(1);
      }
    }

    // ドライランまたは本番復元
    if (options.dryRun || options.recover) {
      const recoveryOptions = {
        dryRun: options.dryRun,
        createBackup: options.createBackup && options.recover,
        onProgress: (progress: any) => {
          // 進捗表示（オプション）
        }
      };

      const result = await recoveryService.recoverAll(recoveryOptions);
      
      if (result.success) {
        console.log('\n✅ 処理が正常に完了しました');
        
        if (options.dryRun) {
          console.log('\nℹ️  これはドライランです。実際のデータ挿入は行われませんでした。');
          console.log('   本番復元を実行するには: --recover --create-backup');
        }
        
        process.exit(0);
      } else {
        console.error('\n❌ 処理に失敗しました');
        process.exit(1);
      }
    }

    // オプションが指定されていない場合
    console.log('オプションを指定してください。--help でヘルプを表示します。');
    printHelp();
    process.exit(1);

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
main();
