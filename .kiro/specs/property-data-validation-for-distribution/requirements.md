# Requirements Document

## Introduction

This feature ensures that all properties have the necessary data (Google Map URL and city field) required for accurate distribution area calculation, and that the distribution area calculation logic correctly identifies all applicable areas. The system must calculate both city-wide areas (㊵大分市, ㊶別府市) and distance-based areas (①-⑦) within a 10km radius of the property location.

## Glossary

- **System**: The property management application
- **Property**: A real estate listing in the database
- **Google Map URL**: A URL pointing to the property location on Google Maps, used to extract coordinates
- **City Field**: The city (市) where the property is located
- **Distribution Area**: Geographic areas (numbered ①-㊿) used for buyer email distribution
- **Distance-based Area**: Distribution areas calculated based on distance from property coordinates
- **City-wide Area**: Distribution areas that cover entire cities (e.g., ㊵大分市, ㊶別府市)
- **Property Listing**: A record in the property_listings table that stores distribution areas

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to identify properties with missing Google Map URLs, so that I can ensure distance-based distribution areas can be calculated.

#### Acceptance Criteria

1. WHEN the system performs a data validation check THEN the system SHALL identify all properties where google_map_url is NULL or empty
2. WHEN a property lacks a Google Map URL THEN the system SHALL report the property number, address, and seller information
3. WHEN displaying validation results THEN the system SHALL show the count of properties missing Google Map URLs
4. WHEN a property has no Google Map URL THEN the system SHALL indicate that distance-based areas cannot be calculated for that property

### Requirement 2

**User Story:** As a system administrator, I want to identify properties with missing city fields, so that I can ensure city-wide distribution areas can be assigned.

#### Acceptance Criteria

1. WHEN the system performs a data validation check THEN the system SHALL identify all properties where city is NULL or empty
2. WHEN a property lacks a city field THEN the system SHALL report the property number, address, and seller information
3. WHEN displaying validation results THEN the system SHALL show the count of properties missing city fields
4. WHEN a property has no city field THEN the system SHALL indicate that city-wide areas cannot be calculated for that property

### Requirement 3

**User Story:** As a system administrator, I want to automatically extract city names from property addresses, so that missing city fields can be populated without manual data entry.

#### Acceptance Criteria

1. WHEN a property has an address but no city field THEN the system SHALL attempt to extract the city name from the address
2. WHEN extracting city names THEN the system SHALL recognize common Japanese city patterns (e.g., "大分市", "別府市", "中津市")
3. WHEN a city name is successfully extracted THEN the system SHALL update the property's city field
4. WHEN city extraction fails THEN the system SHALL log the property for manual review
5. WHEN updating city fields THEN the system SHALL preserve the original address field unchanged

### Requirement 4

**User Story:** As a system administrator, I want to run a comprehensive validation report, so that I can see all properties with data quality issues affecting distribution area calculation.

#### Acceptance Criteria

1. WHEN generating a validation report THEN the system SHALL list all properties with missing Google Map URLs
2. WHEN generating a validation report THEN the system SHALL list all properties with missing city fields
3. WHEN generating a validation report THEN the system SHALL list all properties without property listings
4. WHEN displaying each property issue THEN the system SHALL show property number, seller name, address, and specific missing fields
5. WHEN the report is complete THEN the system SHALL provide summary statistics for each issue type

### Requirement 5

**User Story:** As a system administrator, I want to fix missing data in batch operations, so that I can efficiently resolve data quality issues across multiple properties.

#### Acceptance Criteria

1. WHEN executing a batch city extraction THEN the system SHALL process all properties with missing city fields
2. WHEN executing batch operations THEN the system SHALL provide progress updates showing processed count and total count
3. WHEN a batch operation completes THEN the system SHALL report the number of successfully updated properties
4. WHEN a batch operation encounters errors THEN the system SHALL log failed properties without stopping the entire operation
5. WHEN batch operations complete THEN the system SHALL trigger recalculation of distribution areas for updated properties

### Requirement 6

**User Story:** As a property manager, I want to see validation warnings in the property detail UI, so that I know when critical data is missing and can take corrective action.

#### Acceptance Criteria

1. WHEN viewing a property detail page THEN the system SHALL display a warning banner if Google Map URL is missing
2. WHEN viewing a property detail page THEN the system SHALL display a warning banner if city field is missing
3. WHEN displaying warnings THEN the system SHALL explain the impact on distribution area calculation
4. WHEN a warning is displayed THEN the system SHALL provide a clear call-to-action to add the missing data
5. WHEN missing data is added THEN the system SHALL automatically recalculate distribution areas

### Requirement 7

**User Story:** As a system administrator, I want to prevent distribution area calculation when required data is missing, so that incomplete or incorrect areas are not assigned to properties.

#### Acceptance Criteria

1. WHEN calculating distribution areas THEN the system SHALL check for Google Map URL presence before distance calculations
2. WHEN calculating distribution areas THEN the system SHALL check for city field presence before city-wide area assignment
3. WHEN required data is missing THEN the system SHALL skip the calculation and log a warning
4. WHEN required data is missing THEN the system SHALL set distribution_areas to an empty array
5. WHEN required data becomes available THEN the system SHALL automatically trigger area recalculation

### Requirement 8

**User Story:** As a developer, I want a diagnostic script to analyze data quality issues, so that I can quickly identify and understand the scope of missing data problems.

#### Acceptance Criteria

1. WHEN running the diagnostic script THEN the system SHALL connect to the database and query all properties
2. WHEN analyzing properties THEN the system SHALL check for missing Google Map URLs, city fields, and property listings
3. WHEN the analysis completes THEN the system SHALL output a detailed report with property-specific issues
4. WHEN the analysis completes THEN the system SHALL provide actionable recommendations for fixing each issue type
5. WHEN the script encounters database errors THEN the system SHALL display clear error messages with troubleshooting guidance

### Requirement 9

**User Story:** As a system administrator, I want to verify that distribution area calculation correctly identifies all areas within 10km radius, so that buyers in all applicable areas receive property notifications.

#### Acceptance Criteria

1. WHEN calculating distribution areas for a property THEN the system SHALL identify all numbered areas (①-⑦) within 10km radius of the property coordinates
2. WHEN calculating distribution areas for a property THEN the system SHALL identify the city-wide area (㊵ or ㊶) based on the city field
3. WHEN a property is located in 大分市 THEN the system SHALL include both ㊵ and all numbered areas within 10km in the distribution_areas array
4. WHEN displaying distribution areas THEN the system SHALL show both city-wide and distance-based areas together (e.g., "㊵⑦" for a property in 大分市田尻北)
5. WHEN the calculation completes THEN the system SHALL log the number of areas found for verification purposes

### Requirement 10

**User Story:** As a developer, I want to test the distribution area calculation logic with known property locations, so that I can verify the 10km radius calculation is working correctly.

#### Acceptance Criteria

1. WHEN testing with a known property address THEN the system SHALL extract coordinates from the Google Map URL
2. WHEN testing with known coordinates THEN the system SHALL calculate distances to all area center points
3. WHEN an area center point is within 10km THEN the system SHALL include that area in the results
4. WHEN displaying test results THEN the system SHALL show the distance to each area center point for debugging
5. WHEN the test completes THEN the system SHALL compare actual results with expected results and report any discrepancies
