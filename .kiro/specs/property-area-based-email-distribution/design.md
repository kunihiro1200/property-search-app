# Design Document

## Overview

This feature implements a hybrid approach to area-based email distribution that combines automatic calculation with manual editing capabilities. When users view or save property details, the system automatically calculates which area numbers (①-⑯, ㊵, ㊶) are within 3KM of the property's location and populates a new "配信エリア" (Distribution Area) field. Users can then manually edit these suggestions before saving. During email distribution, the system uses the pre-calculated area numbers to quickly match buyers without performing expensive real-time calculations.

This design improves upon the previous implementation by:
- Moving calculation from email-send time to property-view/save time
- Allowing user verification and adjustment of auto-calculated areas
- Eliminating performance bottlenecks during email distribution
- Providing transparency and control to users

## Architecture

### High-Level Flow

```
Property Detail Page Load
  ↓
Extract coordinates from Google Map URL
  ↓
Calculate areas within 3KM radius
  ↓
Auto-populate Distribution Area field
  ↓
User reviews/edits (optional)
  ↓
Save to database
  ↓
[Later] Gmail Distribution
  ↓
Read pre-calculated areas from database
  ↓
Match with buyer preferred areas
  ↓
Generate email list
```

### Component Interaction

```
Frontend (PropertyDetailPage)
  ↓
PropertyDistributionAreaCalculator (new)
  ↓
EnhancedGeolocationService (existing)
  ↓
AreaMapConfigService (existing)
  ↓
Database (property_listings.distribution_areas)
```


## Components and Interfaces

### 1. PropertyDistributionAreaCalculator (New Backend Service)

**Purpose**: Calculate which area numbers are within 3KM of a property's location

**Key Methods**:
```typescript
interface PropertyDistributionAreaCalculator {
  // Calculate areas within radius of property
  calculateDistributionAreas(googleMapUrl: string, city?: string): Promise<string[]>;
  
  // Validate area number format
  validateAreaNumbers(areaNumbers: string): boolean;
  
  // Parse area numbers from string
  parseAreaNumbers(areaNumbers: string): string[];
  
  // Format area numbers for display
  formatAreaNumbers(areaNumbers: string[]): string;
}
```

**Dependencies**:
- EnhancedGeolocationService (for coordinate extraction and distance calculation)
- AreaMapConfigService (for area map configurations)

### 2. Database Schema Changes

**Add column to property_listings table**:
```sql
ALTER TABLE property_listings 
ADD COLUMN distribution_areas TEXT;
```

**Column Details**:
- `distribution_areas`: Comma-separated area numbers (e.g., "①,②,③,㊵")
- Nullable: Yes (for properties without calculated areas)
- Indexed: Yes (for faster filtering during email distribution)

### 3. Frontend Component Updates

**PropertyDetailPage Enhancements**:
- Add "配信エリア" input field
- Trigger auto-calculation on page load (if Google Map URL exists)
- Trigger auto-calculation on Google Map URL change
- Allow manual editing of calculated areas
- Show confirmation dialog before overwriting manual edits

**UI Components**:
```typescript
interface DistributionAreaField {
  value: string;  // e.g., "①,②,③,㊵"
  isAutoCalculated: boolean;
  isManuallyEdited: boolean;
  onCalculate: () => Promise<void>;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
}
```

### 4. API Endpoints

**New Endpoint**: `POST /api/properties/:propertyNumber/calculate-distribution-areas`
- Calculate distribution areas for a property
- Returns: `{ areas: string[], formatted: string }`

**Updated Endpoint**: `PUT /api/properties/:propertyNumber`
- Accept `distribution_areas` field in request body
- Validate area number format
- Save to database

**Updated Endpoint**: `GET /api/properties/:propertyNumber/buyers/distribution`
- Use `distribution_areas` field instead of real-time calculation
- Match with buyer preferred areas
- Return filtered buyer list


## Data Models

### PropertyListing (Updated)

```typescript
interface PropertyListing {
  id: string;
  property_number: string;
  google_map_url: string | null;
  address: string | null;
  city: string | null;
  price: number | null;
  property_type: string | null;
  distribution_areas: string | null;  // NEW: "①,②,③,㊵"
  // ... other existing fields
}
```

### DistributionAreaCalculationResult

```typescript
interface DistributionAreaCalculationResult {
  areas: string[];           // ["①", "②", "③", "㊵"]
  formatted: string;         // "①,②,③,㊵"
  radiusAreas: string[];     // Areas matched by 3KM radius
  cityWideAreas: string[];   // Areas matched by city (㊵, ㊶)
  calculatedAt: Date;
}
```

### BuyerDistributionMatch (Updated)

```typescript
interface BuyerDistributionMatch {
  buyer_number: string;
  email: string;
  desired_area: string | null;
  matchedAreas: string[];    // Which areas matched
  matchType: 'exact' | 'none';  // Simplified from previous
  filterResults: {
    geography: boolean;      // Based on pre-calculated areas
    distribution: boolean;
    status: boolean;
    priceRange: boolean;
  };
}
```

## Error Handling

### Calculation Errors

**Scenario**: Google Map URL is invalid or coordinates cannot be extracted
- **Action**: Return empty array, log warning
- **User Experience**: Field remains empty, user can manually input

**Scenario**: AreaMapConfigService fails to load configurations
- **Action**: Return empty array, log error
- **User Experience**: Field remains empty, show error message

**Scenario**: Distance calculation fails
- **Action**: Skip that area, continue with others
- **User Experience**: Partial results shown

### Validation Errors

**Scenario**: User inputs invalid area numbers
- **Action**: Show validation error, prevent save
- **User Experience**: Clear error message with valid format example

**Scenario**: User inputs area numbers that don't exist in configuration
- **Action**: Show warning, allow save (permissive)
- **User Experience**: Warning message but not blocking

### Distribution Errors

**Scenario**: Property has no distribution_areas value
- **Action**: Show warning, don't proceed with filtering
- **User Experience**: Prompt to calculate areas first

**Scenario**: No buyers match the distribution areas
- **Action**: Return empty list with explanation
- **User Experience**: Clear message explaining why no buyers matched


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several redundant properties:
- Properties 3.3 and 3.2 are redundant (distribution flag filtering)
- Properties 3.6 and 3.5 are redundant (status filtering)
- Properties 4.6 and 4.5 are redundant (price range filtering)
- Properties 5.3 and 5.2 are redundant (combined eligibility)

These will be consolidated into single comprehensive properties that test both the positive and negative cases.

### Core Properties

**Property 1: Radius-based area calculation accuracy**
*For any* property with a valid Google Map URL, all calculated area numbers should be within 3KM of the property's coordinates, and no area within 3KM should be omitted.
**Validates: Requirements 1.2**

**Property 2: Oita City area inclusion**
*For any* property located in Oita City (大分市), the calculated distribution areas should include ㊵.
**Validates: Requirements 1.3**

**Property 3: Beppu City area inclusion**
*For any* property located in Beppu City (別府市), the calculated distribution areas should include ㊶.
**Validates: Requirements 1.4**

**Property 4: Distribution area persistence**
*For any* property, saving distribution areas and then retrieving the property should return the same distribution areas.
**Validates: Requirements 1.7, 1.8**

**Property 5: Area number parsing consistency**
*For any* valid distribution area string (e.g., "①,②,③"), parsing and then formatting should produce an equivalent representation.
**Validates: Requirements 2.3**

**Property 6: Geographic matching correctness**
*For any* buyer and property, if the buyer's preferred areas contain at least one area from the property's distribution areas, the buyer should be marked as geographically eligible.
**Validates: Requirements 2.4, 2.5**

**Property 7: Distribution flag filtering**
*For any* buyer, the buyer should be marked as distribution-eligible if and only if their distribution flag is set to "要".
**Validates: Requirements 3.2, 3.3**

**Property 8: Status filtering**
*For any* buyer, the buyer should be excluded from distribution if and only if their latest status contains "買付" or "D".
**Validates: Requirements 3.5, 3.6**

**Property 9: Price range filtering**
*For any* buyer and property, if the buyer's price range is "指定なし" or empty, the buyer should be price-eligible; otherwise, the buyer should be price-eligible if and only if the property price falls within the buyer's specified range for that property type.
**Validates: Requirements 4.3, 4.4, 4.5, 4.6**

**Property 10: Combined eligibility logic**
*For any* buyer and property, the buyer should be included in the final distribution list if and only if they meet all four criteria: geographic match, distribution flag, status, and price range.
**Validates: Requirements 5.1, 5.2, 5.3**

**Property 11: Email list count consistency**
*For any* set of qualifying buyers, the displayed count should equal the number of unique email addresses in the BCC field.
**Validates: Requirements 6.1**

**Property 12: Recalculation trigger**
*For any* property, updating the Google Map URL should trigger recalculation and update the distribution areas field (with user confirmation if manually edited).
**Validates: Requirements 7.1, 7.2, 7.4, 7.5**


## Testing Strategy

### Unit Testing

Unit tests will cover specific examples and integration points:

1. **PropertyDistributionAreaCalculator**:
   - Test with known coordinates and expected areas
   - Test with invalid Google Map URLs
   - Test with missing coordinates
   - Test city detection logic

2. **Area Number Parsing**:
   - Test various input formats ("①②③", "①,②,③", "① ② ③")
   - Test invalid characters
   - Test empty strings

3. **Database Operations**:
   - Test saving distribution areas
   - Test retrieving distribution areas
   - Test updating distribution areas

4. **API Endpoints**:
   - Test calculation endpoint with valid/invalid inputs
   - Test update endpoint with valid/invalid area numbers
   - Test distribution endpoint with various filter combinations

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript/TypeScript property testing library). Each test will run a minimum of 100 iterations.

1. **Property 1: Radius-based area calculation accuracy**
   - Generate random valid coordinates
   - Calculate distribution areas
   - Verify all returned areas are within 3KM
   - **Feature: property-area-based-email-distribution, Property 1: Radius-based area calculation accuracy**

2. **Property 2 & 3: City area inclusion**
   - Generate random properties with Oita/Beppu city
   - Verify ㊵/㊶ inclusion
   - **Feature: property-area-based-email-distribution, Property 2: Oita City area inclusion**
   - **Feature: property-area-based-email-distribution, Property 3: Beppu City area inclusion**

3. **Property 4: Distribution area persistence**
   - Generate random distribution area strings
   - Save and retrieve
   - Verify equality
   - **Feature: property-area-based-email-distribution, Property 4: Distribution area persistence**

4. **Property 5: Area number parsing consistency**
   - Generate random valid area number strings
   - Parse and format
   - Verify equivalence
   - **Feature: property-area-based-email-distribution, Property 5: Area number parsing consistency**

5. **Property 6: Geographic matching correctness**
   - Generate random buyer/property combinations
   - Verify matching logic
   - **Feature: property-area-based-email-distribution, Property 6: Geographic matching correctness**

6. **Property 7-10: Filter logic**
   - Generate random buyers with various attributes
   - Verify each filter criterion
   - Verify combined logic
   - **Feature: property-area-based-email-distribution, Property 7: Distribution flag filtering**
   - **Feature: property-area-based-email-distribution, Property 8: Status filtering**
   - **Feature: property-area-based-email-distribution, Property 9: Price range filtering**
   - **Feature: property-area-based-email-distribution, Property 10: Combined eligibility logic**

7. **Property 11: Email list count consistency**
   - Generate random buyer lists
   - Verify count matches unique emails
   - **Feature: property-area-based-email-distribution, Property 11: Email list count consistency**

8. **Property 12: Recalculation trigger**
   - Generate random URL updates
   - Verify recalculation occurs
   - **Feature: property-area-based-email-distribution, Property 12: Recalculation trigger**

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **Complete Distribution Flow**:
   - Create property with Google Map URL
   - Verify auto-calculation
   - Manually edit areas
   - Save property
   - Trigger distribution
   - Verify buyer list

2. **Recalculation Flow**:
   - Create property with areas
   - Update Google Map URL
   - Verify recalculation prompt
   - Confirm/cancel
   - Verify result

3. **Error Handling**:
   - Test with invalid URLs
   - Test with missing data
   - Test with no matching buyers
   - Verify appropriate error messages


## Implementation Details

### Calculation Algorithm

```typescript
async calculateDistributionAreas(
  googleMapUrl: string, 
  city?: string
): Promise<string[]> {
  const areas: string[] = [];
  
  // 1. Add city-wide areas based on city
  if (city) {
    if (city.includes('大分市')) areas.push('㊵');
    if (city.includes('別府市')) areas.push('㊶');
  }
  
  // 2. Extract coordinates from URL
  const coords = extractCoordinatesFromUrl(googleMapUrl);
  if (!coords) return areas;
  
  // 3. Load area map configurations
  const areaConfigs = await loadAreaMaps();
  
  // 4. Calculate distance to each area
  for (const config of areaConfigs) {
    if (!config.coordinates) continue; // Skip city-wide areas
    
    const distance = calculateDistance(coords, config.coordinates);
    if (distance <= 3.0) { // 3KM radius
      areas.push(config.areaNumber);
    }
  }
  
  // 5. Remove duplicates and sort
  return Array.from(new Set(areas)).sort();
}
```

### Area Number Format

**Storage Format**: Comma-separated (e.g., "①,②,③,㊵")
**Display Format**: Comma-separated with spaces (e.g., "①, ②, ③, ㊵")
**Input Formats Accepted**:
- Comma-separated: "①,②,③"
- Space-separated: "① ② ③"
- Mixed: "①, ②, ③"
- Continuous: "①②③"

### Validation Rules

1. **Area Number Validation**:
   - Must match pattern: /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]$/
   - Duplicates are automatically removed
   - Invalid characters are rejected

2. **Google Map URL Validation**:
   - Must be a valid Google Maps URL
   - Must contain extractable coordinates
   - Invalid URLs result in empty calculation

3. **City Name Validation**:
   - Must be one of: "大分市", "別府市"
   - Partial matches accepted (e.g., "大分市田尻" → "大分市")

### Performance Considerations

1. **Caching**:
   - AreaMapConfigService caches configurations for 1 hour
   - Reduces database queries during calculation

2. **Calculation Timing**:
   - Triggered on property page load (if not already calculated)
   - Triggered on Google Map URL change
   - NOT triggered during email distribution (uses pre-calculated values)

3. **Database Indexing**:
   - Index on `distribution_areas` column for faster filtering
   - Index on `property_number` for faster lookups

### User Experience Flow

1. **Initial Load**:
   ```
   User opens property detail page
   → System checks if distribution_areas exists
   → If not, auto-calculate and populate field
   → User sees suggested areas
   ```

2. **Manual Edit**:
   ```
   User edits distribution_areas field
   → System marks as manually edited
   → User saves property
   → System stores edited value
   ```

3. **URL Update**:
   ```
   User updates Google Map URL
   → System detects change
   → If manually edited: Show confirmation dialog
   → If confirmed: Recalculate and update
   → If cancelled: Keep existing value
   ```

4. **Email Distribution**:
   ```
   User clicks Gmail distribution button
   → System reads distribution_areas from database
   → System matches with buyer preferred areas
   → System applies other filters
   → System populates BCC field
   ```


## Security Considerations

1. **Input Validation**:
   - Sanitize area number input to prevent injection attacks
   - Validate Google Map URLs to prevent SSRF attacks
   - Limit input length to prevent DoS

2. **Authorization**:
   - Only authenticated users can calculate/update distribution areas
   - Only authenticated users can access buyer distribution lists
   - Verify user has permission to access property data

3. **Data Privacy**:
   - Buyer email addresses are only exposed to authorized users
   - Distribution area calculations don't expose sensitive location data
   - Audit log for distribution area changes

## Migration Strategy

### Phase 1: Add Database Column
```sql
ALTER TABLE property_listings 
ADD COLUMN distribution_areas TEXT;

CREATE INDEX idx_property_listings_distribution_areas 
ON property_listings(distribution_areas);
```

### Phase 2: Backfill Existing Properties
```typescript
// For each property with google_map_url:
// 1. Calculate distribution areas
// 2. Update distribution_areas column
// 3. Log results
```

### Phase 3: Update Frontend
- Add distribution area field to PropertyDetailPage
- Implement auto-calculation on load
- Implement manual edit functionality
- Add recalculation confirmation dialog

### Phase 4: Update Distribution Logic
- Modify EnhancedBuyerDistributionService to use distribution_areas
- Remove real-time calculation from distribution flow
- Update tests

### Phase 5: Monitoring & Validation
- Monitor calculation accuracy
- Validate buyer matching results
- Collect user feedback
- Adjust algorithm if needed

## Rollback Plan

If issues arise, rollback can be performed by:

1. **Immediate**: Revert frontend changes to hide distribution area field
2. **Short-term**: Revert distribution logic to use real-time calculation
3. **Long-term**: Drop distribution_areas column if feature is abandoned

The system is designed to be backwards compatible - if distribution_areas is null, the system can fall back to real-time calculation.

## Future Enhancements

1. **Bulk Recalculation**:
   - Admin tool to recalculate all properties
   - Scheduled job to update stale calculations

2. **Area Suggestions**:
   - Machine learning to suggest areas based on historical data
   - User feedback to improve suggestions

3. **Visual Map Interface**:
   - Show areas on a map
   - Allow drag-and-drop area selection
   - Visual radius indicator

4. **Distribution Analytics**:
   - Track which areas generate most matches
   - Analyze buyer response rates by area
   - Optimize area configurations

