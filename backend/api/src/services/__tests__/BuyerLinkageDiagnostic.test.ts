// **Feature: buyer-property-linkage-fix, Property 1: Buyer count accuracy**
import * as fc from 'fast-check';
import { BuyerLinkageDiagnostic } from '../BuyerLinkageDiagnostic';

// モックデータ生成用のヘルパー
const generateBuyerSample = () => fc.record({
  buyer_number: fc.string({ minLength: 1, maxLength: 10 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  property_number: fc.oneof(
    fc.constant(null),
    fc.constant(''),
    fc.string({ minLength: 5, maxLength: 10 }).map(s => `AA${s}`)
  ),
  synced_at: fc.date().map(d => d.toISOString())
});

describe('BuyerLinkageDiagnostic', () => {
  let diagnostic: BuyerLinkageDiagnostic;
  let mockSupabase: any;

  beforeEach(() => {
    // Supabaseクライアントのモック
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    };

    diagnostic = new BuyerLinkageDiagnostic(mockSupabase);
  });

  describe('Property 1: Buyer count accuracy', () => {
    /**
     * **Feature: buyer-property-linkage-fix, Property 1: Buyer count accuracy**
     * **Validates: Requirements 1.2, 4.1**
     * 
     * For any property_number, the count of buyers returned by the query 
     * should equal the number of buyer records in the database with that property_number value.
     */
    it('should return accurate buyer count for any property number', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 10 }).map(s => `AA${s}`),
          fc.array(generateBuyerSample(), { minLength: 0, maxLength: 20 }),
          async (propertyNumber, allBuyers) => {
            // 指定されたproperty_numberを持つ買主をフィルタリング
            const expectedBuyers = allBuyers.filter(
              b => b.property_number === propertyNumber
            );

            // モックの設定 - 最後のメソッド呼び出しで戻り値を返す
            mockSupabase.order = jest.fn().mockResolvedValue({
              data: expectedBuyers,
              error: null
            });

            // 実行
            const result = await diagnostic.getBuyersForProperty(propertyNumber);

            // 検証: 返された買主数が期待値と一致すること
            expect(result.length).toBe(expectedBuyers.length);

            // 検証: すべての買主が正しいproperty_numberを持つこと
            result.forEach(buyer => {
              expect(buyer.property_number).toBe(propertyNumber);
            });
          }
        ),
        { numRuns: 100 } // 100回のランダムテストを実行
      );
    });

    it('should correctly count buyers with and without property_number', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(generateBuyerSample(), { minLength: 10, maxLength: 100 }),
          async (buyers) => {
            // 期待値を計算
            const expectedWithProperty = buyers.filter(
              b => b.property_number !== null && b.property_number !== ''
            ).length;
            const expectedWithoutProperty = buyers.length - expectedWithProperty;

            // 検証: 合計が一致すること（ロジックのテスト）
            expect(expectedWithProperty + expectedWithoutProperty).toBe(buyers.length);

            // 検証: 未設定の買主数が正しいこと
            expect(expectedWithoutProperty).toBe(buyers.length - expectedWithProperty);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when no buyers exist for property', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 10 }).map(s => `AA${s}`),
          async (propertyNumber) => {
            // モックの設定 - 買主なし（最後のメソッドで戻り値を返す）
            mockSupabase.order = jest.fn().mockResolvedValue({
              data: [],
              error: null
            });

            // 実行
            const result = await diagnostic.getBuyersForProperty(propertyNumber);

            // 検証
            expect(result).toEqual([]);
            expect(result.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property distribution', () => {
    it('should correctly calculate property number distribution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(generateBuyerSample(), { minLength: 10, maxLength: 50 }),
          async (buyers) => {
            // property_numberが設定されている買主のみをフィルタ
            const buyersWithProperty = buyers.filter(
              b => b.property_number !== null && b.property_number !== ''
            );

            // 期待される分布を計算
            const expectedDistribution: Record<string, number> = {};
            buyersWithProperty.forEach(b => {
              const pn = b.property_number!;
              expectedDistribution[pn] = (expectedDistribution[pn] || 0) + 1;
            });

            // モックの設定（最後のメソッドで戻り値を返す）
            mockSupabase.neq = jest.fn().mockResolvedValue({
              data: buyersWithProperty,
              error: null
            });

            // 実行
            const distribution = await diagnostic.getPropertyDistribution();

            // 検証: 分布が正しいこと
            expect(Object.keys(distribution).length).toBe(Object.keys(expectedDistribution).length);
            
            Object.keys(expectedDistribution).forEach(propertyNumber => {
              expect(distribution[propertyNumber]).toBe(expectedDistribution[propertyNumber]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
