/**
 * InquiryHistory プロパティベーステスト
 * 
 * Feature: seller-list-management
 * Property 1: 問合せ履歴テーブル初期表示時の自動チェック
 * Validates: Requirements 1.2
 * 
 * このテストは、問合せ履歴データの中で is_current_status が true の項目が
 * 正しく識別されることを検証します。
 */

import * as fc from 'fast-check';

// InquiryHistory型の定義
interface InquiryHistory {
  id: string;
  sellerId: string;
  inquiryDate: Date;
  inquirySite?: string;
  inquiryReason?: string;
  isCurrentStatus: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 問合せ履歴データから is_current_status が true の項目を検出する関数
 * （実際のコンポーネントで使用されるロジックをシミュレート）
 */
function findCurrentStatusInquiry(inquiries: InquiryHistory[]): InquiryHistory | undefined {
  return inquiries.find(inquiry => inquiry.isCurrentStatus === true);
}

/**
 * 問合せ履歴データのジェネレーター
 */
const inquiryHistoryArbitrary = fc.record({
  id: fc.uuid(),
  sellerId: fc.uuid(),
  inquiryDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
  inquirySite: fc.option(fc.constantFrom('ウ', 'L', 'その他'), { nil: undefined }),
  inquiryReason: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  isCurrentStatus: fc.boolean(),
  notes: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

describe('InquiryHistory Property-Based Tests', () => {
  /**
   * Property 1: 問合せ履歴テーブル初期表示時の自動チェック
   * 
   * For any: 問合せ履歴データのリスト
   * When: is_current_status が true の項目が1つ存在する場合
   * Then: その項目が正しく検出されること
   */
  it('Property 1: is_current_status が true の項目を正しく検出できる', () => {
    fc.assert(
      fc.property(
        fc.array(inquiryHistoryArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (inquiries, currentIndex) => {
          // テストデータの準備: 1つの項目だけ is_current_status を true にする
          const adjustedIndex = currentIndex % inquiries.length;
          const testInquiries = inquiries.map((inquiry, index) => ({
            ...inquiry,
            isCurrentStatus: index === adjustedIndex,
          }));

          // 実行
          const result = findCurrentStatusInquiry(testInquiries);

          // 検証
          expect(result).toBeDefined();
          expect(result?.isCurrentStatus).toBe(true);
          expect(result?.id).toBe(testInquiries[adjustedIndex].id);
        }
      ),
      { numRuns: 100 } // 100回のランダムテストを実行
    );
  });

  /**
   * Property 2: is_current_status が true の項目が存在しない場合
   * 
   * For any: 問合せ履歴データのリスト
   * When: すべての項目の is_current_status が false の場合
   * Then: undefined が返されること
   */
  it('Property 2: is_current_status が true の項目が存在しない場合は undefined を返す', () => {
    fc.assert(
      fc.property(
        fc.array(inquiryHistoryArbitrary, { minLength: 1, maxLength: 10 }),
        (inquiries) => {
          // テストデータの準備: すべての項目の is_current_status を false にする
          const testInquiries = inquiries.map(inquiry => ({
            ...inquiry,
            isCurrentStatus: false,
          }));

          // 実行
          const result = findCurrentStatusInquiry(testInquiries);

          // 検証
          expect(result).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: 空の配列の場合
   * 
   * For any: 空の問合せ履歴データのリスト
   * Then: undefined が返されること
   */
  it('Property 3: 空の配列の場合は undefined を返す', () => {
    const result = findCurrentStatusInquiry([]);
    expect(result).toBeUndefined();
  });

  /**
   * Property 4: 複数の is_current_status が true の項目が存在する場合
   * （データ整合性の問題だが、最初の項目を返すべき）
   * 
   * For any: 問合せ履歴データのリスト
   * When: 複数の項目の is_current_status が true の場合
   * Then: 最初の項目が返されること
   */
  it('Property 4: 複数の is_current_status が true の項目がある場合は最初の項目を返す', () => {
    fc.assert(
      fc.property(
        fc.array(inquiryHistoryArbitrary, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        (inquiries, index1, index2) => {
          // テストデータの準備: 2つの項目の is_current_status を true にする
          const adjustedIndex1 = index1 % inquiries.length;
          const adjustedIndex2 = index2 % inquiries.length;
          
          // 異なるインデックスを保証
          if (adjustedIndex1 === adjustedIndex2) {
            return; // スキップ
          }

          const firstTrueIndex = Math.min(adjustedIndex1, adjustedIndex2);
          
          const testInquiries = inquiries.map((inquiry, index) => ({
            ...inquiry,
            isCurrentStatus: index === adjustedIndex1 || index === adjustedIndex2,
          }));

          // 実行
          const result = findCurrentStatusInquiry(testInquiries);

          // 検証: 最初の true の項目が返されること
          expect(result).toBeDefined();
          expect(result?.isCurrentStatus).toBe(true);
          expect(result?.id).toBe(testInquiries[firstTrueIndex].id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
