# Tasks Document

## Task Breakdown

### Task 1: Backend - Create AthomeDataService

**Status**: ✅ Completed

**Description**: Create the `AthomeDataService` class to handle fetching athome sheet data from Google Sheets.

**Files to Create/Modify**:
- `backend/src/services/AthomeDataService.ts` (create)

**Implementation Steps**:

1. Create the service class file
2. Implement cache management (Map-based, 5-minute TTL)
3. Implement `getCellRange()` method with property type mapping
4. Implement `replaceSymbols()` method for ★ → ● conversion
5. Implement `fetchFromSheet()` method using GoogleSheetsClient
6. Implement `getAthomeData()` main method with:
   - Cache check
   - Input validation
   - Retry logic (1 retry after 1 second)
   - Error handling (graceful degradation)
   - Symbol replacement
   - Cache storage

**Acceptance Criteria**:
- Service correctly maps property types to cell ranges
- Cache works with 5-minute TTL
- Symbols are replaced correctly
- Errors are handled gracefully without throwing
- Empty cells are filtered out
- Retry logic works on first failure

**Dependencies**: None

**Estimated Time**: 2 hours

---

### Task 2: Backend - Add API Endpoint

**Status**: ✅ Completed

**Description**: Add a new API endpoint to serve athome data for public properties.

**Files to Create/Modify**:
- `backend/src/routes/publicProperties.ts` (modify)

**Implementation Steps**:

1. Add new route: `GET /api/public-properties/:id/athome`
2. Validate property ID parameter
3. Fetch property details using PropertyListingService
4. Check if property is public (atbb_status = '専任・公開中')
5. Call AthomeDataService with property details
6. Return JSON response with data
7. Handle 404 for non-existent properties
8. Handle 500 for server errors

**Acceptance Criteria**:
- Endpoint returns athome data for valid property ID
- Returns 404 for non-existent properties
- Returns empty array for properties without spreadsheet URL
- Returns empty array for unsupported property types
- Response includes cached flag
- Errors are logged but not exposed to client

**Dependencies**: Task 1

**Estimated Time**: 1 hour

---

### Task 3: Backend - Add Unit Tests

**Status**: ✅ Completed

**Description**: Create comprehensive unit tests for AthomeDataService.

**Files to Create/Modify**:
- `backend/src/services/__tests__/AthomeDataService.test.ts` (create)

**Implementation Steps**:

1. Test `getCellRange()` for all property types
2. Test `replaceSymbols()` with various inputs
3. Test cache hit/miss/expiry scenarios
4. Test `getAthomeData()` with mocked GoogleSheetsClient
5. Test error handling and retry logic
6. Test graceful degradation

**Test Cases**:
- ✓ Returns correct cell range for 土地
- ✓ Returns correct cell range for 戸建て
- ✓ Returns correct cell range for マンション
- ✓ Returns null for unknown property type
- ✓ Replaces ★ with ● at start of string
- ✓ Preserves text without ★
- ✓ Cache returns data within TTL
- ✓ Cache expires after TTL
- ✓ Fetches from sheet on cache miss
- ✓ Retries once on failure
- ✓ Returns empty array on persistent failure
- ✓ Filters out empty cells

**Dependencies**: Task 1

**Estimated Time**: 2 hours

---

### Task 4: Frontend - Create AthomeSection Component

**Status**: ✅ Completed

**Description**: Create a React component to display athome data on the property detail page.

**Files to Create/Modify**:
- `frontend/src/components/AthomeSection.tsx` (create)

**Implementation Steps**:

1. Create functional component with TypeScript
2. Add state for data, loading, error
3. Implement useEffect to fetch data on mount
4. Add 3-second timeout for API request
5. Implement loading state (CircularProgress)
6. Implement data display (Paper with list)
7. Implement silent failure (hide on error/no data)
8. Add proper styling with Material-UI

**Component Props**:
```typescript
interface AthomeSectionProps {
  propertyId: string;
}
```

**Acceptance Criteria**:
- Shows loading spinner while fetching
- Displays list of items when data available
- Hides completely when no data
- Hides completely on error (no error message)
- Times out after 3 seconds
- Styled consistently with other sections
- Uses Material-UI Paper component

**Dependencies**: Task 2

**Estimated Time**: 1.5 hours

---

### Task 5: Frontend - Integrate with PublicPropertyDetailPage

**Status**: ✅ Completed

**Description**: Add the AthomeSection component to the property detail page below the basic information section.

**Files to Create/Modify**:
- `frontend/src/pages/PublicPropertyDetailPage.tsx` (modify)

**Implementation Steps**:

1. Import AthomeSection component
2. Add component below basic info Paper
3. Pass property ID as prop
4. Verify positioning in layout
5. Test responsive behavior

**Placement**:
```tsx
{/* 物件基本情報 */}
<Paper elevation={2} sx={{ p: 3, mb: 3 }}>
  {/* ... existing basic info ... */}
</Paper>

{/* Athome情報セクション */}
<AthomeSection propertyId={property.id} />

{/* おすすめコメントセクション */}
<RecommendedCommentSection propertyId={property.id} />
```

**Acceptance Criteria**:
- Component appears below basic info section
- Component appears above recommended comment section
- Layout remains responsive
- No visual glitches or layout shifts
- Works on mobile and desktop

**Dependencies**: Task 4

**Estimated Time**: 0.5 hours

---

### Task 6: Testing - Manual Testing

**Status**: Not Started

**Description**: Perform comprehensive manual testing of the athome section feature.

**Test Scenarios**:

1. **Happy Path**:
   - Load property with athome data
   - Verify section appears below basic info
   - Verify data is displayed correctly
   - Verify symbols are replaced (★ → ●)

2. **No Data**:
   - Load property without spreadsheet URL
   - Verify section is hidden
   - Verify page loads normally

3. **Unknown Property Type**:
   - Load property with unsupported type
   - Verify section is hidden
   - Verify page loads normally

4. **Cache Behavior**:
   - Load property detail page
   - Reload page within 5 minutes
   - Verify data loads instantly (from cache)
   - Wait 5+ minutes and reload
   - Verify data fetches again

5. **Error Handling**:
   - Simulate API error (disconnect network)
   - Verify section is hidden
   - Verify no error message shown
   - Verify page loads normally

6. **Performance**:
   - Load property detail page
   - Verify athome section doesn't block page render
   - Verify timeout works (3 seconds max)

**Acceptance Criteria**:
- All test scenarios pass
- No console errors
- No visual glitches
- Performance is acceptable

**Dependencies**: Task 5

**Estimated Time**: 1 hour

---

### Task 7: Documentation - Update README

**Status**: ✅ Completed

**Description**: Document the athome section feature for developers and users.

**Files to Create/Modify**:
- `.kiro/specs/public-property-athome-section/README.md` (create)
- `.kiro/specs/public-property-athome-section/USER_GUIDE.md` (create)

**Documentation Sections**:

1. **README.md**:
   - Feature overview
   - Architecture diagram
   - API documentation
   - Configuration requirements
   - Troubleshooting guide

2. **USER_GUIDE.md**:
   - How to view athome information
   - What data is displayed
   - How to update athome data (in spreadsheet)
   - FAQ

**Acceptance Criteria**:
- Documentation is clear and comprehensive
- Includes code examples
- Includes screenshots (if applicable)
- Covers common issues and solutions

**Dependencies**: Task 6

**Estimated Time**: 1 hour

---

### Task 8: Deployment - Deploy to Production

**Status**: Not Started

**Description**: Deploy the athome section feature to production environment.

**Deployment Steps**:

1. **Pre-deployment**:
   - Review all code changes
   - Ensure all tests pass
   - Verify staging environment works
   - Prepare rollback plan

2. **Backend Deployment**:
   - Deploy backend changes
   - Verify API endpoint is accessible
   - Check logs for errors
   - Test cache behavior

3. **Frontend Deployment**:
   - Deploy frontend changes
   - Clear CDN cache if applicable
   - Verify component renders correctly
   - Test on multiple browsers

4. **Post-deployment**:
   - Monitor error logs
   - Check cache hit rate
   - Verify Google Sheets API quota
   - Gather user feedback

**Rollback Plan**:
- If issues occur, remove `<AthomeSection />` from PublicPropertyDetailPage
- Redeploy frontend only
- Backend endpoint can remain (harmless if unused)

**Acceptance Criteria**:
- Feature works in production
- No errors in logs
- Performance is acceptable
- Users can view athome data

**Dependencies**: Task 7

**Estimated Time**: 1 hour

---

## Task Summary

| Task | Description | Status | Estimated Time | Dependencies |
|------|-------------|--------|----------------|--------------|
| 1 | Create AthomeDataService | Not Started | 2 hours | None |
| 2 | Add API Endpoint | Not Started | 1 hour | Task 1 |
| 3 | Add Unit Tests | Not Started | 2 hours | Task 1 |
| 4 | Create AthomeSection Component | Not Started | 1.5 hours | Task 2 |
| 5 | Integrate with Detail Page | Not Started | 0.5 hours | Task 4 |
| 6 | Manual Testing | Not Started | 1 hour | Task 5 |
| 7 | Documentation | Not Started | 1 hour | Task 6 |
| 8 | Deployment | Not Started | 1 hour | Task 7 |

**Total Estimated Time**: 10 hours

## Implementation Order

1. Task 1: Backend service (foundation)
2. Task 2: API endpoint (exposes service)
3. Task 3: Unit tests (verify backend)
4. Task 4: Frontend component (UI)
5. Task 5: Integration (connect UI to API)
6. Task 6: Manual testing (verify end-to-end)
7. Task 7: Documentation (knowledge transfer)
8. Task 8: Deployment (go live)

## Notes

- Tasks 1-3 can be done by backend developer
- Tasks 4-5 can be done by frontend developer
- Tasks 6-8 require coordination between both
- Each task should be reviewed before moving to next
- Use feature branch for development
- Merge to main only after all tests pass
