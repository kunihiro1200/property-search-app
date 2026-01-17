# Design Document

## Overview

This design addresses three display and functionality issues with the site field in the seller management system. The site field tracks the inquiry source (e.g., ウ, ビ, HP, at-home) and needs to be properly displayed and editable across three key interfaces: the sellers table, new seller registration form, and call mode page.

## Architecture

The fix involves frontend-only changes to three React components:
1. `SellersPage.tsx` - Sellers table display
2. `NewSellerPage.tsx` - New seller registration form
3. `CallModePage.tsx` - Call mode page with seller details

The backend already correctly handles the `site` field through:
- Database column: `sellers.site` (VARCHAR(100))
- API field: `site` in seller objects
- Valid options defined in `backend/src/routes/sellers.ts`

## Components and Interfaces

### 1. SellersPage Component

**Current Issue**: Displays `seller.inquirySite` but backend returns `seller.site`

**Solution**: Update the table cell to use `seller.site` instead of `seller.inquirySite`

**Location**: `frontend/src/pages/SellersPage.tsx` line ~393

### 2. NewSellerPage Component

**Current Issue**: Uses a text input field instead of a dropdown select

**Solution**: 
- Replace TextField with Select component
- Add site options array matching backend valid options
- Update form submission to use `site` field name

**Location**: `frontend/src/pages/NewSellerPage.tsx` lines ~407-412

### 3. CallModePage Component

**Current Issue**: Site field is not displayed in the "Other" section

**Solution**:
- Add site display and edit functionality in the "Other" section
- Reuse existing site editing logic (already present in the component)
- Ensure site field is visible and editable

**Location**: `frontend/src/pages/CallModePage.tsx` - needs to add site field display in the "Other" section

## Data Models

### Site Field

```typescript
interface Seller {
  // ... other fields
  site?: string; // Website or channel from which inquiry originated
}
```

### Valid Site Options

The following options are defined in the backend and should be used in all dropdowns:

```typescript
const siteOptions = [
  'ウ',
  'ビ',
  'H',
  'お',
  'Y',
  'す',
  'a',
  'L',
  'エ',
  '近所',
  'チ',
  'P',
  '紹',
  'リ',
  '買',
  'HP',
  '知合',
  'at-homeの掲載を見て',
  '2件目以降査定'
];
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Site field mapping consistency

*For any* seller object returned from the API, the site value should be accessible via the `site` property and displayed correctly in the UI
**Validates: Requirements 1.1, 1.2**

### Property 2: Site dropdown completeness

*For any* site dropdown in the application, all valid site options from the backend should be available for selection
**Validates: Requirements 2.2**

### Property 3: Site value persistence

*For any* site value selected or edited by the user, when saved, the value should be correctly stored in the database and retrievable in subsequent views
**Validates: Requirements 2.4, 3.5**

## Error Handling

### Invalid Site Values

- If a site value is not in the valid options list, the backend will return a 400 error
- Frontend should only allow selection from valid options to prevent this error
- Display validation error if an invalid value is somehow submitted

### Missing Site Values

- Site field is optional, so null/undefined values are acceptable
- Display "-" or empty placeholder when site value is not set
- Do not show validation errors for empty site values

## Testing Strategy

### Unit Tests

- Test that SellersPage correctly displays site values from API response
- Test that NewSellerPage includes site in form submission data
- Test that CallModePage displays and updates site values correctly

### Property-Based Tests

Property-based testing is not required for this feature as it involves simple UI display and form handling logic. The correctness properties defined above will be validated through manual testing and code review.

### Manual Testing Checklist

1. **Sellers Table Display**
   - Create a seller with a site value
   - Verify site appears in the "サイト" column
   - Verify "-" appears for sellers without site values

2. **New Seller Registration**
   - Open new seller form
   - Verify site field is a dropdown
   - Verify all valid options are available
   - Select a site and submit form
   - Verify site value is saved correctly

3. **Call Mode Page**
   - Open call mode for a seller with a site value
   - Verify site is displayed in the "Other" section
   - Edit the site value
   - Save and verify the update persists
