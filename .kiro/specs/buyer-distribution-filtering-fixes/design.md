# Design Document

## Overview

This document describes the design of bug fixes and enhancements to the buyer distribution filtering system. The fixes address critical issues in property type matching, distribution flag filtering, price range parsing, and distribution area validation.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Property Detail Page                        │
│                 (Gmail Distribution Button)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          EnhancedBuyerDistributionService                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  getQualifiedBuyersWithAllCriteria()                  │  │
│  │  - Fetch property details                             │  │
│  │  - Validate distribution_areas                        │  │
│  │  - Fetch all buyers                                   │  │
│  │  - Apply filters (geography, distribution, status,    │  │
│  │    price range with property type validation)         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Geography  │  │Distribution │  │ Price Range │
│   Filter    │  │    Flag     │  │   Filter    │
│             │  │   Filter    │  │  (Enhanced) │
└─────────────┘  └─────────────┘  └─────────────┘
                                          │
                                          ▼
                                  ┌─────────────┐
                                  │Property Type│
                                  │  Matching   │
                                  └─────────────┘
```

## Key Design Changes

### 1. Property Type Validation in Price Range Filter

**Problem**: The `filterByPriceRange()` method checked price ranges without validating that the buyer's desired property type matched the property type. This caused buyers interested in different property types to be included.

**Solution**: Add property type validation as the first step in `filterByPriceRange()`.

```typescript
private filterByPriceRange(
  propertyPrice: number | null | undefined,
  propertyType: string | null | undefined,
  buyer: any
): boolean {
  // Early return if no price
  if (!propertyPrice) {
    return true;
  }

  // Get appropriate price range based on property type
  let priceRangeText: string | null = null;
  if (propertyType === 'マンション' || propertyType === 'アパート') {
    priceRangeText = buyer.price_range_apartment;
  } else if (propertyType === '戸建' || propertyType === '戸建て') {
    priceRangeText = buyer.price_range_house;
  } else if (propertyType === '土地') {
    priceRangeText = buyer.price_range_land;
  }

  // If no price range specified, validate property type match
  if (!priceRangeText || priceRangeText.includes('指定なし') || priceRangeText.trim() === '') {
    if (buyer.desired_property_type && buyer.desired_property_type.trim() !== '') {
      const desiredType = buyer.desired_property_type.trim();
      const actualType = propertyType?.trim() || '';
      
      const typeMatch = this.checkPropertyTypeMatch(desiredType, actualType);
      
      if (!typeMatch) {
        console.log(`[Price Filter] Property type mismatch: Buyer wants "${desiredType}", Property is "${actualType}" - excluding buyer`);
        return false;
      }
    }
    return true;
  }

  // Continue with price range parsing...
}
```

**Impact**: Prevents buyers from receiving notifications for property types they're not interested in.

### 2. Multiple Property Type Matching

**Problem**: Buyers with multiple desired property types (e.g., "戸建、マンション") were excluded because the system used exact string matching.

**Solution**: Create `checkPropertyTypeMatch()` method that splits multiple types and checks for any match.

```typescript
private checkPropertyTypeMatch(desiredType: string, actualType: string): boolean {
  const normalizedActual = actualType.toLowerCase().trim();

  // Split desired types by common separators (、, ・, /, etc.)
  const desiredTypes = desiredType
    .split(/[、・\/,]/)
    .map(t => t.toLowerCase().trim())
    .filter(t => t);

  // Check if any of the desired types match the actual type
  for (const desired of desiredTypes) {
    // Exact match
    if (desired === normalizedActual) {
      return true;
    }

    // マンション/アパート are considered the same category
    if ((desired === 'マンション' || desired === 'アパート') &&
        (normalizedActual === 'マンション' || normalizedActual === 'アパート')) {
      return true;
    }

    // 戸建/戸建て are considered the same
    if ((desired === '戸建' || desired === '戸建て') &&
        (normalizedActual === '戸建' || normalizedActual === '戸建て')) {
      return true;
    }
  }

  return false;
}
```

**Impact**: Buyers interested in multiple property types now receive relevant notifications for any matching type.

### 3. Enhanced Distribution Flag Filtering

**Problem**: Only "要" was accepted as a valid distribution flag, but most buyers (485) used "mail".

**Solution**: Update `filterByDistributionFlag()` to accept multiple valid values.

```typescript
private filterByDistributionFlag(buyer: any): boolean {
  const distributionType = buyer.distribution_type?.trim() || '';
  // Accept "要", "mail", and "LINE→mail" as valid distribution flags
  return distributionType === '要' || 
         distributionType === 'mail' || 
         distributionType.includes('LINE→mail');
}
```

**Impact**: Increased qualified buyer pool from 89 to 574 buyers.

### 4. Improved Price Range Parsing

**Problem**: Price range formats like "~1900万円" and "1000万円~2999万円" were not parsed correctly.

**Solution**: Enhanced regex patterns to handle all common formats.

```typescript
// 1. "X万円以上" - minimum only
const minOnlyMatch = priceRangeText.match(/(\d+)万円以上/);
if (minOnlyMatch) {
  const minPrice = parseInt(minOnlyMatch[1]) * 10000;
  return propertyPrice >= minPrice;
}

// 2. "X万円以下" or "~X万円" - maximum only
const maxOnlyMatch = priceRangeText.match(/(?:~|～)?(\d+)万円(?:以下)?$/);
if (maxOnlyMatch && !priceRangeText.includes('以上') && 
    !priceRangeText.includes('～') && 
    !priceRangeText.match(/(\d+)万円～(\d+)万円/)) {
  const maxPrice = parseInt(maxOnlyMatch[1]) * 10000;
  return propertyPrice <= maxPrice;
}

// 3. "X万円～Y万円" or "X～Y万円" - range
const rangeMatch = priceRangeText.match(/(\d+)(?:万円)?[～~](\d+)万円/);
if (rangeMatch) {
  const minPrice = parseInt(rangeMatch[1]) * 10000;
  const maxPrice = parseInt(rangeMatch[2]) * 10000;
  return propertyPrice >= minPrice && propertyPrice <= maxPrice;
}
```

**Impact**: All common price range formats are now correctly parsed and evaluated.

### 5. Distribution Areas Validation

**Problem**: Properties with null or empty `distribution_areas` returned zero buyers without clear feedback.

**Solution**: Add early validation check in `getQualifiedBuyersWithAllCriteria()`.

```typescript
// Check if distribution_areas is set
if (!property.distribution_areas || property.distribution_areas.trim() === '') {
  console.warn(`[EnhancedBuyerDistributionService] Property ${criteria.propertyNumber} has no distribution areas set`);
  return {
    emails: [],
    count: 0,
    totalBuyers: 0,
    filteredBuyers: [],
    appliedFilters: {
      geographyFilter: true,
      distributionFilter: true,
      statusFilter: true,
      priceRangeFilter: true
    }
  };
}
```

**Impact**: Clear feedback when distribution areas are missing, preventing confusion about why no buyers are returned.

## Data Flow

### Distribution Calculation Flow

```
1. User clicks "配信メール" button on property detail page
   ↓
2. System fetches property details from property_listings table
   ↓
3. System validates distribution_areas field
   ├─ If null/empty → Return 0 buyers with warning
   └─ If set → Continue
   ↓
4. System fetches all buyers from buyers table
   ↓
5. System fetches all buyer inquiry history
   ↓
6. For each buyer:
   ├─ Check geography filter (inquiry-based OR area-based)
   ├─ Check distribution flag (要 OR mail OR LINE→mail)
   ├─ Check status (exclude if contains 買付 or D)
   └─ Check price range:
       ├─ Validate property type match first
       ├─ If no price range → Check property type only
       └─ If price range set → Parse and validate
   ↓
7. Collect buyers who pass ALL filters
   ↓
8. Extract unique email addresses
   ↓
9. Return filtered buyer list with details
```

## Database Schema

### Tables Used

**property_listings**
- `property_number` (PK) - Property identifier
- `google_map_url` - For coordinate extraction
- `address` - For city extraction
- `price` - For price range matching
- `property_type` - For type matching
- `distribution_areas` - For area-based filtering

**buyers**
- `id` (PK) - Buyer identifier
- `buyer_number` - Buyer reference number
- `email` - Distribution target
- `desired_area` - Area numbers (①-⑯, ㊵, ㊶)
- `distribution_type` - Distribution flag (要/mail/LINE→mail)
- `latest_status` - Current status
- `desired_property_type` - Property type preference
- `price_range_apartment` - Apartment price range
- `price_range_house` - House price range
- `price_range_land` - Land price range

**buyer_inquiries**
- `buyer_id` (FK) - References buyers.id
- `property_number` (FK) - References property_listings.property_number
- `inquiry_date` - When inquiry was made

## Error Handling

### Missing Distribution Areas

```typescript
if (!property.distribution_areas || property.distribution_areas.trim() === '') {
  console.warn(`Property ${propertyNumber} has no distribution areas set`);
  return { emails: [], count: 0, ... };
}
```

### Invalid Price Range Format

```typescript
if (/* unable to parse price range */) {
  console.warn(`Unable to parse price range format: "${priceRangeText}" - excluding buyer`);
  return false;
}
```

### Missing Property Coordinates

```typescript
if (!propertyCoords) {
  console.warn(`No coordinates for property ${propertyNumber}`);
  // Continue with area-based matching only
}
```

## Performance Considerations

### Batch Operations

- All buyers fetched in single query
- All buyer inquiries fetched in single query with join
- Inquiry map built once and reused for all buyers

### Early Returns

- Distribution areas validation before fetching buyers
- Property type validation before price range parsing
- Skip area-based matching if inquiry-based match succeeds

### Logging

- Detailed logging for debugging without impacting performance
- Log levels appropriate for production use

## Testing Strategy

### Unit Tests

1. `checkPropertyTypeMatch()` with various input combinations
2. Price range parsing regex patterns
3. Distribution flag validation
4. Multiple property type splitting

### Integration Tests

1. End-to-end distribution calculation for AA13129
2. Buyer 6432 exclusion verification
3. AA13149 with populated distribution areas
4. Multiple property type matching scenarios

### Diagnostic Scripts

- `check-buyer-3212-aa13129.ts` - Verify specific buyer exclusion
- `find-aa13129-qualified-buyers.ts` - Test complete filtering
- `check-distribution-flag.ts` - Analyze flag values
- `check-aa13149-distribution.ts` - Test area validation

## Rollback Plan

If issues are discovered:

1. Revert `EnhancedBuyerDistributionService.ts` to previous version
2. Distribution will return to previous behavior (fewer buyers)
3. No database changes required (all changes are in application logic)

### 6. Email-Based Buyer Consolidation

**Problem**: Multiple buyer records with the same email address are treated independently, causing incorrect distribution decisions. For example, email kouten0909@icloud.com has 2 records (1811 and 4782) both with areas ①②③④⑥⑦, but the system doesn't consolidate them.

**Solution**: Implement email-based consolidation in the distribution service.

```typescript
interface ConsolidatedBuyer {
  email: string;
  buyerNumbers: number[];
  allDesiredAreas: string; // Merged from all records
  mostPermissiveStatus: string; // C over D
  propertyTypes: string[]; // All unique types
  priceRanges: {
    apartment: string[];
    house: string[];
    land: string[];
  };
}

private consolidateBuyersByEmail(buyers: any[]): Map<string, ConsolidatedBuyer> {
  const emailMap = new Map<string, ConsolidatedBuyer>();
  
  for (const buyer of buyers) {
    const email = buyer.email?.trim().toLowerCase();
    if (!email) continue;
    
    if (!emailMap.has(email)) {
      emailMap.set(email, {
        email: buyer.email,
        buyerNumbers: [buyer.buyer_number],
        allDesiredAreas: buyer.desired_area || '',
        mostPermissiveStatus: buyer.latest_status || '',
        propertyTypes: buyer.desired_property_type ? [buyer.desired_property_type] : [],
        priceRanges: {
          apartment: buyer.price_range_apartment ? [buyer.price_range_apartment] : [],
          house: buyer.price_range_house ? [buyer.price_range_house] : [],
          land: buyer.price_range_land ? [buyer.price_range_land] : []
        }
      });
    } else {
      const consolidated = emailMap.get(email)!;
      
      // Add buyer number
      consolidated.buyerNumbers.push(buyer.buyer_number);
      
      // Merge desired areas (remove duplicates)
      const existingAreas = new Set(consolidated.allDesiredAreas.split(''));
      const newAreas = (buyer.desired_area || '').split('');
      newAreas.forEach(area => existingAreas.add(area));
      consolidated.allDesiredAreas = Array.from(existingAreas).join('');
      
      // Use most permissive status (C > D)
      if (this.isMorePermissiveStatus(buyer.latest_status, consolidated.mostPermissiveStatus)) {
        consolidated.mostPermissiveStatus = buyer.latest_status;
      }
      
      // Merge property types
      if (buyer.desired_property_type && !consolidated.propertyTypes.includes(buyer.desired_property_type)) {
        consolidated.propertyTypes.push(buyer.desired_property_type);
      }
      
      // Merge price ranges
      if (buyer.price_range_apartment && !consolidated.priceRanges.apartment.includes(buyer.price_range_apartment)) {
        consolidated.priceRanges.apartment.push(buyer.price_range_apartment);
      }
      // ... similar for house and land
    }
  }
  
  return emailMap;
}

private isMorePermissiveStatus(status1: string, status2: string): boolean {
  // C (active) is more permissive than D (inactive)
  if (status1 === 'C' && status2 === 'D') return true;
  if (status1 === 'D' && status2 === 'C') return false;
  // For other statuses, keep the first one
  return false;
}
```

**Impact**: 
- Buyers with multiple records will have all their preferences considered
- Prevents incorrect exclusions when preferences are split across records
- Ensures only one email is sent per unique email address

### 7. Distribution Areas Column Clarification

**Status**: ✅ VERIFIED - No code changes needed

**Investigation Result**: The codebase already uses the correct column names. This was a documentation issue, not a code issue.

**Column Naming Convention**:

| Table | Column Name | Purpose |
|-------|-------------|---------|
| `buyers` | `desired_area` | Buyer's desired areas (e.g., "㊵㊶⑫") |
| `property_listings` | `distribution_areas` | Property's distribution areas (e.g., "㊵㊶") |

**Why Different Names?**
- **Buyers**: Use `desired_area` to indicate areas they WANT to receive notifications for
- **Properties**: Use `distribution_areas` to indicate areas the property should be distributed to

**Code Verification**:
```typescript
// ✅ CORRECT - Buyers table uses desired_area
interface BuyerRecord {
  buyer_number: string;
  email: string;
  desired_area: string | null;  // ✅ Correct column name
  distribution_type: string | null;
}

// ✅ CORRECT - Property listings table uses distribution_areas
const { data: propertyData } = await this.supabase
  .from('property_listings')
  .select('property_number, distribution_areas')  // ✅ Correct column name
  .eq('property_number', propertyNumber);
```

**Impact**: Documentation updated to reflect actual database schema. No runtime errors exist.

## Data Flow (Updated)

### Distribution Calculation Flow with Email Consolidation

```
1. User clicks "配信メール" button on property detail page
   ↓
2. System fetches property details from property_listings table
   ↓
3. System validates distribution_areas field
   ├─ If null/empty → Return 0 buyers with warning
   └─ If set → Continue
   ↓
4. System fetches all buyers from buyers table
   ↓
5. System consolidates buyers by email address
   ├─ Group all records with same email
   ├─ Merge desired_area values
   ├─ Use most permissive status
   └─ Combine property types and price ranges
   ↓
6. System fetches all buyer inquiry history
   ↓
7. For each consolidated buyer (by email):
   ├─ Check geography filter using ALL merged areas
   ├─ Check distribution flag (要 OR mail OR LINE→mail)
   ├─ Check status (use most permissive)
   └─ Check price range with property type validation
   ↓
8. Collect buyers who pass ALL filters
   ↓
9. Extract unique email addresses (already unique after consolidation)
   ↓
10. Return filtered buyer list with details
```

## Monitoring

### Key Metrics

- Number of qualified buyers per property
- Distribution flag value distribution
- Property type match success rate
- Price range parsing success rate
- Properties with missing distribution areas
- **Number of buyers with multiple records per email**
- **Email consolidation success rate**
- **Average number of records per email address**

### Logging

All filtering decisions are logged with:
- Buyer number(s) (may be multiple if consolidated)
- Email address
- Filter results (pass/fail for each filter)
- Reason for exclusion if applicable
- Geographic match details
- **Consolidation details (if multiple records merged)**
