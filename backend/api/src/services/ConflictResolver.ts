/**
 * ConflictResolver - 双方向同期の競合検出・解決サービス
 * 
 * スプレッドシートとDBの間の競合を検出し、解決策を提供します。
 */

import { BuyerWriteService } from './BuyerWriteService';
import { BuyerColumnMapper } from './BuyerColumnMapper';

export interface ConflictInfo {
  fieldName: string;
  dbValue: any;
  spreadsheetValue: any;
  expectedValue: any;
  lastSyncedAt?: Date;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ConflictInfo[];
  canAutoResolve: boolean;
}

export interface ConflictResolution {
  strategy: 'db_wins' | 'spreadsheet_wins' | 'manual';
  resolvedValues: Record<string, any>;
}

export class ConflictResolver {
  private writeService: BuyerWriteService;
  private columnMapper: BuyerColumnMapper;

  constructor(writeService: BuyerWriteService, columnMapper: BuyerColumnMapper) {
    this.writeService = writeService;
    this.columnMapper = columnMapper;
  }

  /**
   * 競合をチェック
   * @param buyerNumber 買主番号
   * @param dbValues DBの現在値
   * @param expectedSpreadsheetValues 期待されるスプレッドシートの値（前回同期時の値）
   * @param lastSyncedAt 最終同期日時
   * @returns 競合チェック結果
   */
  async checkConflict(
    buyerNumber: string,
    dbValues: Record<string, any>,
    expectedSpreadsheetValues: Record<string, any>,
    lastSyncedAt?: Date
  ): Promise<ConflictCheckResult> {
    const conflicts: ConflictInfo[] = [];

    // スプレッドシートの現在の行データを取得
    const currentSpreadsheetRow = await this.writeService.getRowData(buyerNumber);

    if (!currentSpreadsheetRow) {
      // スプレッドシートに行が存在しない場合は競合なし（新規追加として扱う）
      return {
        hasConflict: false,
        conflicts: [],
        canAutoResolve: true
      };
    }

    // 各フィールドについて競合をチェック
    for (const [dbFieldName, dbValue] of Object.entries(dbValues)) {
      const spreadsheetColumnName = this.columnMapper.getSpreadsheetColumnName(dbFieldName);
      
      if (!spreadsheetColumnName) {
        continue; // マッピングがないフィールドはスキップ
      }

      const currentSpreadsheetValue = currentSpreadsheetRow[spreadsheetColumnName];
      const expectedValue = expectedSpreadsheetValues[dbFieldName];

      // 期待値と現在のスプレッドシート値が異なる場合は競合
      if (!this.valuesEqual(currentSpreadsheetValue, expectedValue)) {
        conflicts.push({
          fieldName: dbFieldName,
          dbValue,
          spreadsheetValue: currentSpreadsheetValue,
          expectedValue,
          lastSyncedAt
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      canAutoResolve: conflicts.length === 0
    };
  }


  /**
   * 値が等しいかどうかを比較（型変換を考慮）
   */
  private valuesEqual(value1: any, value2: any): boolean {
    // 両方がnull/undefinedまたは空文字列の場合は等しい
    const isEmpty1 = value1 === null || value1 === undefined || value1 === '';
    const isEmpty2 = value2 === null || value2 === undefined || value2 === '';
    
    if (isEmpty1 && isEmpty2) {
      return true;
    }
    
    if (isEmpty1 !== isEmpty2) {
      return false;
    }

    // 文字列として比較
    return String(value1).trim() === String(value2).trim();
  }

  /**
   * 強制上書き（競合を無視してDBの値でスプレッドシートを更新）
   * @param buyerNumber 買主番号
   * @param dbValues DBの値
   * @returns 書き込み結果
   */
  async forceOverwrite(
    buyerNumber: string,
    dbValues: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.writeService.updateFields(buyerNumber, dbValues);
      return {
        success: result.success,
        error: result.error
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Force overwrite failed'
      };
    }
  }

  /**
   * 競合を解決
   * @param buyerNumber 買主番号
   * @param conflicts 競合情報
   * @param resolution 解決方法
   * @returns 解決結果
   */
  async resolveConflict(
    buyerNumber: string,
    conflicts: ConflictInfo[],
    resolution: ConflictResolution
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (resolution.strategy) {
        case 'db_wins':
          // DBの値でスプレッドシートを上書き
          const dbValues: Record<string, any> = {};
          for (const conflict of conflicts) {
            dbValues[conflict.fieldName] = conflict.dbValue;
          }
          return await this.forceOverwrite(buyerNumber, dbValues);

        case 'spreadsheet_wins':
          // スプレッドシートの値を維持（何もしない）
          return { success: true };

        case 'manual':
          // 手動で指定された値で更新
          return await this.forceOverwrite(buyerNumber, resolution.resolvedValues);

        default:
          return {
            success: false,
            error: `Unknown resolution strategy: ${resolution.strategy}`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Conflict resolution failed'
      };
    }
  }

  /**
   * 競合レポートを生成
   * @param conflicts 競合情報
   * @returns 人間が読める形式の競合レポート
   */
  generateConflictReport(conflicts: ConflictInfo[]): string {
    if (conflicts.length === 0) {
      return 'No conflicts detected.';
    }

    const lines: string[] = [
      `${conflicts.length} conflict(s) detected:`,
      ''
    ];

    for (const conflict of conflicts) {
      lines.push(`Field: ${conflict.fieldName}`);
      lines.push(`  DB Value: ${conflict.dbValue}`);
      lines.push(`  Spreadsheet Value: ${conflict.spreadsheetValue}`);
      lines.push(`  Expected Value: ${conflict.expectedValue}`);
      if (conflict.lastSyncedAt) {
        lines.push(`  Last Synced: ${conflict.lastSyncedAt.toISOString()}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 単一フィールドの競合をチェック
   * @param buyerNumber 買主番号
   * @param dbFieldName DBフィールド名
   * @param expectedValue 期待値
   * @returns 競合があるかどうか
   */
  async checkFieldConflict(
    buyerNumber: string,
    dbFieldName: string,
    expectedValue: any
  ): Promise<boolean> {
    const currentValue = await this.writeService.getCurrentValue(buyerNumber, dbFieldName);
    return !this.valuesEqual(currentValue, expectedValue);
  }
}
