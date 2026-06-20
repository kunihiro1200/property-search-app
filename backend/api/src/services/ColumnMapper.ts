import columnMappingConfig from '../config/column-mapping.json';
import { SheetRow } from './GoogleSheetsClient';

export interface SellerData {
  id?: string;
  seller_number?: string;
  name: string;
  address: string;
  phone_number: string;
  email?: string;
  site?: string;
  inquiry_date?: Date | string;
  valuation_amount_1?: number;
  valuation_amount_2?: number;
  valuation_amount_3?: number;
  visit_date?: Date | string;
  visit_time?: string;
  visit_department?: string;
  visit_assignee?: string;
  visit_valuation_acquirer?: string;
  valuation_assignee?: string;
  phone_assignee?: string;
  status?: string;
  comments?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  [key: string]: any;
}

export interface PropertyData {
  seller_id: string;
  address: string;
  property_type?: string;
  land_area?: number;
  building_area?: number;
  build_year?: number;
  structure?: string;
  seller_situation?: string;
  floor_plan?: string;
  land_rights?: string;
  current_status?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * カラムマッパー
 * 
 * スプレッドシートのカラムとSupabaseのカラムをマッピングし、
 * データ型の変換とバリデーションを行います。
 */
export class ColumnMapper {
  private spreadsheetToDb: Record<string, string>;
  private dbToSpreadsheet: Record<string, string>;
  private typeConversions: Record<string, string>;
  private requiredFields: string[];

  constructor() {
    this.spreadsheetToDb = columnMappingConfig.spreadsheetToDatabase;
    this.dbToSpreadsheet = columnMappingConfig.databaseToSpreadsheet;
    this.typeConversions = columnMappingConfig.typeConversions;
    this.requiredFields = columnMappingConfig.requiredFields;
  }

  /**
   * スプレッドシートの行データをSupabaseのデータ形式に変換
   */
  mapToDatabase(sheetRow: SheetRow): SellerData {
    const dbData: any = {};

    for (const [sheetColumn, dbColumn] of Object.entries(this.spreadsheetToDb)) {
      const value = sheetRow[sheetColumn];
      
      if (value === null || value === undefined || value === '') {
        // 「氏名」フィールドが空の場合は「不明」を設定
        if (dbColumn === 'name') {
          dbData[dbColumn] = '不明';
        } else {
          dbData[dbColumn] = null;
        }
        continue;
      }

      // メールアドレスの特殊処理
      if (dbColumn === 'email' && typeof value === 'string') {
        const skipValues = ['なし', '無し', '不明', 'エラー', '不可', 'ヒアリングしてない', '0'];
        const normalizedValue = value.trim();
        
        // 「アドレス」という文字を含む場合（「アドレスなし」「メールアドレスなし」など）
        const containsAddressKeyword = normalizedValue.includes('アドレス') || normalizedValue.includes('address');
        
        // 数字のみの場合（電話番号の可能性）
        const isOnlyNumbers = /^\d+$/.test(normalizedValue);
        
        // 改行や複数のメールアドレスが含まれている場合
        const hasMultipleValues = normalizedValue.includes('\n') || normalizedValue.split(/\s+/).length > 1;
        
        // 全角の@を半角に変換
        const normalizedEmail = normalizedValue.replace(/＠/g, '@');
        
        // 基本的なメールアドレスの形式チェック
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailRegex.test(normalizedEmail);
        
        // 無効な値の場合はnullに設定
        if (
          skipValues.includes(normalizedValue) ||
          containsAddressKeyword ||
          isOnlyNumbers ||
          hasMultipleValues ||
          !isValidEmail
        ) {
          dbData[dbColumn] = null;
          continue;
        }
        
        // 有効なメールアドレスの場合、全角@を半角に変換して保存
        dbData[dbColumn] = normalizedEmail;
        continue;
      }

      // 査定額の特殊処理（万円 → 円に変換）
      if (dbColumn === 'valuation_amount_1' || dbColumn === 'valuation_amount_2' || dbColumn === 'valuation_amount_3') {
        const targetType = this.typeConversions[dbColumn];
        const numValue = this.convertValue(value, targetType);
        // スプレッドシートの査定額は万円単位なので、円単位に変換（×10000）
        dbData[dbColumn] = numValue !== null ? numValue * 10000 : null;
        continue;
      }
      
      // 手入力の査定額の特殊処理（万円 → 円に変換し、対応する自動計算の査定額を上書き）
      if (dbColumn === 'manual_valuation_amount_1' || dbColumn === 'manual_valuation_amount_2' || dbColumn === 'manual_valuation_amount_3') {
        const targetType = this.typeConversions[dbColumn];
        const numValue = this.convertValue(value, targetType);
        
        // 手入力の査定額が存在する場合、対応する自動計算の査定額を上書き
        if (numValue !== null) {
          const autoFieldName = dbColumn.replace('manual_', '');
          dbData[autoFieldName] = numValue * 10000;
        }
        // 手入力フィールド自体はデータベースに保存しない（スキップ）
        continue;
      }

      // 型変換
      const targetType = this.typeConversions[dbColumn];
      dbData[dbColumn] = this.convertValue(value, targetType);
    }

    return dbData as SellerData;
  }

  /**
   * Supabaseのデータをスプレッドシートの行形式に変換
   */
  mapToSheet(sellerData: SellerData): SheetRow {
    const sheetRow: SheetRow = {};

    for (const [dbColumn, sheetColumn] of Object.entries(this.dbToSpreadsheet)) {
      const value = sellerData[dbColumn];
      
      if (value === null || value === undefined) {
        sheetRow[sheetColumn] = '';
        continue;
      }

      // 型変換（逆方向）
      const targetType = this.typeConversions[dbColumn];
      sheetRow[sheetColumn] = this.convertValueToSheet(value, targetType);
    }

    return sheetRow;
  }

  /**
   * スプレッドシートのデータをバリデーション
   */
  validate(sheetRow: SheetRow): ValidationResult {
    const errors: string[] = [];

    // 必須フィールドのチェック
    for (const requiredField of this.requiredFields) {
      const sheetColumn = this.dbToSpreadsheet[requiredField];
      const value = sheetRow[sheetColumn];

      // 「氏名」フィールドは空でも「不明」として扱うのでバリデーションエラーにしない
      if (requiredField === 'name') {
        continue;
      }

      if (!value || value === '') {
        errors.push(`必須フィールド「${sheetColumn}」が空です`);
      }
    }

    // 電話番号の形式チェック（簡易版）
    const phoneColumn = this.dbToSpreadsheet['phone_number'];
    const phoneValue = sheetRow[phoneColumn];
    if (phoneValue && typeof phoneValue === 'string') {
      const phoneRegex = /^[0-9\-\(\)\s]+$/;
      if (!phoneRegex.test(phoneValue)) {
        errors.push(`電話番号の形式が不正です: ${phoneValue}`);
      }
    }

    // メールアドレスの形式チェック（無効な場合は警告のみ、エラーにしない）
    const emailColumn = this.dbToSpreadsheet['email'];
    const emailValue = sheetRow[emailColumn];
    if (emailValue && typeof emailValue === 'string' && emailValue !== '') {
      // 「なし」「無し」「不明」「エラー」「不可」などの値、または「アドレス」を含む値はスキップ
      const skipValues = ['なし', '無し', '不明', 'エラー', '不可', 'ヒアリングしてない'];
      const normalizedValue = emailValue.trim();
      
      // 「アドレス」という文字を含む場合もスキップ（「アドレスなし」「メールアドレスなし」など）
      const containsAddressKeyword = normalizedValue.includes('アドレス') || normalizedValue.includes('address');
      
      if (!skipValues.includes(normalizedValue) && !containsAddressKeyword) {
        // 改行や複数のメールアドレスが含まれている場合はスキップ
        if (!normalizedValue.includes('\n') && !normalizedValue.includes(' ')) {
          // 全角の@を半角に変換してチェック
          const normalizedEmail = normalizedValue.replace(/＠/g, '@');
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          
          // 数字のみの場合もスキップ（電話番号の可能性）
          const isOnlyNumbers = /^\d+$/.test(normalizedValue);
          
          if (!emailRegex.test(normalizedEmail) && !isOnlyNumbers) {
            // エラーではなく警告として記録（移行は続行）
            // errors.push(`メールアドレスの形式が不正です: ${emailValue}`);
            // 無効なメールアドレスは後でnullに変換される
          }
        }
      }
    }

    // 数値フィールドのチェック
    const numberFields = ['valuation_amount_1', 'valuation_amount_2', 'valuation_amount_3'];
    for (const field of numberFields) {
      const sheetColumn = this.dbToSpreadsheet[field];
      const value = sheetRow[sheetColumn];
      
      if (value && value !== '') {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
        if (isNaN(numValue)) {
          errors.push(`${sheetColumn}は数値である必要があります: ${value}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 値を指定された型に変換（スプレッドシート → データベース）
   */
  private convertValue(value: any, targetType?: string): any {
    if (!targetType) {
      return value;
    }

    switch (targetType) {
      case 'number':
        if (typeof value === 'number') return value;
        // カンマ区切りの数値文字列を処理
        const numStr = String(value).replace(/,/g, '');
        const num = parseFloat(numStr);
        return isNaN(num) ? null : num;

      case 'date':
        return this.parseDate(value);

      case 'datetime':
        return this.parseDateTime(value);

      case 'boolean':
        if (typeof value === 'boolean') return value;
        const str = String(value).toLowerCase();
        return str === 'true' || str === '1' || str === 'yes' || str === 'はい';

      default:
        return value;
    }
  }

  /**
   * 値をスプレッドシート形式に変換（データベース → スプレッドシート）
   */
  private convertValueToSheet(value: any, targetType?: string): string | number {
    if (value === null || value === undefined) {
      return '';
    }

    if (!targetType) {
      return value;
    }

    switch (targetType) {
      case 'number':
        return typeof value === 'number' ? value : parseFloat(String(value));

      case 'date':
        return this.formatDate(value);

      case 'datetime':
        return this.formatDateTime(value);

      case 'boolean':
        return value ? 'はい' : 'いいえ';

      default:
        return String(value);
    }
  }

  /**
   * 日付文字列をパース
   */
  private parseDate(value: any): string | null {
    if (!value) return null;

    try {
      // 既にDate型の場合
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }

      // 文字列の場合
      const str = String(value).trim();
      
      // YYYY-MM-DD形式
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }

      // YYYY/MM/DD形式
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
        return str.replace(/\//g, '-');
      }

      // MM/DD形式（年なし）- 現在の年を使用
      const mmddMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (mmddMatch) {
        const month = mmddMatch[1].padStart(2, '0');
        const day = mmddMatch[2].padStart(2, '0');
        const currentYear = new Date().getFullYear();
        
        // 月が現在の月より大きい場合は前年とする（例: 現在12月で、入力が1月の場合は来年）
        const currentMonth = new Date().getMonth() + 1;
        const inputMonth = parseInt(month);
        
        // 反響日付や次電日は通常過去または近い未来なので、
        // 入力月が現在月より3ヶ月以上先の場合は前年とする
        let year = currentYear;
        if (inputMonth > currentMonth + 3) {
          year = currentYear - 1;
        } else if (inputMonth < currentMonth - 9) {
          // 入力月が現在月より9ヶ月以上前の場合は来年とする
          year = currentYear + 1;
        }
        
        return `${year}-${month}-${day}`;
      }

      // M/D形式（年なし、ゼロ埋めなし）
      const mdMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (mdMatch) {
        const month = mdMatch[1].padStart(2, '0');
        const day = mdMatch[2].padStart(2, '0');
        const currentYear = new Date().getFullYear();
        
        const currentMonth = new Date().getMonth() + 1;
        const inputMonth = parseInt(month);
        
        let year = currentYear;
        if (inputMonth > currentMonth + 3) {
          year = currentYear - 1;
        } else if (inputMonth < currentMonth - 9) {
          year = currentYear + 1;
        }
        
        return `${year}-${month}-${day}`;
      }

      // その他の形式はDateオブジェクトでパース
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 日時文字列をパース
   */
  private parseDateTime(value: any): string | null {
    if (!value) return null;

    try {
      // 既にDate型の場合
      if (value instanceof Date) {
        return value.toISOString();
      }

      // 文字列の場合
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 日付をフォーマット（YYYY-MM-DD）
   */
  private formatDate(value: any): string {
    if (!value) return '';

    try {
      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return '';
      
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  /**
   * 日時をフォーマット（YYYY-MM-DD HH:mm:ss）
   */
  private formatDateTime(value: any): string {
    if (!value) return '';

    try {
      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return '';
      
      return date.toISOString().replace('T', ' ').split('.')[0];
    } catch {
      return '';
    }
  }

  /**
   * スプレッドシートの行から物件情報を抽出
   */
  extractPropertyData(sheetRow: SheetRow, sellerId: string): PropertyData | null {
    const address = sheetRow['物件所在地'];
    
    // 物件住所が空の場合はnullを返す
    if (!address || address === '') {
      return null;
    }
    
    // 物件種別は「物件種別」または「種別」列から取得
    let propertyType = sheetRow['物件種別'] || sheetRow['種別'];
    
    // 物件種別の正規化（略称を正式名称に変換）
    if (propertyType) {
      const typeStr = String(propertyType).trim();
      const typeMapping: Record<string, string> = {
        '土': '土地',
        '戸': '戸建',
        'マ': 'マンション',
        '事': '事業用',
      };
      propertyType = typeMapping[typeStr] || typeStr;
    }
    
    return {
      seller_id: sellerId,
      address: String(address),
      property_type: propertyType ? String(propertyType) : undefined,
      land_area: this.convertValue(sheetRow['土（㎡）'], 'number') || undefined,
      building_area: this.convertValue(sheetRow['建（㎡）'], 'number') || undefined,
      build_year: this.convertValue(sheetRow['築年'], 'number') || undefined,
      structure: sheetRow['構造'] ? String(sheetRow['構造']) : undefined,
      seller_situation: sheetRow['状況（売主）'] ? String(sheetRow['状況（売主）']) : undefined,
      floor_plan: sheetRow['間取り'] ? String(sheetRow['間取り']) : undefined,
      land_rights: sheetRow['土地権利'] ? String(sheetRow['土地権利']) : undefined,
      current_status: sheetRow['現況'] ? String(sheetRow['現況']) : undefined,
    };
  }

  /**
   * カラムマッピング設定を取得
   */
  getMappingConfig() {
    return {
      spreadsheetToDb: this.spreadsheetToDb,
      dbToSpreadsheet: this.dbToSpreadsheet,
      typeConversions: this.typeConversions,
      requiredFields: this.requiredFields,
    };
  }
}
