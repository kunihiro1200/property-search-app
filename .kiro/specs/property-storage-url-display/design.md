# Design Document

## Overview

This feature adds a "Storage URL" (格納先URL) field to the property detail page, displaying the URL where property-related documents are stored. The URL is fetched from the work_tasks table using the property number as the key.

## Architecture

### Component Structure

```
PropertyListingDetailPage (frontend/src/pages/PropertyListingDetailPage.tsx)
  └── PropertyDetailsSection (frontend/src/components/PropertyDetailsSection.tsx)
      └── Storage URL Field (new)
```

### Data Flow

1. User navigates to property detail page
2. Frontend fetches property listing data (existing)
3. Frontend fetches work task data including storage_url (new)
4. PropertyDetailsSection displays storage URL field
5. If URL exists, render as clickable link; otherwise show placeholder

## Components and Interfaces

### Frontend Components

#### PropertyListingDetailPage Updates

Add state and API call to fetch work task data:

```typescript
interface WorkTaskData {
  storage_url?: string;
  // ... other fields
}

const [workTaskData, setWorkTaskData] = useState<WorkTaskData | null>(null);

useEffect(() => {
  const fetchWorkTaskData = async () => {
    try {
      const response = await api.get(`/api/work-tasks/property/${propertyNumber}`);
      setWorkTaskData(response.data);
    } catch (error) {
      console.error('Failed to fetch work task data:', error);
      // Don't break the page if work task data is unavailable
    }
  };
  
  if (propertyNumber) {
    fetchWorkTaskData();
  }
}, [propertyNumber]);
```

Pass storage URL to PropertyDetailsSection:

```typescript
<PropertyDetailsSection
  data={data}
  editedData={editedData}
  onFieldChange={handleFieldChange}
  isEditMode={isPropertyDetailsEditMode}
  storageUrl={workTaskData?.storage_url}
/>
```

#### PropertyDetailsSection Updates

Add storageUrl prop and display field:

```typescript
interface PropertyDetailsSectionProps {
  data: PropertyListing;
  editedData: Record<string, any>;
  onFieldChange: (field: string, value: any) => void;
  isEditMode: boolean;
  storageUrl?: string; // new prop
}

// In render:
<Grid item xs={12}>
  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
    格納先URL
  </Typography>
  {storageUrl ? (
    <Link 
      href={storageUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
    >
      {storageUrl}
      <OpenInNewIcon fontSize="small" />
    </Link>
  ) : (
    <Typography variant="body2" color="text.secondary">
      -
    </Typography>
  )}
</Grid>
```

### Backend API

#### New Endpoint

Add endpoint to fetch work task by property number:

```typescript
// backend/src/routes/workTasks.ts

// Get work task by property number
router.get('/property/:propertyNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyNumber } = req.params;
    const data = await workTaskService.getByPropertyNumber(propertyNumber);
    
    if (!data) {
      res.status(404).json({ error: 'Work task not found' });
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching work task:', error);
    res.status(500).json({ error: error.message });
  }
});
```

The WorkTaskService already has the `getByPropertyNumber` method, so no service changes are needed.

## Data Models

### Existing Models

#### work_tasks table
- `property_number` (VARCHAR): Primary key for linking to property
- `storage_url` (TEXT): The URL to display

#### PropertyListing interface (frontend)
No changes needed - storage URL comes from separate work_tasks data

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Storage URL Display Consistency
*For any* property detail page load, if a storage URL exists in work_tasks for that property number, then the storage URL field should display that URL as a clickable link
**Validates: Requirements 1.2, 2.2**

### Property 2: Graceful Degradation
*For any* property detail page load, if work task data fetch fails or no storage URL exists, then the page should still render successfully with the storage URL field showing a placeholder
**Validates: Requirements 1.3, 2.3**

### Property 3: External Link Behavior
*For any* displayed storage URL that is clicked, the system should open the URL in a new browser tab without navigating away from the current page
**Validates: Requirements 1.4**

### Property 4: Read-Only in Edit Mode
*For any* property details section in edit mode, the storage URL field should remain visible but not editable
**Validates: Requirements 1.5**

## Error Handling

### Frontend Error Handling

1. **Work Task Fetch Failure**: Log error to console but don't break page rendering
2. **Invalid URL Format**: Display URL as plain text if it's not a valid URL
3. **Network Timeout**: Show placeholder after timeout, allow page to function normally

### Backend Error Handling

1. **Property Number Not Found**: Return 404 with clear error message
2. **Database Connection Error**: Return 500 with error details
3. **Invalid Property Number Format**: Return 400 with validation error

## Testing Strategy

### Unit Tests

1. Test PropertyDetailsSection renders storage URL correctly when provided
2. Test PropertyDetailsSection shows placeholder when storage URL is null/undefined
3. Test API endpoint returns correct work task data for valid property number
4. Test API endpoint returns 404 for non-existent property number

### Property-Based Tests

Property-based testing will use the `fast-check` library for TypeScript/JavaScript.

1. **Property 1 Test**: Generate random valid URLs and property numbers, verify display consistency
2. **Property 2 Test**: Generate random error scenarios, verify graceful degradation
3. **Property 3 Test**: Simulate link clicks, verify new tab behavior
4. **Property 4 Test**: Toggle edit mode with random data, verify read-only behavior

### Integration Tests

1. Test full flow: load property page → fetch work task → display storage URL
2. Test error scenarios: missing work task data, network failures
3. Test responsive behavior on different screen sizes

### Manual Testing

1. Verify storage URL displays correctly on actual property detail pages
2. Test clicking storage URL opens correct location in new tab
3. Verify field positioning and styling matches other fields
4. Test on mobile and desktop browsers
