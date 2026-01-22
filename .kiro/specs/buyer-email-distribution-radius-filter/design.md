# Design Document

## Overview

This feature enhances the existing Gmail distribution functionality by implementing a sophisticated multi-criteria filtering system for buyer email distribution. The system will automatically identify and include buyers who meet geographic proximity, distribution preference, status, and price range criteria when sending price reduction emails from the property detail page.

### Geographic Matching Logic (Key Clarification)

**Important:** The system does NOT extract city/ward from the address field. Instead:

1. **Property Location Source**: The property's Google Map URL from the "GoogleMap" field in property details
2. **Area Location Source**: Predefined area map URLs (①-⑯) stored in the area_map_config table
3. **Matching Process**:
   - Extract coordinates from the property's Google Map URL
   - Extract coordinates from each area map URL (①-⑯)
   - Calculate distance between property coordinates and each area map coordinates
   - If distance ≤ 2KM, buyers with that area number in their "★エリア" field are eligible
4. **Special Cases**:
   - ㊵ (大分市全部): Matches all properties in Oita City
   - ㊶ (別府市全部): Matches all properties in Beppu City

**Example**: 
- Property has Google Map URL pointing to coordinates (33.2382, 131.6126)
- Area ① has Google Map URL pointing to coordinates (33.2400, 131.6150)
- Distance calculated: 0.3km
- Result: Buyers with "①" in their ★エリア field are geographically eligible

The design leverages existing services (BuyerDistributionService, GeolocationService) and extends them to support:
- Multiple area map configurations (①-⑯, ㊵, ㊶)
- 2KM radius filtering between property Google Map URL and area map URLs
- Latest status filtering (excluding "買付" and "D")
- Price range matching with flexible handling of unspecified ranges

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PropertyDetailPage                                   │  │
│  │    └─ GmailDistributionButton                        │  │
│  │         └─ EmailTemplateSelector                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  gmailDistributionService                            │  │
│  │    - fetchQualifiedBuyerEmails()                     │  │
│  │    - generateGmailUrl()                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/property-listings/:propertyNumber/             │  │
│  │       distribution-buyers-enhanced                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  EnhancedBuyerDistributionService                    │  │
│  │    - getQualifiedBuyersWithAllCriteria()             │  │
│  │    - filterByGeography()                             │  │
│  │    - filterByDistributionFlag()                      │  │
│  │    - filterByLatestStatus()                          │  │
│  │    - filterByPriceRange()                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  EnhancedGeolocationService                          │  │
│  │    - getAreaMapCoordinates()                         │  │
│  │    - isWithinRadiusOfAnyArea()                       │  │
│  │    - isCityWideMatch()                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AreaMapConfigService                                │  │
│  │    - loadAreaMaps()                                  │  │
│  │    - getCoordinatesForArea()                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                       │
│  - buyers table                                              │
│  - property_listings table                                   │
│  - area_map_config table (new)                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. EnhancedBuyerDistributionService

Extends the existing BuyerDistributionService with comprehensive filtering logic.

```typescript
interface EnhancedFilterCriteria {
  propertyNumber: string;
  propertyType: string;
  propertyPrice: number;
  propertyCity?: string;
}

interface FilteredBuyer {
  buyer_number: string;
  email: string;
  desired_area: string;
  distribution_type: string;
  latest_status: string;
  price_range_min?: number;
  price_range_max?: number;
  filterResults: {
    geography: boolean;
    distribution: boolean;
    status: boolean;
    priceRange: boolean;
  };
}

interface EnhancedBuyerFilterResult {
  emails: string[];
  count: number;
  totalBuyers: number;
  filteredBuyers: FilteredBuyer[];
  appliedFilters: {
    geographyFilter: boolean;
    distributionFilter: boolean;
    statusFilter: boolean;
    priceRangeFilter: boolean;
  };
}
```


### 2. EnhancedGeolocationService

Extends GeolocationService to support multiple area maps and city-wide matching.

```typescript
interface AreaMapEntry {
  areaNumber: string;  // "①", "②", etc.
  googleMapUrl: string;
  coordinates: Coordinates;
  cityName?: string;   // For ㊵, ㊶
}

interface GeographicMatchResult {
  matched: boolean;
  matchedAreas: string[];
  matchType: 'radius' | 'city-wide' | 'none';
}
```

### 3. AreaMapConfigService

Manages the configuration of area maps and their coordinates.

```typescript
interface AreaMapConfig {
  areaNumber: string;
  googleMapUrl: string;
  cityName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Frontend Components

**GmailDistributionButton Enhancement:**
- Add loading state during buyer filtering
- Display count of qualifying buyers
- Show filter breakdown (optional)
- Handle errors gracefully

**BuyerFilterSummaryModal (New):**
- Display list of qualifying buyers
- Show which criteria each buyer met/failed
- Allow manual addition/removal of emails
- Confirm before opening Gmail

## Data Models

### Database Schema Changes

#### New Table: area_map_config

```sql
CREATE TABLE area_map_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_number VARCHAR(10) NOT NULL UNIQUE,
  google_map_url TEXT NOT NULL,
  city_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_area_map_config_active ON area_map_config(is_active);
CREATE INDEX idx_area_map_config_city ON area_map_config(city_name) WHERE city_name IS NOT NULL;
```

#### Initial Data Population

```sql
INSERT INTO area_map_config (area_number, google_map_url) VALUES
  ('①', 'https://maps.app.goo.gl/6SUp2oApoATE4R336'),
  ('②', 'https://maps.app.goo.gl/3tXJJ3zPDhAXnxJk9'),
  ('③', 'https://maps.app.goo.gl/9CvuwKdgGCpM7kiT7'),
  ('④', 'https://maps.app.goo.gl/FAh59DdyR3Xrpn2d7'),
  ('⑥', 'https://maps.app.goo.gl/LWcdvysji8MzrC4a6'),
  ('⑦', 'https://maps.app.goo.gl/UMvP5iD5ttYvpz9i8'),
  ('⑧', 'https://maps.app.goo.gl/4UJ6Dcfniv5HnJV67'),
  ('⑨', 'https://maps.app.goo.gl/RFxMmCWuqNBw1UR87'),
  ('⑩', 'https://maps.app.goo.gl/LQrdiaZjij6R69fx9'),
  ('⑪', 'https://maps.app.goo.gl/Lia3s1spu2giyaBJ9'),
  ('⑫', 'https://maps.app.goo.gl/qkaDsYW4HFpx9x8x9'),
  ('⑬', 'https://maps.app.goo.gl/hPndBk6HxPvdfFBz9'),
  ('⑭', 'https://maps.app.goo.gl/ZWYbTxb2Dnq6B6ka8'),
  ('⑮', 'https://maps.app.goo.gl/rAMak435w8Q33qJo8'),
  ('㊵', NULL, '大分市'),
  ('㊶', NULL, '別府市');
```

### Buyer Table Fields (Existing)

The following fields from the buyers table will be used:
- `buyer_number`: Unique identifier
- `email`: Email address for distribution
- `desired_area`: Preferred area (contains area numbers like ①②③)
- `distribution_type`: Distribution flag (要/不要)
- `latest_status`: Latest buyer status (★最新状況)
- `property_type`: Type of property interested in
- `price_range_min`: Minimum price range (optional)
- `price_range_max`: Maximum price range (optional)
- `price_range_text`: Text representation of price range

### Property Listing Fields (Existing)

- `property_number`: Unique identifier
- `google_map_url`: Property location URL
- `address`: Property address
- `city`: City name
- `property_type`: Type of property
- `price`: Property price


## Filtering Logic

### Geographic Filtering Algorithm

```typescript
function filterByGeography(
  propertyGoogleMapUrl: string,
  propertyCity: string,
  buyer: Buyer,
  areaMapConfigs: AreaMapConfig[]
): GeographicMatchResult {
  // Extract coordinates from property's Google Map URL
  const propertyCoords = extractCoordinatesFromGoogleMapUrl(propertyGoogleMapUrl);
  
  if (!propertyCoords) {
    // If we can't extract property coordinates, fall back to city-wide matching only
    return fallbackToCityWideMatching(propertyCity, buyer, areaMapConfigs);
  }
  
  const buyerAreas = extractAreaNumbers(buyer.desired_area);
  const matchedAreas: string[] = [];
  
  for (const areaNumber of buyerAreas) {
    const areaConfig = areaMapConfigs.find(c => c.areaNumber === areaNumber);
    
    if (!areaConfig) continue;
    
    // City-wide match (㊵, ㊶)
    if (areaConfig.cityName) {
      if (propertyCity === areaConfig.cityName) {
        matchedAreas.push(areaNumber);
      }
      continue;
    }
    
    // Radius match (①-⑮)
    // Extract coordinates from the area's Google Map URL
    if (areaConfig.googleMapUrl) {
      const areaCoords = extractCoordinatesFromGoogleMapUrl(areaConfig.googleMapUrl);
      
      if (areaCoords) {
        const distance = calculateDistance(propertyCoords, areaCoords);
        if (distance <= 2.0) {  // 2KM radius
          matchedAreas.push(areaNumber);
        }
      }
    }
  }
  
  return {
    matched: matchedAreas.length > 0,
    matchedAreas,
    matchType: matchedAreas.some(a => ['㊵', '㊶'].includes(a)) 
      ? 'city-wide' 
      : matchedAreas.length > 0 
        ? 'radius' 
        : 'none'
  };
}
```

### Distribution Flag Filtering

```typescript
function filterByDistributionFlag(buyer: Buyer): boolean {
  return buyer.distribution_type?.trim() === '要';
}
```

### Latest Status Filtering

```typescript
function filterByLatestStatus(buyer: Buyer): boolean {
  const status = buyer.latest_status || '';
  
  // Exclude if contains "買付" or "D"
  if (status.includes('買付') || status.includes('D')) {
    return false;
  }
  
  return true;
}
```

### Price Range Filtering

```typescript
function filterByPriceRange(
  propertyPrice: number,
  propertyType: string,
  buyer: Buyer
): boolean {
  // If buyer's property type doesn't match, exclude
  if (buyer.property_type && buyer.property_type !== propertyType) {
    return false;
  }
  
  // If price range is "指定なし" or empty, include
  if (!buyer.price_range_text || 
      buyer.price_range_text.includes('指定なし') ||
      buyer.price_range_text.trim() === '') {
    return true;
  }
  
  // If specific range is set, check if property price falls within
  if (buyer.price_range_min !== null && buyer.price_range_max !== null) {
    return propertyPrice >= buyer.price_range_min && 
           propertyPrice <= buyer.price_range_max;
  }
  
  // If only min is set
  if (buyer.price_range_min !== null) {
    return propertyPrice >= buyer.price_range_min;
  }
  
  // If only max is set
  if (buyer.price_range_max !== null) {
    return propertyPrice <= buyer.price_range_max;
  }
  
  // Default: include if no clear range specified
  return true;
}
```

### Combined Filtering

```typescript
async function getQualifiedBuyersWithAllCriteria(
  criteria: EnhancedFilterCriteria
): Promise<EnhancedBuyerFilterResult> {
  // 1. Fetch property details (including google_map_url field)
  const property = await fetchProperty(criteria.propertyNumber);
  
  // 2. Fetch all buyers
  const allBuyers = await fetchAllBuyers();
  
  // 3. Load area map configurations (with their Google Map URLs)
  const areaMapConfigs = await loadAreaMapConfigs();
  
  // 4. Apply filters sequentially
  const filteredBuyers = allBuyers.map(buyer => {
    // Pass the property's Google Map URL (not extracted coordinates)
    // The filterByGeography function will extract coordinates from both
    // the property URL and each area map URL, then calculate distances
    const geoMatch = filterByGeography(
      property.google_map_url,  // Property's Google Map URL from "GoogleMap" field
      property.city, 
      buyer, 
      areaMapConfigs  // Contains area map URLs (①-⑯)
    );
    const distMatch = filterByDistributionFlag(buyer);
    const statusMatch = filterByLatestStatus(buyer);
    const priceMatch = filterByPriceRange(
      property.price, 
      property.property_type, 
      buyer
    );
    
    return {
      ...buyer,
      filterResults: {
        geography: geoMatch.matched,
        distribution: distMatch,
        status: statusMatch,
        priceRange: priceMatch
      },
      qualifies: geoMatch.matched && distMatch && statusMatch && priceMatch
    };
  });
  
  // 5. Extract qualified buyers
  const qualifiedBuyers = filteredBuyers.filter(b => b.qualifies);
  const emails = qualifiedBuyers.map(b => b.email).filter(e => e);
  
  return {
    emails: Array.from(new Set(emails)),
    count: emails.length,
    totalBuyers: allBuyers.length,
    filteredBuyers,
    appliedFilters: {
      geographyFilter: true,
      distributionFilter: true,
      statusFilter: true,
      priceRangeFilter: true
    }
  };
}
```


## Error Handling

### Backend Error Scenarios

1. **Property Not Found**
   - Return 404 with clear error message
   - Log property number for debugging

2. **Invalid Google Maps URL**
   - Log warning
   - Continue with city-wide matching only
   - Return partial results with warning flag

3. **Area Map Configuration Missing**
   - Log error
   - Skip that area in filtering
   - Continue with available areas

4. **Database Connection Errors**
   - Return 500 with generic error message
   - Log detailed error for debugging
   - Implement retry logic for transient failures

5. **Coordinate Extraction Failure**
   - Log warning with URL
   - Fall back to city-wide matching if available
   - Continue processing

### Frontend Error Handling

1. **API Request Failure**
   - Display user-friendly error message
   - Provide retry option
   - Log error details to console

2. **No Qualifying Buyers**
   - Display informative message
   - Suggest manual email entry
   - Allow proceeding with empty BCC

3. **URL Length Exceeded**
   - Warn user about truncated recipient list
   - Display count of included/excluded recipients
   - Offer alternative (copy to clipboard)

4. **Gmail Window Blocked**
   - Detect popup blocker
   - Provide instructions to allow popups
   - Offer fallback: copy URL to clipboard

## Testing Strategy

### Unit Tests

1. **GeolocationService Tests**
   - Test coordinate extraction from various URL formats
   - Test distance calculation accuracy
   - Test radius checking with edge cases (exactly 3km, 2.99km, 3.01km)

2. **AreaMapConfigService Tests**
   - Test loading configurations
   - Test caching mechanism
   - Test handling of missing/invalid data

3. **Filtering Logic Tests**
   - Test each filter independently
   - Test combined filtering
   - Test edge cases (empty fields, null values, special characters)

4. **Price Range Matching Tests**
   - Test "指定なし" handling
   - Test empty field handling
   - Test boundary conditions
   - Test partial range specifications

### Integration Tests

1. **End-to-End Buyer Filtering**
   - Create test property with known location
   - Create test buyers with various criteria
   - Verify correct buyers are selected

2. **API Endpoint Tests**
   - Test successful requests
   - Test error scenarios
   - Test response format

3. **Gmail URL Generation**
   - Test with various buyer counts
   - Test URL length limits
   - Test special characters in emails

### Manual Testing Checklist

1. **Geographic Filtering**
   - [ ] Verify ①-⑮ area radius matching
   - [ ] Verify ㊵ (大分市) city-wide matching
   - [ ] Verify ㊶ (別府市) city-wide matching
   - [ ] Test property at exactly 3km boundary

2. **Status Filtering**
   - [ ] Verify "買付" exclusion
   - [ ] Verify "D" exclusion
   - [ ] Verify other statuses are included

3. **Price Range Filtering**
   - [ ] Test "指定なし" inclusion
   - [ ] Test empty price range inclusion
   - [ ] Test within-range matching
   - [ ] Test out-of-range exclusion

4. **UI/UX**
   - [ ] Verify loading states
   - [ ] Verify error messages
   - [ ] Verify buyer count display
   - [ ] Verify Gmail opens correctly


## Performance Considerations

### Optimization Strategies

1. **Area Map Configuration Caching**
   - Cache area map configurations in memory
   - Refresh cache on configuration updates
   - TTL: 1 hour (configurable)

2. **Buyer Query Optimization**
   - Use database indexes on frequently queried fields
   - Fetch only necessary fields
   - Consider pagination for large buyer lists

3. **Coordinate Calculation**
   - Pre-calculate and cache area coordinates
   - Batch distance calculations
   - Use spatial database functions if available

4. **Frontend Optimization**
   - Debounce API calls
   - Show loading indicators
   - Cache results for same property (session-based)

### Expected Performance

- **Buyer Filtering**: < 2 seconds for 1000 buyers
- **Coordinate Extraction**: < 100ms per URL (property URL + up to 15 area URLs)
- **Distance Calculation**: < 1ms per calculation (property vs each area)
- **API Response Time**: < 3 seconds total

### Coordinate Extraction Strategy

The system will extract coordinates from Google Maps URLs using one of these methods:
1. Parse the URL for embedded coordinates (e.g., `@33.2382,131.6126`)
2. Use Google Maps API to resolve shortened URLs (maps.app.goo.gl) to full URLs with coordinates
3. Cache extracted coordinates to avoid repeated API calls

## Security Considerations

1. **Email Address Protection**
   - Validate email formats
   - Sanitize email addresses
   - Rate limit API requests

2. **Data Access Control**
   - Verify user authentication
   - Check property access permissions
   - Log access attempts

3. **Input Validation**
   - Validate property numbers
   - Sanitize URL parameters
   - Prevent SQL injection

4. **Configuration Management**
   - Restrict area map configuration updates to admins
   - Audit configuration changes
   - Validate Google Maps URLs

## Deployment Strategy

### Phase 1: Database Migration
1. Create area_map_config table
2. Populate initial data
3. Verify data integrity

### Phase 2: Backend Services
1. Deploy AreaMapConfigService
2. Deploy EnhancedGeolocationService
3. Deploy EnhancedBuyerDistributionService
4. Add new API endpoint

### Phase 3: Frontend Updates
1. Update GmailDistributionButton
2. Add BuyerFilterSummaryModal (optional)
3. Update gmailDistributionService

### Phase 4: Testing & Validation
1. Run integration tests
2. Perform manual testing
3. Validate with real data

### Phase 5: Monitoring
1. Monitor API response times
2. Track error rates
3. Collect user feedback

## Configuration Management

### Environment Variables

```env
# Geolocation settings
RADIUS_FILTER_KM=3
ENABLE_CITY_WIDE_MATCHING=true

# Performance settings
AREA_MAP_CACHE_TTL_SECONDS=3600
MAX_BUYERS_PER_REQUEST=1000

# Feature flags
ENABLE_ENHANCED_FILTERING=true
ENABLE_FILTER_SUMMARY_MODAL=false
```

### Area Map Configuration UI (Future Enhancement)

Admin interface for managing area maps:
- Add/edit/delete area configurations
- Update Google Maps URLs
- Enable/disable specific areas
- View area coverage on map
- Test radius calculations

## Future Enhancements

1. **Advanced Geographic Matching**
   - Polygon-based area definitions
   - Multiple radius options (1km, 3km, 5km)
   - Custom area shapes

2. **Smart Filtering**
   - Machine learning-based buyer matching
   - Historical engagement analysis
   - Predictive buyer interest scoring

3. **Batch Email Management**
   - Save buyer lists for reuse
   - Schedule email distributions
   - Track email open rates

4. **Analytics Dashboard**
   - Filter effectiveness metrics
   - Buyer engagement statistics
   - Geographic distribution visualization

5. **Mobile Optimization**
   - Responsive design improvements
   - Native app integration
   - Offline capability

## API Documentation

### GET /api/property-listings/:propertyNumber/distribution-buyers-enhanced

Retrieves qualified buyer emails based on comprehensive filtering criteria.

**Parameters:**
- `propertyNumber` (path): Property identifier

**Query Parameters:**
- `includeDetails` (optional, boolean): Include detailed filter results
- `maxResults` (optional, number): Limit number of results

**Response:**
```json
{
  "emails": ["buyer1@example.com", "buyer2@example.com"],
  "count": 2,
  "totalBuyers": 150,
  "appliedFilters": {
    "geographyFilter": true,
    "distributionFilter": true,
    "statusFilter": true,
    "priceRangeFilter": true
  },
  "filteredBuyers": [
    {
      "buyer_number": "B001",
      "email": "buyer1@example.com",
      "desired_area": "①②③",
      "filterResults": {
        "geography": true,
        "distribution": true,
        "status": true,
        "priceRange": true
      }
    }
  ]
}
```

**Error Responses:**
- `404`: Property not found
- `500`: Server error
- `400`: Invalid parameters

