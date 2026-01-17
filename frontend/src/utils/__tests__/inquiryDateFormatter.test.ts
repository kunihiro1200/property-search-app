/**
 * Property-Based Tests for Inquiry Date Formatter
 * 
 * **Feature: inquiry-date-display-enhancement**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.3**
 */

import * as fc from 'fast-check';
import { formatInquiryDate, hasTimeInfo, SellerDateInfo } from '../inquiryDateFormatter';

describe('formatInquiryDate - Property-Based Tests', () => {
  // タイムスタンプ範囲を定義（2020年〜2030年）
  const minTimestamp = new Date('2020-01-01').getTime();
  const maxTimestamp = new Date('2030-12-31').getTime();

  /**
   * **Property 1: 反響詳細日時優先表示**
   * *For any* 売主データにおいて、反響詳細日時（inquiryDetailedDatetime）が存在する場合、
   * 表示される日付は反響詳細日時の値と一致する
   * 
   * **Validates: Requirements 1.1, 3.3**
   */
  describe('Property 1: 反響詳細日時優先表示', () => {
    it('反響詳細日時が存在する場合、その値が表示に使用される', () => {
      fc.assert(
        fc.property(
          // 有効な日時を生成（タイムスタンプから構築）
          fc.integer({ min: minTimestamp, max: maxTimestamp }),
          fc.integer({ min: minTimestamp, max: maxTimestamp }),
          (detailedTs, inquiryTs) => {
            const detailedDatetime = new Date(detailedTs);
            const inquiryDate = new Date(inquiryTs);
            
            const seller: SellerDateInfo = {
              inquiryDetailedDatetime: detailedDatetime.toISOString(),
              inquiryDate: inquiryDate.toISOString(),
            };

            const result = formatInquiryDate(seller);

            // 結果が '-' でないこと
            expect(result).not.toBe('-');

            // 反響詳細日時の年月日が結果に含まれていること
            const year = detailedDatetime.getFullYear();
            const month = String(detailedDatetime.getMonth() + 1).padStart(2, '0');
            const day = String(detailedDatetime.getDate()).padStart(2, '0');
            
            expect(result).toContain(String(year));
            expect(result).toContain(month);
            expect(result).toContain(day);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('反響詳細日時のみ存在する場合も正しく表示される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: minTimestamp, max: maxTimestamp }),
          (timestamp) => {
            const detailedDatetime = new Date(timestamp);
            const seller: SellerDateInfo = {
              inquiryDetailedDatetime: detailedDatetime.toISOString(),
              inquiryDate: null,
            };

            const result = formatInquiryDate(seller);
            expect(result).not.toBe('-');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 2: 反響日付フォールバック**
   * *For any* 売主データにおいて、反響詳細日時がnullで反響日付（inquiryDate）が存在する場合、
   * 表示される日付は反響日付の値と一致する
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Property 2: 反響日付フォールバック', () => {
    it('反響詳細日時がnullの場合、反響日付が表示される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: minTimestamp, max: maxTimestamp }),
          (timestamp) => {
            const inquiryDate = new Date(timestamp);
            const seller: SellerDateInfo = {
              inquiryDetailedDatetime: null,
              inquiryDate: inquiryDate.toISOString(),
            };

            const result = formatInquiryDate(seller);

            // 結果が '-' でないこと
            expect(result).not.toBe('-');

            // 反響日付の年月日が結果に含まれていること
            const year = inquiryDate.getFullYear();
            expect(result).toContain(String(year));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('反響詳細日時がundefinedの場合、反響日付が表示される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: minTimestamp, max: maxTimestamp }),
          (timestamp) => {
            const inquiryDate = new Date(timestamp);
            const seller: SellerDateInfo = {
              inquiryDate: inquiryDate.toISOString(),
            };

            const result = formatInquiryDate(seller);
            expect(result).not.toBe('-');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 3: 日時フォーマット一貫性**
   * *For any* 反響詳細日時が存在する売主データにおいて、
   * フォーマットされた表示文字列には時刻情報（時:分）が含まれる
   * 
   * **Validates: Requirements 1.3**
   */
  describe('Property 3: 日時フォーマット一貫性', () => {
    it('反響詳細日時がある場合、表示に時刻情報が含まれる', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: minTimestamp, max: maxTimestamp }),
          (timestamp) => {
            const detailedDatetime = new Date(timestamp);
            const seller: SellerDateInfo = {
              inquiryDetailedDatetime: detailedDatetime.toISOString(),
            };

            const result = formatInquiryDate(seller);

            // 時刻情報（HH:MM形式）が含まれていること
            expect(hasTimeInfo(result)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Property 4: 日付フォーマット一貫性**
   * *For any* 反響詳細日時がnullで反響日付のみ存在する売主データにおいて、
   * フォーマットされた表示文字列には時刻情報が含まれない
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 4: 日付フォーマット一貫性', () => {
    it('反響日付のみの場合、表示に時刻情報が含まれない', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: minTimestamp, max: maxTimestamp }),
          (timestamp) => {
            const inquiryDate = new Date(timestamp);
            const seller: SellerDateInfo = {
              inquiryDetailedDatetime: null,
              inquiryDate: inquiryDate.toISOString(),
            };

            const result = formatInquiryDate(seller);

            // 時刻情報が含まれていないこと
            expect(hasTimeInfo(result)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * エッジケーステスト
   */
  describe('Edge Cases', () => {
    it('両方nullの場合は "-" を返す', () => {
      const seller: SellerDateInfo = {
        inquiryDetailedDatetime: null,
        inquiryDate: null,
      };
      expect(formatInquiryDate(seller)).toBe('-');
    });

    it('両方undefinedの場合は "-" を返す', () => {
      const seller: SellerDateInfo = {};
      expect(formatInquiryDate(seller)).toBe('-');
    });

    it('無効な日付文字列の場合は "-" を返す', () => {
      const seller: SellerDateInfo = {
        inquiryDetailedDatetime: 'invalid-date',
        inquiryDate: 'also-invalid',
      };
      expect(formatInquiryDate(seller)).toBe('-');
    });

    it('空文字列の場合は "-" を返す', () => {
      const seller: SellerDateInfo = {
        inquiryDetailedDatetime: '',
        inquiryDate: '',
      };
      expect(formatInquiryDate(seller)).toBe('-');
    });
  });
});
