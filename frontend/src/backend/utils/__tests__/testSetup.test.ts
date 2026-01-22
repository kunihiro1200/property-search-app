/**
 * テストセットアップ検証
 * fast-checkとテストヘルパーが正しく動作することを確認
 */

import * as fc from 'fast-check';
import {
  areAllUnique,
  isValidSellerNumber,
  isChronologicallySorted,
  MockDatabase,
} from './testHelpers';
import {
  sellerNumberArbitrary,
  phoneNumberArbitrary,
  emailArbitrary,
  sellerArbitrary,
} from './testGenerators';

describe('Test Setup Verification', () => {
  describe('fast-check integration', () => {
    it('should generate valid seller numbers', () => {
      fc.assert(
        fc.property(sellerNumberArbitrary(), (sellerNumber) => {
          expect(isValidSellerNumber(sellerNumber)).toBe(true);
          expect(sellerNumber).toMatch(/^AA\d{5}$/);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate valid phone numbers', () => {
      fc.assert(
        fc.property(phoneNumberArbitrary(), (phone) => {
          expect(phone).toMatch(/^\d{2,4}-\d{3,4}-\d{4}$/);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate valid email addresses', () => {
      fc.assert(
        fc.property(emailArbitrary(), (email) => {
          expect(email).toMatch(/^[a-z0-9]+@[a-z.]+$/);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate valid seller data', () => {
      fc.assert(
        fc.property(sellerArbitrary(), (seller) => {
          expect(seller.name).toBeDefined();
          expect(seller.phoneNumber).toBeDefined();
          expect(seller.address).toBeDefined();
          expect(seller.status).toBeDefined();
          expect(seller.confidence).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Test helpers', () => {
    it('should detect unique elements', () => {
      expect(areAllUnique([1, 2, 3, 4, 5])).toBe(true);
      expect(areAllUnique([1, 2, 3, 2, 5])).toBe(false);
      expect(areAllUnique([])).toBe(true);
    });

    it('should validate seller numbers', () => {
      expect(isValidSellerNumber('AA00001')).toBe(true);
      expect(isValidSellerNumber('AA12345')).toBe(true);
      expect(isValidSellerNumber('AA99999')).toBe(true);
      expect(isValidSellerNumber('AA1234')).toBe(false); // 4桁
      expect(isValidSellerNumber('AB12345')).toBe(false); // 異なるプレフィックス
      expect(isValidSellerNumber('AA1234A')).toBe(false); // 文字を含む
    });

    it('should detect chronological sorting', () => {
      const dates = [
        new Date('2025-01-03'),
        new Date('2025-01-02'),
        new Date('2025-01-01'),
      ];
      expect(isChronologicallySorted(dates)).toBe(true);

      const unsorted = [
        new Date('2025-01-01'),
        new Date('2025-01-03'),
        new Date('2025-01-02'),
      ];
      expect(isChronologicallySorted(unsorted)).toBe(false);
    });
  });

  describe('Mock database', () => {
    let db: MockDatabase;

    beforeEach(() => {
      db = new MockDatabase();
    });

    it('should insert and retrieve records', async () => {
      const record = { name: 'Test Seller', phone: '090-1234-5678' };
      const inserted = await db.insert('sellers', record);

      expect(inserted.id).toBeDefined();
      expect(inserted.name).toBe('Test Seller');

      const retrieved = await db.findById('sellers', inserted.id);
      expect(retrieved).toEqual(inserted);
    });

    it('should update records', async () => {
      const record = { name: 'Test Seller', phone: '090-1234-5678' };
      const inserted = await db.insert('sellers', record);

      const updated = await db.update('sellers', inserted.id, { name: 'Updated Seller' });
      expect(updated?.name).toBe('Updated Seller');
      expect(updated?.phone).toBe('090-1234-5678');
    });

    it('should delete records', async () => {
      const record = { name: 'Test Seller', phone: '090-1234-5678' };
      const inserted = await db.insert('sellers', record);

      const deleted = await db.delete('sellers', inserted.id);
      expect(deleted).toBe(true);

      const retrieved = await db.findById('sellers', inserted.id);
      expect(retrieved).toBeNull();
    });

    it('should find all records', async () => {
      await db.insert('sellers', { name: 'Seller 1' });
      await db.insert('sellers', { name: 'Seller 2' });
      await db.insert('sellers', { name: 'Seller 3' });

      const all = await db.findAll('sellers');
      expect(all).toHaveLength(3);
    });
  });
});
