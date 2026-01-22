# Design Document

## Overview

This feature adds an "exclusion date" field to the CallModePage status update section, positioned above the "next call date" field. The exclusion date is automatically calculated based on the inquiry date and site using specific business rules for each site type. The calculation logic is implemented in the backend to ensure consistency across the system.

## Architecture

### Component Structure

```
Frontend (CallModePage)
  ├── ExclusionDateDisplay (read-only field)
  └── StatusUpdateSection
      ├── Status dropdown
      ├── Confidence dropdown
      ├── ExclusionDate field (NEW)
      └── NextCallDate field

Backend
  ├── SellerService
  │   └── calculateExclusionDate() (NEW)
  └── API Routes
      └── PUT /sellers/:id (enhanced)
```

### Data Flow

1. User loads CallModePage
2. Frontend requests seller data from backend
3. Backend calculates exclusion date before returning data
4. Frontend displays exclusion date in read-only field
5. When seller data is updated, backend recalculates exclusion date

## Components and Interfaces

### Frontend Components

#### ExclusionDateField Component

Location: `frontend/src/pages/CallModePage.tsx` (inline in status update section)

```typescript
// Add to state variables
const [exclusionDate, setExclusionDate] = useState<string | null>(null);

// Display in Grid
<Grid item xs={12}>
  <TextField
    fullWidth
    size="small"
    label="除外日"
    type="date"
    value={exclusionDate || ''}
    InputProps={{
      readOnly: true,
    }}
    InputLabelProps={{ shrink: true }}
    helperText="反響日付とサイトから自動計算"
  />
</Grid>
```

### Backend Services

#### ExclusionDateCalculator

Location: `backend/src/services/ExclusionDateCalculator.ts` (NEW)

```typescript
export class ExclusionDateCalculator {
  /**
   * Calculate exclusion date based on inquiry date and site
   * @param inquiryDate - The inquiry date
   * @param site - The site identifier (Y, ウ, L, す, a)
   * @returns The calculated exclusion date or null
   */
  static calculateExclusionDate(
    inquiryDate: Date | string,
    site: string | null | undefined
  ): Date | null {
    if (!inquiryDate || !site) {
      return null;
    }

    const inquiry = new Date(inquiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inquiry.setHours(0, 0, 0, 0);

    // Check if inquiry date is in the future
    if (inquiry > today) {
      return null;
    }

    const daysDiff = Math.floor((today.getTime() - inquiry.getTime()) / (1000 * 60 * 60 * 24));

    // Site-specific rules
    const rules: Record<string, { maxDays: number; addDays: number }> = {
      'Y': { maxDays: 6, addDays: 5 },
      'ウ': { maxDays: 7, addDays: 7 },
      'L': { maxDays: 5, addDays: 5 },
      'す': { maxDays: 8, addDays: 9 },
      'a': { maxDays: 8, addDays: 8 },
    };

    const rule = rules[site];
    if (!rule) {
      return null;
    }

    // Check if inquiry date is within the allowed range
    if (daysDiff <= rule.maxDays) {
      const exclusionDate = new Date(inquiry);
      exclusionDate.setDate(exclusionDate.getDate() + rule.addDays);
      return exclusionDate;
    }

    return null;
  }
}
```

#### SellerService Enhancement

Location: `backend/src/services/SellerService.ts` or `SellerService.supabase.ts`

Add exclusion date calculation to:
- `getById()` - Calculate before returning
- `update()` - Calculate before saving
- `create()` - Calculate on creation

```typescript
// In getById method
const exclusionDate = ExclusionDateCalculator.calculateExclusionDate(
  seller.inquiryDate,
  seller.site
);
seller.exclusionDate = exclusionDate;

// In update method
updateData.exclusionDate = ExclusionDateCalculator.calculateExclusionDate(
  seller.inquiryDate || updateData.inquiryDate,
  seller.site || updateData.site
);
```

## Data Models

### Database Schema

The `exclusion_date` column already exists in the `sellers` table (from migration 009):

```sql
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_date DATE;
```

### TypeScript Types

Frontend (`frontend/src/types/index.ts`):
```typescript
export interface Seller {
  // ... existing fields
  exclusionDate?: string | Date; // Already exists
  // ... existing fields
}
```

Backend (`backend/src/types/index.ts`):
```typescript
export interface Seller {
  // ... existing fields
  exclusionDate?: Date; // Already exists
  // ... existing fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Exclusion date calculation for site Y

*For any* seller with inquiry date within 6 days before today and site "Y" and inquiry date not in the future, the exclusion date should equal inquiry date plus 5 days

**Validates: Requirements 2.1**

### Property 2: Exclusion date calculation for site ウ

*For any* seller with inquiry date within 7 days before today and site "ウ" and inquiry date not in the future, the exclusion date should equal inquiry date plus 7 days

**Validates: Requirements 2.2**

### Property 3: Exclusion date calculation for site L

*For any* seller with inquiry date within 5 days before today and site "L" and inquiry date not in the future, the exclusion date should equal inquiry date plus 5 days

**Validates: Requirements 2.3**

### Property 4: Exclusion date calculation for site す

*For any* seller with inquiry date within 8 days before today and site "す" and inquiry date not in the future, the exclusion date should equal inquiry date plus 9 days

**Validates: Requirements 2.4**

### Property 5: Exclusion date calculation for site a

*For any* seller with inquiry date within 8 days before today and site "a" and inquiry date not in the future, the exclusion date should equal inquiry date plus 8 days

**Validates: Requirements 2.5**

### Property 6: Null exclusion date for invalid conditions

*For any* seller where none of the site-specific conditions are met, the exclusion date should be null

**Validates: Requirements 2.6**

### Property 7: Exclusion date recalculation on data load

*For any* seller data loaded in CallModePage, the exclusion date should be calculated based on current inquiry date and site values

**Validates: Requirements 3.1, 3.2**

### Property 8: Future inquiry dates excluded

*For any* seller with inquiry date in the future, the exclusion date should be null regardless of site

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

## Error Handling

### Frontend Error Handling

1. **Missing Data**: If `inquiryDate` or `site` is missing, display "-" in the exclusion date field
2. **Invalid Date**: If exclusion date calculation returns null, display "-"
3. **Display Errors**: Use try-catch when formatting dates for display

### Backend Error Handling

1. **Invalid Input**: Return null if `inquiryDate` or `site` is invalid
2. **Date Parsing Errors**: Catch and log date parsing errors, return null
3. **Database Errors**: Log errors when saving exclusion date, but don't fail the entire operation

## Testing Strategy

### Unit Tests

1. Test `ExclusionDateCalculator.calculateExclusionDate()` with various inputs:
   - Each site type (Y, ウ, L, す, a)
   - Inquiry dates within and outside the valid range
   - Future inquiry dates
   - Null/undefined inputs
   - Edge cases (exactly at boundary days)

2. Test frontend display:
   - Null exclusion date displays as "-"
   - Valid exclusion date displays in correct format
   - Field is read-only

### Property-Based Tests

Property-based tests will verify the correctness properties using a PBT library (fast-check for TypeScript).

Each property test should:
- Generate random inquiry dates and sites
- Verify the calculation follows the specified rules
- Run at least 100 iterations
- Be tagged with the property number from the design document

Example test structure:
```typescript
// Feature: exclusion-date-field, Property 1: Exclusion date calculation for site Y
fc.assert(
  fc.property(
    fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    (inquiryDate) => {
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - inquiryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 6 && daysDiff >= 0) {
        const result = ExclusionDateCalculator.calculateExclusionDate(inquiryDate, 'Y');
        const expected = new Date(inquiryDate);
        expected.setDate(expected.getDate() + 5);
        
        return result !== null && 
               result.getTime() === expected.getTime();
      }
      return true;
    }
  ),
  { numRuns: 100 }
);
```

### Integration Tests

1. Test full flow:
   - Load seller in CallModePage
   - Verify exclusion date is displayed
   - Update seller data
   - Verify exclusion date is recalculated

2. Test API endpoints:
   - GET /sellers/:id returns exclusion date
   - PUT /sellers/:id recalculates exclusion date

## Implementation Notes

### Field Positioning

The exclusion date field should be inserted in the status update section Grid, immediately before the next call date field:

```typescript
<Grid item xs={12}>
  <FormControl fullWidth size="small">
    <InputLabel>確度</InputLabel>
    <Select ...>
      {/* Confidence options */}
    </Select>
  </FormControl>
</Grid>

{/* NEW: Exclusion Date Field */}
<Grid item xs={12}>
  <TextField
    fullWidth
    size="small"
    label="除外日"
    type="date"
    value={exclusionDate || ''}
    InputProps={{ readOnly: true }}
    InputLabelProps={{ shrink: true }}
    helperText="反響日付とサイトから自動計算"
  />
</Grid>

{/* Existing: Next Call Date Field */}
<Grid item xs={12}>
  <TextField
    fullWidth
    size="small"
    label="次電日"
    type="date"
    value={editedNextCallDate}
    onChange={(e) => setEditedNextCallDate(e.target.value)}
    InputLabelProps={{ shrink: true }}
  />
</Grid>
```

### Calculation Timing

The exclusion date should be calculated:
1. When seller data is loaded (in `loadSellerData()`)
2. When seller data is retrieved from the backend (in `SellerService.getById()`)
3. When seller data is updated (in `SellerService.update()`)

### Date Handling

- All dates should be handled in UTC to avoid timezone issues
- Use `setHours(0, 0, 0, 0)` to normalize dates for comparison
- Store dates in ISO format (YYYY-MM-DD) in the database

## Security Considerations

- The exclusion date field is read-only in the UI, preventing manual manipulation
- Calculation logic is server-side, ensuring consistency
- No sensitive data is exposed through the exclusion date calculation

## Performance Considerations

- Exclusion date calculation is O(1) and very fast
- No additional database queries required (uses existing fields)
- Calculation happens in-memory during data retrieval/update
