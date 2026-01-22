// 買主データ検証サービス
import { BuyerRecord } from './BuyerColumnMapper';

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * 買主データの検証を行うサービス
 */
export class BuyerDataValidator {
  /**
   * 単一行のデータを検証
   */
  validateRow(data: BuyerRecord, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // 必須フィールド: 買主番号
    if (!this.validateBuyerNumber(data.buyer_number)) {
      errors.push({
        row: rowNumber,
        field: 'buyer_number',
        value: data.buyer_number,
        message: '買主番号は必須です',
        severity: 'error'
      });
    }

    // メールアドレスと電話番号は検証しない（空欄や変わった形式も許可）
    // KEYは買主番号なので、メールアドレスと電話番号はそのまま保存

    return errors;
  }

  /**
   * 買主番号を検証
   */
  validateBuyerNumber(value: any): boolean {
    if (!value) return false;
    
    const str = String(value).trim();
    if (str === '') return false;
    
    return true;
  }

  /**
   * メールアドレスを検証
   */
  validateEmail(value: any): boolean {
    if (!value) return true; // null/undefinedは許可（オプショナル）
    
    const str = String(value).trim();
    if (str === '') return true; // 空文字列は許可
    
    // 基本的なメールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(str);
  }

  /**
   * 電話番号を検証
   */
  validatePhoneNumber(value: any): boolean {
    if (!value) return true; // null/undefinedは許可（オプショナル）
    
    const str = String(value).trim();
    if (str === '') return true; // 空文字列は許可
    
    // 数字、ハイフン、括弧、スペース、プラス記号のみ許可
    const phoneRegex = /^[\d\-\(\)\s\+]+$/;
    if (!phoneRegex.test(str)) return false;
    
    // 最低でも数字が含まれているか確認
    const hasDigits = /\d/.test(str);
    return hasDigits;
  }

  /**
   * 複数行の重複をチェック
   */
  checkDuplicates(rows: Array<{ data: BuyerRecord; rowNumber: number }>): ValidationError[] {
    const errors: ValidationError[] = [];
    const buyerNumberMap = new Map<string, number[]>();

    // 買主番号ごとに行番号を記録
    for (const { data, rowNumber } of rows) {
      if (!data.buyer_number) continue;
      
      const buyerNumber = String(data.buyer_number).trim();
      if (!buyerNumberMap.has(buyerNumber)) {
        buyerNumberMap.set(buyerNumber, []);
      }
      buyerNumberMap.get(buyerNumber)!.push(rowNumber);
    }

    // 重複をチェック
    for (const [buyerNumber, rowNumbers] of buyerNumberMap.entries()) {
      if (rowNumbers.length > 1) {
        // 重複が見つかった場合、すべての該当行にエラーを追加
        for (const rowNumber of rowNumbers) {
          errors.push({
            row: rowNumber,
            field: 'buyer_number',
            value: buyerNumber,
            message: `買主番号 "${buyerNumber}" が重複しています（行: ${rowNumbers.join(', ')}）`,
            severity: 'error'
          });
        }
      }
    }

    return errors;
  }

  /**
   * 複数行をまとめて検証
   */
  validateRows(rows: Array<{ data: BuyerRecord; rowNumber: number }>): ValidationResult {
    const allErrors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let validRows = 0;

    // 各行を個別に検証
    for (const { data, rowNumber } of rows) {
      const rowErrors = this.validateRow(data, rowNumber);
      
      if (rowErrors.length === 0) {
        validRows++;
      } else {
        // エラーと警告を分離
        const errors = rowErrors.filter(e => e.severity === 'error');
        const warns = rowErrors.filter(e => e.severity === 'warning');
        
        allErrors.push(...errors);
        warnings.push(...warns.map(w => ({
          row: w.row,
          field: w.field,
          message: w.message
        })));
      }
    }

    // 重複チェック
    const duplicateErrors = this.checkDuplicates(rows);
    allErrors.push(...duplicateErrors);

    // 重複エラーがある場合、該当行を無効としてカウント
    const rowsWithDuplicates = new Set(duplicateErrors.map(e => e.row));
    const invalidRows = rows.length - validRows + rowsWithDuplicates.size;

    return {
      isValid: allErrors.length === 0,
      totalRows: rows.length,
      validRows: validRows - rowsWithDuplicates.size,
      invalidRows,
      errors: allErrors,
      warnings
    };
  }

  /**
   * 検証結果のサマリーを生成
   */
  generateValidationSummary(result: ValidationResult): string {
    const lines: string[] = [];
    
    lines.push('=== 検証結果サマリー ===');
    lines.push(`総行数: ${result.totalRows}`);
    lines.push(`有効行数: ${result.validRows}`);
    lines.push(`無効行数: ${result.invalidRows}`);
    lines.push(`エラー数: ${result.errors.length}`);
    lines.push(`警告数: ${result.warnings.length}`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push('--- エラー詳細 ---');
      const errorsByRow = new Map<number, ValidationError[]>();
      
      for (const error of result.errors) {
        if (!errorsByRow.has(error.row)) {
          errorsByRow.set(error.row, []);
        }
        errorsByRow.get(error.row)!.push(error);
      }

      for (const [row, errors] of errorsByRow.entries()) {
        lines.push(`行 ${row}:`);
        for (const error of errors) {
          lines.push(`  - ${error.field}: ${error.message}`);
        }
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('--- 警告詳細 ---');
      for (const warning of result.warnings) {
        lines.push(`行 ${warning.row}: ${warning.field} - ${warning.message}`);
      }
      lines.push('');
    }

    if (result.isValid) {
      lines.push('✅ すべてのデータが検証に合格しました');
    } else {
      lines.push('❌ 検証エラーがあります。上記のエラーを修正してください');
    }

    return lines.join('\n');
  }
}
