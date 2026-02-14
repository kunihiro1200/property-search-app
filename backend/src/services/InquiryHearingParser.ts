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
  desired_area?: string;
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
            console.log('[InquiryHearingParser] 価格帯を戸建に設定:', priceRange);
          } else if (desiredPropertyType?.includes('マンション')) {
            result.price_range_apartment = priceRange;
            console.log('[InquiryHearingParser] 価格帯をマンションに設定:', priceRange);
          } else if (desiredPropertyType?.includes('土地')) {
            result.price_range_land = priceRange;
            console.log('[InquiryHearingParser] 価格帯を土地に設定:', priceRange);
          } else {
            // 希望種別が不明な場合はエラーログを出力し、価格帯を設定しない
            console.error('[InquiryHearingParser] 希望種別が不明なため、価格帯を設定できません。desired_property_type:', desiredPropertyType);
            console.error('[InquiryHearingParser] 予算:', budget);
            console.error('[InquiryHearingParser] 価格帯:', priceRange);
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
   * 
   * 選択肢:
   * - ~1900万円
   * - 1000万円~2999万円
   * - 2000万円以上
   * 
   * マッピングルール:
   * - 予算900万円 → ~1900万円
   * - 予算2500万円 → 1000万円~2999万円
   * - 予算3000万円 → 2000万円以上
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

    // 価格帯にマッピング
    if (amount < 1000) {
      // 1000万円未満 → ~1900万円
      return '~1900万円';
    } else if (amount < 3000) {
      // 1000万円～2999万円 → 1000万円~2999万円
      return '1000万円~2999万円';
    } else {
      // 3000万円以上 → 2000万円以上
      return '2000万円以上';
    }
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

  /**
   * 物件情報から希望条件を自動設定
   * @param propertyInfo 物件情報（price, distribution_areas, property_type）
   * @param desiredPropertyType 希望種別
   */
  parseFromPropertyInfo(
    propertyInfo: { price?: number; distribution_areas?: string; property_type?: string },
    desiredPropertyType?: string
  ): ParsedInquiryHearing {
    const result: ParsedInquiryHearing = {};

    try {
      // 価格帯を設定
      if (propertyInfo.price) {
        const priceRange = this.mapPriceRangeFromAmount(propertyInfo.price);
        if (priceRange) {
          // 希望種別に応じて適切なフィールドに設定
          if (desiredPropertyType?.includes('戸建')) {
            result.price_range_house = priceRange;
            console.log('[InquiryHearingParser] 価格帯を戸建に設定（物件から）:', priceRange);
          } else if (desiredPropertyType?.includes('マンション')) {
            result.price_range_apartment = priceRange;
            console.log('[InquiryHearingParser] 価格帯をマンションに設定（物件から）:', priceRange);
          } else if (desiredPropertyType?.includes('土地')) {
            result.price_range_land = priceRange;
            console.log('[InquiryHearingParser] 価格帯を土地に設定（物件から）:', priceRange);
          }
        }
      }

      // 希望エリアを設定
      if (propertyInfo.distribution_areas) {
        result.desired_area = propertyInfo.distribution_areas;
        console.log('[InquiryHearingParser] 希望エリアを設定（物件から）:', propertyInfo.distribution_areas);
      }
    } catch (error) {
      console.error('[InquiryHearingParser] Error parsing from property info:', error);
    }

    return result;
  }

  /**
   * 金額から価格帯をマッピング
   * @param amount 金額（円）
   */
  private mapPriceRangeFromAmount(amount: number): string | undefined {
    if (amount < 10000000) {
      // 1000万円未満 → ~1900万円
      return '~1900万円';
    } else if (amount < 30000000) {
      // 1000万円～2999万円 → 1000万円~2999万円
      return '1000万円~2999万円';
    } else {
      // 3000万円以上 → 2000万円以上
      return '2000万円以上';
    }
  }
}
