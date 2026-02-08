// 買主リストのカラムマッピングサービス
import columnMapping from '../config/buyer-column-mapping.json';

export interface BuyerRecord {
  [key: string]: any;
}

export class BuyerColumnMapper {
  private spreadsheetToDb: Record<string, string>;
  private dbToSpreadsheet: Record<string, string>;
  private typeConversions: Record<string, string>;

  constructor() {
    // Merge both mapping objects
    this.spreadsheetToDb = {
      ...columnMapping.spreadsheetToDatabase,
      ...columnMapping.spreadsheetToDatabaseExtended
    };
    this.dbToSpreadsheet = {};
    for (const [key, value] of Object.entries(this.spreadsheetToDb)) {
      this.dbToSpreadsheet[value] = key;
    }
    this.typeConversions = columnMapping.typeConversions;
  }

  /**
   * スプレッドシートの行データをデータベース形式に変換
   */
  mapSpreadsheetToDatabase(headers: string[], row: any[]): BuyerRecord {
    const result: BuyerRecord = {};
    
    headers.forEach((header, index) => {
      const dbColumn = this.spreadsheetToDb[header];
      if (dbColumn && row[index] !== undefined) {
        result[dbColumn] = this.convertValue(dbColumn, row[index]);
      }
    });

    return result;
  }

  /**
   * データベースレコードをスプレッドシート形式に変換
   */
  mapDatabaseToSpreadsheet(record: BuyerRecord): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [dbColumn, value] of Object.entries(record)) {
      const spreadsheetColumn = this.dbToSpreadsheet[dbColumn];
      if (spreadsheetColumn) {
        result[spreadsheetColumn] = this.formatValueForSpreadsheet(dbColumn, value);
      }
    }

    return result;
  }

  /**
   * 値を適切な型に変換
   */
  private convertValue(column: string, value: any): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const type = this.typeConversions[column];
    
    if (type === 'date') {
      return this.parseDate(value);
    }
    
    if (type === 'datetime') {
      return this.parseDatetime(value);
    }
    
    if (type === 'number') {
      return this.parseNumber(value);
    }

    return String(value).trim();
  }

  /**
   * スプレッドシート出力用に値をフォーマット
   */
  private formatValueForSpreadsheet(column: string, value: any): any {
    if (value === null || value === undefined) {
      return '';
    }

    const type = this.typeConversions[column];
    
    if (type === 'date' && value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      }
    }

    return value;
  }

  /**
   * 日付文字列をパース
   */
  private parseDate(value: any): string | null {
    if (!value || value === '') return null;
    
    // Excelシリアル値（数値）の場合
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue > 30000 && numValue < 60000) {
      try {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
        
        // 日付が有効範囲内かチェック（1900-01-01 ～ 2100-12-31）
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) {
          console.warn(`⚠️  Invalid year from Excel serial: ${year} (serial: ${numValue})`);
          return null;
        }
        
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (error: any) {
        console.warn(`⚠️  Failed to parse Excel serial value: ${numValue} (${error.message})`);
        return null;
      }
    }
    
    const str = String(value).trim();
    if (!str) return null;

    // YYYY/MM/DD or YYYY-MM-DD
    const match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // MM/DD/YYYY
    const match2 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match2) {
      const [, month, day, year] = match2;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // MM/DD (年が省略されている場合は前年を使用)
    // 理由: スプレッドシートで年が省略されている場合、通常は前年のデータ
    const match3 = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (match3) {
      const [, month, day] = match3;
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1; // 前年を使用
      return `${previousYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
  }

  /**
   * 日時文字列をパース
   */
  private parseDatetime(value: any): string | null {
    if (!value || value === '') return null;
    
    // Excelシリアル値（数値）の場合
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue > 30000 && numValue < 60000) {
      try {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
        
        // 日付が有効範囲内かチェック（1900-01-01 ～ 2100-12-31）
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) {
          console.warn(`⚠️  Invalid year from Excel serial: ${year} (serial: ${numValue})`);
          return null;
        }
        
        return date.toISOString();
      } catch (error: any) {
        console.warn(`⚠️  Failed to parse Excel serial value: ${numValue} (${error.message})`);
        return null;
      }
    }
    
    const str = String(value).trim();
    if (!str) return null;

    // Try to parse as ISO date
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    // YYYY/MM/DD HH:mm:ss
    const match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const [, year, month, day, hour, minute, second = '00'] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}`;
    }

    return null;
  }

  /**
   * 数値をパース
   */
  private parseNumber(value: any): number | null {
    if (!value) return null;
    
    const str = String(value).replace(/[,，円￥\s]/g, '').trim();
    if (!str) return null;

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  /**
   * データベースカラム名の一覧を取得
   */
  getDbColumns(): string[] {
    return Object.values(this.spreadsheetToDb);
  }

  /**
   * スプレッドシートカラム名の一覧を取得
   */
  getSpreadsheetColumns(): string[] {
    return Object.keys(this.spreadsheetToDb);
  }

  /**
   * 必須フィールドを取得
   */
  getRequiredFields(): string[] {
    return columnMapping.requiredFields;
  }

  /**
   * 型変換ルールを取得
   */
  getTypeConversions(): Record<string, string> {
    return this.typeConversions;
  }

  /**
   * DBフィールド名からスプレッドシートの列インデックス（0始まり）を取得
   * @param dbFieldName データベースのフィールド名
   * @param headers スプレッドシートのヘッダー配列
   * @returns 列インデックス（見つからない場合は-1）
   */
  getColumnIndex(dbFieldName: string, headers: string[]): number {
    const spreadsheetColumn = this.dbToSpreadsheet[dbFieldName];
    if (!spreadsheetColumn) {
      return -1;
    }
    return headers.indexOf(spreadsheetColumn);
  }

  /**
   * DBフィールド名からスプレッドシートの列文字（A, B, C...）を取得
   * @param dbFieldName データベースのフィールド名
   * @param headers スプレッドシートのヘッダー配列
   * @returns 列文字（見つからない場合はnull）
   */
  getColumnLetter(dbFieldName: string, headers: string[]): string | null {
    const index = this.getColumnIndex(dbFieldName, headers);
    if (index < 0) {
      return null;
    }
    return this.indexToColumnLetter(index);
  }

  /**
   * 列インデックスを列文字に変換（0 -> A, 1 -> B, 26 -> AA）
   * @param index 0始まりの列インデックス
   * @returns 列文字
   */
  private indexToColumnLetter(index: number): string {
    let result = '';
    let n = index;
    
    while (n >= 0) {
      result = String.fromCharCode((n % 26) + 65) + result;
      n = Math.floor(n / 26) - 1;
    }
    
    return result;
  }

  /**
   * 列文字を列インデックスに変換（A -> 0, B -> 1, AA -> 26）
   * @param letter 列文字
   * @returns 0始まりの列インデックス
   */
  columnLetterToIndex(letter: string): number {
    let result = 0;
    for (let i = 0; i < letter.length; i++) {
      result = result * 26 + (letter.charCodeAt(i) - 64);
    }
    return result - 1;
  }

  /**
   * DBフィールド名からスプレッドシートのカラム名を取得
   * @param dbFieldName データベースのフィールド名
   * @returns スプレッドシートのカラム名（見つからない場合はnull）
   */
  getSpreadsheetColumnName(dbFieldName: string): string | null {
    return this.dbToSpreadsheet[dbFieldName] || null;
  }

  /**
   * スプレッドシートのカラム名からDBフィールド名を取得
   * @param spreadsheetColumn スプレッドシートのカラム名
   * @returns DBフィールド名（見つからない場合はnull）
   */
  getDbFieldName(spreadsheetColumn: string): string | null {
    return this.spreadsheetToDb[spreadsheetColumn] || null;
  }

  /**
   * マッピングされているすべてのDBフィールド名を取得
   * @returns DBフィールド名の配列
   */
  getMappedFields(): string[] {
    return Object.values(this.spreadsheetToDb);
  }

  /**
   * 指定されたヘッダーに対してマッピングされているカラム名を取得
   * @param headers スプレッドシートのヘッダー配列
   * @returns マッピングされているカラム名の配列
   */
  getMappedColumns(headers: string[]): string[] {
    return headers.filter(header => this.spreadsheetToDb[header] !== undefined);
  }

  /**
   * 指定されたフィールドがヘッダーにマッピングを持つかチェック
   * @param fieldName DBフィールド名
   * @param headers スプレッドシートのヘッダー配列
   * @returns マッピングが存在する場合true
   */
  hasColumnMapping(fieldName: string, headers: string[]): boolean {
    const spreadsheetColumn = this.dbToSpreadsheet[fieldName];
    if (!spreadsheetColumn) {
      return false;
    }
    return headers.includes(spreadsheetColumn);
  }
}
