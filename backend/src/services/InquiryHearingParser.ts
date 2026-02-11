/**
 * InquiryHearingParser
 * 
 * 問合せ時ヒアリングのテキストをパースして、希望条件フィールドに反映する値を抽出します。
 */

export interface ParsedInquiryHearing {
  desired_timing?: string;
  parking_spaces?: string;
  price_range_house?: string;
  price_range_apartment?: string;
  price_range_land?: string;
}

export class InquiryHearingParser {
  /**
   * 問合せ時ヒアリングをパースして希望条件フィールドの値を抽出
   * @param inquiryHearing 問合せ時ヒアリングのテキスト
   * @param desiredPropertyType 希望種別（戸建て、マンション、土地）
   */
  parseInquiryHearing(inquiryHearing: string, desiredPropertyType?: string): ParsedInquiryHearing {
    if (!inquiryHearing || inquiryHearing.trim() === '') {
      return {};
    }

    const result: ParsedInquiryHearing = {};

    try {
      // 希望時期を抽出
      const desiredTiming = this.extractFieldValue(inquiryHearing, /希望時期[：:]\s*([^\n]+)/);
      if (desiredTiming) {
        result.desired_timing = desiredTiming;
      }

      // 駐車場希望台数を抽出
      const parkingSpaces = this.extractFieldValue(inquiryHearing, /駐車場希望台数[：:]\s*([^\n]+)/);
      if (parkingSpaces) {
        result.parking_spaces = parkingSpaces;
      }

      // 予算を抽出してマッピング
      const budget = this.extractFieldValue(inquiryHearing, /予算[：:]\s*([^\n]+)/);
      if (budget) {
        const priceRange = this.mapPriceRange(budget);
        if (priceRange) {
          // 希望種別に応じて適切なフィールドに設定
          if (desiredPropertyType?.includes('戸建')) {
            result.price_range_house = priceRange;
          } else if (desiredPropertyType?.includes('マンション')) {
            result.price_range_apartment = priceRange;
          } else if (desiredPropertyType?.includes('土地')) {
            result.price_range_land = priceRange;
          } else {
            // 希望種別が不明な場合は全てのフィールドに設定
            result.price_range_house = priceRange;
            result.price_range_apartment = priceRange;
            result.price_range_land = priceRange;
          }
        }
      }
    } catch (error) {
      console.error('[InquiryHearingParser] Error parsing inquiry hearing:', error);
      // エラーが発生しても空のオブジェクトを返す
    }

    return result;
  }

  /**
   * フィールド値を抽出
   */
  private extractFieldValue(text: string, pattern: RegExp): string | undefined {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  }

  /**
   * 価格帯をマッピング
   */
  private mapPriceRange(budgetText: string): string | undefined {
    if (!budgetText) {
      return undefined;
    }

    // 数値を抽出
    const numberMatch = budgetText.match(/(\d+)/);
    if (!numberMatch) {
      return undefined;
    }

    const amount = parseInt(numberMatch[1], 10);

    // 「以下」「以上」のパターンをチェック
    if (budgetText.includes('以下')) {
      return `${amount}万円以下`;
    }

    if (budgetText.includes('以上')) {
      return `${amount}万円以上`;
    }

    // 通常の価格帯（例: 3000万円 → 3000万円台）
    return `${amount}万円台`;
  }

  /**
   * 上書き可能かどうかを判定
   */
  shouldOverwrite(
    fieldName: string,
    currentValue: any,
    currentUpdatedAt: Date | null,
    inquiryHearingUpdatedAt: Date
  ): boolean {
    // 現在の値がnullまたは未定義の場合は常に上書き
    if (currentValue === null || currentValue === undefined || currentValue === '') {
      return true;
    }

    // 現在の最終更新日時がnullの場合は上書き
    if (!currentUpdatedAt) {
      return true;
    }

    // 問合せ時ヒアリングの最終更新日時が新しい場合は上書き
    return inquiryHearingUpdatedAt > currentUpdatedAt;
  }
}
