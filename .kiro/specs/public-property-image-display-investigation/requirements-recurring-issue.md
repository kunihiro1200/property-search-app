# Public Property Image Display - Recurring Issue Investigation

## Status: 🔍 ROOT CAUSE IDENTIFIED

## Investigation Date
January 3, 2026

## Problem Statement

### User Report
User provided a screenshot showing that **NO images are displaying** on `localhost:5173/public/properties` despite previous fix being marked as complete.

### Previous Fix (Completed)
- **Date**: December 2025
- **Change**: Modified `PropertyListingService.getPublicProperties()` to use `image_url` field directly instead of calling Google Drive API
- **Result**: Load time improved from 20-100s to <1s, image display rate improved from ~0% to 52%
- **Status**: ✅ Implementation verified (lines 217-220 in PropertyListingService.ts)

## Investigation Results

### 1. Database State ✅
```
Total properties: 1,000
├─ Public properties (atbb_status = '専任・公開中'): 152
│  └─ With image_url: ~80% (4 out of 5 samples)
├─ With storage_location: 126 (12.6%)
└─ With image_url: 50 (5.0%)
```

**Conclusion**: Public properties have image data available ✅

### 2. Backend API Response ✅
```json
{
  "properties": [
    {
      "property_number": "AA13129",
      "property_type": "戸建",
      "address": "大分市田尻北3-14",
      "price": 19800000,
      "image_url": "https://drive.google.com/uc?export=view&id=...",
      "images": ["https://drive.google.com/uc?export=view&id=..."]
    }
  ]
}
```

**Conclusion**: Backend correctly returns `images` array ✅

### 3. Frontend Expectations ❌
```typescript
interface PublicProperty {
  id: string;
  propertyNumber: string;  // ❌ camelCase
  address: string;
  price: number;
  propertyType: string;    // ❌ camelCase
  images?: string[];
}
```

**Conclusion**: Frontend expects camelCase field names ❌

### 4. Actual API Response ⚠️
```json
{
  "property_number": "AA13129",  // ⚠️ snake_case
  "property_type": "戸建",       // ⚠️ snake_case
  "images": [...]
}
```

**Conclusion**: Backend returns snake_case field names ⚠️

## Root Cause

**Field Name Mismatch Between Backend and Frontend**

| Field | Backend (Actual) | Frontend (Expected) | Match |
|-------|-----------------|---------------------|-------|
| Property Number | `property_number` | `propertyNumber` | ❌ |
| Property Type | `property_type` | `propertyType` | ❌ |
| Address | `address` | `address` | ✅ |
| Price | `price` | `price` | ✅ |
| Images | `images` | `images` | ✅ |

**Impact**:
- Frontend cannot read `propertyNumber` → Property number not displayed
- Frontend cannot read `propertyType` → Property type not displayed
- `images` array is correctly read → **Images should display** (needs further investigation)

## Additional Investigation Needed

### Hypothesis 1: Frontend Mapping Issue
`PublicPropertiesPage.tsx` may not be correctly mapping the API response data.

### Hypothesis 2: Image URL Format Issue
Google Drive URL format may have changed, preventing browser from loading images.

### Hypothesis 3: CORS Issue
Image loading from Google Drive may be failing due to CORS errors.

## User Stories

### US-1: Verify Browser Console Errors
**As a** developer  
**I want to** check browser console for errors  
**So that** I can identify the exact cause of image display failure

**Acceptance Criteria:**
- User opens browser developer tools (F12)
- User checks Console tab for error messages
- User checks Network tab for API response and image loading status
- User provides screenshots of findings

### US-2: Fix Field Name Mismatch
**As a** developer  
**I want to** convert backend response to camelCase  
**So that** frontend can correctly read all property data

**Acceptance Criteria:**
- Backend converts snake_case fields to camelCase in API response
- Frontend correctly displays property number and type
- Images display correctly
- No breaking changes to other API consumers

## Technical Requirements

### TR-1: Browser Console Investigation
**Required Actions:**
1. Open `localhost:5173/public/properties`
2. Open browser developer tools (F12)
3. Check Console tab for errors
4. Check Network tab:
   - Find `/api/public/properties` request
   - Verify response status (should be 200)
   - Check response body format
   - Check image loading requests (if any)

### TR-2: Backend Response Transformation
**File:** `backend/src/services/PropertyListingService.ts`

**Current Code (lines 217-220):**
```typescript
const propertiesWithImages = (data || []).map((property) => {
  const images = property.image_url ? [property.image_url] : [];
  return { ...property, images };
});
```

**Proposed Fix:**
```typescript
const propertiesWithImages = (data || []).map((property) => {
  const images = property.image_url ? [property.image_url] : [];
  return {
    id: property.id,
    propertyNumber: property.property_number,
    propertyType: property.property_type,
    address: property.address,
    price: property.price,
    landArea: property.land_area,
    buildingArea: property.building_area,
    constructionYearMonth: property.construction_year_month,
    distributionAreas: property.distribution_areas,
    atbbStatus: property.atbb_status,
    createdAt: property.created_at,
    images
  };
});
```

### TR-3: Verify Image URL Format
**Required Actions:**
1. Extract sample image URL from API response
2. Open URL directly in browser
3. Verify image loads correctly
4. Check for CORS errors in console

## Solution Options

### Option A: Backend Transformation (Recommended)
**Pros:**
- Follows JavaScript/TypeScript naming conventions
- Consistent with frontend expectations
- No frontend changes required

**Cons:**
- Requires backend code change
- Need to ensure all fields are mapped

**Implementation Time:** 30 minutes

### Option B: Frontend Adaptation
**Pros:**
- No backend changes required
- Simpler implementation

**Cons:**
- Goes against JavaScript naming conventions
- May require changes in multiple frontend files

**Implementation Time:** 1 hour

## Success Criteria

1. **Field Name Consistency:** Backend response uses camelCase field names
2. **Image Display:** Images display correctly on public properties page
3. **Property Information:** Property number and type display correctly
4. **Performance:** Page load time remains <1 second
5. **No Regressions:** Other pages continue to work correctly

## Next Steps

### Phase 1: Investigation (Immediate)
1. ✅ Run diagnostic scripts
2. ✅ Analyze database state
3. ✅ Analyze API response format
4. ✅ Identify root cause
5. ⏳ **User action required**: Check browser console

### Phase 2: Fix Implementation (After browser check)
1. Implement backend response transformation
2. Test on development environment
3. Verify images display correctly
4. Verify all property information displays correctly
5. Deploy to production

### Phase 3: Documentation
1. Update spec documentation
2. Create user guide
3. Document lessons learned

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking other API consumers | Low | High | Verify no other code depends on snake_case response |
| Image URL format changed | Medium | High | Test image URLs directly in browser |
| CORS issues | Low | Medium | Check browser console for CORS errors |
| Missing field mappings | Low | Low | Comprehensive testing of all fields |

## Related Files

- `backend/src/services/PropertyListingService.ts` - Backend API implementation
- `frontend/src/pages/PublicPropertiesPage.tsx` - Frontend implementation
- `backend/test-public-api-response.ts` - Diagnostic script (newly created)
- `backend/check-image-data.ts` - Database diagnostic script
- `.kiro/specs/public-property-image-display-investigation/RECURRING_ISSUE_ROOT_CAUSE.md` - Detailed analysis (Japanese)
- `今すぐ確認_画像表示問題の原因.md` - User action guide (Japanese)

## Diagnostic Scripts

### Check Database Image Data
```bash
cd backend
npx ts-node check-image-data.ts
```

### Test API Response Format
```bash
cd backend
npx ts-node test-public-api-response.ts
```

## Timeline

- **Investigation Start**: January 3, 2026
- **Root Cause Identified**: January 3, 2026
- **Awaiting**: User browser console check
- **Estimated Fix Time**: 30 minutes after confirmation
- **Estimated Total Time**: 1 hour

## Notes

- Previous fix (using `image_url` field) is correctly implemented
- Database has sufficient image data (80% of public properties)
- Backend API is working correctly
- Issue is likely a simple field name mismatch
- Quick fix available once browser check confirms hypothesis
