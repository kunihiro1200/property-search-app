# Design Document

## Overview

This feature provides comprehensive data validation and diagnostic tools to ensure properties have all necessary data for accurate distribution area calculation. The system will identify missing Google Map URLs and city fields, automatically extract city names from addresses, and verify that the distribution area calculation logic correctly identifies all areas within a 10km radius.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Validation Layer                          │
├─────────────────────────────────────────────────────────────┤
│  PropertyDataValidator                                       │
│  - validateGoogleMapUrl()                                    │
│  - validateCityField()                                       │
│  - validatePropertyListing()                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Extraction Layer                          │
├─────────────────────────────────────────────────────────────┤
│  CityNameExtractor                                           │
│  - extractCityFromAddress()                                  │
│  - normalizeCityName()                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Calculation Layer                         │
├─────────────────────────────────────────────────────────────┤
│  PropertyDistributionAreaCalculator (Enhanced)               │
│  - calculateDistributionAreas()                              │
│  - verifyRadiusCalculation()                                 │
│  - debugDistanceCalculation()                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Diagnostic Layer                          │
├─────────────────────────────────────────────────────────────┤
│  DataIntegrityDiagnosticService (Enhanced)                   │
│  - diagnoseProperty()                                        │
│  - generateValidationReport()                                │
│  - testDistributionCalculation()                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Warning Layer                          │
├─────────────────────────────────────────────────────────────┤
│  PropertyDetailWarnings (React Component)                    │
│  - MissingGoogleMapUrlWarning                                │
│  - MissingCityFieldWarning                                   │
│  - IncompleteDistributionAreasWarning                        │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. PropertyDataValidator

Validates property data completeness for distribution area calculation.

```typescript
interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
  errors: string[];
}

interface PropertyValidationReport {
  propertyNumber: string;
  sellerName: string;
  address: string;
  hasGoogleMapUrl: boolean;
  hasCityField: boolean;
  hasPropertyListing: boolean;
  distributionAreas: string[];
  issues: string[];
}

class PropertyDataValidator {
  validateProperty(property: Property): ValidationResult;
  validateGoogleMapUrl(url: string | null): boolean;
  validateCityField(city: string | null): boolean;
  validatePropertyListing(propertyId: string): Promise<boolean>;
  generateReport(properties: Property[]): PropertyValidationReport[];
}
```

### 2. CityNameExtractor

Extracts city names from Japanese addresses.

```typescript
interface CityExtractionResult {
  city: string | null;
  confidence: 'high' | 'medium' | 'low';
  extractedFrom: string;
}

class CityNameExtractor {
  extractCityFromAddress(address: string): CityExtractionResult;
  normalizeCityName(city: string): string;
  batchExtractCities(properties: Property[]): Promise<Map<string, CityExtractionResult>>;
}
```

**City Extraction Patterns:**
- `大分市` → Extract "大分市"
- `別府市` → Extract "別府市"
- `中津市` → Extract "中津市"
- `大分県大分市田尻北3-14` → Extract "大分市"
- `大分県別府市北浜1-1-1` → Extract "別府市"

### 3. Enhanced PropertyDistributionAreaCalculator

Enhanced version with debugging and verification capabilities.

```typescript
interface DistributionAreaDebugInfo {
  propertyCoords: Coordinates | null;
  cityField: string | null;
  areaConfigs: AreaMapConfig[];
  distanceCalculations: Array<{
    areaNumber: string;
    areaCoords: Coordinates;
    distance: number;
    withinRadius: boolean;
  }>;
  cityWideMatches: string[];
  finalAreas: string[];
}

class PropertyDistributionAreaCalculator {
  // Existing methods
  calculateDistributionAreas(googleMapUrl: string | null, city?: string | null): Promise<DistributionAreaCalculationResult>;
  
  // New methods for validation
  calculateWithDebugInfo(googleMapUrl: string | null, city?: string | null): Promise<{
    result: DistributionAreaCalculationResult;
    debugInfo: DistributionAreaDebugInfo;
  }>;
  
  verifyRadiusCalculation(propertyCoords: Coordinates, expectedAreas: string[]): Promise<{
    correct: boolean;
    missing: string[];
    unexpected: string[];
  }>;
  
  testWithKnownLocation(address: string, expectedAreas: string[]): Promise<{
    passed: boolean;
    actual: string[];
    expected: string[];
    discrepancies: string[];
  }>;
}
```

### 4. Enhanced DataIntegrityDiagnosticService

Extended diagnostic service with distribution area validation.

```typescript
interface DistributionAreaDiagnostic {
  propertyNumber: string;
  address: string;
  googleMapUrl: string | null;
  city: string | null;
  currentDistributionAreas: string[];
  calculatedDistributionAreas: string[];
  discrepancy: boolean;
  missingAreas: string[];
  unexpectedAreas: string[];
  distanceDebugInfo?: DistributionAreaDebugInfo;
}

class DataIntegrityDiagnosticService {
  // Existing methods
  diagnoseProperty(propertyNumber: string): Promise<PropertyDiagnostic>;
  
  // New methods
  diagnoseDistributionAreas(propertyNumber: string): Promise<DistributionAreaDiagnostic>;
  validateAllDistributionAreas(): Promise<{
    total: number;
    correct: number;
    incorrect: number;
    missing: number;
    diagnostics: DistributionAreaDiagnostic[];
  }>;
  
  generateDistributionAreaReport(): Promise<{
    summary: {
      totalProperties: number;
      propertiesWithGoogleMapUrl: number;
      propertiesWithCity: number;
      propertiesWithCompleteData: number;
      propertiesWithIncorrectAreas: number;
    };
    issues: Array<{
      propertyNumber: string;
      issueType: 'missing_url' | 'missing_city' | 'incorrect_calculation';
      details: string;
    }>;
  }>;
}
```

### 5. UI Warning Components

React components to display warnings in property detail pages.

```typescript
interface WarningProps {
  property: Property;
  onFixClick?: () => void;
}

const MissingGoogleMapUrlWarning: React.FC<WarningProps> = ({ property, onFixClick }) => {
  return (
    <Alert severity="warning">
      <AlertTitle>Google Map URLが未設定です</AlertTitle>
      距離ベースの配信エリア(①-⑦)を計算できません。
      Google Map URLを設定してください。
      {onFixClick && <Button onClick={onFixClick}>設定する</Button>}
    </Alert>
  );
};

const MissingCityFieldWarning: React.FC<WarningProps> = ({ property, onFixClick }) => {
  return (
    <Alert severity="warning">
      <AlertTitle>市フィールドが未設定です</AlertTitle>
      市全体エリア(㊵大分市、㊶別府市)を計算できません。
      市フィールドを設定してください。
      {onFixClick && <Button onClick={onFixClick}>自動抽出</Button>}
    </Alert>
  );
};

const IncompleteDistributionAreasWarning: React.FC<WarningProps> = ({ property }) => {
  return (
    <Alert severity="info">
      <AlertTitle>配信エリアが不完全な可能性があります</AlertTitle>
      必須データが揃っていないため、一部のエリアが計算されていない可能性があります。
    </Alert>
  );
};
```

## Data Models

### Property (Extended)

```typescript
interface Property {
  id: string;
  seller_number: string;
  address: string;
  city: string | null;  // May be null - needs validation
  google_map_url: string | null;  // May be null - needs validation
  // ... other fields
}
```

### PropertyListing (Extended)

```typescript
interface PropertyListing {
  id: string;
  property_id: string;
  distribution_areas: string[];  // May be empty or incomplete
  // ... other fields
}
```

### ValidationIssue

```typescript
interface ValidationIssue {
  id: string;
  property_id: string;
  property_number: string;
  issue_type: 'missing_google_map_url' | 'missing_city' | 'missing_property_listing' | 'incorrect_distribution_areas';
  severity: 'error' | 'warning';
  description: string;
  detected_at: Date;
  resolved: boolean;
  resolved_at: Date | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Missing Google Map URL Detection
*For any* property without a Google Map URL, the validation system should identify it and report the property number, address, and seller information.
**Validates: Requirements 1.1, 1.2**

### Property 2: Missing City Field Detection
*For any* property without a city field, the validation system should identify it and report the property number, address, and seller information.
**Validates: Requirements 2.1, 2.2**

### Property 3: City Name Extraction Accuracy
*For any* address containing a valid Japanese city name pattern (e.g., "大分市", "別府市"), the extraction function should correctly identify and extract the city name.
**Validates: Requirements 3.1, 3.2**

### Property 4: City Field Preservation
*For any* property where city extraction is performed, the original address field should remain unchanged after the operation.
**Validates: Requirements 3.5**

### Property 5: Batch Operation Atomicity
*For any* batch city extraction operation, if one property fails, the operation should continue processing remaining properties without stopping.
**Validates: Requirements 5.4**

### Property 6: Distribution Area Recalculation Trigger
*For any* property where missing data (Google Map URL or city) is added, the system should automatically trigger recalculation of distribution areas.
**Validates: Requirements 5.5, 6.5**

### Property 7: 10km Radius Calculation Completeness
*For any* property with valid coordinates, all area center points within 10km should be included in the distribution_areas array.
**Validates: Requirements 9.1, 9.2**

### Property 8: City-Wide Area Inclusion
*For any* property with a city field set to "大分市", the distribution_areas array should include "㊵".
**Validates: Requirements 9.3**

### Property 9: Combined Area Display
*For any* property in 大分市 with areas within 10km, the distribution_areas should include both the city-wide area (㊵) and distance-based areas (e.g., "㊵⑦").
**Validates: Requirements 9.4**

### Property 10: Distance Calculation Accuracy
*For any* two coordinates, the calculated distance should match the expected distance within a tolerance of 0.1km.
**Validates: Requirements 10.3**

## Error Handling

### Missing Data Scenarios

1. **No Google Map URL**
   - Skip distance-based area calculation
   - Log warning with property number
   - Return only city-wide areas if city is present
   - Display warning in UI

2. **No City Field**
   - Skip city-wide area calculation
   - Log warning with property number
   - Return only distance-based areas if coordinates available
   - Display warning in UI

3. **No Property Listing**
   - Cannot store distribution areas
   - Log error with property number
   - Recommend creating property listing
   - Display error in UI

4. **Invalid Google Map URL**
   - Cannot extract coordinates
   - Log error with URL and property number
   - Treat as missing Google Map URL
   - Display error in UI

### Calculation Errors

1. **Coordinate Extraction Failure**
   - Log error with URL
   - Skip distance-based calculation
   - Continue with city-wide calculation if possible

2. **Distance Calculation Error**
   - Log error with coordinates
   - Skip problematic area
   - Continue with remaining areas

3. **Area Config Loading Failure**
   - Log error with details
   - Return empty distribution areas
   - Display error to user

### Batch Operation Errors

1. **Database Connection Error**
   - Retry up to 3 times
   - Log error details
   - Fail gracefully with clear error message

2. **Individual Property Error**
   - Log error with property number
   - Continue processing remaining properties
   - Include failed properties in final report

## Testing Strategy

### Unit Tests

1. **CityNameExtractor Tests**
   - Test extraction from various address formats
   - Test normalization of city names
   - Test handling of invalid addresses
   - Test edge cases (empty strings, special characters)

2. **PropertyDataValidator Tests**
   - Test validation of Google Map URLs
   - Test validation of city fields
   - Test validation of property listings
   - Test report generation

3. **PropertyDistributionAreaCalculator Tests**
   - Test calculation with valid data
   - Test calculation with missing Google Map URL
   - Test calculation with missing city
   - Test 10km radius calculation
   - Test city-wide area inclusion
   - Test combined area display

### Integration Tests

1. **End-to-End Validation Flow**
   - Create property with missing data
   - Run validation
   - Verify issues are detected
   - Fix data
   - Verify issues are resolved

2. **Batch City Extraction**
   - Create multiple properties with addresses
   - Run batch extraction
   - Verify cities are extracted correctly
   - Verify original addresses unchanged

3. **Distribution Area Recalculation**
   - Create property with incomplete data
   - Add missing data
   - Verify distribution areas are recalculated
   - Verify all areas within 10km are included

### Diagnostic Script Tests

1. **Known Location Tests**
   - Test with "大分市田尻北3-14" → expect "㊵⑦"
   - Test with "別府市北浜1-1-1" → expect "㊶" + nearby areas
   - Test with properties at various distances from area centers
   - Verify 10km radius boundary cases

2. **Distance Calculation Verification**
   - Test distance calculation accuracy
   - Compare with known distances
   - Verify all areas within 10km are found
   - Verify areas beyond 10km are excluded

## Implementation Notes

### Current Issues Identified

1. **Inconsistent Radius Values**
   - `PropertyDistributionAreaCalculator` uses 10km
   - `EnhancedGeolocationService` uses 3km
   - **Fix**: Update `EnhancedGeolocationService.DEFAULT_RADIUS_KM` to 10.0

2. **Potential Area Config Issues**
   - Need to verify all area configs have valid coordinates
   - Need to verify area center points are correctly positioned
   - **Fix**: Add health check to verify area configs

3. **Missing Validation in Calculation**
   - Current code doesn't validate if all expected areas are found
   - No logging of distance calculations for debugging
   - **Fix**: Add debug mode with detailed logging

### City Extraction Patterns

```typescript
const CITY_PATTERNS = [
  /大分市/,
  /別府市/,
  /中津市/,
  /日田市/,
  /佐伯市/,
  /臼杵市/,
  /津久見市/,
  /竹田市/,
  /豊後高田市/,
  /杵築市/,
  /宇佐市/,
  /豊後大野市/,
  /由布市/,
  /国東市/
];
```

### Distance Calculation Formula

Using Haversine formula for accurate distance calculation:

```typescript
function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}
```

### Batch Processing Strategy

For large datasets, process in batches of 100 properties:

```typescript
async function batchExtractCities(properties: Property[]): Promise<void> {
  const BATCH_SIZE = 100;
  const batches = chunk(properties, BATCH_SIZE);
  
  for (const batch of batches) {
    await Promise.all(batch.map(property => extractAndUpdateCity(property)));
    console.log(`Processed ${batch.length} properties`);
  }
}
```

## Deployment Considerations

1. **Database Migration**
   - No schema changes required
   - Existing tables support all validation features

2. **Backward Compatibility**
   - All new features are additive
   - Existing distribution area calculation continues to work
   - Enhanced features provide additional validation and debugging

3. **Performance Impact**
   - Validation adds minimal overhead
   - Batch operations should be run during off-peak hours
   - Caching of area configs reduces database load

4. **Monitoring**
   - Log all validation errors
   - Track number of properties with missing data
   - Monitor distribution area calculation accuracy
   - Alert on high error rates
