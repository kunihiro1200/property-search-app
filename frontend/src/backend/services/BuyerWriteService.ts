/**
 * BuyerWriteService - 買主データのスプレッドシートへの書き込みサービス
 * 
 * DBの変更をスプレッドシートに書き戻す機能を提供します。
 */

import { GoogleSheetsClient, SheetRow } from './GoogleSheetsClient';
import { BuyerColumnMapper } from './BuyerColumnMapper';

export interface WriteResult {
  success: boolean;
  rowNumber?: number;
  error?: string;
}

export interface BatchWriteResult {
  success: boolean;
  results: WriteResult[];
  totalUpdated: number;
  totalFailed: number;
}

export interface FieldUpdate {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

export class BuyerWriteService {
  private sheetsClient: GoogleSheetsClient;
  private columnMapper: BuyerColumnMapper;

  constructor(sheetsClient: GoogleSheetsClient, columnMapper: BuyerColumnMapper) {
    this.sheetsClient = sheetsClient;
    this.columnMapper = columnMapper;
  }

  /**
   * ヘッダーキャッシュをクリア
   */
  clearHeaderCache(): void {
    this.sheetsClient.clearHeaderCache();
  }

  /**
   * 買主番号でスプレッドシートの行番号を検索
   * @param buyerNumber 買主番号
   * @returns 行番号（1-indexed、ヘッダー行は1）、見つからない場合はnull
   */
  async findRowByBuyerNumber(buyerNumber: string): Promise<number | null> {
    // 買主番号のスプレッドシートカラム名を取得
    const spreadsheetColumnName = this.columnMapper.getSpreadsheetColumnName('buyer_number');
    
    if (!spreadsheetColumnName) {
      throw new Error('buyer_number column mapping not found');
    }

    return await this.sheetsClient.findRowByColumn(spreadsheetColumnName, buyerNumber);
  }


  /**
   * 単一フィールドをスプレッドシートに書き込み
   * @param buyerNumber 買主番号
   * @param dbFieldName DBフィールド名
   * @param value 新しい値
   * @returns 書き込み結果
   */
  async updateField(buyerNumber: string, dbFieldName: string, value: any): Promise<WriteResult> {
    try {
      // 行番号を検索
      const rowNumber = await this.findRowByBuyerNumber(buyerNumber);
      
      if (!rowNumber) {
        return {
          success: false,
          error: `Buyer ${buyerNumber} not found in spreadsheet`
        };
      }

      // スプレッドシートのカラム名を取得
      const spreadsheetColumnName = this.columnMapper.getSpreadsheetColumnName(dbFieldName);
      
      if (!spreadsheetColumnName) {
        return {
          success: false,
          error: `Column mapping not found for field: ${dbFieldName}`
        };
      }

      // 現在の行データを取得
      const rows = await this.sheetsClient.readRange(`${rowNumber}:${rowNumber}`);
      
      if (rows.length === 0) {
        return {
          success: false,
          error: `Row ${rowNumber} not found`
        };
      }

      // 値を更新
      const rowData = rows[0];
      const formattedValue = this.columnMapper.mapDatabaseToSpreadsheet({ [dbFieldName]: value });
      rowData[spreadsheetColumnName] = formattedValue[spreadsheetColumnName] ?? '';

      // スプレッドシートに書き込み
      await this.sheetsClient.updateRow(rowNumber, rowData);

      return {
        success: true,
        rowNumber
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * 複数フィールドを一括でスプレッドシートに書き込み
   * @param buyerNumber 買主番号
   * @param updates 更新するフィールドと値のマップ
   * @returns 書き込み結果
   */
  async updateFields(buyerNumber: string, updates: Record<string, any>): Promise<WriteResult> {
    try {
      // 行番号を検索
      const rowNumber = await this.findRowByBuyerNumber(buyerNumber);
      
      if (!rowNumber) {
        return {
          success: false,
          error: `Buyer ${buyerNumber} not found in spreadsheet`
        };
      }

      // 現在の行データを取得
      const rows = await this.sheetsClient.readRange(`${rowNumber}:${rowNumber}`);
      
      if (rows.length === 0) {
        return {
          success: false,
          error: `Row ${rowNumber} not found`
        };
      }

      // 値を更新
      const rowData = rows[0];
      const formattedValues = this.columnMapper.mapDatabaseToSpreadsheet(updates);
      
      for (const [spreadsheetColumn, value] of Object.entries(formattedValues)) {
        rowData[spreadsheetColumn] = value ?? '';
      }

      // スプレッドシートに書き込み
      await this.sheetsClient.updateRow(rowNumber, rowData);

      return {
        success: true,
        rowNumber
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * 複数の買主データを一括更新
   * @param updates 買主番号と更新データのマップ
   * @returns バッチ書き込み結果
   */
  async batchUpdateFields(updates: Map<string, Record<string, any>>): Promise<BatchWriteResult> {
    const results: WriteResult[] = [];
    let totalUpdated = 0;
    let totalFailed = 0;

    for (const [buyerNumber, fieldUpdates] of updates) {
      const result = await this.updateFields(buyerNumber, fieldUpdates);
      results.push(result);
      
      if (result.success) {
        totalUpdated++;
      } else {
        totalFailed++;
      }
    }

    return {
      success: totalFailed === 0,
      results,
      totalUpdated,
      totalFailed
    };
  }

  /**
   * スプレッドシートの現在値を取得
   * @param buyerNumber 買主番号
   * @param dbFieldName DBフィールド名
   * @returns 現在の値（見つからない場合はnull）
   */
  async getCurrentValue(buyerNumber: string, dbFieldName: string): Promise<any | null> {
    try {
      const rowNumber = await this.findRowByBuyerNumber(buyerNumber);
      
      if (!rowNumber) {
        return null;
      }

      const spreadsheetColumnName = this.columnMapper.getSpreadsheetColumnName(dbFieldName);
      
      if (!spreadsheetColumnName) {
        return null;
      }

      const rows = await this.sheetsClient.readRange(`${rowNumber}:${rowNumber}`);
      
      if (rows.length === 0) {
        return null;
      }

      return rows[0][spreadsheetColumnName] ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * スプレッドシートの行全体を取得
   * @param buyerNumber 買主番号
   * @returns 行データ（見つからない場合はnull）
   */
  async getRowData(buyerNumber: string): Promise<SheetRow | null> {
    try {
      const rowNumber = await this.findRowByBuyerNumber(buyerNumber);
      
      if (!rowNumber) {
        return null;
      }

      const rows = await this.sheetsClient.readRange(`${rowNumber}:${rowNumber}`);
      
      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      return null;
    }
  }
}
