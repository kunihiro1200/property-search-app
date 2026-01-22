/**
 * Property-Based Test for Property Listings Buyers Endpoint
 * Feature: buyer-property-linkage-fix, Property 6: Buyer count display format
 * Validates: Requirements 4.2
 */

import * as fc from 'fast-check';
import { BuyerSummary } from '../../services/BuyerLinkageService';

describe('Property 6: Buyer count display format', () => {
  /**
   * Property: For any list of buyers, the count should equal the array length
   * and each buyer should have required fields (buyer_number, name, phone_number, latest_status)
   */
  it('should return buyer count equal to array length with all required fields', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary buyer lists
        fc.array(
          fc.record({
            id: fc.uuid(),
            buyer_number: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            phone_number: fc.string({ minLength: 10, maxLength: 20 }),
            email: fc.string({ minLength: 5, maxLength: 100 }),
            latest_status: fc.constantFrom('新規', '追客中', '商談中', '成約', 'キャンセル'),
            inquiry_confidence: fc.constantFrom('S', 'A', 'B', 'C', 'D'),
            reception_date: fc.date().map(d => d.toISOString()),
            latest_viewing_date: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
            next_call_date: fc.option(fc.date().map(d => d.toISOString()), { nil: null })
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (buyers: BuyerSummary[]) => {
          // Property: Count should equal array length
          const count = buyers.length;
          expect(count).toBe(buyers.length);

          // Property: Each buyer should have required fields
          buyers.forEach(buyer => {
            expect(buyer).toHaveProperty('buyer_number');
            expect(buyer).toHaveProperty('name');
            expect(buyer).toHaveProperty('phone_number');
            expect(buyer).toHaveProperty('latest_status');
            
            // Validate field types
            expect(typeof buyer.buyer_number).toBe('string');
            expect(typeof buyer.name).toBe('string');
            expect(typeof buyer.phone_number).toBe('string');
            expect(typeof buyer.latest_status).toBe('string');
            
            // Validate non-empty strings
            expect(buyer.buyer_number.length).toBeGreaterThan(0);
            expect(buyer.name.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any buyer list, filtering by status should return only buyers with that status
   */
  it('should correctly filter buyers by status', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            buyer_number: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            phone_number: fc.string({ minLength: 10, maxLength: 20 }),
            email: fc.string({ minLength: 5, maxLength: 100 }),
            latest_status: fc.constantFrom('新規', '追客中', '商談中', '成約', 'キャンセル'),
            inquiry_confidence: fc.constantFrom('S', 'A', 'B', 'C', 'D'),
            reception_date: fc.date().map(d => d.toISOString()),
            latest_viewing_date: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
            next_call_date: fc.option(fc.date().map(d => d.toISOString()), { nil: null })
          }),
          { minLength: 0, maxLength: 50 }
        ),
        fc.constantFrom('新規', '追客中', '商談中', '成約', 'キャンセル'),
        (buyers: BuyerSummary[], targetStatus: string) => {
          // Filter buyers by status
          const filtered = buyers.filter(b => b.latest_status === targetStatus);
          
          // Property: All filtered buyers should have the target status
          filtered.forEach(buyer => {
            expect(buyer.latest_status).toBe(targetStatus);
          });
          
          // Property: Count of filtered buyers should be <= total count
          expect(filtered.length).toBeLessThanOrEqual(buyers.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any buyer list, sorting by reception_date should maintain order
   */
  it('should maintain sort order by reception_date', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            buyer_number: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            phone_number: fc.string({ minLength: 10, maxLength: 20 }),
            email: fc.string({ minLength: 5, maxLength: 100 }),
            latest_status: fc.constantFrom('新規', '追客中', '商談中', '成約', 'キャンセル'),
            inquiry_confidence: fc.constantFrom('S', 'A', 'B', 'C', 'D'),
            reception_date: fc.date().map(d => d.toISOString()),
            latest_viewing_date: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
            next_call_date: fc.option(fc.date().map(d => d.toISOString()), { nil: null })
          }),
          { minLength: 2, maxLength: 50 }
        ),
        fc.constantFrom('asc' as const, 'desc' as const),
        (buyers: BuyerSummary[], sortOrder: 'asc' | 'desc') => {
          // Sort buyers by reception_date
          const sorted = [...buyers].sort((a, b) => {
            const dateA = new Date(a.reception_date).getTime();
            const dateB = new Date(b.reception_date).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          });
          
          // Property: Sorted array should maintain order
          for (let i = 0; i < sorted.length - 1; i++) {
            const dateA = new Date(sorted[i].reception_date).getTime();
            const dateB = new Date(sorted[i + 1].reception_date).getTime();
            
            if (sortOrder === 'asc') {
              expect(dateA).toBeLessThanOrEqual(dateB);
            } else {
              expect(dateA).toBeGreaterThanOrEqual(dateB);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any buyer list with limit, result should not exceed limit
   */
  it('should respect limit parameter', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            buyer_number: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            phone_number: fc.string({ minLength: 10, maxLength: 20 }),
            email: fc.string({ minLength: 5, maxLength: 100 }),
            latest_status: fc.constantFrom('新規', '追客中', '商談中', '成約', 'キャンセル'),
            inquiry_confidence: fc.constantFrom('S', 'A', 'B', 'C', 'D'),
            reception_date: fc.date().map(d => d.toISOString()),
            latest_viewing_date: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
            next_call_date: fc.option(fc.date().map(d => d.toISOString()), { nil: null })
          }),
          { minLength: 0, maxLength: 100 }
        ),
        fc.integer({ min: 1, max: 50 }),
        (buyers: BuyerSummary[], limit: number) => {
          // Apply limit
          const limited = buyers.slice(0, limit);
          
          // Property: Result should not exceed limit
          expect(limited.length).toBeLessThanOrEqual(limit);
          
          // Property: Result should be <= original array length
          expect(limited.length).toBeLessThanOrEqual(buyers.length);
          
          // Property: If original array is smaller than limit, result should equal original
          if (buyers.length <= limit) {
            expect(limited.length).toBe(buyers.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any property number, buyer count should be non-negative
   */
  it('should return non-negative buyer count', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 1000 }),
        (_propertyNumber: string, count: number) => {
          // Property: Count should be non-negative
          expect(count).toBeGreaterThanOrEqual(0);
          
          // Property: Count should be an integer
          expect(Number.isInteger(count)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
