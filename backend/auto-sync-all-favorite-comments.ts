import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 自動バッチ同期スクリプト
 * Google Sheets APIクォータ制限を考慮して、全ての公開物件のお気に入り文言を同期
 */

const BATCH_SIZE = 20;
const WAIT_TIME_MINUTES = 10; // バッチ間の待機時間（分）
const LOG_FILE = path.join(__dirname, 'auto-sync-log.txt');

interface BatchResult {
  batchNumber: number;
  timestamp: string;
  success: number;
  skipped: number;
  noData: number;
  failed: number;
  quotaError: boolean;
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

function sleep(minutes: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));
}

async function runBatch(batchNumber: number, offset: number): Promise<BatchResult> {
  log(`\n${'='.repeat(60)}`);
  log(`📦 バッチ ${batchNumber} 開始（オフセット: ${offset}）`);
  log(`${'='.repeat(60)}`);

  try {
    const command = `npx ts-node sync-favorite-comments-to-database.ts --limit ${BATCH_SIZE} --offset ${offset}`;
    const output = execSync(command, {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    log(output);

    // 出力から結果を解析
    const successMatch = output.match(/✅ 成功: (\d+)件/);
    const skippedMatch = output.match(/⏭️ スキップ: (\d+)件/);
    const noDataMatch = output.match(/⚠️ データなし: (\d+)件/);
    const failedMatch = output.match(/❌ 失敗: (\d+)件/);
    const quotaError = output.includes('quota') || output.includes('クォータ');

    const result: BatchResult = {
      batchNumber,
      timestamp: new Date().toISOString(),
      success: successMatch ? parseInt(successMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      noData: noDataMatch ? parseInt(noDataMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      quotaError
    };

    log(`\n📊 バッチ ${batchNumber} 結果:`);
    log(`   ✅ 成功: ${result.success}件`);
    log(`   ⏭️ スキップ: ${result.skipped}件`);
    log(`   ⚠️ データなし: ${result.noData}件`);
    log(`   ❌ 失敗: ${result.failed}件`);
    log(`   🔄 クォータエラー: ${result.quotaError ? 'あり' : 'なし'}`);

    return result;
  } catch (error: any) {
    log(`❌ バッチ ${batchNumber} でエラー発生: ${error.message}`);
    return {
      batchNumber,
      timestamp: new Date().toISOString(),
      success: 0,
      skipped: 0,
      noData: 0,
      failed: BATCH_SIZE,
      quotaError: error.message.includes('quota') || error.message.includes('クォータ')
    };
  }
}

async function main() {
  log('🚀 自動バッチ同期開始');
  log(`設定: バッチサイズ=${BATCH_SIZE}件, 待機時間=${WAIT_TIME_MINUTES}分`);
  
  const results: BatchResult[] = [];
  let batchNumber = 1;
  let offset = 0;
  let continueProcessing = true;

  // 最初のバッチは既に完了しているのでスキップ
  log('ℹ️ 最初の20件は既に処理済みのため、21件目から開始します');
  offset = 20;
  batchNumber = 2;

  while (continueProcessing) {
    const result = await runBatch(batchNumber, offset);
    results.push(result);

    // 全てスキップされた場合は終了
    if (result.success === 0 && result.noData === 0 && result.failed === 0 && result.skipped === BATCH_SIZE) {
      log('\n✅ 全ての物件が既に処理済みです。同期完了！');
      continueProcessing = false;
      break;
    }

    // 処理された件数が0の場合も終了
    if (result.success === 0 && result.noData === 0 && result.failed === 0 && result.skipped === 0) {
      log('\n✅ これ以上処理する物件がありません。同期完了！');
      continueProcessing = false;
      break;
    }

    // 次のバッチへ
    batchNumber++;
    offset += BATCH_SIZE;

    // クォータエラーがある場合は待機時間を延長
    const waitTime = result.quotaError ? WAIT_TIME_MINUTES * 1.5 : WAIT_TIME_MINUTES;
    
    if (continueProcessing) {
      log(`\n⏳ ${waitTime}分待機中...（Google Sheets APIクォータ制限対策）`);
      log(`   次のバッチ: ${batchNumber}, オフセット: ${offset}`);
      await sleep(waitTime);
    }
  }

  // 最終結果サマリー
  log('\n' + '='.repeat(60));
  log('🎉 全バッチ処理完了！');
  log('='.repeat(60));
  
  const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalNoData = results.reduce((sum, r) => sum + r.noData, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  
  log('\n📊 全体サマリー:');
  log(`   処理バッチ数: ${results.length}件`);
  log(`   ✅ 成功: ${totalSuccess}件`);
  log(`   ⏭️ スキップ: ${totalSkipped}件`);
  log(`   ⚠️ データなし: ${totalNoData}件`);
  log(`   ❌ 失敗: ${totalFailed}件`);
  log(`\n📝 詳細ログ: ${LOG_FILE}`);
  
  // 失敗があった場合は再試行が必要な物件をリスト
  if (totalNoData > 0 || totalFailed > 0) {
    log('\n⚠️ 注意: データ取得できなかった物件や失敗した物件があります。');
    log('   後ほど個別に再試行することをお勧めします。');
  }
}

main().catch(error => {
  log(`❌ 致命的エラー: ${error.message}`);
  process.exit(1);
});
