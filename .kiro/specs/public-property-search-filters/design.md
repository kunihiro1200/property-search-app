# Design Document: Public Property Search Filters

## Overview

This feature extends the existing public property site with additional search filters to help users find properties more efficiently. We will add location-based search (partial address matching) and building age range filtering to the existing property type and price filters. The property number filter will be implemented for internal use only and will not be exposed on the public site.

### Key Design Principles

1. **User-Friendly**: Intuitive filter interface with immediate feedback
2. **Performance**: Efficient database queries with proper indexing
3. **Extensible**: Easy to add more filters in the future
4. **Consistent**: Follows existing public property site patterns
5. **Secure**: Property number filter restricted to internal use only

## Architecture

### System Architecture

The feature extends the existing public property site architecture:

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────┐
│  React Frontend                 │
│  (PublicPropertyListingPage)    │
│                                 │
│  ┌───────────────────────────┐ │
│  │ PublicPropertyFilters     │ │ ← Extended with new filters
│  │ - Property Type           │ │
│  │ - Price Range             │ │
│  │ - Location Search (NEW)   │ │ ← Partial address matching
│  │ - Building Age (NEW)      │ │ ← Min/max range
│  └───────────────────────────┘ │
└────────┬────────────────────────┘
         │ REST API
         ▼
┌─────────────────────────────────┐
│  Backend API                    │
│  (publicProperties.ts)          │
│                                 │
│  GET /api/public/properties     │ ← Extended query params
│  - propertyType                 │
│  - minPrice, maxPrice           │
│  - location (NEW)               │ ← Partial match on address
│  - minAge, maxAge (NEW)         │ ← Building age range
│                                 │
│  GET /api/internal/properties   │ ← Internal endpoint
│  - propertyNumber (NEW)         │ ← Exact/partial match
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  PropertyListingService         │
│                                 │
│  getPublicProperties()          │ ← Extended filtering logic
│  - Location filtering           │
│  - Building age filtering       │
│                                 │
│  searchByPropertyNumber()       │ ← Internal use only
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  PostgreSQL Database            │
│  (property_listings table)      │
│                                 │
│  Indexes:                       │
│  - address (GIN for text search)│ ← For location search
│  - construction_year_month      │ ← For age filtering
│  - property_number              │ ← For internal search
└─────────────────────────────────┘
```

## Components and Interfaces

### Frontend Components

#### 1. Extended PublicPropertyFilters Component

**Location:** `frontend/src/components/PublicPropertyFilters.tsx`

The existing component will be extended with two new filter fields:

```typescript
interface PublicPropertyFilters {
  // Existing filters
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  areas?: string[];
  page?: number;
  limit?: number;
  
  // NEW: Location search filter
  location?: string;
  
  // NEW: Building age range filter
  minAge?: number;  // Minimum building age in years
  maxAge?: number;  // Maximum building age in years
}
```

**New UI Elements:**

1. **Location Search Field**
   - Text input field with label "所在地で検索"
   - Placeholder: "例: 大分市、別府市中央町"
   - Debounced input (500ms) to avoid excessive API calls
   - Clear button when text is entered
   - Real-time search as user types

2. **Building Age Range Filter**
   - Two number input fields: "築年数（最小）" and "築年数（最大）"
   - Unit label: "年"
   - Input validation: min >= 0, max >= min
   - Placeholder: "例: 0, 10, 20"
   - Apply button or auto-apply on blur

**Component Structure:**

```typescript
const PublicPropertyFiltersComponent: React.FC<PublicPropertyFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState<PublicPropertyFilters>(filters);
  const [locationInput, setLocationInput] = useState(filters.location || '');
  
  // Debounce location search
  const debouncedLocationSearch = useMemo(
    () => debounce((value: string) => {
      const newFilters = { ...localFilters, location: value || undefined };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    }, 500),
    [localFilters, onFiltersChange]
  );
  
  const handleLocationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocationInput(value);
    debouncedLocationSearch(value);
  };
  
  const handleMinAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value ? parseInt(event.target.value, 10) : undefined;
    const newFilters = { ...localFilters, minAge: value };
    setLocalFilters(newFilters);
  };
  
  const handleMaxAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value ? parseInt(event.target.value, 10) : undefined;
    const newFilters = { ...localFilters, maxAge: value };
    setLocalFilters(newFilters);
  };
  
  const handleApplyAgeFilters = () => {
    onFiltersChange(localFilters);
  };
  
  // ... rest of component
};
```

### Backend API Endpoints

#### 1. Extended Public Properties Endpoint

**Endpoint:** `GET /api/public/properties`

**Extended Query Parameters:**

```typescript
interface PublicPropertiesQueryParams {
  // Existing parameters
  limit?: string;
  offset?: string;
  propertyType?: string;
  minPrice?: string;
  maxPrice?: string;
  areas?: string;
  
  // NEW: Location search parameter
  location?: string;  // Partial match on address field
  
  // NEW: Building age range parameters
  minAge?: string;    // Minimum building age in years
  maxAge?: string;    // Maximum building age in years
}
```

**Implementation in `backend/src/routes/publicProperties.ts`:**

```typescript
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const {
      limit = '20',
      offset = '0',
      propertyType,
      minPrice,
      maxPrice,
      areas,
      location,      // NEW
      minAge,        // NEW
      maxAge,        // NEW
    } = req.query;

    // Parse and validate parameters
    const parsedLimit = Math.min(parseInt(limit as string, 10), 100);
    const parsedOffset = parseInt(offset as string, 10);

    // Price range validation (existing)
    let priceFilter: { min?: number; max?: number } | undefined;
    if (minPrice || maxPrice) {
      priceFilter = {};
      if (minPrice) {
        const min = parseInt(minPrice as string, 10);
        if (!isNaN(min) && min >= 0) {
          priceFilter.min = min;
        }
      }
      if (maxPrice) {
        const max = parseInt(maxPrice as string, 10);
        if (!isNaN(max) && max >= 0) {
          priceFilter.max = max;
        }
      }
    }

    // NEW: Building age range validation
    let ageFilter: { min?: number; max?: number } | undefined;
    if (minAge || maxAge) {
      ageFilter = {};
      if (minAge) {
        const min = parseInt(minAge as string, 10);
        if (!isNaN(min) && min >= 0) {
          ageFilter.min = min;
        }
      }
      if (maxAge) {
        const max = parseInt(maxAge as string, 10);
        if (!isNaN(max) && max >= 0) {
          ageFilter.max = max;
        }
      }
    }

    // Area filter parsing (existing)
    let areaFilter: string[] | undefined;
    if (areas && typeof areas === 'string') {
      areaFilter = areas.split(',').map(a => a.trim()).filter(a => a);
    }

    // NEW: Location filter (sanitize input)
    let locationFilter: string | undefined;
    if (location && typeof location === 'string') {
      locationFilter = location.trim();
    }

    const result = await propertyListingService.getPublicProperties({
      limit: parsedLimit,
      offset: parsedOffset,
      propertyType: propertyType as string,
      priceRange: priceFilter,
      areas: areaFilter,
      location: locationFilter,     // NEW
      buildingAgeRange: ageFilter,  // NEW
    });

    res.set('Cache-Control', 'public, max-age=300');
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching public properties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### 2. Internal Property Search Endpoint (NEW)

**Endpoint:** `GET /api/internal/properties/search`

**Purpose:** Internal use only - search by property number

**Authentication:** Required (existing `authenticate` middleware)

**Query Parameters:**

```typescript
interface InternalPropertySearchParams {
  propertyNumber: string;  // Exact or partial match
  exact?: string;          // 'true' for exact match, default is partial
}
```

**Implementation:**

```typescript
// NEW: Internal property search by property number
router.get('/internal/properties/search', authenticate, async (req: Request, res: Response) => {
  try {
    const { propertyNumber, exact = 'false' } = req.query;

    if (!propertyNumber || typeof propertyNumber !== 'string') {
      res.status(400).json({ error: 'Property number is required' });
      return;
    }

    const isExactMatch = exact === 'true';
    const results = await propertyListingService.searchByPropertyNumber(
      propertyNumber.trim(),
      isExactMatch
    );

    res.json({ properties: results, count: results.length });
  } catch (error: any) {
    console.error('Error searching properties by number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Backend Service Methods

#### Extended PropertyListingService

**Location:** `backend/src/services/PropertyListingService.ts`

**Extended getPublicProperties Method:**

```typescript
async getPublicProperties(options: {
  limit?: number;
  offset?: number;
  propertyType?: string;
  priceRange?: { min?: number; max?: number };
  areas?: string[];
  location?: string;                              // NEW
  buildingAgeRange?: { min?: number; max?: number };  // NEW
} = {}) {
  const {
    limit = 20,
    offset = 0,
    propertyType,
    priceRange,
    areas,
    location,           // NEW
    buildingAgeRange,   // NEW
  } = options;

  try {
    let query = this.supabase
      .from('property_listings')
      .select('id, property_number, property_type, address, price, land_area, building_area, construction_year_month, image_url, distribution_areas, atbb_status, created_at', { count: 'exact' })
      .eq('atbb_status', '専任・公開中');
    
    // Existing filters
    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }
    
    if (priceRange?.min !== undefined) {
      query = query.gte('price', priceRange.min);
    }
    
    if (priceRange?.max !== undefined) {
      query = query.lte('price', priceRange.max);
    }
    
    if (areas && areas.length > 0) {
      const areaConditions = areas.map(area => `distribution_areas.ilike.%${area}%`).join(',');
      query = query.or(areaConditions);
    }
    
    // NEW: Location filter (partial match on address)
    if (location) {
      query = query.ilike('address', `%${location}%`);
    }
    
    // NEW: Building age filter
    if (buildingAgeRange) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      if (buildingAgeRange.min !== undefined) {
        // Calculate maximum construction date for minimum age
        // If minAge is 10, property must be built before (currentYear - 10)
        const maxYear = currentYear - buildingAgeRange.min;
        const maxYearMonth = `${maxYear}-${String(currentMonth).padStart(2, '0')}`;
        query = query.lte('construction_year_month', maxYearMonth);
      }
      
      if (buildingAgeRange.max !== undefined) {
        // Calculate minimum construction date for maximum age
        // If maxAge is 20, property must be built after (currentYear - 20)
        const minYear = currentYear - buildingAgeRange.max;
        const minYearMonth = `${minYear}-${String(currentMonth).padStart(2, '0')}`;
        query = query.gte('construction_year_month', minYearMonth);
      }
    }
    
    // Sort and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }
    
    return { 
      properties: data || [], 
      total: count || 0,
      limit,
      offset 
    };
  } catch (error: any) {
    console.error('Error in getPublicProperties:', error);
    throw new Error(`Failed to fetch public properties: ${error.message}`);
  }
}
```

**NEW: searchByPropertyNumber Method:**

```typescript
// Internal use only - search by property number
async searchByPropertyNumber(propertyNumber: string, exactMatch: boolean = false): Promise<any[]> {
  try {
    let query = this.supabase
      .from('property_listings')
      .select('*');
    
    if (exactMatch) {
      query = query.eq('property_number', propertyNumber);
    } else {
      query = query.ilike('property_number', `%${propertyNumber}%`);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }
    
    return data || [];
  } catch (error: any) {
    console.error('Error in searchByPropertyNumber:', error);
    throw new Error(`Failed to search properties by number: ${error.message}`);
  }
}
```

## Data Models

### Extended PublicProperty Interface

```typescript
interface PublicProperty {
  id: string;
  propertyNumber: string;
  address: string;
  price: number;
  propertyType: PropertyType;
  thumbnailImage: string;
  keyFeatures: string[];
  createdAt: Date;
  
  // NEW: Building age information
  constructionYearMonth?: string;  // Format: "YYYY-MM"
  buildingAge?: number;            // Calculated age in years
}
```

### Database Schema

**Table:** `property_listings`

**Existing Columns:**
- `id` (uuid, primary key)
- `property_number` (text)
- `address` (text)
- `price` (numeric)
- `property_type` (text)
- `construction_year_month` (text) - Format: "YYYY-MM"
- `atbb_status` (text)
- ... other columns

**NEW: Database Indexes for Performance**

```sql
-- Index for location search (partial text matching)
CREATE INDEX IF NOT EXISTS idx_property_listings_address_gin 
ON property_listings USING gin(address gin_trgm_ops);

-- Index for building age filtering
CREATE INDEX IF NOT EXISTS idx_property_listings_construction_year_month 
ON property_listings(construction_year_month);

-- Index for property number search (internal use)
CREATE INDEX IF NOT EXISTS idx_property_listings_property_number_gin 
ON property_listings USING gin(property_number gin_trgm_ops);
```

**Note:** The `gin_trgm_ops` index requires the `pg_trgm` extension for efficient partial text matching.

## Data Transformation

### Building Age Calculation

Building age is calculated from `construction_year_month` field:

```typescript
function calculateBuildingAge(constructionYearMonth: string | null): number | null {
  if (!constructionYearMonth) return null;
  
  const [yearStr, monthStr] = constructionYearMonth.split('-');
  const constructionYear = parseInt(yearStr, 10);
  const constructionMonth = parseInt(monthStr, 10);
  
  if (isNaN(constructionYear) || isNaN(constructionMonth)) return null;
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  let age = currentYear - constructionYear;
  
  // Adjust if current month is before construction month
  if (currentMonth < constructionMonth) {
    age -= 1;
  }
  
  return Math.max(0, age);
}
```

### Location Search Normalization

Location search input is normalized before querying:

```typescript
function normalizeLocationInput(location: string): string {
  return location
    .trim()
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .toLowerCase();         // Case-insensitive
}
```

## Error Handling

### Frontend Error Handling

**Invalid Age Range:**
- Display error message: "最大築年数は最小築年数以上である必要があります"
- Highlight invalid fields with red border
- Prevent API call until corrected

**No Results:**
- Display message: "条件に一致する物件が見つかりませんでした"
- Suggest clearing filters or adjusting criteria
- Show active filters with option to remove individually

**API Errors:**
- Display generic error message
- Log error details for debugging
- Provide retry option

### Backend Error Handling

**Invalid Parameters:**
- Return 400 Bad Request with specific error message
- Validate age range (min <= max, both >= 0)
- Sanitize location input to prevent SQL injection

**Database Errors:**
- Return 500 Internal Server Error
- Log error details
- Don't expose internal error messages to client

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

**Requirement 1: 所在地フィルター**

1.1 WHEN a user enters a location keyword in the search filter, THE Public_Property_Site SHALL display only properties whose address contains the keyword

1.2 WHEN a user enters partial address text, THE Public_Property_Site SHALL perform a partial match search on the property address field

1.3 WHEN a user clears the location filter, THE Public_Property_Site SHALL display all properties again

1.4 THE Public_Property_Site SHALL perform case-insensitive matching for location searches

1.5 WHEN no properties match the location criteria, THE Public_Property_Site SHALL display an appropriate "no results" message

**Requirement 2: 築年数フィルター**

2.1 WHEN a user selects a minimum building age, THE Public_Property_Site SHALL display only properties with building age greater than or equal to the specified value

2.2 WHEN a user selects a maximum building age, THE Public_Property_Site SHALL display only properties with building age less than or equal to the specified value

2.3 WHEN a user specifies both minimum and maximum building age, THE Public_Property_Site SHALL display only properties within the specified range

2.4 THE Public_Property_Site SHALL handle properties with null or missing building age data by excluding them from age-based filtering

2.5 WHEN a user clears the building age filter, THE Public_Property_Site SHALL display all properties again

**Requirement 3: 物件番号フィルター（社内用）**

3.1 WHEN an internal user enters a property number, THE System SHALL search properties by the property_number field

3.2 THE System SHALL perform exact match or partial match search on property numbers

3.3 THE Property_Number filter SHALL NOT be visible on the public-facing property listing page

3.4 THE Property_Number filter SHALL only be accessible through internal admin interfaces or API endpoints

3.5 WHEN a property number is provided, THE System SHALL return the matching property or properties

**Requirement 4: フィルター組み合わせ**

4.1 WHEN a user applies multiple filters simultaneously, THE Public_Property_Site SHALL display only properties that match ALL specified criteria (AND logic)

4.2 WHEN a user changes any filter value, THE Public_Property_Site SHALL immediately update the displayed results

4.3 THE Public_Property_Site SHALL maintain filter state when users navigate between pages of results

4.4 WHEN a user applies filters, THE Public_Property_Site SHALL display the count of matching properties

4.5 THE Public_Property_Site SHALL provide a "clear all filters" button to reset all search criteria at once

**Requirement 5: フィルターUI表示**

5.1 THE Public_Property_Site SHALL display search filters in a prominent location on the property listing page

5.2 THE Public_Property_Site SHALL provide clear labels for each filter field

5.3 WHEN a user interacts with filter controls, THE Public_Property_Site SHALL provide immediate visual feedback

5.4 THE Public_Property_Site SHALL display active filters with visual indicators showing which filters are currently applied

5.5 THE Public_Property_Site SHALL be responsive and work correctly on mobile devices

**Requirement 6: パフォーマンス**

6.1 WHEN a user applies filters, THE Public_Property_Site SHALL return results within 2 seconds under normal load

6.2 THE System SHALL use appropriate database indexes on searchable fields to optimize query performance

6.3 WHEN filtering large datasets, THE System SHALL implement pagination to maintain performance

6.4 THE System SHALL cache frequently accessed filter combinations to improve response times

6.5 WHEN multiple users apply filters simultaneously, THE System SHALL maintain acceptable performance levels

**Requirement 7: データ整合性**

7.1 THE System SHALL validate all filter input values before executing searches

7.2 THE System SHALL sanitize user input to prevent SQL injection or other security vulnerabilities

7.3 WHEN property data is updated, THE System SHALL ensure search indexes are updated accordingly

7.4 THE System SHALL handle edge cases such as null values, empty strings, and special characters gracefully

7.5 THE System SHALL log search queries for monitoring and debugging purposes

### Property Reflection and Redundancy Elimination

After analyzing the acceptance criteria, the following correctness properties have been identified. Redundant or overlapping criteria have been consolidated:

- **AC 1.1, 1.2, 1.4** → Property 1 (Location Filtering with Partial Match)
- **AC 2.1, 2.2, 2.3** → Property 2 (Building Age Range Filtering)
- **AC 2.4** → Property 3 (Null Building Age Handling)
- **AC 3.1, 3.2, 3.5** → Property 4 (Property Number Search)
- **AC 3.3, 3.4** → Property 5 (Property Number Filter Access Control)
- **AC 4.1** → Property 6 (Combined Filters AND Logic)
- **AC 4.2** → Covered by integration tests (not a property)
- **AC 4.3** → Property 7 (Filter State Persistence)
- **AC 4.4** → Property 8 (Result Count Display)
- **AC 1.3, 2.5, 4.5** → Property 9 (Clear Filters Functionality)
- **AC 1.5** → Property 10 (No Results Message)
- **AC 5.1, 5.2, 5.3, 5.4, 5.5** → Covered by UI tests (not properties)
- **AC 6.1, 6.5** → Covered by performance tests (not properties)
- **AC 6.2, 6.3, 6.4** → Implementation requirements (not testable properties)
- **AC 7.1, 7.2** → Property 11 (Input Validation and Sanitization)
- **AC 7.3, 7.4** → Implementation requirements (not testable properties)
- **AC 7.5** → Covered by logging implementation (not a property)

### Correctness Properties

### Property 1: Location Filtering with Partial Match
*For any* set of properties and location search term, when filtering by location, all returned properties should have addresses that contain the search term (case-insensitive partial match).
**Validates: Requirements 1.1, 1.2, 1.4**

### Property 2: Building Age Range Filtering
*For any* set of properties with construction dates and age range (min, max), when filtering by building age, all returned properties should have building ages within the specified range (inclusive).
**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Null Building Age Handling
*For any* set of properties including those with null/missing construction dates, when filtering by building age, properties with null construction dates should be excluded from results.
**Validates: Requirement 2.4**

### Property 4: Property Number Search
*For any* property number search term and match type (exact/partial), when searching by property number, all returned properties should have property numbers that match according to the specified match type.
**Validates: Requirements 3.1, 3.2, 3.5**

### Property 5: Property Number Filter Access Control
*For any* request to the property number search endpoint, the request should be rejected with 401 Unauthorized if authentication credentials are not provided.
**Validates: Requirements 3.3, 3.4**

### Property 6: Combined Filters AND Logic
*For any* combination of multiple filter criteria, when applying filters simultaneously, all returned properties should satisfy ALL specified criteria (AND logic, not OR).
**Validates: Requirement 4.1**

### Property 7: Filter State Persistence
*For any* active filter state and page navigation action, when navigating between result pages, the filter state should be preserved and applied to the new page.
**Validates: Requirement 4.3**

### Property 8: Result Count Display
*For any* filter combination, when filters are applied, the displayed result count should match the actual number of properties that satisfy the filter criteria.
**Validates: Requirement 4.4**

### Property 9: Clear Filters Functionality
*For any* active filter state, when the clear filters action is triggered, all filter values should be reset to their default (empty) state and all properties should be displayed.
**Validates: Requirements 1.3, 2.5, 4.5**

### Property 10: No Results Message
*For any* filter combination that yields zero results, the system should display an appropriate "no results" message instead of an empty list.
**Validates: Requirement 1.5**

### Property 11: Input Validation and Sanitization
*For any* user input to filter fields, the input should be validated and sanitized before being used in database queries to prevent SQL injection and other security vulnerabilities.
**Validates: Requirements 7.1, 7.2**

## Testing Strategy

### Property-Based Tests

Each correctness property will be implemented with property-based testing (minimum 100 iterations):

**Property 1 Test: Location Filtering with Partial Match**
```typescript
// Feature: public-property-search-filters, Property 1: Location Filtering with Partial Match
test('location filter returns only properties with matching addresses (case-insensitive)', () => {
  fc.assert(
    fc.property(
      fc.array(propertyWithAddressGenerator()),
      fc.string({ minLength: 1, maxLength: 20 }),
      (properties, searchTerm) => {
        const filtered = filterByLocation(properties, searchTerm);
        return filtered.every(p => 
          p.address.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 2 Test: Building Age Range Filtering**
```typescript
// Feature: public-property-search-filters, Property 2: Building Age Range Filtering
test('age filter returns only properties within specified range', () => {
  fc.assert(
    fc.property(
      fc.array(propertyWithConstructionDateGenerator()),
      fc.integer({ min: 0, max: 50 }),
      fc.integer({ min: 0, max: 50 }),
      (properties, minAge, maxAge) => {
        fc.pre(minAge <= maxAge);  // Precondition: valid range
        
        const filtered = filterByBuildingAge(properties, minAge, maxAge);
        return filtered.every(p => {
          const age = calculateBuildingAge(p.construction_year_month);
          return age !== null && age >= minAge && age <= maxAge;
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 3 Test: Null Building Age Handling**
```typescript
// Feature: public-property-search-filters, Property 3: Null Building Age Handling
test('properties with null construction dates are excluded from age filtering', () => {
  fc.assert(
    fc.property(
      fc.array(propertyWithOptionalConstructionDateGenerator()),
      fc.integer({ min: 0, max: 50 }),
      fc.integer({ min: 0, max: 50 }),
      (properties, minAge, maxAge) => {
        fc.pre(minAge <= maxAge);
        
        const filtered = filterByBuildingAge(properties, minAge, maxAge);
        return filtered.every(p => p.construction_year_month !== null);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 4 Test: Property Number Search**
```typescript
// Feature: public-property-search-filters, Property 4: Property Number Search
test('property number search returns matching properties', () => {
  fc.assert(
    fc.property(
      fc.array(propertyWithNumberGenerator()),
      fc.string({ minLength: 2, maxLength: 8 }),
      fc.boolean(),
      (properties, searchTerm, exactMatch) => {
        const results = searchByPropertyNumber(properties, searchTerm, exactMatch);
        
        if (exactMatch) {
          return results.every(p => p.property_number === searchTerm);
        } else {
          return results.every(p => 
            p.property_number.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 5 Test: Property Number Filter Access Control**
```typescript
// Feature: public-property-search-filters, Property 5: Property Number Filter Access Control
test('property number search requires authentication', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 2, maxLength: 8 }),
      async (propertyNumber) => {
        const response = await fetch('/api/internal/properties/search', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // No authentication token
        });
        return response.status === 401;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 6 Test: Combined Filters AND Logic**
```typescript
// Feature: public-property-search-filters, Property 6: Combined Filters AND Logic
test('multiple filters are combined with AND logic', () => {
  fc.assert(
    fc.property(
      fc.array(propertyGenerator()),
      filterCombinationGenerator(),
      (properties, filters) => {
        const filtered = applyFilters(properties, filters);
        return filtered.every(p => matchesAllFilters(p, filters));
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 7 Test: Filter State Persistence**
```typescript
// Feature: public-property-search-filters, Property 7: Filter State Persistence
test('filter state persists across page navigation', () => {
  fc.assert(
    fc.property(
      filterStateGenerator(),
      fc.integer({ min: 1, max: 10 }),
      (filterState, newPage) => {
        const stateBeforeNav = { ...filterState, page: 1 };
        const stateAfterNav = navigateToPage(stateBeforeNav, newPage);
        
        // All filter values should be preserved except page number
        return (
          stateAfterNav.location === stateBeforeNav.location &&
          stateAfterNav.minAge === stateBeforeNav.minAge &&
          stateAfterNav.maxAge === stateBeforeNav.maxAge &&
          stateAfterNav.propertyType === stateBeforeNav.propertyType &&
          stateAfterNav.page === newPage
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 8 Test: Result Count Display**
```typescript
// Feature: public-property-search-filters, Property 8: Result Count Display
test('displayed result count matches actual filtered results', () => {
  fc.assert(
    fc.property(
      fc.array(propertyGenerator()),
      filterCombinationGenerator(),
      (properties, filters) => {
        const filtered = applyFilters(properties, filters);
        const displayedCount = getDisplayedResultCount(filters);
        return displayedCount === filtered.length;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 9 Test: Clear Filters Functionality**
```typescript
// Feature: public-property-search-filters, Property 9: Clear Filters Functionality
test('clear filters resets all filter values to default', () => {
  fc.assert(
    fc.property(
      filterStateGenerator(),
      (filterState) => {
        const clearedState = clearAllFilters(filterState);
        return (
          clearedState.location === undefined &&
          clearedState.minAge === undefined &&
          clearedState.maxAge === undefined &&
          clearedState.propertyType === undefined &&
          clearedState.minPrice === undefined &&
          clearedState.maxPrice === undefined &&
          clearedState.areas === undefined
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 10 Test: No Results Message**
```typescript
// Feature: public-property-search-filters, Property 10: No Results Message
test('no results message displayed when filter yields zero results', () => {
  fc.assert(
    fc.property(
      fc.array(propertyGenerator()),
      filterCombinationGenerator(),
      (properties, filters) => {
        const filtered = applyFilters(properties, filters);
        const hasNoResultsMessage = checkNoResultsMessage(filtered);
        
        if (filtered.length === 0) {
          return hasNoResultsMessage === true;
        } else {
          return hasNoResultsMessage === false;
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 11 Test: Input Validation and Sanitization**
```typescript
// Feature: public-property-search-filters, Property 11: Input Validation and Sanitization
test('malicious input is sanitized before database query', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant("'; DROP TABLE properties; --"),
        fc.constant("<script>alert('xss')</script>"),
        fc.constant("../../../etc/passwd"),
        fc.string()
      ),
      (maliciousInput) => {
        const sanitized = sanitizeLocationInput(maliciousInput);
        // Should not contain SQL injection patterns
        return (
          !sanitized.includes("';") &&
          !sanitized.includes("--") &&
          !sanitized.includes("DROP") &&
          !sanitized.includes("<script>") &&
          !sanitized.includes("../")
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Tests

**Frontend:**
- Filter component rendering
- Input validation (age range)
- Debounced location search
- Filter state management
- Clear filters functionality

**Backend:**
- Query parameter parsing and validation
- Location search query building
- Building age calculation
- Property number search (exact and partial)
- Error handling for invalid inputs

### Integration Tests

- End-to-end filter application
- API endpoint with various filter combinations
- Database query performance
- Cache behavior with new filters

## Performance Optimization

### Database Optimization

**Indexes:**
1. GIN index on `address` for fast partial text search
2. B-tree index on `construction_year_month` for range queries
3. GIN index on `property_number` for internal searches

**Query Optimization:**
- Use Supabase's built-in query optimization
- Limit result set size (max 100 per request)
- Implement pagination for large result sets

### Frontend Optimization

**Debouncing:**
- Location search input debounced to 500ms
- Prevents excessive API calls while typing

**Caching:**
- React Query caches filter results
- Cache invalidation on filter changes
- Stale-while-revalidate strategy

**Performance Targets:**
- Location search response: < 1 second
- Building age filter response: < 500ms
- Combined filters response: < 2 seconds

## Security Considerations

### Input Validation

**Location Search:**
- Sanitize input to prevent SQL injection
- Limit input length (max 100 characters)
- Remove special characters that could be malicious

**Building Age:**
- Validate numeric input (integer, >= 0)
- Validate range (min <= max)
- Reject negative values

**Property Number (Internal):**
- Require authentication
- Validate format (alphanumeric, max 20 characters)
- Rate limit to prevent abuse

### Access Control

**Public Filters:**
- Location and building age filters are public
- No authentication required
- Rate limiting applied (100 requests per minute per IP)

**Internal Filters:**
- Property number search requires authentication
- Only accessible to authenticated employees
- Audit log for internal searches

## Accessibility

### Filter Controls

**Location Search:**
- Label: "所在地で検索"
- ARIA label: "物件の所在地を入力してください"
- Keyboard accessible
- Clear button with ARIA label

**Building Age:**
- Labels: "築年数（最小）", "築年数（最大）"
- ARIA labels for screen readers
- Keyboard navigation between fields
- Error messages announced to screen readers

**Filter Results:**
- Announce result count to screen readers
- Focus management when results update
- Loading state announced

## Future Enhancements

1. **Advanced Location Search:**
   - Autocomplete suggestions
   - Map-based location selection
   - Distance-based search (radius)

2. **Saved Searches:**
   - Save filter combinations
   - Email alerts for new matching properties

3. **More Building Filters:**
   - Building structure type
   - Number of rooms
   - Parking availability

4. **Smart Filters:**
   - Popular filter combinations
   - Recommended filters based on user behavior

5. **Filter Analytics:**
   - Track most used filters
   - Optimize UI based on usage patterns
