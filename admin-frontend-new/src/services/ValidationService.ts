/**
 * ValidationService
 * 
 * 買主内覧ページの必須フィールドバリデーションを担当するサービス
 */

interface Buyer {
  buyer_number: string;
  name?: string;
  phone_number?: string;
  email?: string;
  latest_viewing_date?: string;
  viewing_time?: string;
  viewing_mobile?: string;
  follow_up_assignee?: string;
  pre_viewing_notes?: string;
  [key: string]: any;
}

interface Property {
  property_number: string;
  atbb_status?: string;
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationService {
  /**
   * 必須フィールドのバリデーションを実行
   * @param buyer - 買主データ
   * @param linkedProperties - 紐づいた物件データ
   * @returns バリデーション結果
   */
  static validateRequiredFields(
    buyer: Buyer,
    linkedProperties: Property[]
  ): ValidationResult {
    const errors: string[] = [];

    // 内覧日のチェック
    if (!buyer.latest_viewing_date || buyer.latest_viewing_date.trim() === '') {
      errors.push('内覧日（最新）');
    }

    // 時間のチェック
    if (!buyer.viewing_time || buyer.viewing_time.trim() === '') {
      errors.push('時間');
    }

    // 内覧形態のチェック（物件タイプに応じて）
    const hasExclusiveProperty = linkedProperties.some(
      (property) => property.atbb_status && property.atbb_status.includes('専任')
    );
    const hasGeneralProperty = linkedProperties.some(
      (property) => property.atbb_status && property.atbb_status.includes('一般')
    );

    if (hasExclusiveProperty || hasGeneralProperty) {
      if (!buyer.viewing_mobile || buyer.viewing_mobile.trim() === '') {
        if (hasExclusiveProperty) {
          errors.push('内覧形態');
        } else {
          errors.push('内覧形態_一般媒介');
        }
      }
    }

    // 後続担当のチェック
    if (!buyer.follow_up_assignee || buyer.follow_up_assignee.trim() === '') {
      errors.push('後続担当');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * エラーメッセージを生成
   * @param errors - エラーフィールド名の配列
   * @returns ユーザー向けエラーメッセージ
   */
  static getValidationErrorMessage(errors: string[]): string {
    if (errors.length === 0) return '';
    if (errors.length === 1) return `${errors[0]}が未入力です`;
    return `${errors.join('、')}が未入力です`;
  }
}
