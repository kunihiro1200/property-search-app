# Image Hide/Unhide Feature - Architecture

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Action                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PropertyImageGallery.tsx                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ handleHideImage(imageId)                                  │  │
│  │   ├─ setIsHideLoading(imageId)                           │  │
│  │   ├─ propertyImageApi.hideImage(propertyId, imageId)     │  │
│  │   ├─ setLocalHiddenImageIds(result.hiddenImages)         │  │
│  │   └─ refetch()                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  api.ts (Frontend API Client)                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ propertyImageApi.hideImage()                              │  │
│  │   POST /api/property-listings/${propertyId}/hide-image   │  │
│  │   Body: { fileId: string }                                │  │
│  │                                                            │  │
│  │ propertyImageApi.restoreImage()                           │  │
│  │   POST /api/property-listings/${propertyId}/unhide-image │  │ ✅ FIXED
│  │   Body: { fileId: string }                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  propertyListings.ts (Backend Routes)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ POST /:id/hide-image                                      │  │
│  │   ├─ Validate fileId                                      │  │
│  │   ├─ propertyListingService.hideImage(id, fileId)        │  │
│  │   └─ Return { success: true, message: "..." }            │  │
│  │                                                            │  │
│  │ POST /:id/unhide-image                                    │  │
│  │   ├─ Validate fileId                                      │  │
│  │   ├─ propertyListingService.unhideImage(id, fileId)      │  │
│  │   └─ Return { success: true, message: "..." }            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PropertyListingService.ts (Business Logic)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ hideImage(propertyId, fileId)                             │  │
│  │   ├─ Get current hidden images                           │  │
│  │   ├─ Check if already hidden (prevent duplicates)        │  │
│  │   ├─ Add fileId to array                                 │  │
│  │   └─ Update database                                      │  │
│  │                                                            │  │
│  │ unhideImage(propertyId, fileId)                           │  │
│  │   ├─ Get current hidden images                           │  │
│  │   ├─ Remove fileId from array                            │  │
│  │   └─ Update database                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase (Database)                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ property_listings table                                   │  │
│  │   ├─ id (UUID)                                            │  │
│  │   ├─ property_number (TEXT)                               │  │
│  │   ├─ hidden_images (TEXT[])  ← Array of file IDs         │  │
│  │   └─ ...other columns                                     │  │
│  │                                                            │  │
│  │ Example data:                                             │  │
│  │   hidden_images: ["1abc...", "2def...", "3ghi..."]       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Hide Image Flow
```
User clicks hide button
    ↓
Frontend: handleHideImage(imageId)
    ↓
API: POST /api/property-listings/${propertyId}/hide-image
    ↓
Backend: propertyListingService.hideImage(propertyId, fileId)
    ↓
Database: UPDATE property_listings 
          SET hidden_images = array_append(hidden_images, fileId)
          WHERE id = propertyId
    ↓
Response: { success: true, message: "Image hidden" }
    ↓
Frontend: Update local state & refetch
    ↓
UI: Image disappears, success message shown
```

### Unhide Image Flow
```
User clicks unhide button
    ↓
Frontend: handleRestoreImage(imageId)
    ↓
API: POST /api/property-listings/${propertyId}/unhide-image
    ↓
Backend: propertyListingService.unhideImage(propertyId, fileId)
    ↓
Database: UPDATE property_listings 
          SET hidden_images = array_remove(hidden_images, fileId)
          WHERE id = propertyId
    ↓
Response: { success: true, message: "Image unhidden" }
    ↓
Frontend: Update local state & refetch
    ↓
UI: Image reappears, success message shown
```

## Database Schema

### property_listings Table
```sql
CREATE TABLE property_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_number TEXT NOT NULL,
    -- ... other columns ...
    hidden_images TEXT[] DEFAULT ARRAY[]::TEXT[],  -- ← New column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient array searches
CREATE INDEX idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);
```

### Example Data
```sql
-- Property with 2 hidden images
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "property_number": "AA12345",
    "hidden_images": [
        "1abc2def3ghi4jkl5mno",
        "6pqr7stu8vwx9yza0bcd"
    ]
}

-- Property with no hidden images
{
    "id": "987f6543-e21c-43d2-b654-321098765432",
    "property_number": "AA67890",
    "hidden_images": []
}
```

## API Endpoints

### Hide Image
```http
POST /api/property-listings/:id/hide-image
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
    "fileId": "1abc2def3ghi4jkl5mno"
}

Response (200 OK):
{
    "success": true,
    "message": "Image 1abc2def3ghi4jkl5mno has been hidden"
}

Response (400 Bad Request):
{
    "error": "fileId is required",
    "code": "MISSING_FILE_ID"
}

Response (500 Internal Server Error):
{
    "error": "Failed to hide image: ...",
    "code": "INTERNAL_ERROR"
}
```

### Unhide Image
```http
POST /api/property-listings/:id/unhide-image
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
    "fileId": "1abc2def3ghi4jkl5mno"
}

Response (200 OK):
{
    "success": true,
    "message": "Image 1abc2def3ghi4jkl5mno has been unhidden"
}
```

### Get Hidden Images
```http
GET /api/property-listings/:id/hidden-images
Authorization: Bearer <token>

Response (200 OK):
{
    "hiddenImages": [
        "1abc2def3ghi4jkl5mno",
        "6pqr7stu8vwx9yza0bcd"
    ],
    "count": 2
}
```

## State Management

### Frontend State
```typescript
// Local state in PropertyImageGallery component
const [localHiddenImageIds, setLocalHiddenImageIds] = useState<string[]>([]);
const [isHideLoading, setIsHideLoading] = useState<string | null>(null);

// Computed state
const hiddenImageIds = useMemo(() => {
    const apiHiddenImages = data?.hiddenImages || [];
    // Local state takes precedence for immediate UI updates
    if (localHiddenImageIds.length > 0) {
        return localHiddenImageIds;
    }
    return apiHiddenImages;
}, [data?.hiddenImages, localHiddenImageIds]);

// Filtered images for display
const images = showHiddenImages 
    ? allImages 
    : allImages.filter(img => !hiddenImageIds.includes(img.id));
```

## Error Handling

### Frontend Error Handling
```typescript
try {
    await propertyImageApi.hideImage(propertyId, imageId);
    // Success: Update UI
    setSnackbar({
        open: true,
        message: '画像を非表示にしました',
        severity: 'success',
    });
} catch (error: any) {
    // Error: Show error message
    setSnackbar({
        open: true,
        message: error.response?.data?.error || '画像の非表示に失敗しました',
        severity: 'error',
    });
}
```

### Backend Error Handling
```typescript
try {
    await propertyListingService.hideImage(id, fileId);
    res.json({ success: true, message: `Image ${fileId} has been hidden` });
} catch (error: any) {
    console.error('Error hiding image:', error);
    res.status(500).json({ 
        error: error.message,
        code: 'INTERNAL_ERROR'
    });
}
```

## Security Considerations

1. **Authentication**: All endpoints require authentication token
2. **Authorization**: Only authenticated users can hide/unhide images
3. **Validation**: File IDs are validated before processing
4. **SQL Injection**: Using parameterized queries via Supabase client
5. **Rate Limiting**: Consider adding rate limiting for API endpoints

## Performance Considerations

1. **Array Operations**: Using PostgreSQL array functions for efficient updates
2. **Indexing**: GIN index on `hidden_images` for fast array searches
3. **Caching**: Frontend caches hidden images list to reduce API calls
4. **Optimistic Updates**: UI updates immediately before API response

## Testing Strategy

1. **Unit Tests**: Test service methods in isolation
2. **Integration Tests**: Test API endpoints with database
3. **E2E Tests**: Test complete user flow in browser
4. **Edge Cases**:
   - Hiding already hidden image (should be idempotent)
   - Unhiding non-hidden image (should be safe)
   - Invalid file IDs
   - Network errors
   - Database errors

---

**Last Updated**: 2025-01-03  
**Status**: Frontend fix complete ✅ | Database verification needed 🔍
