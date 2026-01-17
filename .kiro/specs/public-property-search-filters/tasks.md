# Implementation Tasks

## Overview

This document outlines the implementation tasks for the Public Property Search Filters feature. Tasks are organized by component and include database setup, backend API extensions, frontend UI updates, and comprehensive testing.

## Task Status Legend

- [ ] Not started
- [x] Completed
- [~] In progress

## Database Setup

### Task 1: Enable pg_trgm Extension
- [ ] 1.1 Create migration file `078_enable_pg_trgm_extension.sql`
- [ ] 1.2 Add SQL command to enable pg_trgm extension for partial text matching
- [ ] 1.3 Create migration runner script `run-078-migration.ts`
- [ ] 1.4 Test migration on development database
- [ ] 1.5 Verify extension is enabled with `SELECT * FROM pg_extension WHERE extname = 'pg_trgm';`

**Requirements:** REQ-6.2 (Database indexes for performance)

**Checkpoint:** Extension enabled and verified

### Task 2: Create Database Indexes
- [ ] 2.1 Create migration file `079_add_search_filter_indexes.sql`
- [ ] 2.2 Add GIN index on `address` field: `CREATE INDEX idx_property_listings_address_gin ON property_listings USING gin(address gin_trgm_ops);`
- [ ] 2.3 Add B-tree index on `construction_year_month`: `CREATE INDEX idx_property_listings_construction_year_month ON property_listings(construction_year_month);`
- [ ] 2.4 Add GIN index on `property_number`: `CREATE INDEX idx_property_listings_property_number_gin ON property_listings USING gin(property_number gin_trgm_ops);`
- [ ] 2.5 Create migration runner script `run-079-migration.ts`
- [ ] 2.6 Test migration on development database
- [ ] 2.7 Verify indexes created with `\d property_listings` in psql

**Requirements:** REQ-6.2 (Database indexes for performance)

**Checkpoint:** All indexes created and verified

## Backend Implementation

### Task 3: Extend PropertyListingService - Location Filter
- [ ] 3.1 Open `backend/src/services/PropertyListingService.ts`
- [ ] 3.2 Add `location?: string` parameter to `getPublicProperties` method options
- [ ] 3.3 Implement location filter logic using `query.ilike('address', `%${location}%`)`
- [ ] 3.4 Add input sanitization for location parameter
- [ ] 3.5 Add JSDoc comments explaining location filter behavior
- [ ] 3.6 Update TypeScript interface for method options

**Requirements:** REQ-1.1, REQ-1.2, REQ-1.4 (Location filtering with partial match)

### Task 4: Extend PropertyListingService - Building Age Filter
- [ ] 4.1 Add `buildingAgeRange?: { min?: number; max?: number }` parameter to `getPublicProperties` method options
- [ ] 4.2 Implement building age calculation logic (current year/month - construction year/month)
- [ ] 4.3 Convert age range to construction date range for database query
- [ ] 4.4 Add query filters: `query.lte('construction_year_month', maxYearMonth)` for minAge
- [ ] 4.5 Add query filters: `query.gte('construction_year_month', minYearMonth)` for maxAge
- [ ] 4.6 Handle null construction dates (exclude from results)
- [ ] 4.7 Add JSDoc comments explaining age filter logic

**Requirements:** REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4 (Building age filtering)

### Task 5: Add Property Number Search Method (Internal)
- [ ] 5.1 Add new method `searchByPropertyNumber(propertyNumber: string, exactMatch: boolean): Promise<any[]>` to PropertyListingService
- [ ] 5.2 Implement exact match logic: `query.eq('property_number', propertyNumber)`
- [ ] 5.3 Implement partial match logic: `query.ilike('property_number', `%${propertyNumber}%`)`
- [ ] 5.4 Add input validation and sanitization
- [ ] 5.5 Add error handling with descriptive messages
- [ ] 5.6 Add JSDoc comments with usage examples

**Requirements:** REQ-3.1, REQ-3.2, REQ-3.5 (Property number search)

**Checkpoint:** Service methods implemented and documented

### Task 6: Extend Public Properties API Endpoint
- [ ] 6.1 Open `backend/src/routes/publicProperties.ts`
- [ ] 6.2 Add `location` query parameter extraction and validation
- [ ] 6.3 Add `minAge` and `maxAge` query parameter extraction and validation
- [ ] 6.4 Validate age range (minAge <= maxAge, both >= 0)
- [ ] 6.5 Pass location filter to `propertyListingService.getPublicProperties()`
- [ ] 6.6 Pass building age range to `propertyListingService.getPublicProperties()`
- [ ] 6.7 Update API response to include filter metadata
- [ ] 6.8 Add error handling for invalid filter parameters (400 Bad Request)

**Requirements:** REQ-1.1, REQ-2.1, REQ-4.1 (Filter combination with AND logic)

### Task 7: Create Internal Property Search Endpoint
- [x] 7.1 Add new route `GET /api/internal/properties/search` in `publicProperties.ts`
- [x] 7.2 Add authentication middleware to route
- [x] 7.3 Extract and validate `propertyNumber` query parameter
- [x] 7.4 Extract and parse `exact` query parameter (default: 'false')
- [x] 7.5 Call `propertyListingService.searchByPropertyNumber()`
- [x] 7.6 Return results with count: `{ properties: results, count: results.length }`
- [x] 7.7 Add error handling for missing/invalid parameters (400 Bad Request)
- [x] 7.8 Add error handling for authentication failures (401 Unauthorized)

**Requirements:** REQ-3.3, REQ-3.4 (Property number filter access control)

**Checkpoint:** API endpoints extended and secured

## Frontend Implementation

### Task 8: Extend PublicPropertyFilters Interface
- [x] 8.1 Open `frontend/src/types/publicProperty.ts` (or create if not exists)
- [x] 8.2 Add `location?: string` to PublicPropertyFilters interface
- [x] 8.3 Add `minAge?: number` to PublicPropertyFilters interface
- [x] 8.4 Add `maxAge?: number` to PublicPropertyFilters interface
- [x] 8.5 Export updated interface

**Requirements:** REQ-1.1, REQ-2.1 (Filter data model)

**Status:** ✅ COMPLETE

### Task 9: Add Location Search Field to PublicPropertyFilters Component
- [x] 9.1 Open `frontend/src/components/PublicPropertyFilters.tsx`
- [x] 9.2 Add state for location input: `const [locationInput, setLocationInput] = useState('')`
- [x] 9.3 Create debounced search handler (500ms delay)
- [x] 9.4 Add text input field with label "所在地で検索"
- [x] 9.5 Add placeholder text: "例: 大分市、別府市中央町"
- [x] 9.6 Add clear button (X icon) that appears when text is entered
- [x] 9.7 Connect input to debounced handler
- [x] 9.8 Update filter state on debounced input change
- [x] 9.9 Add ARIA labels for accessibility

**Requirements:** REQ-1.1, REQ-1.2, REQ-5.2, REQ-5.3 (Location search UI)

**Status:** ✅ COMPLETE

**Requirements:** REQ-1.1, REQ-1.2, REQ-5.2, REQ-5.3 (Location search UI)

### Task 10: Add Building Age Range Fields to PublicPropertyFilters Component
- [x] 10.1 Add state for age inputs: `const [minAge, setMinAge] = useState<number | undefined>()`
- [x] 10.2 Add state for age inputs: `const [maxAge, setMaxAge] = useState<number | undefined>()`
- [x] 10.3 Add number input field with label "築年数（最小）"
- [x] 10.4 Add number input field with label "築年数（最大）"
- [x] 10.5 Add unit label "年" next to inputs
- [x] 10.6 Add placeholder text: "例: 0, 10, 20"
- [x] 10.7 Implement input validation (min >= 0, max >= min)
- [x] 10.8 Display validation error message if range is invalid
- [x] 10.9 Add "適用" (Apply) button or auto-apply on blur
- [x] 10.10 Update filter state when valid values are entered
- [x] 10.11 Add ARIA labels for accessibility

**Requirements:** REQ-2.1, REQ-2.2, REQ-5.2, REQ-5.3 (Building age filter UI)

**Status:** ✅ COMPLETE

### Task 11: Add Clear All Filters Button
- [x] 11.1 Add "すべてクリア" (Clear All) button to filter component
- [x] 11.2 Implement handler to reset all filter state to default values
- [x] 11.3 Clear location input field
- [x] 11.4 Clear age range inputs
- [x] 11.5 Clear existing filters (property type, price, areas)
- [x] 11.6 Trigger filter update to show all properties
- [x] 11.7 Add visual feedback (button disabled when no filters active)

**Requirements:** REQ-4.5 (Clear all filters functionality)

**Status:** ✅ COMPLETE

### Task 12: Display Active Filters and Result Count
- [x] 12.1 Add section to display active filters as chips/tags
- [x] 12.2 Show location filter if active: "所在地: {location}"
- [x] 12.3 Show age range if active: "築年数: {min}年 - {max}年"
- [x] 12.4 Add remove button (X) to each filter chip
- [x] 12.5 Display result count: "{count}件の物件が見つかりました"
- [x] 12.6 Update count when filters change
- [x] 12.7 Show "条件に一致する物件が見つかりませんでした" when count is 0

**Requirements:** REQ-4.4, REQ-1.5, REQ-5.4 (Result count and no results message)

**Status:** ✅ COMPLETE

### Task 13: Implement Filter State Persistence
- [x] 13.1 Update URL query parameters when filters change
- [x] 13.2 Parse URL query parameters on component mount
- [x] 13.3 Restore filter state from URL parameters
- [x] 13.4 Maintain filter state during pagination
- [x] 13.5 Test browser back/forward navigation with filters

**Requirements:** REQ-4.3 (Filter state persistence)

**Status:** ✅ COMPLETE

### Task 14: Update API Service for New Filters
- [x] 14.1 Open `frontend/src/services/publicApi.ts`
- [x] 14.2 Add `location` parameter to `getPublicProperties` function
- [x] 14.3 Add `minAge` and `maxAge` parameters to `getPublicProperties` function
- [x] 14.4 Build query string with new parameters
- [x] 14.5 Update TypeScript types for API response
- [x] 14.6 Add error handling for API failures

**Requirements:** REQ-1.1, REQ-2.1 (API integration)

**Status:** ✅ COMPLETE

**Checkpoint:** Frontend UI complete and functional

**Requirements:** REQ-1.1, REQ-2.1 (API integration)

**Checkpoint:** Frontend UI complete and functional

## Testing Implementation

### Task 15: Create Property-Based Test Generators*
- [ ] 15.1 Create `propertyWithAddressGenerator()` for location filter tests
- [ ] 15.2 Create `propertyWithConstructionDateGenerator()` for age filter tests
- [ ] 15.3 Create `propertyWithOptionalConstructionDateGenerator()` for null handling tests
- [ ] 15.4 Create `propertyWithNumberGenerator()` for property number search tests
- [ ] 15.5 Create `filterCombinationGenerator()` for combined filter tests
- [ ] 15.6 Create `filterStateGenerator()` for state persistence tests

**Requirements:** All properties (testing infrastructure)

### Task 16: Implement Property 1 Test - Location Filtering*
- [ ] 16.1 Create test file `backend/src/services/__tests__/PropertyListingService.location.property.test.ts`
- [ ] 16.2 Implement property test: location filter returns only matching addresses
- [ ] 16.3 Test case-insensitive matching
- [ ] 16.4 Test partial match behavior
- [ ] 16.5 Run 100 iterations with fast-check
- [ ] 16.6 Verify all returned properties contain search term

**Requirements:** REQ-1.1, REQ-1.2, REQ-1.4 (Property 1)

### Task 17: Implement Property 2 Test - Building Age Range*
- [ ] 17.1 Create test in same file or new file
- [ ] 17.2 Implement property test: age filter returns only properties within range
- [ ] 17.3 Test minimum age boundary
- [ ] 17.4 Test maximum age boundary
- [ ] 17.5 Test both boundaries together
- [ ] 17.6 Run 100 iterations with fast-check
- [ ] 17.7 Verify all returned properties have age within specified range

**Requirements:** REQ-2.1, REQ-2.2, REQ-2.3 (Property 2)

### Task 18: Implement Property 3 Test - Null Building Age Handling*
- [ ] 18.1 Implement property test: null construction dates excluded from age filtering
- [ ] 18.2 Generate properties with mix of valid and null construction dates
- [ ] 18.3 Apply age filter
- [ ] 18.4 Run 100 iterations with fast-check
- [ ] 18.5 Verify no returned properties have null construction dates

**Requirements:** REQ-2.4 (Property 3)

### Task 19: Implement Property 4 Test - Property Number Search*
- [ ] 19.1 Create test file `backend/src/services/__tests__/PropertyListingService.propertyNumber.property.test.ts`
- [ ] 19.2 Implement property test: exact match returns only exact matches
- [ ] 19.3 Implement property test: partial match returns all containing matches
- [ ] 19.4 Test case-insensitive matching
- [ ] 19.5 Run 100 iterations with fast-check
- [ ] 19.6 Verify search results match expected behavior

**Requirements:** REQ-3.1, REQ-3.2, REQ-3.5 (Property 4)

### Task 20: Implement Property 5 Test - Access Control*
- [ ] 20.1 Create test file `backend/src/routes/__tests__/publicProperties.auth.property.test.ts`
- [ ] 20.2 Implement property test: unauthenticated requests return 401
- [ ] 20.3 Test with various property numbers
- [ ] 20.4 Run 100 iterations with fast-check
- [ ] 20.5 Verify all unauthenticated requests are rejected

**Requirements:** REQ-3.3, REQ-3.4 (Property 5)

### Task 21: Implement Property 6 Test - Combined Filters AND Logic*
- [ ] 21.1 Create test file `backend/src/services/__tests__/PropertyListingService.combined.property.test.ts`
- [ ] 21.2 Implement property test: multiple filters use AND logic
- [ ] 21.3 Generate various filter combinations
- [ ] 21.4 Run 100 iterations with fast-check
- [ ] 21.5 Verify all returned properties match ALL filter criteria

**Requirements:** REQ-4.1 (Property 6)

### Task 22: Implement Property 7 Test - Filter State Persistence*
- [ ] 22.1 Create test file `frontend/src/components/__tests__/PublicPropertyFilters.persistence.property.test.tsx`
- [ ] 22.2 Implement property test: filter state persists across page navigation
- [ ] 22.3 Test with various filter combinations and page numbers
- [ ] 22.4 Run 100 iterations with fast-check
- [ ] 22.5 Verify filter values preserved (except page number)

**Requirements:** REQ-4.3 (Property 7)

### Task 23: Implement Property 8 Test - Result Count Display*
- [ ] 23.1 Implement property test: displayed count matches actual filtered results
- [ ] 23.2 Generate various filter combinations
- [ ] 23.3 Run 100 iterations with fast-check
- [ ] 23.4 Verify count accuracy for all filter combinations

**Requirements:** REQ-4.4 (Property 8)

### Task 24: Implement Property 9 Test - Clear Filters*
- [ ] 24.1 Implement property test: clear filters resets all values to default
- [ ] 24.2 Generate various active filter states
- [ ] 24.3 Run 100 iterations with fast-check
- [ ] 24.4 Verify all filter values are undefined after clear

**Requirements:** REQ-1.3, REQ-2.5, REQ-4.5 (Property 9)

### Task 25: Implement Property 10 Test - No Results Message*
- [ ] 25.1 Implement property test: no results message shown when count is 0
- [ ] 25.2 Generate filter combinations that may yield zero results
- [ ] 25.3 Run 100 iterations with fast-check
- [ ] 25.4 Verify message displayed only when results are empty

**Requirements:** REQ-1.5 (Property 10)

### Task 26: Implement Property 11 Test - Input Sanitization*
- [ ] 26.1 Create test file `backend/src/services/__tests__/PropertyListingService.security.property.test.ts`
- [ ] 26.2 Implement property test: malicious input is sanitized
- [ ] 26.3 Generate SQL injection patterns, XSS attempts, path traversal
- [ ] 26.4 Run 100 iterations with fast-check
- [ ] 26.5 Verify sanitized output contains no malicious patterns

**Requirements:** REQ-7.1, REQ-7.2 (Property 11)

**Checkpoint:** All property-based tests implemented and passing

### Task 27: Create Unit Tests for Service Methods*
- [ ] 27.1 Create test file `backend/src/services/__tests__/PropertyListingService.filters.test.ts`
- [ ] 27.2 Test location filter with empty string
- [ ] 27.3 Test location filter with special characters
- [ ] 27.4 Test age filter with zero values
- [ ] 27.5 Test age filter with very large values
- [ ] 27.6 Test age filter with invalid range (min > max)
- [ ] 27.7 Test property number search with empty string
- [ ] 27.8 Test property number search with special characters
- [ ] 27.9 Test combined filters with all parameters
- [ ] 27.10 Test error handling for database failures

**Requirements:** REQ-7.4 (Edge case handling)

### Task 28: Create Unit Tests for API Endpoints*
- [ ] 28.1 Create test file `backend/src/routes/__tests__/publicProperties.filters.test.ts`
- [ ] 28.2 Test location parameter parsing
- [ ] 28.3 Test age parameter parsing and validation
- [ ] 28.4 Test invalid age range returns 400
- [ ] 28.5 Test missing property number returns 400
- [ ] 28.6 Test unauthenticated internal search returns 401
- [ ] 28.7 Test successful filter combinations return 200
- [ ] 28.8 Test response format includes filter metadata

**Requirements:** REQ-7.1 (Input validation)

### Task 29: Create Frontend Component Tests*
- [ ] 29.1 Create test file `frontend/src/components/__tests__/PublicPropertyFilters.test.tsx`
- [ ] 29.2 Test location input renders correctly
- [ ] 29.3 Test age range inputs render correctly
- [ ] 29.4 Test debounced location search (mock timer)
- [ ] 29.5 Test age range validation error display
- [ ] 29.6 Test clear button functionality
- [ ] 29.7 Test clear all filters button
- [ ] 29.8 Test active filter chips display
- [ ] 29.9 Test result count display
- [ ] 29.10 Test no results message display

**Requirements:** REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4 (UI display)

### Task 30: Create Integration Tests*
- [ ] 30.1 Create test file `backend/src/__tests__/integration/publicPropertyFilters.test.ts`
- [ ] 30.2 Test end-to-end location filter flow
- [ ] 30.3 Test end-to-end age filter flow
- [ ] 30.4 Test end-to-end combined filters flow
- [ ] 30.5 Test pagination with filters
- [ ] 30.6 Test filter state persistence in URL
- [ ] 30.7 Test internal property number search with authentication
- [ ] 30.8 Test performance with large dataset (measure response time)

**Requirements:** REQ-6.1 (Performance), REQ-4.3 (State persistence)

**Checkpoint:** All tests implemented and passing

## Documentation and Deployment

### Task 31: Update API Documentation
- [ ] 31.1 Document new query parameters in API documentation
- [ ] 31.2 Add examples for location filter
- [ ] 31.3 Add examples for building age filter
- [ ] 31.4 Document internal property number search endpoint
- [ ] 31.5 Add authentication requirements for internal endpoint
- [ ] 31.6 Document error responses and status codes

**Requirements:** REQ-7.5 (Documentation)

### Task 32: Create User Guide
- [ ] 32.1 Create user guide document in `.kiro/specs/public-property-search-filters/USER_GUIDE.md`
- [ ] 32.2 Document how to use location search
- [ ] 32.3 Document how to use building age filter
- [ ] 32.4 Document how to combine filters
- [ ] 32.5 Document how to clear filters
- [ ] 32.6 Add screenshots of filter UI
- [ ] 32.7 Add troubleshooting section

**Requirements:** REQ-5.1 (User documentation)

### Task 33: Performance Testing and Optimization
- [ ] 33.1 Run performance tests with 1000+ properties
- [ ] 33.2 Measure location search response time
- [ ] 33.3 Measure age filter response time
- [ ] 33.4 Measure combined filter response time
- [ ] 33.5 Verify all responses < 2 seconds
- [ ] 33.6 Optimize slow queries if needed
- [ ] 33.7 Verify indexes are being used (EXPLAIN ANALYZE)

**Requirements:** REQ-6.1, REQ-6.5 (Performance)

### Task 34: Deployment Preparation
- [ ] 34.1 Create deployment checklist
- [ ] 34.2 Verify all migrations are ready
- [ ] 34.3 Create rollback plan for migrations
- [ ] 34.4 Test migrations on staging database
- [ ] 34.5 Verify frontend build succeeds
- [ ] 34.6 Create deployment guide document
- [ ] 34.7 Schedule deployment window

**Requirements:** All (Deployment readiness)

**Checkpoint:** Feature ready for production deployment

## Notes

- Tasks marked with * are optional test tasks as per spec workflow
- All property-based tests should run minimum 100 iterations
- Database migrations should be tested on staging before production
- Frontend changes should be tested on multiple browsers and devices
- Performance testing should be done with realistic data volumes
- Security testing should include penetration testing for input sanitization

## Dependencies

- Task 2 depends on Task 1 (pg_trgm extension must be enabled before creating GIN indexes)
- Tasks 3-5 should be completed before Tasks 6-7 (service methods before API endpoints)
- Task 8 should be completed before Tasks 9-14 (type definitions before UI implementation)
- Tasks 15-26 depend on Tasks 3-7 (property tests require service implementation)
- Task 33 depends on Task 2 (performance testing requires indexes)
- Task 34 depends on all previous tasks (deployment requires complete implementation)
