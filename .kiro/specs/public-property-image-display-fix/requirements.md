# Public Property Image Display Fix - Requirements

## Problem Statement

Images are not displaying on the public property listing page (一覧ページ). Users only see a small image icon in the top-left corner instead of actual property images.

## Investigation Summary

### Backend Status ✅
- **Diagnostic Results**: 85% success rate (17/20 properties with images)
- **API Working**: Backend successfully fetches images from Google Drive
- **Image URLs**: Being returned as string array in `images` field
- **Recent Improvements**:
  - Changed cache key from `propertyId` to `folderId` based
  - Errors are no longer cached (allows retry)
  - Empty results cached for only 1 minute
  - Added detailed logging

### Frontend Issue ❌
- **Type Definition**: Correct - `images?: string[]`
- **Component**: `PublicPropertyCard.tsx` expects `property.images[0]` as URL string
- **Data Flow**: 
  1. `usePublicProperties` hook fetches from `/api/public/properties`
  2. Backend returns properties with `images: string[]`
  3. Frontend receives data correctly
  
### Root Cause Analysis

The backend is returning image URLs correctly, but there are two potential issues:

1. **Google Drive URL Accessibility**: The URLs returned might be Google Drive URLs that require authentication or have CORS restrictions
2. **Image Proxy Not Being Used**: The backend has image proxy endpoints (`/api/public/images/:fileId` and `/api/public/images/:fileId/thumbnail`) but they're not being used in the listing

## Current Architecture

### Backend Image Flow
```
PropertyListingService.getPublicProperties()
  → PropertyImageService.getFirstImage()
    → GoogleDriveService.listImagesWithThumbnails()
      → Returns: [{ fullImageUrl: "https://drive.google.com/..." }]
        → Extracts: images[0].fullImageUrl
          → Returns: ["https://drive.google.com/..."]
```

### Frontend Image Flow
```
usePublicProperties hook
  → publicApi.get('/api/public/properties')
    → Backend returns: { properties: [{ images: ["url"] }] }
      → PublicPropertyCard receives: property.images[0]
        → <img src={property.images[0]} />
```

## Solution Options

### Option 1: Use Image Proxy (Recommended) ⭐
**Pros:**
- Solves CORS issues
- Handles authentication
- Already implemented in backend
- Better performance with caching

**Implementation:**
1. Backend: Return file IDs instead of direct URLs
2. Frontend: Use proxy URL format `/api/public/images/:fileId/thumbnail`

### Option 2: Make Google Drive URLs Public
**Pros:**
- Simpler implementation
- No proxy needed

**Cons:**
- Security concerns
- Requires changing Drive permissions
- May not work with CORS

### Option 3: Pre-generate and Store Image URLs
**Pros:**
- Fastest performance
- No runtime API calls

**Cons:**
- Requires batch processing
- Storage overhead
- Sync complexity

## Recommended Solution

**Use Image Proxy with File IDs**

### Changes Required

#### Backend Changes
1. Modify `PropertyImageService.getFirstImage()` to return file IDs instead of URLs
2. Update `PropertyListingService.getPublicProperties()` to format proxy URLs

#### Frontend Changes
1. No changes needed - URLs will just point to proxy endpoints

### Implementation Steps

1. **Backend: Update PropertyImageService**
   ```typescript
   async getFirstImage(propertyId: string, storageUrl: string): Promise<string[]> {
     // ... existing code ...
     
     // Return proxy URL instead of direct Drive URL
     const fileId = images[0].id;
     const proxyUrl = `/api/public/images/${fileId}/thumbnail`;
     return [proxyUrl];
   }
   ```

2. **Test with diagnostic script**
   ```bash
   cd backend
   npx tsx diagnose-image-api-errors.ts
   ```

3. **Verify frontend display**
   - Check browser console for errors
   - Verify images load correctly
   - Test with different properties

## Acceptance Criteria

- [ ] Images display correctly on public property listing page
- [ ] No CORS errors in browser console
- [ ] Image loading performance is acceptable (< 2s)
- [ ] Fallback to placeholder image works when no images available
- [ ] Cache headers are set correctly for performance
- [ ] Works across different browsers (Chrome, Firefox, Safari)

## Testing Plan

1. **Unit Tests**
   - Test `getFirstImage()` returns correct proxy URL format
   - Test fallback behavior when no images

2. **Integration Tests**
   - Test full flow from API to frontend display
   - Test with properties that have images
   - Test with properties without images

3. **Manual Testing**
   - Load public property listing page
   - Verify images display
   - Check browser network tab for correct URLs
   - Test on mobile devices

## Rollback Plan

If issues occur:
1. Revert backend changes to return direct Drive URLs
2. Investigate CORS/authentication issues
3. Consider Option 2 or 3 as alternatives

## Related Files

### Backend
- `backend/src/services/PropertyImageService.ts`
- `backend/src/services/PropertyListingService.ts`
- `backend/src/routes/publicProperties.ts`
- `backend/diagnose-image-api-errors.ts`

### Frontend
- `frontend/src/components/PublicPropertyCard.tsx`
- `frontend/src/hooks/usePublicProperties.ts`
- `frontend/src/types/publicProperty.ts`
- `frontend/src/services/publicApi.ts`

## Notes

- Backend diagnostic shows 85% success rate, indicating the API is working
- The issue is likely in how the URLs are being used/displayed in the frontend
- Image proxy endpoints are already implemented and tested
- This is a display issue, not a data retrieval issue
