# Public Property Image Display Fix - Design

## Problem Root Cause

The backend returns Google Drive URLs in this format:
```
https://drive.google.com/uc?export=view&id={fileId}
```

These URLs **require the files to be publicly accessible**, which they are not. This causes images to fail to load in the frontend, showing only a broken image icon.

## Solution: Use Image Proxy

The backend already has image proxy endpoints implemented:
- `/api/public/images/:fileId` - Full image
- `/api/public/images/:fileId/thumbnail` - Thumbnail

These endpoints:
1. Authenticate with Google Drive using service account
2. Fetch the image data
3. Return it with proper CORS headers
4. Set cache headers for performance

## Architecture Changes

### Current Flow (Broken)
```
Frontend Request
  ↓
Backend API: /api/public/properties
  ↓
PropertyListingService.getPublicProperties()
  ↓
PropertyImageService.getFirstImage()
  ↓
Returns: ["https://drive.google.com/uc?export=view&id=abc123"]
  ↓
Frontend: <img src="https://drive.google.com/uc?export=view&id=abc123" />
  ↓
❌ FAILS: File not publicly accessible
```

### New Flow (Fixed)
```
Frontend Request
  ↓
Backend API: /api/public/properties
  ↓
PropertyListingService.getPublicProperties()
  ↓
PropertyImageService.getFirstImageProxy()  ← NEW METHOD
  ↓
Returns: ["/api/public/images/abc123/thumbnail"]
  ↓
Frontend: <img src="/api/public/images/abc123/thumbnail" />
  ↓
Backend Proxy: /api/public/images/abc123/thumbnail
  ↓
PropertyImageService.getImageData()
  ↓
GoogleDriveService (authenticated)
  ↓
✅ SUCCESS: Returns image data
```

## Implementation Plan

### Phase 1: Backend Changes

#### 1. Add new method to PropertyImageService

```typescript
/**
 * 一覧表示用に最初の1枚の画像のプロキシURLを取得
 * @param propertyId 物件ID（ログ用）
 * @param storageUrl 物件の格納先URL
 * @returns プロキシURL の配列（最大1件）
 */
async getFirstImageProxyUrl(propertyId: string, storageUrl: string | null | undefined): Promise<string[]> {
  // 格納先URLが設定されていない場合
  if (!storageUrl) {
    console.log(`[PropertyImageService] No storage_location for property ${propertyId}`);
    return [];
  }

  // フォルダIDを抽出
  const folderId = this.extractFolderIdFromUrl(storageUrl);
  if (!folderId) {
    console.warn(`[PropertyImageService] Invalid storage URL format for property ${propertyId}: ${storageUrl}`);
    return [];
  }

  // キャッシュキーをfolderIdベースに変更
  const cacheKey = `first_image_folder_${folderId}`;
  
  // キャッシュをチェック（5分間のTTL）
  const cachedEntry = this.cache.get(cacheKey);
  if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
    console.log(`[PropertyImageService] Cache hit for property ${propertyId}, folder ${folderId}`);
    // キャッシュされた画像のプロキシURLを返す
    return cachedEntry.images.length > 0 
      ? [`/api/public/images/${cachedEntry.images[0].id}/thumbnail`] 
      : [];
  }

  try {
    console.log(`[PropertyImageService] Fetching images for property ${propertyId} from folder ${folderId}`);
    
    // Googleドライブから画像を取得
    const driveFiles = await this.driveService.listImagesWithThumbnails(folderId);
    
    // 画像がない場合
    if (driveFiles.length === 0) {
      console.log(`[PropertyImageService] No images found in folder ${folderId} for property ${propertyId}`);
      
      // 画像がない場合は短時間キャッシュ（1分）
      const now = Date.now();
      this.cache.set(cacheKey, {
        images: [],
        folderId,
        cachedAt: now,
        expiresAt: now + (1 * 60 * 1000), // 1分間
      });
      
      return [];
    }

    // PropertyImage形式に変換
    const images = this.convertToPropertyImages(driveFiles);
    
    console.log(`[PropertyImageService] Found ${images.length} images in folder ${folderId} for property ${propertyId}`);
    
    // キャッシュに保存（5分間）
    const now = Date.now();
    this.cache.set(cacheKey, {
      images,
      folderId,
      cachedAt: now,
      expiresAt: now + (5 * 60 * 1000), // 5分間
    });
    
    // 最初の1枚のプロキシURLを返す
    return [`/api/public/images/${images[0].id}/thumbnail`];
  } catch (error: any) {
    console.error(`[PropertyImageService] Error fetching first image for property ${propertyId} from folder ${folderId}:`, error.message);
    console.error(`[PropertyImageService] Error details:`, error);
    
    // エラー時はキャッシュしない（次回リトライ可能にする）
    return [];
  }
}
```

#### 2. Update PropertyListingService.getPublicProperties()

Change line 296 from:
```typescript
images = await this.propertyImageService.getFirstImage(
  property.id,
  property.storage_location
);
```

To:
```typescript
images = await this.propertyImageService.getFirstImageProxyUrl(
  property.id,
  property.storage_location
);
```

### Phase 2: Testing

#### 1. Update diagnostic script

```typescript
// Test both old and new methods
const directUrl = await imageService.getFirstImage(property.id, property.storage_location);
const proxyUrl = await imageService.getFirstImageProxyUrl(property.id, property.storage_location);

console.log(`   Direct URL: ${directUrl[0]}`);
console.log(`   Proxy URL: ${proxyUrl[0]}`);
```

#### 2. Test proxy endpoint

```bash
# Test that proxy endpoint works
curl http://localhost:3000/api/public/images/{fileId}/thumbnail
```

### Phase 3: Frontend Verification

No frontend changes needed! The URLs will just work because:
1. They're relative URLs (`/api/public/images/...`)
2. The proxy handles authentication
3. CORS headers are set correctly

## Alternative: Simpler Fix

If we want an even simpler fix, we can just modify the existing `getFirstImage()` method to return proxy URLs instead of direct Drive URLs:

```typescript
// In PropertyImageService.getFirstImage()
// Change line 282 from:
return [images[0].fullImageUrl];

// To:
return [`/api/public/images/${images[0].id}/thumbnail`];
```

This is the **recommended approach** because:
- ✅ Minimal code changes
- ✅ No new methods needed
- ✅ Fixes the issue immediately
- ✅ No frontend changes required

## Performance Considerations

### Caching Strategy
1. **Backend Cache**: 5 minutes for image metadata
2. **HTTP Cache Headers**: 1 hour for image data
3. **Browser Cache**: Automatic based on cache headers

### Expected Performance
- First load: ~500ms (Drive API call)
- Cached: ~50ms (memory cache)
- Subsequent loads: ~10ms (browser cache)

## Security Considerations

1. **Authentication**: Service account handles Drive authentication
2. **Rate Limiting**: Already implemented in proxy endpoints
3. **Access Control**: Only public properties are accessible
4. **CORS**: Properly configured for public access

## Rollback Plan

If issues occur:
1. Revert the one-line change in `getFirstImage()`
2. Original functionality restored immediately
3. No database changes needed

## Success Metrics

- [ ] Images display on listing page
- [ ] No 403/404 errors in browser console
- [ ] Page load time < 3 seconds
- [ ] Image load time < 1 second per image
- [ ] Works on mobile devices
- [ ] Works across all browsers

## Files to Modify

### Backend
- `backend/src/services/PropertyImageService.ts` (1 line change)

### Testing
- `backend/diagnose-image-api-errors.ts` (verify fix)

### No Changes Needed
- ✅ Frontend files (URLs will just work)
- ✅ Database schema
- ✅ API routes
- ✅ Type definitions
