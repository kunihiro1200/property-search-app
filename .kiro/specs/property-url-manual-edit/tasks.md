# Implementation Tasks

## Phase 1: Backend Foundation

### Task 1.1: Create URL Validator Utility
**Estimated Time**: 1 hour

Create a utility class for URL validation.

**Files to Create**:
- `backend/src/utils/urlValidator.ts`

**Implementation**:
```typescript
export class UrlValidator {
  private static readonly GOOGLE_MAP_URL_PATTERNS = [
    /^https:\/\/maps\.google\.com\/.+/,
    /^https:\/\/www\.google\.com\/maps\/.+/,
    /^https:\/\/goo\.gl\/maps\/.+/,
  ];

  private static readonly GOOGLE_DRIVE_FOLDER_PATTERNS = [
    /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/.+/,
  ];

  static validateGoogleMapUrl(url: string): boolean {
    if (!url || url.trim() === '') return true; // Empty is valid (optional)
    return this.GOOGLE_MAP_URL_PATTERNS.some(pattern => pattern.test(url));
  }

  static validateGoogleDriveFolderUrl(url: string): boolean {
    if (!url || url.trim() === '') return true; // Empty is valid (optional)
    return this.GOOGLE_DRIVE_FOLDER_PATTERNS.some(pattern => pattern.test(url));
  }

  static sanitizeUrl(url: string): string {
    return url.trim();
  }
}
```

**Acceptance Criteria**:
- [ ] Validates Google Map URLs correctly
- [ ] Validates Google Drive folder URLs correctly
- [ ] Accepts empty strings as valid
- [ ] Sanitizes URLs by trimming whitespace

---

### Task 1.2: Add URL Update API Endpoints
**Estimated Time**: 2 hours

Add API endpoints for updating Google Map URL and Storage Location.

**Files to Modify**:
- `backend/src/routes/propertyListings.ts`

**Implementation**:
```typescript
// Update Google Map URL
router.patch('/:propertyNumber/google-map-url', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    const { googleMapUrl } = req.body;

    // Validate URL
    if (!UrlValidator.validateGoogleMapUrl(googleMapUrl)) {
      return res.status(400).json({
        error: '有効なGoogle Map URLを入力してください'
      });
    }

    // Sanitize URL
    const sanitizedUrl = UrlValidator.sanitizeUrl(googleMapUrl);

    // Update property
    const service = new PropertyListingService();
    const updatedProperty = await service.update(propertyNumber, {
      google_map_url: sanitizedUrl
    });

    res.json({
      success: true,
      distributionAreas: updatedProperty.distribution_areas
    });
  } catch (error) {
    console.error('Error updating Google Map URL:', error);
    res.status(500).json({ error: 'Failed to update Google Map URL' });
  }
});

// Update Storage Location
router.patch('/:propertyNumber/storage-location', async (req, res) => {
  try {
    const { propertyNumber } = req.params;
    const { storageLocation } = req.body;

    // Validate URL
    if (!UrlValidator.validateGoogleDriveFolderUrl(storageLocation)) {
      return res.status(400).json({
        error: '有効なGoogle DriveフォルダURLを入力してください'
      });
    }

    // Sanitize URL
    const sanitizedUrl = UrlValidator.sanitizeUrl(storageLocation);

    // Update property
    const service = new PropertyListingService();
    await service.update(propertyNumber, {
      storage_location: sanitizedUrl
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating Storage Location:', error);
    res.status(500).json({ error: 'Failed to update Storage Location' });
  }
});
```

**Acceptance Criteria**:
- [ ] PATCH endpoint for Google Map URL works correctly
- [ ] PATCH endpoint for Storage Location works correctly
- [ ] URL validation is performed
- [ ] Distribution areas are recalculated for Google Map URL updates
- [ ] Proper error handling and status codes

---

## Phase 2: Frontend Components

### Task 2.1: Create EditableUrlField Component
**Estimated Time**: 3 hours

Create a reusable component for editing URL fields.

**Files to Create**:
- `frontend/src/components/EditableUrlField.tsx`

**Implementation**:
```typescript
import { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Button,
  Typography,
  Link,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';

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

export default function EditableUrlField({
  label,
  value,
  placeholder,
  urlPattern,
  errorMessage,
  onSave,
  disabled = false,
  helperText,
}: EditableUrlFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setEditValue(value || '');
    setError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setError('');
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Validate
    const trimmedValue = editValue.trim();
    if (trimmedValue && !urlPattern.test(trimmedValue)) {
      setError(errorMessage);
      return;
    }

    try {
      setSaving(true);
      await onSave(trimmedValue);
      setIsEditing(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {value ? (
            <Link
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Typography variant="body2">{value}</Typography>
              <OpenInNewIcon fontSize="small" />
            </Link>
          ) : (
            <Typography variant="body2" color="text.secondary">
              未設定
            </Typography>
          )}
          {!disabled && (
            <IconButton size="small" onClick={handleEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        {helperText && (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        placeholder={placeholder}
        error={!!error}
        helperText={error || helperText}
        disabled={saving}
      />
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          保存
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={handleCancel}
          disabled={saving}
        >
          キャンセル
        </Button>
      </Box>
    </Box>
  );
}
```

**Acceptance Criteria**:
- [ ] Component displays URL as clickable link when not editing
- [ ] Edit button triggers edit mode
- [ ] Save button validates and saves URL
- [ ] Cancel button reverts changes
- [ ] Error messages are displayed correctly
- [ ] Loading state is shown during save
- [ ] Component is disabled when disabled prop is true

---

### Task 2.2: Add URL Editing to Property Detail Page
**Estimated Time**: 2 hours

Integrate EditableUrlField components into the property detail page.

**Files to Modify**:
- `frontend/src/pages/PropertyListingDetailPage.tsx`

**Implementation**:
Add a new section for URL editing:

```typescript
// Add URL patterns
const GOOGLE_MAP_URL_PATTERN = /^https:\/\/(maps\.google\.com|www\.google\.com\/maps|goo\.gl\/maps)\/.+/;
const GOOGLE_DRIVE_FOLDER_PATTERN = /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/.+/;

// Add update handlers
const handleUpdateGoogleMapUrl = async (newUrl: string) => {
  try {
    const response = await api.patch(
      `/api/property-listings/${propertyNumber}/google-map-url`,
      { googleMapUrl: newUrl }
    );
    
    // Update local state
    setProperty(prev => prev ? {
      ...prev,
      google_map_url: newUrl,
      distribution_areas: response.data.distributionAreas
    } : null);
    
    // Show success message
    enqueueSnackbar('地図URLを更新しました', { variant: 'success' });
  } catch (error: any) {
    enqueueSnackbar(
      error.response?.data?.error || '地図URLの更新に失敗しました',
      { variant: 'error' }
    );
    throw error;
  }
};

const handleUpdateStorageLocation = async (newUrl: string) => {
  try {
    await api.patch(
      `/api/property-listings/${propertyNumber}/storage-location`,
      { storageLocation: newUrl }
    );
    
    // Update local state
    setProperty(prev => prev ? {
      ...prev,
      storage_location: newUrl
    } : null);
    
    // Show success message
    enqueueSnackbar('格納先URLを更新しました', { variant: 'success' });
  } catch (error: any) {
    enqueueSnackbar(
      error.response?.data?.error || '格納先URLの更新に失敗しました',
      { variant: 'error' }
    );
    throw error;
  }
};

// Add URL editing section in the render
<Paper sx={{ p: 2, mb: 2 }}>
  <Typography variant="h6" gutterBottom>
    地図・サイトURL
  </Typography>
  
  <EditableUrlField
    label="地図URL"
    value={property?.google_map_url || null}
    placeholder="https://maps.google.com/..."
    urlPattern={GOOGLE_MAP_URL_PATTERN}
    errorMessage="有効なGoogle Map URLを入力してください"
    onSave={handleUpdateGoogleMapUrl}
    helperText="物件の位置を示すGoogle Map URLを入力してください"
  />
  
  <EditableUrlField
    label="格納先URL"
    value={property?.storage_location || null}
    placeholder="https://drive.google.com/drive/folders/..."
    urlPattern={GOOGLE_DRIVE_FOLDER_PATTERN}
    errorMessage="有効なGoogle DriveフォルダURLを入力してください"
    onSave={handleUpdateStorageLocation}
    helperText="物件関連ドキュメントが保存されているGoogle DriveフォルダのURLを入力してください"
  />
</Paper>
```

**Acceptance Criteria**:
- [ ] URL editing section is visible on property detail page
- [ ] Google Map URL field works correctly
- [ ] Storage Location URL field works correctly
- [ ] Success/error messages are displayed
- [ ] Distribution areas update when Google Map URL changes
- [ ] Page layout remains consistent

---

## Phase 3: Testing

### Task 3.1: Backend Unit Tests
**Estimated Time**: 2 hours

Write unit tests for URL validation and API endpoints.

**Files to Create**:
- `backend/src/utils/__tests__/urlValidator.test.ts`
- `backend/src/routes/__tests__/propertyListings.url.test.ts`

**Test Cases**:
- [ ] Valid Google Map URLs are accepted
- [ ] Invalid Google Map URLs are rejected
- [ ] Valid Google Drive folder URLs are accepted
- [ ] Invalid Google Drive folder URLs are rejected
- [ ] Empty URLs are accepted
- [ ] API endpoints return correct status codes
- [ ] Distribution areas are recalculated

---

### Task 3.2: Frontend Component Tests
**Estimated Time**: 2 hours

Write tests for EditableUrlField component.

**Files to Create**:
- `frontend/src/components/__tests__/EditableUrlField.test.tsx`

**Test Cases**:
- [ ] Component renders correctly in view mode
- [ ] Edit button triggers edit mode
- [ ] Save button validates and calls onSave
- [ ] Cancel button reverts changes
- [ ] Error messages are displayed
- [ ] Loading state is shown during save

---

### Task 3.3: Integration Testing
**Estimated Time**: 1 hour

Manual testing of the complete feature.

**Test Scenarios**:
- [ ] Edit Google Map URL and verify distribution areas update
- [ ] Edit Storage Location URL and verify images update
- [ ] Test invalid URL formats
- [ ] Test empty URL values
- [ ] Test save/cancel functionality
- [ ] Test error handling
- [ ] Test on mobile devices
- [ ] Test keyboard navigation

---

## Phase 4: Documentation

### Task 4.1: Update User Documentation
**Estimated Time**: 1 hour

Create user guide for URL editing feature.

**Files to Create**:
- `.kiro/specs/property-url-manual-edit/USER_GUIDE.md`

**Content**:
- How to edit Google Map URL
- How to edit Storage Location URL
- URL format requirements
- Troubleshooting common issues

---

### Task 4.2: Update API Documentation
**Estimated Time**: 30 minutes

Document new API endpoints.

**Files to Modify**:
- `backend/API.md` (if exists) or create new documentation

**Content**:
- Endpoint descriptions
- Request/response formats
- Error codes
- Examples

---

## Summary

**Total Estimated Time**: 14.5 hours

**Task Breakdown**:
- Backend: 5 hours
- Frontend: 5 hours
- Testing: 5 hours
- Documentation: 1.5 hours

**Dependencies**:
- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 1 and 2
- Phase 4 can be done in parallel with Phase 3

**Priority**:
1. High: Tasks 1.1, 1.2, 2.1, 2.2 (Core functionality)
2. Medium: Tasks 3.1, 3.2, 3.3 (Testing)
3. Low: Tasks 4.1, 4.2 (Documentation)
