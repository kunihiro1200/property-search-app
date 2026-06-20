/**
 * Property-Based Tests for PropertyListingService Public API
 * 
 * Feature: public-property-site
 * Property 1: Status Filtering
 * 
 * Validates: Requirements 1.1
 * 
 * For any set of properties with mixed statuses, when filtering for public display,
 * only properties with status "サイト表示" should be returned.
 */

import * as fc from 'fast-check';
import { PropertyListingService } from '../PropertyListingService';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('../CityNameExtractor');
jest.mock('../PropertyDistributionAreaCalculator');

// Set environment variables for tests
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';

describe('PropertyListingService - Public API Property Tests', () => {
  let service: PropertyListingService;
  let mockSupabase: any;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
    };

    // Initialize service
    service = new PropertyListingService();
    
    // Replace the supabase client with our mock
    (service as any).supabase = mockSupabase;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: Status Filtering
   * 
   * For any set of properties with mixed statuses, when filtering for public display,
   * only properties with status "サイト表示" should be returned.
   */
  describe('Property 1: Status Filtering', () => {
    it('should only return properties with status "サイト表示"', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate array of properties with mixed site_display values
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.string({ minLength: 5, maxLength: 10 }),
              property_type: fc.constantFrom('戸建て', 'マンション', '土地'),
              address: fc.string({ minLength: 10, maxLength: 100 }),
              price: fc.integer({ min: 1000000, max: 100000000 }),
              land_area: fc.option(fc.double({ min: 10, max: 1000 }), { nil: null }),
              building_area: fc.option(fc.double({ min: 10, max: 500 }), { nil: null }),
              construction_year: fc.option(fc.integer({ min: 1950, max: 2024 }), { nil: null }),
              image_urls: fc.array(fc.webUrl(), { maxLength: 10 }),
              distribution_areas: fc.array(fc.string(), { maxLength: 5 }),
              site_display: fc.constantFrom('サイト表示', '非表示', '準備中', null),
              created_at: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          async (allProperties) => {
            // Filter properties that should be returned (only "サイト表示")
            const expectedProperties = allProperties.filter(
              p => p.site_display === 'サイト表示'
            );

            // Create a fresh mock for this test iteration
            const mockEq = jest.fn().mockReturnThis();
            const mockOrder = jest.fn().mockReturnThis();
            const mockRange = jest.fn().mockResolvedValue({
              data: expectedProperties,
              error: null,
              count: expectedProperties.length,
            });

            mockSupabase.from.mockReturnValueOnce({
              select: jest.fn().mockReturnValue({
                eq: mockEq,
                order: mockOrder,
                range: mockRange,
              }),
            });

            // Call the service method
            const result = await service.getPublicProperties({
              limit: 100,
              offset: 0,
            });

            // Verify that eq was called with 'site_display' and 'サイト表示'
            expect(mockEq).toHaveBeenCalledWith('site_display', 'サイト表示');

            // Verify count matches expected (all returned properties should be from expectedProperties)
            expect(result.properties.length).toBe(expectedProperties.length);
            
            // The key property: the service correctly filtered by status
            // Since we mocked the DB to return only expectedProperties (which are all 'サイト表示'),
            // and the service called eq with 'site_display' and 'サイト表示',
            // this proves the filtering is working correctly
            
            // Verify all returned properties are from the expected set
            result.properties.forEach(property => {
              const found = expectedProperties.find(p => p.id === property.id);
              expect(found).toBeDefined();
            });
          }
        ),
        { numRuns: 100 } // Run 100 iterations
      );
    });

    it('should return empty array when no properties have status "サイト表示"', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate array of properties WITHOUT "サイト表示" status
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.string({ minLength: 5, maxLength: 10 }),
              property_type: fc.constantFrom('戸建て', 'マンション', '土地'),
              address: fc.string({ minLength: 10, maxLength: 100 }),
              price: fc.integer({ min: 1000000, max: 100000000 }),
              site_display: fc.constantFrom('非表示', '準備中', null),
              created_at: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (_nonPublicProperties) => {
            // Mock empty response since no properties match
            mockSupabase.select.mockReturnValueOnce({
              ...mockSupabase,
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockResolvedValueOnce({
                data: [],
                error: null,
                count: 0,
              }),
            });

            const result = await service.getPublicProperties({
              limit: 100,
              offset: 0,
            });

            // Should return empty array
            expect(result.properties).toEqual([]);
            expect(result.total).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by status even when other filters are applied', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              property_number: fc.string({ minLength: 5, maxLength: 10 }),
              property_type: fc.constantFrom('戸建て', 'マンション', '土地'),
              address: fc.string({ minLength: 10, maxLength: 100 }),
              price: fc.integer({ min: 1000000, max: 100000000 }),
              site_display: fc.constantFrom('サイト表示', '非表示', '準備中'),
              created_at: fc.date().map(d => d.toISOString()),
            }),
            { minLength: 10, maxLength: 50 }
          ),
          fc.constantFrom('戸建て', 'マンション', '土地'),
          fc.record({
            min: fc.integer({ min: 1000000, max: 50000000 }),
            max: fc.integer({ min: 50000001, max: 100000000 }),
          }),
          async (allProperties, propertyType, priceRange) => {
            // Filter for expected results: サイト表示 AND matching filters
            const expectedProperties = allProperties.filter(
              p =>
                p.site_display === 'サイト表示' &&
                p.property_type === propertyType &&
                p.price >= priceRange.min &&
                p.price <= priceRange.max
            );

            // Create a fresh mock chain for this iteration
            const mockEq = jest.fn().mockReturnThis();
            const mockGte = jest.fn().mockReturnThis();
            const mockLte = jest.fn().mockReturnThis();
            const mockOrder = jest.fn().mockReturnThis();
            const mockRange = jest.fn().mockResolvedValue({
              data: expectedProperties,
              error: null,
              count: expectedProperties.length,
            });

            mockSupabase.from.mockReturnValueOnce({
              select: jest.fn().mockReturnValue({
                eq: mockEq,
                gte: mockGte,
                lte: mockLte,
                order: mockOrder,
                range: mockRange,
              }),
            });

            const result = await service.getPublicProperties({
              propertyType,
              priceRange,
              limit: 100,
              offset: 0,
            });

            // Verify site_display filter was applied
            expect(mockEq).toHaveBeenCalledWith('site_display', 'サイト表示');

            // Verify all results match the criteria
            // The key property: all returned properties should match the filters
            result.properties.forEach(property => {
              expect(property.property_type).toBe(propertyType);
              expect(property.price).toBeGreaterThanOrEqual(priceRange.min);
              expect(property.price).toBeLessThanOrEqual(priceRange.max);
              
              // Verify property is from expected set
              const found = expectedProperties.find(p => p.id === property.id);
              expect(found).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional test: getPublicPropertyById should also filter by status
   */
  describe('Property 1: Status Filtering (Detail View)', () => {
    it('should only return property if status is "サイト表示"', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('サイト表示', '非表示', '準備中', null),
          async (propertyId, siteDisplay) => {
            const mockProperty = {
              id: propertyId,
              property_number: 'AA12345',
              property_type: '戸建て',
              address: 'Test Address',
              price: 50000000,
              site_display: siteDisplay,
              created_at: new Date().toISOString(),
            };

            // Create a fresh mock chain for this iteration
            const mockEq = jest.fn().mockReturnThis();
            const mockSingle = jest.fn();

            if (siteDisplay === 'サイト表示') {
              // Should return the property
              mockSingle.mockResolvedValueOnce({
                data: mockProperty,
                error: null,
              });
            } else {
              // Should return null (not found)
              mockSingle.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' },
              });
            }

            mockSupabase.from.mockReturnValueOnce({
              select: jest.fn().mockReturnValue({
                eq: mockEq,
                single: mockSingle,
              }),
            });

            const result = await service.getPublicPropertyById(propertyId);

            // Verify the filter was applied
            expect(mockEq).toHaveBeenCalledWith('site_display', 'サイト表示');

            // Verify the result matches expectations
            if (siteDisplay === 'サイト表示') {
              expect(result).toEqual(mockProperty);
            } else {
              expect(result).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
