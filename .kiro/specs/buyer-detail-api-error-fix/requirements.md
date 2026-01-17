# Requirements Document: Buyer Detail API Error Fix

## Introduction

This specification addresses critical API errors occurring on the buyer detail page that prevent proper display of related buyers and inquiry history. The system currently fails to retrieve related buyer data and inquiry history, resulting in 404 errors that break the user experience.

## Glossary

- **Buyer_Detail_Page**: The page displaying comprehensive information about a specific buyer
- **Related_Buyers_Section**: UI component showing duplicate or related buyers
- **Unified_Inquiry_History_Table**: UI component displaying all inquiry history for a buyer
- **API_Endpoint**: Backend REST endpoint that provides data to the frontend
- **UUID**: Universally Unique Identifier used as primary key for buyers
- **Buyer_ID**: The numeric identifier for buyers (e.g., 6647, 6648)

## Requirements

### Requirement 1: Related Buyers API Endpoint Fix

**User Story:** As a user viewing a buyer's detail page, I want to see all related/duplicate buyers, so that I can understand the complete buyer relationship context.

#### Acceptance Criteria

1. WHEN the Related_Buyers_Section requests data for a valid buyer UUID, THE API_Endpoint SHALL return all related buyers with status 200
2. WHEN the API_Endpoint receives an invalid UUID format, THE API_Endpoint SHALL return a descriptive error with status 400
3. WHEN the API_Endpoint receives a UUID that doesn't exist, THE API_Endpoint SHALL return an empty array with status 200
4. THE API_Endpoint SHALL validate UUID format before querying the database
5. THE API_Endpoint SHALL include all necessary buyer fields in the response (id, uuid, name, email, phone, inquiry_count)

### Requirement 2: Inquiry History API Endpoint Fix

**User Story:** As a user viewing a buyer's detail page, I want to see the complete inquiry history, so that I can track all interactions with properties.

#### Acceptance Criteria

1. WHEN the Unified_Inquiry_History_Table requests data for a valid buyer UUID, THE API_Endpoint SHALL return all inquiry history with status 200
2. WHEN the API_Endpoint receives an invalid UUID format, THE API_Endpoint SHALL return a descriptive error with status 400
3. WHEN the API_Endpoint receives a UUID that doesn't exist, THE API_Endpoint SHALL return an empty array with status 200
4. THE API_Endpoint SHALL validate UUID format before querying the database
5. THE API_Endpoint SHALL include property details in each inquiry history record (property_number, address, inquiry_date)

### Requirement 3: Error Handling Enhancement

**User Story:** As a user, I want the buyer detail page to handle API errors gracefully, so that I can still view other buyer information even if some data fails to load.

#### Acceptance Criteria

1. WHEN an API request fails, THE Buyer_Detail_Page SHALL display an error message for that specific section
2. WHEN an API request fails, THE Buyer_Detail_Page SHALL continue displaying other successfully loaded sections
3. THE Buyer_Detail_Page SHALL log detailed error information for debugging
4. WHEN a 404 error occurs, THE Buyer_Detail_Page SHALL display "No data found" instead of breaking the page
5. THE Buyer_Detail_Page SHALL provide a retry button for failed API requests

### Requirement 4: UUID Parameter Validation

**User Story:** As a developer, I want all API endpoints to validate UUID parameters, so that we catch invalid requests early and provide clear error messages.

#### Acceptance Criteria

1. THE API_Endpoint SHALL validate that UUID parameters match the standard UUID format (8-4-4-4-12 hexadecimal)
2. WHEN a UUID validation fails, THE API_Endpoint SHALL return status 400 with message "Invalid UUID format"
3. THE API_Endpoint SHALL validate UUID parameters before any database queries
4. THE API_Endpoint SHALL log validation failures with the invalid UUID value
5. THE API_Endpoint SHALL handle null or undefined UUID parameters with status 400

### Requirement 5: Related Buyers Data Retrieval

**User Story:** As a user, I want to see buyer 6648 listed as a related buyer when viewing buyer 6647, so that I can identify duplicate records.

#### Acceptance Criteria

1. WHEN querying related buyers for buyer 6647, THE System SHALL include buyer 6648 in the results
2. THE System SHALL identify related buyers based on matching email addresses
3. THE System SHALL identify related buyers based on matching phone numbers
4. THE System SHALL exclude the current buyer from the related buyers list
5. THE System SHALL order related buyers by most recent inquiry date

### Requirement 6: Inquiry History Data Retrieval

**User Story:** As a user, I want to see all inquiry history for a buyer including past inquiries from related buyers, so that I have complete context.

#### Acceptance Criteria

1. WHEN querying inquiry history for a buyer, THE System SHALL include inquiries from all related buyers
2. THE System SHALL join inquiry data with property information
3. THE System SHALL include the buyer name/identifier for each inquiry record
4. THE System SHALL order inquiry history by inquiry date descending
5. THE System SHALL handle cases where property data is missing gracefully

### Requirement 7: API Response Consistency

**User Story:** As a frontend developer, I want consistent API response formats, so that I can reliably parse and display data.

#### Acceptance Criteria

1. THE API_Endpoint SHALL return JSON responses with consistent structure
2. WHEN returning success, THE API_Endpoint SHALL use status 200 with data array
3. WHEN returning errors, THE API_Endpoint SHALL use appropriate status codes (400, 404, 500)
4. THE API_Endpoint SHALL include error messages in a consistent "error" field
5. THE API_Endpoint SHALL include request metadata (timestamp, request_id) in responses

### Requirement 8: Database Query Optimization

**User Story:** As a system administrator, I want efficient database queries, so that the buyer detail page loads quickly.

#### Acceptance Criteria

1. THE System SHALL use indexed fields (uuid, email, phone) for related buyer queries
2. THE System SHALL limit the number of related buyers returned to 50
3. THE System SHALL use JOIN operations instead of multiple separate queries
4. THE System SHALL cache related buyer results for 5 minutes
5. THE System SHALL log slow queries (>1 second) for performance monitoring
