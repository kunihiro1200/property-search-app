# Requirements Document

## Introduction

This specification documents critical bug fixes and enhancements to the buyer distribution filtering system. The fixes address issues where buyers were incorrectly included or excluded from property distribution emails due to flaws in property type matching, distribution flag filtering, and price range parsing logic.

## Glossary

- **System**: The real estate management application
- **Property**: A real estate listing with location, pricing, and type information
- **Buyer**: A potential purchaser registered in the buyer list
- **Distribution Flag**: A field indicating whether a buyer wants to receive email distributions (要/mail/LINE→mail)
- **Property Type**: The type of property (マンション/アパート/戸建/戸建て/土地)
- **Price Range**: The budget range specified by a buyer for property purchases
- **Distribution Areas**: Geographic area numbers assigned to a property for distribution matching

## Background

### Issues Identified

1. **Property Type Mismatch Bug (AA13129)**: Buyer 6432 (taka844452@icloud.com) was incorrectly included in distribution for property AA13129. The buyer desired "マンション" but the property was "戸建". The system failed to validate property type matching before checking price ranges.

2. **Distribution Flag Limitation**: The system only accepted "要" as a valid distribution flag, but the majority of buyers (485) used "mail" as their distribution preference, while only 89 used "要". This caused qualified buyers to be excluded.

3. **Multiple Property Type Handling**: Buyers with multiple desired property types (e.g., "戸建、マンション") were excluded because the system required exact matches instead of checking if any of the buyer's desired types matched the property.

4. **Price Range Parsing Issues**: Price range formats like "~1900万円" and "1000万円~2999万円" were not parsed correctly, causing buyers with valid price ranges to be excluded.

5. **Missing Distribution Areas**: Properties with null or empty `distribution_areas` field returned zero buyers, even when many qualified buyers existed. The system needed to populate this field from property addresses.

## Requirements

### Requirement 1: Property Type Validation in Price Range Filter

**User Story:** As a real estate agent, I want the system to verify that a buyer's desired property type matches the property type before checking price ranges, so that buyers don't receive irrelevant property notifications.

#### Acceptance Criteria

1. WHEN evaluating a buyer for price range matching, THE System SHALL first check if the buyer's desired property type matches the property type
2. WHEN a buyer's desired property type does not match the property type, THE System SHALL exclude that buyer regardless of price range
3. WHEN a buyer has no price range specified but has a desired property type, THE System SHALL only include the buyer if the property type matches
4. WHEN a buyer has no desired property type specified, THE System SHALL include the buyer based on price range alone
5. WHEN property type is null or empty, THE System SHALL include the buyer based on other criteria

### Requirement 2: Multiple Property Type Matching

**User Story:** As a real estate agent, I want buyers who are interested in multiple property types to receive notifications for any matching type, so that flexible buyers don't miss relevant opportunities.

#### Acceptance Criteria

1. WHEN a buyer's desired property type contains multiple types separated by 、・/, THE System SHALL split the string into individual types
2. WHEN checking property type match, THE System SHALL check if ANY of the buyer's desired types matches the property type
3. WHEN comparing property types, THE System SHALL treat "マンション" and "アパート" as equivalent
4. WHEN comparing property types, THE System SHALL treat "戸建" and "戸建て" as equivalent
5. WHEN a buyer desires "戸建、マンション" and property is "戸建", THE System SHALL mark as matching

### Requirement 3: Enhanced Distribution Flag Filtering

**User Story:** As a real estate agent, I want the system to recognize all valid distribution preferences, so that buyers who want email notifications receive them regardless of the specific flag value used.

#### Acceptance Criteria

1. WHEN evaluating a buyer's distribution flag, THE System SHALL accept "要" as valid
2. WHEN evaluating a buyer's distribution flag, THE System SHALL accept "mail" as valid
3. WHEN evaluating a buyer's distribution flag, THE System SHALL accept "LINE→mail" as valid
4. WHEN a buyer's distribution flag is any other value, THE System SHALL exclude that buyer
5. WHEN a buyer's distribution flag is null or empty, THE System SHALL exclude that buyer

### Requirement 4: Improved Price Range Parsing

**User Story:** As a real estate agent, I want the system to correctly parse all common price range formats, so that buyers with valid budget constraints receive appropriate property notifications.

#### Acceptance Criteria

1. WHEN parsing price range "X万円以上", THE System SHALL extract minimum price only
2. WHEN parsing price range "~X万円" or "X万円以下", THE System SHALL extract maximum price only
3. WHEN parsing price range "X万円～Y万円" or "X～Y万円", THE System SHALL extract both minimum and maximum prices
4. WHEN a price range format cannot be parsed, THE System SHALL log a warning and exclude the buyer
5. WHEN property price is within the parsed range, THE System SHALL include the buyer

### Requirement 5: Distribution Areas Validation

**User Story:** As a real estate agent, I want the system to validate that properties have distribution areas set before attempting distribution, so that I receive clear feedback when required data is missing.

#### Acceptance Criteria

1. WHEN retrieving a property for distribution, THE System SHALL check if distribution_areas field is set
2. WHEN distribution_areas is null or empty string, THE System SHALL return zero buyers with appropriate logging
3. WHEN distribution_areas is set, THE System SHALL proceed with normal distribution filtering
4. WHEN a property lacks distribution_areas, THE System SHALL log a warning message
5. WHEN displaying distribution results, THE System SHALL indicate if distribution_areas was missing

### Requirement 6: Distribution Areas Auto-Population

**User Story:** As a real estate agent, I want the system to automatically calculate and populate distribution areas from property addresses, so that I don't have to manually enter area numbers for every property.

#### Acceptance Criteria

1. WHEN a property is created or updated with an address, THE System SHALL extract the city name
2. WHEN the city is "大分市", THE System SHALL set distribution_areas to include "㊵"
3. WHEN the city is "別府市", THE System SHALL set distribution_areas to include "㊶"
4. WHEN the property has a Google Map URL, THE System SHALL calculate coordinate-based area numbers (①-⑮)
5. WHEN distribution_areas is manually edited, THE System SHALL preserve the manual value

## Test Cases

### Test Case 1: Property Type Mismatch Prevention

**Given** Buyer 6432 desires "マンション"  
**And** Property AA13129 is type "戸建"  
**When** Distribution is calculated for AA13129  
**Then** Buyer 6432 SHALL NOT be included in the distribution list  
**And** The log SHALL indicate "Property type mismatch"

### Test Case 2: Multiple Property Type Matching

**Given** Buyer desires "戸建、マンション"  
**And** Property is type "戸建"  
**When** Distribution is calculated  
**Then** Buyer SHALL be included in the distribution list  
**And** The log SHALL indicate property type match

### Test Case 3: Distribution Flag "mail" Acceptance

**Given** Buyer has distribution_type "mail"  
**And** Buyer meets all other criteria  
**When** Distribution is calculated  
**Then** Buyer SHALL be included in the distribution list

### Test Case 4: Price Range "~X万円" Parsing

**Given** Buyer has price range "~1900万円"  
**And** Property price is 18,000,000円  
**When** Distribution is calculated  
**Then** Buyer SHALL be included (price <= 19,000,000)

### Test Case 5: Missing Distribution Areas

**Given** Property AA13149 has distribution_areas = null  
**When** Distribution is calculated  
**Then** System SHALL return 0 buyers  
**And** Log SHALL contain "has no distribution areas set"

### Test Case 6: Auto-Populated Distribution Areas

**Given** Property AA13149 has address "別府市北中7-1"  
**When** Distribution areas are calculated  
**Then** distribution_areas SHALL be set to "㊶"  
**And** Distribution SHALL return qualified buyers

## Implementation Notes

### Files Modified

- `backend/src/services/EnhancedBuyerDistributionService.ts`
  - Added `checkPropertyTypeMatch()` method
  - Enhanced `filterByPriceRange()` to validate property type first
  - Updated `filterByDistributionFlag()` to accept "mail" and "LINE→mail"
  - Improved price range regex patterns
  - Added early return for missing distribution_areas

### Diagnostic Scripts Created

- `backend/check-buyer-3212-aa13129.ts` - Verified buyer 6432 exclusion
- `backend/check-taka-buyer.ts` - Analyzed buyer 6432 details
- `backend/find-aa13129-qualified-buyers.ts` - Tested complete filtering logic
- `backend/check-distribution-flag.ts` - Analyzed distribution flag values
- `backend/analyze-distribution-types.ts` - Counted distribution type usage
- `backend/check-aa13149-distribution.ts` - Diagnosed missing distribution_areas
- `backend/fix-aa13149-distribution-areas.ts` - Populated distribution_areas

## Success Metrics

1. **Property Type Validation**: Buyer 6432 correctly excluded from AA13129 distribution
2. **Distribution Flag Expansion**: Qualified buyers increased from 89 to 574 (485 "mail" + 89 "要")
3. **Multiple Type Support**: Buyers with "戸建、マンション" now match both property types
4. **Price Range Parsing**: All common formats ("~X", "X~Y", "X以上") correctly parsed
5. **Distribution Areas**: AA13149 now returns 93 qualified buyers after area population

### Requirement 7: Email-Based Buyer Consolidation

**User Story:** As a real estate agent, I want the system to consolidate all buyer records with the same email address when calculating distribution, so that buyers receive properties matching ANY of their registered preferences across all their records.

#### Acceptance Criteria

1. WHEN calculating distribution for a property, THE System SHALL group all buyer records by email address
2. WHEN multiple buyer records share the same email, THE System SHALL merge their desired_area values
3. WHEN evaluating area matching, THE System SHALL check if the property's distribution areas match ANY area from ANY buyer record with that email
4. WHEN multiple records have different statuses, THE System SHALL use the most permissive status (active over inactive)
5. WHEN sending distribution emails, THE System SHALL send only one email per unique email address

### Requirement 8: Distribution Areas Column Architecture

**User Story:** As a system architect, I want to ensure the buyer distribution system references columns that actually exist in the database, so that the system functions correctly without runtime errors.

#### Acceptance Criteria

1. ✅ WHEN the distribution service queries buyer data, THE System SHALL only reference columns that exist in the buyers table
2. ✅ WHEN the buyers table stores buyer preferences, THE System SHALL use the desired_area column (not distribution_areas)
3. ✅ WHEN the property_listings table stores distribution data, THE System SHALL use the distribution_areas column
4. ✅ WHEN documentation references column names, THE System SHALL use the correct column name for each table
5. ✅ WHEN adding new columns to buyers table, THE System SHALL update all services that reference buyer data

**Note**: Code verification completed. All services correctly use `buyers.desired_area` and `property_listings.distribution_areas`.

## Test Cases (Continued)

### Test Case 7: Email Consolidation

**Given** Email kouten0909@icloud.com has 2 buyer records  
**And** Buyer 1811 has desired_area "①②③④⑥⑦"  
**And** Buyer 4782 has desired_area "①②③④⑥⑦"  
**And** Property AA4160 has distribution_areas "⑩㊶㊸"  
**When** Distribution is calculated for AA4160  
**Then** System SHALL consolidate areas to "①②③④⑥⑦"  
**And** System SHALL find NO common areas with "⑩㊶㊸"  
**And** Email kouten0909@icloud.com SHALL NOT receive distribution

### Test Case 8: Multiple Records with Different Areas

**Given** Email test@example.com has 2 buyer records  
**And** Buyer A has desired_area "①②③"  
**And** Buyer B has desired_area "④⑤⑥"  
**And** Property has distribution_areas "⑤"  
**When** Distribution is calculated  
**Then** System SHALL consolidate areas to "①②③④⑤⑥"  
**And** System SHALL find common area "⑤"  
**And** Email test@example.com SHALL receive distribution

### Test Case 9: Multiple Records with Different Statuses

**Given** Email test@example.com has 2 buyer records  
**And** Buyer A has status "C" (active)  
**And** Buyer B has status "D" (inactive)  
**When** Distribution is calculated  
**Then** System SHALL use status "C" (most permissive)  
**And** Email test@example.com SHALL be included if other criteria match

## Related Specifications

- `.kiro/specs/buyer-email-distribution-radius-filter/` - Geographic filtering logic
- `.kiro/specs/buyer-inquiry-based-distribution/` - Inquiry-based matching
- `.kiro/specs/property-area-based-email-distribution/` - Area-based distribution
