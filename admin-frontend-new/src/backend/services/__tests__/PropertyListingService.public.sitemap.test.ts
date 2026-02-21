// Property-based tests for sitemap generation
// Feature: public-property-site, Property 8: Sitemap Completeness
// Validates: Requirements 6.4

import fc from 'fast-check';
import { PropertyListingService } from '../PropertyListingService';

// Set up environment variables for tests
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

// Mock Supabase client
const mockProperties: any[] = [];

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockProperties,
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('Property 8: Sitemap Completeness', () => {
  let service: PropertyListingService;

  beforeEach(() => {
    mockProperties.length = 0;
    service = new PropertyListingService();
  });

  /**
   * Property: For any set of public properties, the sitemap should contain
   * URLs for all and only those properties with status "サイト表示"
   */
  test('sitemap contains all public property IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            site_display: fc.constantFrom('サイト表示', '非表示', null)
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (properties) => {
          // Set up mock data
          mockProperties.length = 0;
          const publicProperties = properties.filter(p => p.site_display === 'サイト表示');
          mockProperties.push(...publicProperties);

          // Get sitemap IDs
          const sitemapIds = await service.getAllPublicPropertyIds();

          // Verify all public properties are included
          const allPublicIncluded = publicProperties.every(p =>
            sitemapIds.includes(p.id)
          );

          // Verify no non-public properties are included
          const noNonPublicIncluded = properties
            .filter(p => p.site_display !== 'サイト表示')
            .every(p => !sitemapIds.includes(p.id));

          // Verify count matches
          const countMatches = sitemapIds.length === publicProperties.length;

          return allPublicIncluded && noNonPublicIncluded && countMatches;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sitemap should return empty array when no public properties exist
   */
  test('sitemap returns empty array for no public properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            site_display: fc.constantFrom('非表示', null, '下書き')
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (_properties) => {
          // Set up mock data with no public properties
          mockProperties.length = 0;

          // Get sitemap IDs
          const sitemapIds = await service.getAllPublicPropertyIds();

          // Should return empty array
          return sitemapIds.length === 0;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Sitemap IDs should be unique (no duplicates)
   */
  test('sitemap contains unique property IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid()
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (properties) => {
          // Set up mock data
          mockProperties.length = 0;
          mockProperties.push(...properties);

          // Get sitemap IDs
          const sitemapIds = await service.getAllPublicPropertyIds();

          // Check for uniqueness
          const uniqueIds = new Set(sitemapIds);
          return uniqueIds.size === sitemapIds.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sitemap should maintain consistent ordering
   */
  test('sitemap maintains consistent ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (properties) => {
          // Set up mock data sorted by created_at descending
          mockProperties.length = 0;
          const sorted = [...properties].sort((a, b) => 
            b.created_at.getTime() - a.created_at.getTime()
          );
          mockProperties.push(...sorted);

          // Get sitemap IDs twice
          const sitemapIds1 = await service.getAllPublicPropertyIds();
          const sitemapIds2 = await service.getAllPublicPropertyIds();

          // Should return same order both times
          return JSON.stringify(sitemapIds1) === JSON.stringify(sitemapIds2);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Sitemap should handle large number of properties
   */
  test('sitemap handles large property sets efficiently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 200 }),
        async (count) => {
          // Generate large set of properties
          const properties = Array.from({ length: count }, (_, i) => ({
            id: `property-${i}`,
            created_at: new Date()
          }));

          mockProperties.length = 0;
          mockProperties.push(...properties);

          const startTime = Date.now();
          const sitemapIds = await service.getAllPublicPropertyIds();
          const duration = Date.now() - startTime;

          // Should complete in reasonable time (< 1 second)
          // and return correct count
          return sitemapIds.length === count && duration < 1000;
        }
      ),
      { numRuns: 10 }
    );
  });
});
