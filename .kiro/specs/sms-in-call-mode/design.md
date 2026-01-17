# Design Document

## Overview

This feature adds an "Other" section to the Call Mode Page with a "Site" dropdown field to record the website or channel from which a seller inquiry originated. This enables marketing effectiveness tracking and customer acquisition source analysis.

The implementation involves:
- Adding a new database column to store site information
- Updating backend API to handle site field
- Adding UI components to the Call Mode Page
- Implementing edit/save functionality for the site field

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Call Mode Page (Frontend)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Other Section Component                              │  │
│  │  - Display Mode: Shows selected site                 │  │
│  │  - Edit Mode: Dropdown with predefined options       │  │
│  │  - Save/Cancel buttons                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP PUT /sellers/:id
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Express)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sellers Route                                        │  │
│  │  - Validates site value                               │  │
│  │  - Calls SellerService.updateSeller()                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SellerService                             │
│  - Updates seller record with site value                    │
│  - Returns updated seller data                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  sellers table:                                              │
│  - site VARCHAR(100) NULL                                   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Database Schema

**Migration: Add site column to sellers table**

```sql
ALTER TABLE sellers ADD COLUMN site VARCHAR(100) NULL;
CREATE INDEX idx_sellers_site ON sellers(site);
```

The `site` column:
- Stores the website/channel from which the inquiry originated
- Nullable to support existing records
- Indexed for reporting and analytics queries
- Maximum length of 100 characters to accommodate all predefined options

### Backend Types

**Update Seller interface in `backend/src/types/index.ts`:**

```typescript
export interface Seller {
  // ... existing fields ...
  site?: string; // サイト（問い合わせ元）
  // ... rest of fields ...
}

export interface UpdateSellerRequest {
  // ... existing fields ...
  site?: string;
  // ... rest of fields ...
}
```

### Backend API

**Update `backend/src/services/SellerService.ts`:**

Add site field handling in the `updateSeller` method:

```typescript
async updateSeller(
  sellerId: string,
  data: UpdateSellerRequest
): Promise<Seller> {
  // ... existing code ...
  
  // Add site field update
  if (data.site !== undefined) {
    updates.push(`site = $${paramIndex++}`);
    values.push(data.site);
  }
  
  // ... rest of method ...
}
```

**Update `backend/src/routes/sellers.ts`:**

Add validation for site field:

```typescript
const VALID_SITE_OPTIONS = [
  'ウビ',
  'HおYすaL',
  'エ近所',
  'チP紹',
  'リ買',
  'HP',
  '知合',
  'at-home',
  'の掲載を見て',
  '2件目以降査定'
];

// In PUT /sellers/:id route
if (req.body.site !== undefined && req.body.site !== null) {
  if (!VALID_SITE_OPTIONS.includes(req.body.site)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_SITE',
        message: 'Invalid site value',
        details: { validOptions: VALID_SITE_OPTIONS },
        retryable: false
      }
    });
  }
}
```

### Frontend Components

**Update `frontend/src/types/index.ts`:**

```typescript
export interface Seller {
  // ... existing fields ...
  site?: string;
  // ... rest of fields ...
}
```

**Update `frontend/src/pages/CallModePage.tsx`:**

Add state management for site field:

```typescript
const [editingSite, setEditingSite] = useState(false);
const [editedSite, setEditedSite] = useState<string>('');
const [savingSite, setSavingSite] = useState(false);

const siteOptions = [
  'ウビ',
  'HおYすaL',
  'エ近所',
  'チP紹',
  'リ買',
  'HP',
  '知合',
  'at-home',
  'の掲載を見て',
  '2件目以降査定'
];

// Initialize site value when seller data loads
useEffect(() => {
  if (seller) {
    setEditedSite(seller.site || '');
  }
}, [seller]);

const handleSaveSite = async () => {
  try {
    setSavingSite(true);
    setError(null);
    setSuccessMessage(null);

    await api.put(`/sellers/${id}`, {
      site: editedSite || null,
    });

    setSuccessMessage('サイト情報を更新しました');
    setEditingSite(false);
    
    // Reload seller data
    await loadAllData();
  } catch (err: any) {
    setError(err.response?.data?.error?.message || 'サイト情報の更新に失敗しました');
  } finally {
    setSavingSite(false);
  }
};
```

Add "Other" section UI component (placed after the Appointment section):

```tsx
{/* 他セクション */}
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
  <Typography variant="h6">
    📌 他
  </Typography>
  <Button
    size="small"
    onClick={() => {
      if (editingSite) {
        setEditedSite(seller?.site || '');
      }
      setEditingSite(!editingSite);
    }}
  >
    {editingSite ? 'キャンセル' : '編集'}
  </Button>
</Box>
<Paper sx={{ p: 2, mb: 3 }}>
  {!editingSite ? (
    // Display mode
    <Box>
      <Typography variant="body2" color="text.secondary">
        サイト
      </Typography>
      <Typography variant="body1">
        {seller?.site || '未設定'}
      </Typography>
    </Box>
  ) : (
    // Edit mode
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControl fullWidth size="small">
          <InputLabel>サイト</InputLabel>
          <Select
            value={editedSite}
            label="サイト"
            onChange={(e) => setEditedSite(e.target.value)}
          >
            <MenuItem value="">
              <em>未選択</em>
            </MenuItem>
            {siteOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Button
          fullWidth
          variant="contained"
          startIcon={savingSite ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSaveSite}
          disabled={savingSite}
        >
          {savingSite ? '保存中...' : '保存'}
        </Button>
      </Grid>
    </Grid>
  )}
</Paper>
```

## Data Models

### Seller Model Extension

```typescript
interface Seller {
  // ... existing fields ...
  
  // New field
  site?: string; // サイト（問い合わせ元）
  
  // ... rest of fields ...
}
```

**Field Details:**
- `site`: Optional string field storing the inquiry source
- Valid values: Predefined list of 10 options
- Nullable: Yes (to support existing records)
- Encrypted: No (not PII, used for analytics)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

1.1 WHEN the Call Mode Page loads THEN the System SHALL display an "Other" section at the bottom of the left panel
Thoughts: This is about UI rendering. We can test that when the page component mounts, the "Other" section element exists in the DOM at the expected location.
Testable: yes - example

1.2 WHEN a user views the "Other" section THEN the System SHALL display a "Site" dropdown field with predefined options
Thoughts: This is about UI structure. We can test that the dropdown contains exactly the expected options in the correct format.
Testable: yes - example

1.3 WHEN a user selects a site option THEN the System SHALL save the selection to the seller record
Thoughts: This is a property that should hold for all valid site selections. We can generate random site selections from the valid list and verify they are persisted correctly.
Testable: yes - property

1.4 WHEN a user views a seller with a previously saved site value THEN the System SHALL display the saved site value in the dropdown
Thoughts: This is a round-trip property. For any valid site value, if we save it and then reload the seller, we should get the same value back.
Testable: yes - property

1.5 THE System SHALL provide the following site options in the dropdown: "ウビ", "HおYすaL", "エ近所", "チP紹", "リ買", "HP", "知合", "at-home", "の掲載を見て", "2件目以降査定"
Thoughts: This is testing that the dropdown contains exactly these options, no more, no less.
Testable: yes - example

2.1 WHEN a user clicks the edit button in the "Other" section THEN the System SHALL enable editing mode for the site field
Thoughts: This is a UI interaction test. We can verify that clicking the edit button changes the UI state to editing mode.
Testable: yes - example

2.2 WHEN a user is in editing mode THEN the System SHALL allow the user to change the site selection
Thoughts: This is about UI functionality. We can test that the dropdown is enabled and accepts changes in edit mode.
Testable: yes - example

2.3 WHEN a user clicks save in editing mode THEN the System SHALL persist the updated site value to the database
Thoughts: This is a property about persistence. For any valid site value change, clicking save should result in the database being updated.
Testable: yes - property

2.4 WHEN a user clicks cancel in editing mode THEN the System SHALL revert to the previously saved site value
Thoughts: This is testing that cancel operations don't modify data. For any initial site value, entering edit mode, changing the value, and canceling should leave the original value unchanged.
Testable: yes - property

2.5 WHEN the save operation completes successfully THEN the System SHALL display a success message to the user
Thoughts: This is about UI feedback. We can test that after a successful save, a success message appears.
Testable: yes - example

3.1 WHEN a user saves site information THEN the System SHALL store the value in the sellers table
Thoughts: This is about database persistence. For any valid site value, saving should result in the value being stored in the database.
Testable: yes - property

3.2 WHEN retrieving seller data THEN the System SHALL include the site field in the response
Thoughts: This is about API completeness. For any seller record, the API response should include the site field.
Testable: yes - property

3.3 WHEN updating seller data THEN the System SHALL validate that the site value is one of the predefined options or null
Thoughts: This is about input validation. The system should reject any site value that is not in the predefined list or null.
Testable: yes - property

3.4 WHEN a database migration is required THEN the System SHALL add a new column to store site information without data loss
Thoughts: This is about migration safety. We can test that running the migration on a database with existing data preserves all existing records.
Testable: yes - example

3.5 THE System SHALL allow the site field to be nullable to support existing seller records
Thoughts: This is about schema design. We can test that null values are accepted and stored correctly.
Testable: yes - example

### Property Reflection

After reviewing all properties, the following consolidations can be made:

**Redundancy Analysis:**
- Properties 1.3 and 2.3 both test persistence of site values - these can be combined into a single comprehensive property
- Properties 1.4 and 2.4 both test value retrieval/reversion - the round-trip property (1.4) subsumes the cancel behavior (2.4)
- Properties 3.1 and 3.2 both test database operations - these can be combined into a single property about persistence and retrieval

**Consolidated Properties:**
- Property 1: Site value round-trip (combines 1.3, 1.4, 2.3, 3.1, 3.2)
- Property 2: Cancel preserves original value (2.4)
- Property 3: Input validation rejects invalid values (3.3)

### Correctness Properties

Property 1: Site value round-trip
*For any* valid site value from the predefined list, saving it to a seller record and then retrieving that seller should return the same site value
**Validates: Requirements 1.3, 1.4, 2.3, 3.1, 3.2**

Property 2: Cancel preserves original value
*For any* seller with an initial site value, entering edit mode, changing the site value, and clicking cancel should leave the original site value unchanged
**Validates: Requirements 2.4**

Property 3: Input validation rejects invalid values
*For any* string that is not in the predefined site options list and is not null, attempting to save it as a site value should be rejected by the system
**Validates: Requirements 3.3**

## Error Handling

### Frontend Error Handling

1. **Network Errors**: Display user-friendly error message when API calls fail
2. **Validation Errors**: Show inline validation errors for invalid selections
3. **Save Failures**: Display error alert with retry option
4. **Loading States**: Show loading indicators during save operations

### Backend Error Handling

1. **Invalid Site Value**: Return 400 Bad Request with list of valid options
2. **Seller Not Found**: Return 404 Not Found
3. **Database Errors**: Return 500 Internal Server Error with generic message
4. **Validation Errors**: Return 400 Bad Request with specific error details

### Error Response Format

```typescript
{
  error: {
    code: 'INVALID_SITE',
    message: 'Invalid site value',
    details: { validOptions: [...] },
    retryable: false
  }
}
```

## Testing Strategy

### Unit Tests

**Backend Unit Tests:**
- Test SellerService.updateSeller() with valid site values
- Test SellerService.updateSeller() with null site value
- Test SellerService.updateSeller() with invalid site value (should not throw, validation is in route)
- Test sellers route validation logic for site field

**Frontend Unit Tests:**
- Test "Other" section renders correctly
- Test site dropdown contains all predefined options
- Test edit/cancel button functionality
- Test save button is disabled during save operation
- Test success message displays after successful save
- Test error message displays after failed save

### Property-Based Tests

**Property 1: Site value round-trip**
- Generate random valid site values from the predefined list
- Save each value to a test seller record
- Retrieve the seller and verify the site value matches
- Test with null values as well

**Property 2: Cancel preserves original value**
- Generate random initial site values (including null)
- Simulate edit mode with random new values
- Verify cancel operation restores original value
- Test across multiple edit/cancel cycles

**Property 3: Input validation rejects invalid values**
- Generate random strings that are not in the predefined list
- Attempt to save each as a site value
- Verify all are rejected with appropriate error
- Test with empty strings, special characters, and very long strings

### Integration Tests

- Test full flow: load page → edit site → save → reload page → verify value persists
- Test migration: create sellers without site → run migration → verify all sellers have nullable site field
- Test API endpoint: PUT /sellers/:id with site field updates correctly

### Manual Testing Checklist

- [ ] "Other" section appears at bottom of left panel
- [ ] Site dropdown shows all 10 predefined options
- [ ] Edit button enables dropdown
- [ ] Cancel button reverts changes
- [ ] Save button persists changes
- [ ] Success message appears after save
- [ ] Error message appears on save failure
- [ ] Previously saved values display correctly on page load
- [ ] Null/empty values display as "未設定"
- [ ] Migration runs without errors on existing database
