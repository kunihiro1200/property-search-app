// 復旧プロセスのログ管理サービス
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface RecoveryResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  inserted: number;
  failed: number;
  skipped: number;
  errors: RecoveryError[];
  duration: number;
}

export interface RecoveryError {
  row: number;
  buyerNumber: string | null;
  message: string;
  errorType: RecoveryErrorType;
  timestamp: string;
}

export enum RecoveryErrorType {
  VALIDATION_ERROR = 'validation_error',
  DATABASE_ERROR = 'database_error',
  DUPLICATE_ERROR = 'duplicate_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface RecoveryLog {
  id: string;
  startTime: string;
  endTime: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  result: RecoveryResult | null;
}

/**
 * 復旧プロセスのログを管理するサービス
 */
export class RecoveryLogger {
  private supabase;
  private logs: Map<string, RecoveryLog>;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.logs = new Map();
  }

  /**
   * 復旧開始をログに記録
   */
  async logRecoveryStart(totalRows: number): Promise<string> {
    const logId = uuidv4();
    const startTime = new Date().toISOString();

    const log: RecoveryLog = {
      id: logId,
      startTime,
      endTime: null,
      status: 'in_progress',
      totalRows,
      processedRows: 0,
      result: null
    };

    this.logs.set(logId, log);

    console.log(`[Recovery ${logId}] 復旧開始: ${totalRows}行`);
    console.log(`[Recovery ${logId}] 開始時刻: ${startTime}`);

    // データベースにログを記録（オプション）
    try {
      await this.supabase
        .from('recovery_logs')
        .insert({
          id: logId,
          start_time: startTime,
          status: 'in_progress',
          total_rows: totalRows,
          processed_rows: 0
        });
    } catch (error) {
      // ログテーブルが存在しない場合はスキップ
      console.warn('復旧ログテーブルが存在しません。メモリ内でのみログを管理します。');
    }

    return logId;
  }

  /**
   * 復旧進捗をログに記録
   */
  async logRecoveryProgress(logId: string, processedRows: number): Promise<void> {
    const log = this.logs.get(logId);
    if (!log) {
      console.warn(`[Recovery ${logId}] ログが見つかりません`);
      return;
    }

    log.processedRows = processedRows;
    const percentage = Math.round((processedRows / log.totalRows) * 100);

    console.log(`[Recovery ${logId}] 進捗: ${processedRows}/${log.totalRows} (${percentage}%)`);

    // データベースに進捗を記録（オプション）
    try {
      await this.supabase
        .from('recovery_logs')
        .update({
          processed_rows: processedRows
        })
        .eq('id', logId);
    } catch (error) {
      // エラーは無視（ログテーブルが存在しない場合）
    }
  }

  /**
   * 復旧完了をログに記録
   */
  async logRecoveryComplete(logId: string, result: RecoveryResult): Promise<void> {
    const log = this.logs.get(logId);
    if (!log) {
      console.warn(`[Recovery ${logId}] ログが見つかりません`);
      return;
    }

    const endTime = new Date().toISOString();
    log.endTime = endTime;
    log.status = result.success ? 'completed' : 'failed';
    log.result = result;
    log.processedRows = result.totalRows;

    console.log(`[Recovery ${logId}] 復旧完了`);
    console.log(`[Recovery ${logId}] 終了時刻: ${endTime}`);
    console.log(`[Recovery ${logId}] ステータス: ${log.status}`);
    console.log(`[Recovery ${logId}] 処理時間: ${result.duration}ms`);
    console.log(`[Recovery ${logId}] 挿入: ${result.inserted}件`);
    console.log(`[Recovery ${logId}] 失敗: ${result.failed}件`);
    console.log(`[Recovery ${logId}] スキップ: ${result.skipped}件`);

    if (result.errors.length > 0) {
      console.log(`[Recovery ${logId}] エラー数: ${result.errors.length}`);
      console.log(`[Recovery ${logId}] 最初の5件のエラー:`);
      result.errors.slice(0, 5).forEach(error => {
        console.log(`  - 行${error.row}: ${error.message}`);
      });
    }

    // データベースに完了を記録（オプション）
    try {
      await this.supabase
        .from('recovery_logs')
        .update({
          end_time: endTime,
          status: log.status,
          processed_rows: log.processedRows,
          result: JSON.stringify(result)
        })
        .eq('id', logId);
    } catch (error) {
      // エラーは無視（ログテーブルが存在しない場合）
    }
  }

  /**
   * 復旧履歴を取得
   */
  async getRecoveryHistory(limit: number = 10): Promise<RecoveryLog[]> {
    // メモリ内のログを返す
    const memoryLogs = Array.from(this.logs.values())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);

    // データベースからも取得を試みる
    try {
      const { data, error } = await this.supabase
        .from('recovery_logs')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          startTime: row.start_time,
          endTime: row.end_time,
          status: row.status,
          totalRows: row.total_rows,
          processedRows: row.processed_rows,
          result: row.result ? JSON.parse(row.result) : null
        }));
      }
    } catch (error) {
      // エラーは無視（ログテーブルが存在しない場合）
    }

    return memoryLogs;
  }

  /**
   * 特定の復旧ログを取得
   */
  getRecoveryLog(logId: string): RecoveryLog | null {
    return this.logs.get(logId) || null;
  }

  /**
   * エラーログをファイルに出力
   */
  async exportErrorLog(logId: string, filePath: string): Promise<void> {
    const log = this.logs.get(logId);
    if (!log || !log.result) {
      throw new Error(`ログ ${logId} が見つからないか、結果がありません`);
    }

    const fs = require('fs');
    const lines: string[] = [];

    lines.push('=== 買主データ復旧エラーログ ===');
    lines.push(`復旧ID: ${logId}`);
    lines.push(`開始時刻: ${log.startTime}`);
    lines.push(`終了時刻: ${log.endTime}`);
    lines.push(`ステータス: ${log.status}`);
    lines.push(`処理時間: ${log.result.duration}ms`);
    lines.push('');
    lines.push('=== サマリー ===');
    lines.push(`総行数: ${log.result.totalRows}`);
    lines.push(`有効行数: ${log.result.validRows}`);
    lines.push(`挿入: ${log.result.inserted}件`);
    lines.push(`失敗: ${log.result.failed}件`);
    lines.push(`スキップ: ${log.result.skipped}件`);
    lines.push('');

    if (log.result.errors.length > 0) {
      lines.push('=== エラー詳細 ===');
      for (const error of log.result.errors) {
        lines.push(`行 ${error.row} [${error.errorType}]:`);
        lines.push(`  買主番号: ${error.buyerNumber || 'N/A'}`);
        lines.push(`  メッセージ: ${error.message}`);
        lines.push(`  タイムスタンプ: ${error.timestamp}`);
        lines.push('');
      }
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`エラーログを出力しました: ${filePath}`);
  }

  /**
   * サマリーレポートを生成
   */
  generateSummaryReport(logId: string): string {
    const log = this.logs.get(logId);
    if (!log || !log.result) {
      return `ログ ${logId} が見つからないか、結果がありません`;
    }

    const lines: string[] = [];
    const result = log.result;

    lines.push('╔════════════════════════════════════════════════════════════╗');
    lines.push('║         買主データ復旧 - サマリーレポート                  ║');
    lines.push('╚════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`復旧ID: ${logId}`);
    lines.push(`開始時刻: ${log.startTime}`);
    lines.push(`終了時刻: ${log.endTime}`);
    lines.push(`処理時間: ${(result.duration / 1000).toFixed(2)}秒`);
    lines.push('');
    lines.push('--- 処理結果 ---');
    lines.push(`総行数: ${result.totalRows}行`);
    lines.push(`有効行数: ${result.validRows}行`);
    lines.push(`挿入成功: ${result.inserted}件`);
    lines.push(`失敗: ${result.failed}件`);
    lines.push(`スキップ: ${result.skipped}件`);
    lines.push('');

    const successRate = result.totalRows > 0 
      ? ((result.inserted / result.totalRows) * 100).toFixed(2)
      : '0.00';
    lines.push(`成功率: ${successRate}%`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push('--- エラーサマリー ---');
      const errorTypes = new Map<RecoveryErrorType, number>();
      for (const error of result.errors) {
        errorTypes.set(error.errorType, (errorTypes.get(error.errorType) || 0) + 1);
      }

      for (const [type, count] of errorTypes.entries()) {
        lines.push(`  ${type}: ${count}件`);
      }
      lines.push('');
      lines.push(`詳細は exportErrorLog() でファイルに出力できます`);
    }

    if (result.success) {
      lines.push('✅ 復旧が正常に完了しました');
    } else {
      lines.push('❌ 復旧中にエラーが発生しました');
    }

    return lines.join('\n');
  }
}
