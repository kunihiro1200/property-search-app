// 物件リストのカラムマッピングサービス
import columnMapping from '../config/property-listing-column-mapping.json';

export class PropertyListingColumnMapper {
  private spreadsheetToDb: Record<string, string>;
  private dbToSpreadsheet: Record<string, string>;
  private typeConversions: Record<string, string>;

  constructor() {
    this.spreadsheetToDb = columnMapping.spreadsheetToDatabase;
    this.dbToSpreadsheet = {};
    for (const [key, value] of Object.entries(this.spreadsheetToDb)) {
      this.dbToSpreadsheet[value] = key;
    }
    this.typeConversions = columnMapping.typeConversions;
  }

  mapSpreadsheetToDatabase(headers: string[], row: any[]): Record<string, any>;
  mapSpreadsheetToDatabase(rowObject: Record<string, any>): Record<string, any>;
  mapSpreadsheetToDatabase(headersOrRow: string[] | Record<string, any>, row?: any[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    // Overload 1: (headers, row) - array format
    if (Array.isArray(headersOrRow) && row) {
      const headers = headersOrRow;
      headers.forEach((header, index) => {
        const dbColumn = this.spreadsheetToDb[header];
        if (dbColumn && row[index] !== undefined) {
          result[dbColumn] = this.convertValue(dbColumn, row[index]);
        }
      });
    }
    // Overload 2: (rowObject) - object format
    else if (typeof headersOrRow === 'object' && !Array.isArray(headersOrRow)) {
      const rowObject = headersOrRow;
      for (const [spreadsheetColumn, value] of Object.entries(rowObject)) {
        const dbColumn = this.spreadsheetToDb[spreadsheetColumn];
        if (dbColumn && value !== undefined) {
          result[dbColumn] = this.convertValue(dbColumn, value);
        }
      }
    }

    return result;
  }

  private convertValue(column: string, value: any): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const type = this.typeConversions[column];
    
    if (type === 'date') {
      return this.parseDate(value);
    }
    
    if (type === 'number') {
      return this.parseNumber(value);
    }

    return String(value).trim();
  }

  private parseDate(value: any): string | null {
    if (!value) return null;
    
    const str = String(value).trim();
    if (!str) return null;

    // YYYY/MM/DD or YYYY-MM-DD
    const match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
  }

  private parseNumber(value: any): number | null {
    if (!value) return null;
    
    const str = String(value).replace(/[,，円￥\s]/g, '').trim();
    if (!str) return null;

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  }

  getDbColumns(): string[] {
    return Object.values(this.spreadsheetToDb);
  }

  getSpreadsheetColumns(): string[] {
    return Object.keys(this.spreadsheetToDb);
  }
}
