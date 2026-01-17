# Design Document

## Overview

This design document outlines the solution for displaying and editing the "site" and "exclusion_site" fields in the seller detail page. The issue is that these fields exist in the database and type definitions but are not rendered in the UI, making them invisible and uneditable to users.

The solution involves:
1. Adding UI components to display and edit these fields in the "Other" section
2. Ensuring the backend API properly includes these fields in responses
3. Implementing proper state management for these fields in the frontend

## Architecture

### Component Structure

```
SellerDetailPage (frontend/src/pages/SellerDetailPage.tsx)
├── Management Information Section (管理情報)
│   ├── Status Field
│   ├── Competitor Information (conditional)
│   └── Other Fields
└── Other Section (他) - NEW
    ├── Site Field (サイト等)
    └── Exclusion Site Field (除外サイト)
```

### Data Flow

```
Database (Supabase)
    ↓
SellerService.getSellerById()
    ↓
API Response (includes site, exclusion_site)
    ↓
Frontend State (editedSite, editedExclusionSite)
    ↓
UI Components (TextField)
    ↓
User Edits
    ↓
handleSave()
    ↓
SellerService.updateSeller()
    ↓
Database Update
```

## Components and Interfaces

### Frontend Components

#### 1. SellerDetailPage State Management

Add new state variables for the site fields:

```typescript
const [editedSite, setEditedSite] = useState<string>('');
const [editedExclusionSite, setEditedExclusionSite] = useState<string>('');
```

#### 2. UI Section - "Other" (他)

Add a new section after the management information section:

```tsx
<Grid item xs={12}>
  <Divider sx={{ my: 2 }}>
    <Chip label="他" />
  </Divider>
</Grid>

<Grid item xs={12} md={6}>
  <TextField
    fullWidth
    label="サイト等"
    value={editedSite}
    onChange={(e) => setEditedSite(e.target.value)}
    placeholder="サイト情報を入力"
  />
</Grid>

<Grid item xs={12} md={6}>
  <TextField
    fullWidth
    label="除外サイト"
    value={editedExclusionSite}
    onChange={(e) => setEditedExclusionSite(e.target.value)}
    placeholder="除外サイトURLを入力"
  />
</Grid>
```

### Backend Components

#### 1. SellerService

The `SellerService.getSellerById()` method already uses `select('*')`, which includes all columns including `site` and `exclusion_site`. No changes needed.

#### 2. Update Seller Method

The `updateSeller()` method needs to ensure it accepts and persists the `site` and `exclusion_site` fields:

```typescript
// In SellerService.updateSeller()
const updates: any = {
  // ... existing fields
  site: data.site,
  exclusion_site: data.exclusionSite,
  // ... other fields
};
```

## Data Models

### Database Schema

The database already has the required columns:

```sql
-- From migration 009
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_site TEXT;

-- From migration 022
ALTER TABLE sellers ADD COLUMN site VARCHAR(100) NULL;
```

### TypeScript Interfaces

Both frontend and backend type definitions already include these fields:

```typescript
export interface Seller {
  // ... other fields
  site?: string; // サイト（問い合わせ元）
  exclusionSite?: string; // 除外サイト
  // ... other fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Site field display consistency
*For any* seller record, when the seller detail page is loaded, the "site" field value from the database should be displayed in the UI input field
**Validates: Requirements 1.1, 1.3, 1.4**

### Property 2: Exclusion site field display consistency
*For any* seller record, when the seller detail page is loaded, the "exclusion_site" field value from the database should be displayed in the UI input field
**Validates: Requirements 1.2, 1.5, 1.6**

### Property 3: Site field update persistence
*For any* seller record and any valid site value, when a user updates the "site" field and saves, the new value should be persisted to the database and retrievable on subsequent page loads
**Validates: Requirements 2.1, 2.3**

### Property 4: Exclusion site field update persistence
*For any* seller record and any valid exclusion site value, when a user updates the "exclusion_site" field and saves, the new value should be persisted to the database and retrievable on subsequent page loads
**Validates: Requirements 2.2, 2.4**

### Property 5: Field label correctness
*For any* seller detail page render, the "site" field should display the label "サイト等" and the "exclusion_site" field should display the label "除外サイト"
**Validates: Requirements 3.1, 3.2**

### Property 6: API response completeness
*For any* seller ID, when the backend retrieves seller data, the response should include both "site" and "exclusion_site" fields
**Validates: Requirements 4.1, 4.2**

### Property 7: API update acceptance
*For any* seller update request containing "site" or "exclusion_site" fields, the backend should accept and persist these values to the database
**Validates: Requirements 4.3, 4.4, 4.5**

## Error Handling

### Frontend Error Handling

1. **Load Errors**: If seller data fails to load, display an error message and prevent editing
2. **Save Errors**: If save operation fails, display error message and retain user's edits
3. **Validation Errors**: No specific validation required for these fields (they are optional text fields)

### Backend Error Handling

1. **Database Errors**: Return appropriate HTTP status codes (500 for server errors)
2. **Not Found Errors**: Return 404 if seller doesn't exist
3. **Validation Errors**: Return 400 for invalid data formats

## Testing Strategy

### Unit Tests

1. **Frontend Component Tests**:
   - Test that site fields are rendered when seller data is loaded
   - Test that state updates when user types in the fields
   - Test that save function includes site field values in the update payload

2. **Backend Service Tests**:
   - Test that `getSellerById()` returns site fields
   - Test that `updateSeller()` persists site field changes
   - Test that site fields can be set to null/empty

### Property-Based Tests

Property-based tests will be implemented using a suitable testing library for TypeScript/JavaScript (e.g., fast-check). Each test should run a minimum of 100 iterations.

1. **Property 1 Test**: Generate random seller records with various site values, load the detail page, and verify the displayed value matches the database value

2. **Property 2 Test**: Generate random seller records with various exclusion_site values, load the detail page, and verify the displayed value matches the database value

3. **Property 3 Test**: Generate random seller IDs and site values, update via the UI, save, reload, and verify the persisted value matches the input

4. **Property 4 Test**: Generate random seller IDs and exclusion_site values, update via the UI, save, reload, and verify the persisted value matches the input

5. **Property 5 Test**: Render the seller detail page multiple times and verify the labels are always correct

6. **Property 6 Test**: Generate random seller IDs, call the API, and verify the response includes both fields

7. **Property 7 Test**: Generate random update payloads with site fields, send to API, and verify the database reflects the changes

### Integration Tests

1. **End-to-End Flow**:
   - Create a seller with site field values
   - Load the seller detail page
   - Verify fields are displayed correctly
   - Edit the fields
   - Save changes
   - Reload page
   - Verify changes persisted

2. **Empty Field Handling**:
   - Test behavior when site fields are null/empty
   - Verify empty fields display correctly
   - Test saving empty values

## Implementation Notes

### Frontend Implementation

1. **State Initialization**: Initialize `editedSite` and `editedExclusionSite` in the `loadSellerData()` function
2. **Save Function**: Include these fields in the `handleSave()` function's update payload
3. **Reset Function**: Reset these fields when user cancels editing

### Backend Implementation

1. **Field Mapping**: Ensure camelCase to snake_case conversion is handled correctly:
   - `site` → `site`
   - `exclusionSite` → `exclusion_site`

2. **Null Handling**: Allow null values for these optional fields

### Styling

- Use consistent styling with other text fields in the same section
- Place fields side-by-side on desktop (md={6}), stacked on mobile
- Use Material-UI TextField component for consistency

## Migration Considerations

No database migrations are required as the columns already exist:
- `site` column added in migration 022
- `exclusion_site` column added in migration 009

## Performance Considerations

- No additional database queries required (fields already included in existing queries)
- No significant impact on page load time
- No caching changes needed

## Security Considerations

- These fields contain non-sensitive data (site names/URLs)
- No encryption required
- Standard input sanitization applies
- No special access control needed beyond existing seller access permissions
