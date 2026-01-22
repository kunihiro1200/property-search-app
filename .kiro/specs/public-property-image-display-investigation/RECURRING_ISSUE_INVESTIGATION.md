# Public Property Image Display - Recurring Issue Investigation

## Issue Summary

Images are not displaying on the public property listing page (`http://localhost:5173/public/properties`) despite a previous fix being applied.

## Background

### Previous Fix
- User previously created and ran `backend/sync-storage-locations.ts`
- Successfully synced 110 properties
- Enabled 47 properties to display images (17 direct, 30 via fallback)
- Images were working after the fix

### Current Problem
- Same error is occurring again
- Browser console shows: "Tracking Prevention blocked access to storage"
- Most properties have `null` for `storage_location` field

## Investigation Results

### Database State
```
Total public properties: 20
With storage_location: 2 ❌
Without storage_location: 18 ❌
```

### API Functionality
- ✅ API is working correctly
- ✅ Returns proper image URLs: `https://drive.google.com/uc?export=view&id=...`
- ✅ Test showed 5 properties: 4 with images, 1 without (AA18 has empty array)

### Root Cause Hypotheses

#### Hypothesis A: Data Synchronization Issue
- `sync-storage-locations.ts` was run, but new properties were added afterward
- Or database was rolled back
- **Verification**: Check if `work_tasks` table has `storage_url` values

#### Hypothesis B: Google Drive Permission Issue
- Google Drive folders are not publicly accessible
- Need "Anyone with the link can view" setting
- **Verification**: Run `backend/test-image-access.ts` to test image accessibility

#### Hypothesis C: Browser Tracking Prevention
- Browser's tracking prevention feature is blocking Google Drive access
- CORS header issues
- **Verification**: Test in different browser or private mode

## Actions Taken

### 1. Fixed TypeScript Compilation Error
**File**: `backend/test-image-access.ts`

**Problem**: Missing type definitions for `node-fetch`
```
Could not find a declaration file for module 'node-fetch'
```

**Solution**: Removed `node-fetch` import to use Node.js 18+ built-in `fetch`

**Changes**:
```typescript
// Removed: import fetch from 'node-fetch';
// Now using Node.js built-in fetch (Node 18+)
```

### 2. Created Investigation Documentation

**Files Created**:
- `.kiro/specs/public-property-image-display-investigation/requirements-recurring-issue.md` - Detailed investigation spec
- `今すぐ実行_画像表示問題調査.md` - Japanese quick start guide

## Next Steps

### Step 1: Run Image Access Test
```bash
cd backend
npx ts-node test-image-access.ts
```

**Expected Outcomes**:
- Status 200: Images are accessible → Investigate Hypothesis C (browser tracking)
- Status 403/404: Images not accessible → Investigate Hypothesis B (permissions)

### Step 2: Based on Test Results

#### If Hypothesis A (Data Sync Issue)
1. Re-run `sync-storage-locations.ts`
2. Consider setting up periodic sync script

#### If Hypothesis B (Google Drive Permissions)
1. Check Google Drive folder sharing settings
2. Set to "Anyone with the link can view"
3. Update `PropertyImageService` to handle permission errors gracefully

#### If Hypothesis C (Browser Tracking Prevention)
1. Proxy images through backend
2. Use `/api/public/images/:fileId` endpoint (already implemented)
3. Ensure proper CORS headers

## Related Files

### Investigation Scripts
- `backend/sync-storage-locations.ts` - Sync storage_location from work_tasks
- `backend/check-storage-locations.ts` - Check database state
- `backend/test-public-properties-images.ts` - Test API functionality
- `backend/test-image-access.ts` - Test image accessibility (FIXED)

### Implementation Files
- `backend/src/services/PropertyImageService.ts` - Image retrieval service
- `backend/src/routes/publicProperties.ts` - Public property API
- `frontend/src/components/PublicPropertyCard.tsx` - Property card display

## Priority

**HIGH** - Main functionality of public property site is not working

## Status

🔍 **INVESTIGATING** - TypeScript error fixed, ready to run image access test

## Created

January 3, 2026

## User Instructions

User should follow the Japanese quick start guide: `今すぐ実行_画像表示問題調査.md`

1. Run image access test
2. Review results
3. Apply appropriate fix based on root cause
