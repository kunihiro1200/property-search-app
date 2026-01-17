# Design Document

## Overview

This design document outlines the UI improvements for the property detail page, focusing on relocating the Gmail distribution button to the header and moving the storage URL to the appropriate section. These changes improve user workflow by making the Gmail distribution feature more accessible from the detail view and organizing related URLs together.

## Architecture

### Component Structure

```
PropertyListingDetailPage
├── Header Section
│   ├── Back Button
│   ├── Title (Property Number)
│   ├── Gmail Distribution Button (NEW)
│   └── Save Button
├── Property Information Sections
│   ├── Price Section
│   ├── Basic Info Section
│   ├── Maps and Site URLs Section (MODIFIED)
│   │   ├── Google Map URL
│   │   ├── SUUMO URL
│   │   └── Storage URL (MOVED HERE)
│   ├── Property Details Section (MODIFIED)
│   │   └── (Storage URL removed)
│   └── Other Sections...
└── Buyer List Section

PropertyListingsPage
└── Property Table
    └── (Gmail Distribution Button removed)
```

### Data Flow

1. **Gmail Distribution from Detail Page**:
   - User clicks Gmail button in header
   - Component passes `propertyNumber` and `propertyAddress` from current property data
   - GmailDistributionButton component handles template selection and email generation
   - No changes to the underlying service logic

2. **Storage URL Display**:
   - Storage URL data comes from `workTaskData.storage_url`
   - Currently passed to PropertyDetailsSection component
   - Will be displayed directly in the Maps and Site URLs section instead

## Components and Interfaces

### Modified Components

#### 1. PropertyListingDetailPage.tsx

**Changes**:
- Add GmailDistributionButton to header section
- Move storage URL display from PropertyDetailsSection to Maps and Site URLs section
- Remove storage URL prop from PropertyDetailsSection

**Header Section Update**:
```tsx
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <IconButton onClick={handleBack} size="large">
      <ArrowBackIcon />
    </IconButton>
    <Typography variant="h5" fontWeight="bold">
      物件詳細 - {data.property_number}
    </Typography>
  </Box>
  <Box sx={{ display: 'flex', gap: 2 }}>
    <GmailDistributionButton
      propertyNumber={data.property_number}
      propertyAddress={data.address || data.display_address}
      size="medium"
      variant="contained"
    />
    <Button
      variant="contained"
      startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
      onClick={handleSave}
      disabled={!hasChanges || saving}
    >
      {saving ? '保存中...' : '保存'}
    </Button>
  </Box>
</Box>
```

**Maps and Site URLs Section Update**:
```tsx
<Paper sx={{ p: 2, mb: 2 }}>
  <Typography variant="h6" gutterBottom fontWeight="bold">
    地図、サイトURL等
  </Typography>
  <Grid container spacing={2}>
    {data.google_map_url && (
      <Grid item xs={12}>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
          GoogleマップURL
        </Typography>
        <Link href={data.google_map_url} target="_blank" rel="noopener noreferrer" 
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '1rem' }}>
          {data.google_map_url}
          <OpenInNewIcon fontSize="small" />
        </Link>
      </Grid>
    )}
    {data.suumo_url && (
      <Grid item xs={12}>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
          SUUMO URL
        </Typography>
        <Link href={data.suumo_url} target="_blank" rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '1rem' }}>
          {data.suumo_url}
          <OpenInNewIcon fontSize="small" />
        </Link>
      </Grid>
    )}
    {workTaskData?.storage_url && (
      <Grid item xs={12}>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
          格納先URL
        </Typography>
        <Link href={workTaskData.storage_url} target="_blank" rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '1rem' }}>
          {workTaskData.storage_url}
          <OpenInNewIcon fontSize="small" />
        </Link>
      </Grid>
    )}
    {!data.google_map_url && !data.suumo_url && !workTaskData?.storage_url && (
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">
          URLが登録されていません
        </Typography>
      </Grid>
    )}
  </Grid>
</Paper>
```

#### 2. PropertyDetailsSection.tsx

**Changes**:
- Remove `storageUrl` prop from interface
- Remove storage URL display from the component
- Keep all other fields unchanged

**Updated Interface**:
```tsx
interface PropertyDetailsSectionProps {
  data: PropertyListing;
  editedData: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
  isEditMode: boolean;
  // storageUrl prop removed
}
```

#### 3. PropertyListingsPage.tsx

**Changes**:
- Remove GmailDistributionButton from the table cell
- Remove the entire table cell column for Gmail distribution
- Adjust table column widths accordingly

**Table Structure Update**:
```tsx
// Remove this column:
<TableCell onClick={(e) => e.stopPropagation()}>
  {listing.property_number && (
    <GmailDistributionButton
      propertyNumber={listing.property_number}
      propertyAddress={listing.address || listing.display_address}
    />
  )}
</TableCell>
```

### No Changes Required

- **GmailDistributionButton.tsx**: No changes needed, component is reusable
- **gmailDistributionService.ts**: No changes needed
- **Backend APIs**: No changes needed

## Data Models

No database schema changes required. All changes are UI-only.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Gmail button presence in detail page
*For any* property detail page load, the Gmail distribution button should be visible in the header section alongside the save button
**Validates: Requirements 1.1, 1.4**

### Property 2: Gmail button functionality from detail page
*For any* property with a valid property number, clicking the Gmail distribution button in the detail page header should open the template selector modal with the correct property information
**Validates: Requirements 1.2, 1.5**

### Property 3: Gmail button absence in list page
*For any* property listing table row, the Gmail distribution button should not be present in the table cells
**Validates: Requirements 1.3**

### Property 4: Storage URL in maps section
*For any* property detail page with a storage URL, the storage URL should be displayed in the "地図、サイトURL等" section with consistent formatting
**Validates: Requirements 2.1, 2.3**

### Property 5: Storage URL removal from details section
*For any* property detail page, the storage URL should not appear in the "物件詳細情報" section
**Validates: Requirements 2.2**

### Property 6: URL section consistency
*For any* property detail page, all URLs in the "地図、サイトURL等" section should be formatted as clickable links with external link icons
**Validates: Requirements 2.5**

## Error Handling

### Potential Issues and Solutions

1. **Missing Property Data**:
   - Issue: Property number or address might be undefined
   - Solution: GmailDistributionButton already handles this gracefully by disabling the button

2. **Storage URL Unavailable**:
   - Issue: workTaskData might be null or storage_url might be undefined
   - Solution: Use conditional rendering (`workTaskData?.storage_url &&`) to only show when available

3. **Multiple URL Display**:
   - Issue: Section might look empty if no URLs are available
   - Solution: Show "URLが登録されていません" message when all URLs are missing

## Testing Strategy

### Unit Tests

1. **PropertyListingDetailPage Component Tests**:
   - Test Gmail button renders in header
   - Test Gmail button receives correct props (propertyNumber, propertyAddress)
   - Test storage URL displays in Maps section when available
   - Test storage URL does not display in Property Details section
   - Test empty state message when no URLs available

2. **PropertyDetailsSection Component Tests**:
   - Test component renders without storageUrl prop
   - Test all other fields render correctly
   - Test edit mode functionality unchanged

3. **PropertyListingsPage Component Tests**:
   - Test Gmail button column is removed from table
   - Test table renders correctly without Gmail button column

### Integration Tests

1. **Gmail Distribution Flow**:
   - Navigate to property detail page
   - Click Gmail distribution button in header
   - Verify template selector opens
   - Verify correct property data is used

2. **URL Display Flow**:
   - Navigate to property detail page with storage URL
   - Verify storage URL appears in Maps section
   - Verify storage URL does not appear in Details section
   - Click storage URL link and verify it opens correctly

### Manual Testing Checklist

- [ ] Gmail button appears in property detail header
- [ ] Gmail button works correctly from detail page
- [ ] Gmail button removed from property list table
- [ ] Storage URL appears in Maps section
- [ ] Storage URL removed from Details section
- [ ] All URLs in Maps section have consistent formatting
- [ ] External link icons display correctly
- [ ] Empty state message shows when no URLs available
- [ ] Layout looks good on different screen sizes

## Implementation Notes

1. **Import Statement**: Add GmailDistributionButton import to PropertyListingDetailPage
2. **Styling**: Use `size="medium"` and `variant="contained"` for header button to match save button
3. **Spacing**: Add appropriate gap between Gmail button and save button in header
4. **Icon**: Storage URL should use OpenInNewIcon like other URLs in the section
5. **Conditional Rendering**: Use optional chaining for workTaskData?.storage_url
6. **Remove Prop**: Update PropertyDetailsSection call to remove storageUrl prop
7. **Table Cleanup**: Remove entire TableCell for Gmail button from PropertyListingsPage

## Performance Considerations

- No performance impact expected
- All changes are UI-only with no additional API calls
- Component reuse (GmailDistributionButton) maintains existing performance characteristics

## Security Considerations

- No security changes required
- Existing URL validation and sanitization remains in place
- Gmail distribution service security unchanged
