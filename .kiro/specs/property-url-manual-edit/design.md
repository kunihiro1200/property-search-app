# Design Document

## Architecture Overview

This feature adds manual URL editing capability for Google Map URL and Storage Location URL fields in the property management system. The implementation follows the existing inline editing pattern used in the buyer detail page.

## Component Structure

### Frontend Components

#### 1. EditableUrlField Component (New)
**Location**: `frontend/src/components/EditableUrlField.tsx`

A reusable component for editing URL fields with validation and save/cancel actions.

**Props**:
```typescript
interface EditableUrlFieldProps {
  label: string;
  value: string | null;
  placeholder: string;
  urlPattern: RegExp;
  errorMessage: string;
  onSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
  helperText?: string;
}
```

**Features**:
- Inline editing with edit/save/cancel buttons
- Real-time URL validation
- Loading state during save operation
- Error display
- Clickable link when not editing

#### 2. PropertyListingDetailPage Updates
**Location**: `frontend/src/pages/PropertyListingDetailPage.tsx`

Add URL editing section to the property detail page.

**Changes**:
- Add "地図・サイトURL" section with EditableUrlField components
- Integrate with existing property update API
- Handle distribution area recalculation after Google Map URL update

### Backend Services

#### 1. PropertyListingService Updates
**Location**: `backend/src/services/PropertyListingService.ts`

**New Methods**:
```typescript
async updateGoogleMapUrl(propertyNumber: string, googleMapUrl: string): Promise<void>
async updateStorageLocation(propertyNumber: string, storageLocation: string): Promise<void>
```

**Existing Method Updates**:
- `update()` method already handles distribution area recalculation when address or google_map_url changes

#### 2. URL Validation Utility
**Location**: `backend/src/utils/urlValidator.ts` (New)

```typescript
export class UrlValidator {
  static validateGoogleMapUrl(url: string): boolean
  static validateGoogleDriveFolderUrl(url: string): boolean
  static sanitizeUrl(url: string): string
}
```

### API Endpoints

#### Update Google Map URL
```
PATCH /api/property-listings/:propertyNumber/google-map-url
Body: { googleMapUrl: string }
Response: { success: boolean, distributionAreas?: string }
```

#### Update Storage Location
```
PATCH /api/property-listings/:propertyNumber/storage-location
Body: { storageLocation: string }
Response: { success: boolean }
```

## Data Flow

### Google Map URL Update Flow

```
User Input → EditableUrlField
    ↓
Validation (Frontend)
    ↓
API Call: PATCH /api/property-listings/:propertyNumber/google-map-url
    ↓
Backend Validation
    ↓
Update Database (google_map_url)
    ↓
Recalculate Distribution Areas (PropertyDistributionAreaCalculator)
    ↓
Update Database (distribution_areas)
    ↓
Return Success + New Distribution Areas
    ↓
Update UI
```

### Storage Location Update Flow

```
User Input → EditableUrlField
    ↓
Validation (Frontend)
    ↓
API Call: PATCH /api/property-listings/:propertyNumber/storage-location
    ↓
Backend Validation
    ↓
Update Database (storage_location)
    ↓
Return Success
    ↓
Update UI
```

## Database Schema

No schema changes required. Using existing columns:

```sql
-- property_listings table (existing)
google_map_url TEXT
storage_location TEXT
```

## URL Validation Rules

### Google Map URL
**Valid Patterns**:
- `https://maps.google.com/*`
- `https://www.google.com/maps/*`
- `https://goo.gl/maps/*` (shortened URLs)

**Examples**:
- `https://maps.google.com/maps?q=35.6812,139.7671`
- `https://www.google.com/maps/place/Tokyo`
- `https://goo.gl/maps/abc123`

### Storage Location URL
**Valid Patterns**:
- `https://drive.google.com/drive/folders/*`
- `https://drive.google.com/drive/u/0/folders/*` (with user context)

**Examples**:
- `https://drive.google.com/drive/folders/1a2b3c4d5e6f`
- `https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f`

## UI/UX Design

### Layout

```
┌─────────────────────────────────────────────┐
│ 物件詳細                                      │
├─────────────────────────────────────────────┤
│                                             │
│ [基本情報セクション]                          │
│                                             │
│ [地図・サイトURL]                            │
│ ┌─────────────────────────────────────────┐ │
│ │ 地図URL                                  │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ https://maps.google.com/...    [編集]│ │ │
│ │ └─────────────────────────────────────┘ │ │
│ │                                         │ │
│ │ 格納先URL                                │ │
│ │ ┌─────────────────────────────────────┐ │ │
│ │ │ https://drive.google.com/...   [編集]│ │ │
│ │ └─────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

### Edit Mode

```
┌─────────────────────────────────────────────┐
│ 地図URL                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ https://maps.google.com/maps?q=...      │ │
│ └─────────────────────────────────────────┘ │
│ [保存] [キャンセル]                          │
└─────────────────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────────────────┐
│ 地図URL                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ invalid-url                             │ │
│ └─────────────────────────────────────────┘ │
│ ⚠ 有効なGoogle Map URLを入力してください      │
│ [保存] [キャンセル]                          │
└─────────────────────────────────────────────┘
```

## Error Handling

### Frontend Errors
1. **Invalid URL Format**: Display inline error message
2. **Empty Required Field**: Allow empty (optional field)
3. **Network Error**: Display toast notification with retry option

### Backend Errors
1. **Validation Error**: Return 400 with error message
2. **Property Not Found**: Return 404
3. **Database Error**: Return 500 with generic error message
4. **Distribution Area Calculation Error**: Log error but continue with URL update

## Security Considerations

1. **Input Sanitization**: All URLs are sanitized before storage
2. **XSS Prevention**: URLs are escaped when displayed
3. **Authentication**: Only authenticated users can edit URLs
4. **Authorization**: Check user permissions before allowing edits
5. **Audit Logging**: Log all URL changes with user ID and timestamp

## Performance Considerations

1. **Debounced Validation**: Validate URL after user stops typing (300ms delay)
2. **Optimistic Updates**: Update UI immediately, rollback on error
3. **Async Distribution Calculation**: Don't block UI during recalculation
4. **Caching**: Cache distribution area results to avoid redundant calculations

## Testing Strategy

### Unit Tests
- URL validation logic
- EditableUrlField component behavior
- API endpoint handlers

### Integration Tests
- End-to-end URL update flow
- Distribution area recalculation
- Error handling scenarios

### Manual Testing Checklist
- [ ] Edit Google Map URL and verify distribution areas update
- [ ] Edit Storage Location URL and verify images update
- [ ] Test invalid URL formats
- [ ] Test empty URL values
- [ ] Test save/cancel functionality
- [ ] Test error handling
- [ ] Test on mobile devices
- [ ] Test keyboard navigation

## Migration Plan

No database migration required. This is a pure feature addition using existing columns.

## Rollback Plan

If issues arise:
1. Remove EditableUrlField component
2. Revert PropertyListingDetailPage changes
3. Remove new API endpoints
4. URLs remain in database and can be displayed read-only

## Future Enhancements

1. URL history tracking
2. Bulk URL editing
3. URL validation by checking accessibility
4. Auto-suggest URLs based on address
5. Integration with other mapping services
