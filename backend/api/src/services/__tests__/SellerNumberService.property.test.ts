/**
 * SellerNumberService プロパティベーステスト
 * Feature: seller-list-management
 * Property 1: 売主番号の一意性
 * 検証: 要件 11.1, 11.2
 */

import * as fc from 'fast-check';
import { SellerNumberService } from '../SellerNumberService';
import { areAllUnique, isValidSellerNumber } from '../../utils/__tests__/testHelpers';
import { sellerNumberArbitrary } from '../../utils/__tests__/testGenerators';

// Supabaseクライアントのモック
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
    from: jest.fn(),
  })),
}));

describe('SellerNumberService - Property-Based Tests', () => {
  let service: SellerNumberService;
  let mockSupabase: any;

  beforeEach(() => {
    service = new SellerNumberService();
    // @ts-ignore
    mockSupabase = service['supabase'] || require('@supabase/supabase-js').createClient();
    jest.clearAllMocks();
  });

  describe('Property 1: Seller Number Uniqueness', () => {
    it('should generate unique seller numbers in sequence', async () => {
      // Feature: seller-list-management, Property 1: Seller Number Uniqueness
      
      // 連続した番号を生成するモック
      let currentNumber = 1;
      mockSupabase.rpc = jest.fn().mockImplementation(() => {
        const sellerNumber = `AA${currentNumber.toString().padStart(5, '0')}`;
        currentNumber++;
        return Promise.resolve({ data: sellerNumber, error: null });
      });

      // 100個の売主番号を生成
      const numbers: string[] = [];
      for (let i = 0; i < 100; i++) {
        const number = await service.generateSellerNumber();
        numbers.push(number);
      }

      // すべての番号が一意であることを確認
      expect(areAllUnique(numbers)).toBe(true);

      // すべての番号が正しい形式であることを確認
      numbers.forEach(number => {
        expect(isValidSellerNumber(number)).toBe(true);
        expect(number).toMatch(/^AA\d{5}$/);
      });
    });

    it('should validate all generated seller numbers', () => {
      fc.assert(
        fc.property(
          fc.array(sellerNumberArbitrary(), { minLength: 2, maxLength: 50 }),
          (sellerNumbers) => {
            // すべての売主番号が有効な形式であることを確認
            sellerNumbers.forEach(number => {
              expect(service.validateSellerNumber(number)).toBe(true);
              expect(number).toMatch(/^AA\d{5}$/);
            });

            // すべての売主番号が一意であることを確認
            expect(areAllUnique(sellerNumbers)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format numbers correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 99999 }),
          (num) => {
            // @ts-ignore - private methodにアクセス
            const formatted = service['formatSellerNumber'](num);
            
            // 形式が正しいことを確認
            expect(formatted).toMatch(/^AA\d{5}$/);
            expect(isValidSellerNumber(formatted)).toBe(true);
            
            // 数字部分が5桁であることを確認
            const numberPart = formatted.substring(2);
            expect(numberPart.length).toBe(5);
            
            // 元の数字と一致することを確認
            expect(parseInt(numberPart, 10)).toBe(num);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateSellerNumber', () => {
    it('should accept valid seller numbers', () => {
      fc.assert(
        fc.property(sellerNumberArbitrary(), (sellerNumber) => {
          expect(service.validateSellerNumber(sellerNumber)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => !/^AA\d{5}$/.test(s)),
            fc.constant('AA1234'), // 4桁
            fc.constant('AA123456'), // 6桁
            fc.constant('AB12345'), // 異なるプレフィックス
            fc.constant('AA1234A'), // 文字を含む
            fc.constant('aa12345'), // 小文字
            fc.constant(''), // 空文字列
          ),
          (invalidNumber) => {
            expect(service.validateSellerNumber(invalidNumber)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases', () => {
      // 最小値
      expect(service.validateSellerNumber('AA00001')).toBe(true);
      
      // 最大値
      expect(service.validateSellerNumber('AA99999')).toBe(true);
      
      // null/undefined
      expect(service.validateSellerNumber(null as any)).toBe(false);
      expect(service.validateSellerNumber(undefined as any)).toBe(false);
      
      // 空文字列
      expect(service.validateSellerNumber('')).toBe(false);
      
      // スペースを含む
      expect(service.validateSellerNumber('AA 12345')).toBe(false);
      expect(service.validateSellerNumber(' AA12345')).toBe(false);
      expect(service.validateSellerNumber('AA12345 ')).toBe(false);
    });
  });

  describe('generateWithRetry', () => {
    it('should retry on failure and eventually succeed', async () => {
      let attemptCount = 0;
      mockSupabase.rpc = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.resolve({ data: null, error: { message: 'Temporary error' } });
        }
        return Promise.resolve({ data: 'AA00001', error: null });
      });

      const result = await service.generateWithRetry(3);

      expect(result).toBe('AA00001');
      expect(attemptCount).toBe(3);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Persistent error' },
      });

      await expect(service.generateWithRetry(3)).rejects.toThrow(
        'Failed to generate seller number after 3 attempts'
      );

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3);
    });

    it('should validate generated numbers', async () => {
      // 無効な形式の番号を返すモック
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: 'INVALID',
        error: null,
      });

      await expect(service.generateWithRetry(3)).rejects.toThrow(
        'Invalid seller number format generated'
      );
    });
  });

  describe('Concurrent generation simulation', () => {
    it('should handle concurrent requests without duplicates', async () => {
      // 並行リクエストをシミュレート
      let currentNumber = 1;
      const lock = { locked: false };

      mockSupabase.rpc = jest.fn().mockImplementation(async () => {
        // 簡易的なロック機構
        while (lock.locked) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        lock.locked = true;
        const sellerNumber = `AA${currentNumber.toString().padStart(5, '0')}`;
        currentNumber++;
        lock.locked = false;

        return { data: sellerNumber, error: null };
      });

      // 10個の並行リクエストを実行
      const promises = Array.from({ length: 10 }, () => 
        service.generateSellerNumber()
      );

      const results = await Promise.all(promises);

      // すべての番号が一意であることを確認
      expect(areAllUnique(results)).toBe(true);

      // すべての番号が有効な形式であることを確認
      results.forEach(number => {
        expect(isValidSellerNumber(number)).toBe(true);
      });
    });
  });
});
