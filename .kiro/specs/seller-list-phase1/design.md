# Design Document - Seller List Phase 1 Enhancement

## Overview

Phase 1 of the Seller List Enhancement adds essential tracking and management capabilities to the existing seller management system. The primary focus is on implementing seller numbering, inquiry tracking, communication status management, and duplicate detection features.

This phase lays the foundation for improved data organization and operational efficiency by providing better visibility into seller origins, contact attempts, and potential duplicate records.

## Architecture

### High-Level Architecture

The Phase 1 enhancement follows the existing three-tier architecture:

```
┌─────────────────────────────────────────┐
│         Frontend (React + MUI)          │
│  - Enhanced Seller List View            │
│  - Duplicate Warning Dialogs            │
│  - New Filter/Sort Options              │
└──────────────────┬──────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────┐
│      Backend (Node.js + Express)        │
│  - Seller Number Generator              │
│  - Duplicate Detection Service          │
│  - Enhanced Seller Service              │
└──────────────────┬──────────────────────┘
                   │ SQL
┌──────────────────▼──────────────────────┐
│      Database (Supabase/PostgreSQL)     │
│  - sellers table (enhanced)             │
│  - seller_history table (new)           │
│  - seller_number_sequence (new)         │
└─────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Seller Number Generation**: Use a dedicated sequence table to ensure atomic, gap-free number generation
2. **Duplicate Detection**: Implement at the service layer to provide flexibility for future enhancements
3. **Historical Data**: Store duplicate-related historical data in a separate table to avoid cluttering the main sellers table
4. **Backward Compatibility**: All new fields are optional or have defaults to maintain compatibility with existing code

## Components and Interfaces

### Database Schema Changes

#### Enhanced sellers Table

```sql
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS seller_number VARCHAR(50) UNIQUE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_source VARCHAR(50);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_year INTEGER;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_date DATE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_unreachable BOOLEAN DEFAULT false;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS unreachable_since TIMESTAMP WITH TIME ZONE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS first_caller_initials VARCHAR(10);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS first_caller_employee_id UUID REFERENCES employees(id);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS duplicate_confirmed BOOLEAN DEFAULT false;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS duplicate_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS duplicate_confirmed_by UUID REFERENCES employees(id);

CREATE INDEX idx_sellers_seller_number ON sellers(seller_number);
CREATE INDEX idx_sellers_inquiry_source ON sellers(inquiry_source);
CREATE INDEX idx_sellers_inquiry_date ON sellers(inquiry_date DESC);
CREATE INDEX idx_sellers_is_unreachable ON sellers(is_unreachable);
CREATE INDEX idx_sellers_confidence_level ON sellers(confidence_level);
CREATE INDEX idx_sellers_duplicate_confirmed ON sellers(duplicate_confirmed);
```

#### New seller_number_sequence Table

```sql
CREATE TABLE seller_number_sequence (
    id INTEGER PRIMARY KEY DEFAULT 1,
    current_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO seller_number_sequence (id, current_number) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
```

#### New seller_history Table

```sql
CREATE TABLE seller_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    past_seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('phone', 'email', 'both')),
    past_owner_name TEXT,
    past_owner_phone TEXT,
    past_owner_email TEXT,
    past_property_address TEXT,
    past_property_type VARCHAR(50),
    past_inquiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seller_history_current ON seller_history(current_seller_id);
CREATE INDEX idx_seller_history_past ON seller_history(past_seller_id);
CREATE INDEX idx_seller_history_match_type ON seller_history(match_type);
```

### Backend Services

#### SellerNumberService

```typescript
interface SellerNumberService {
  // Generate next seller number in sequence
  generateSellerNumber(): Promise<string>;
  
  // Get current sequence number (for display/debugging)
  getCurrentSequence(): Promise<number>;
  
  // Validate seller number format
  validateSellerNumber(sellerNumber: string): boolean;
}
```

#### DuplicateDetectionService

```typescript
interface DuplicateMatch {
  sellerId: string;
  matchType: 'phone' | 'email' | 'both';
  sellerInfo: {
    name: string;
    phoneNumber: string;
    email?: string;
    inquiryDate?: Date;
  };
  propertyInfo?: {
    address: string;
    propertyType: string;
  };
}

interface DuplicateDetectionService {
  // Check for duplicates by phone number
  checkDuplicateByPhone(phoneNumber: string, excludeId?: string): Promise<DuplicateMatch[]>;
  
  // Check for duplicates by email
  checkDuplicateByEmail(email: string, excludeId?: string): Promise<DuplicateMatch[]>;
  
  // Check for duplicates by both phone and email
  checkDuplicates(phoneNumber: string, email?: string, excludeId?: string): Promise<DuplicateMatch[]>;
  
  // Record duplicate relationship in history
  recordDuplicateHistory(currentSellerId: string, pastSellerId: string, matchType: string): Promise<void>;
  
  // Get duplicate history for a seller
  getDuplicateHistory(sellerId: string): Promise<DuplicateMatch[]>;
}
```

#### Enhanced SellerService

```typescript
interface CreateSellerRequestPhase1 extends CreateSellerRequest {
  sellerNumber?: string; // Auto-generated if not provided
  inquirySource: string;
  inquiryYear: number;
  inquiryDate: Date;
  inquiryDatetime?: Date;
  confidenceLevel?: 'high' | 'medium' | 'low';
  firstCallerInitials?: string;
  firstCallerEmployeeId?: string;
}

interface UpdateSellerRequestPhase1 extends UpdateSellerRequest {
  inquirySource?: string;
  inquiryYear?: number;
  inquiryDate?: Date;
  isUnreachable?: boolean;
  confidenceLevel?: 'high' | 'medium' | 'low';
  firstCallerInitials?: string;
  duplicateConfirmed?: boolean;
}

interface SellerPhase1 extends Seller {
  sellerNumber: string;
  inquirySource: string;
  inquiryYear: number;
  inquiryDate: Date;
  inquiryDatetime?: Date;
  isUnreachable: boolean;
  unreachableSince?: Date;
  firstCallerInitials?: string;
  firstCallerEmployeeId?: string;
  confidenceLevel?: 'high' | 'medium' | 'low';
  duplicateConfirmed: boolean;
  duplicateConfirmedAt?: Date;
  duplicateConfirmedBy?: string;
  duplicateMatches?: DuplicateMatch[];
}
```

### API Endpoints

#### New/Modified Endpoints

```
POST   /sellers
  - Enhanced with Phase 1 fields
  - Returns duplicate warnings if matches found
  - Auto-generates seller number

GET    /sellers
  - Enhanced with Phase 1 filters:
    ?inquirySource=ウ
    ?inquiryYearFrom=2024&inquiryYearTo=2025
    ?isUnreachable=true
    ?confidenceLevel=high
    ?firstCaller=TK
    ?duplicateConfirmed=false

GET    /sellers/:id
  - Includes Phase 1 fields
  - Includes duplicate history if applicable

PATCH  /sellers/:id
  - Allows updating Phase 1 fields
  - Validates first caller immutability

POST   /sellers/:id/mark-unreachable
  - Marks seller as unreachable
  - Records timestamp

POST   /sellers/:id/clear-unreachable
  - Clears unreachable status

POST   /sellers/:id/confirm-duplicate
  - Marks duplicate as confirmed
  - Records confirming employee and timestamp

GET    /sellers/:id/duplicate-history
  - Returns duplicate match history

GET    /sellers/check-duplicate
  - Query params: phone, email
  - Returns potential duplicate matches
```

## Data Models

### TypeScript Interfaces

```typescript
export enum InquirySource {
  IEUL = 'ウ',
  LIFULL = 'L',
  // Add more as needed
}

export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface SellerPhase1 extends Seller {
  sellerNumber: string;
  inquirySource: string;
  inquiryYear: number;
  inquiryDate: Date;
  inquiryDatetime?: Date;
  isUnreachable: boolean;
  unreachableSince?: Date;
  firstCallerInitials?: string;
  firstCallerEmployeeId?: string;
  confidenceLevel?: ConfidenceLevel;
  duplicateConfirmed: boolean;
  duplicateConfirmedAt?: Date;
  duplicateConfirmedBy?: string;
}

export interface DuplicateWarning {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
  canProceed: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Seller Number Uniqueness
*For any* two sellers in the system, their seller numbers must be different.
**Validates: Requirements 1.1, 1.2**

### Property 2: Seller Number Sequential Generation
*For any* sequence of seller creations, the seller numbers must be in strictly increasing numerical order (ignoring the "AA" prefix).
**Validates: Requirements 1.1, 1.5**

### Property 3: Seller Number Search Accuracy
*For any* seller with a known seller number, searching by that seller number must return that exact seller.
**Validates: Requirements 1.4**

### Property 4: Inquiry Source Validation
*For any* attempt to create a seller without an inquiry source, the system must reject the request with a validation error.
**Validates: Requirements 2.1**

### Property 5: Inquiry Source Filtering
*For any* inquiry source value, filtering sellers by that source must return only sellers with that exact inquiry source.
**Validates: Requirements 2.4**

### Property 6: Inquiry Source Statistics Accuracy
*For any* set of sellers, the count of sellers per inquiry source must equal the sum of individual source counts.
**Validates: Requirements 2.5**

### Property 7: Inquiry Date Requirement
*For any* attempt to create a seller without inquiry year or inquiry date, the system must reject the request with a validation error.
**Validates: Requirements 3.1, 3.2**

### Property 8: Inquiry Datetime Storage
*For any* seller created with an inquiry datetime, retrieving that seller must return the same datetime value.
**Validates: Requirements 3.3**

### Property 9: Inquiry Date Sorting
*For any* set of sellers sorted by inquiry date, each seller's inquiry date must be less than or equal to the next seller's inquiry date (ascending) or greater than or equal (descending).
**Validates: Requirements 3.5**

### Property 10: Unreachable Timestamp Recording
*For any* seller marked as unreachable, the unreachable_since timestamp must be set and must be less than or equal to the current time.
**Validates: Requirements 4.3**

### Property 11: Unreachable Status Filtering
*For any* filter by unreachable status, the returned sellers must all have the is_unreachable flag matching the filter value.
**Validates: Requirements 4.5**

### Property 12: First Caller Recording
*For any* seller with a first caller set, the first_caller_initials field must be non-empty and the first_caller_employee_id must reference a valid employee.
**Validates: Requirements 5.1**

### Property 13: First Caller Filtering
*For any* first caller initials, filtering by those initials must return only sellers where first_caller_initials matches exactly.
**Validates: Requirements 5.4**

### Property 14: First Caller Immutability
*For any* seller with a first caller already set, attempts to modify the first caller (without authorization) must be rejected.
**Validates: Requirements 5.5**

### Property 15: Confidence Level Filtering
*For any* confidence level value, filtering by that level must return only sellers with that exact confidence level.
**Validates: Requirements 6.4**

### Property 16: Confidence Level Sorting
*For any* set of sellers sorted by confidence level, the order must follow a consistent ranking (e.g., high > medium > low).
**Validates: Requirements 6.5**

### Property 17: Phone Number Duplicate Detection
*For any* phone number that exists in the system, attempting to create a new seller with that phone number must trigger duplicate detection and return the existing seller information.
**Validates: Requirements 7.1, 7.3, 7.4**

### Property 18: Email Duplicate Detection
*For any* email address that exists in the system, attempting to create a new seller with that email must trigger duplicate detection and return the existing seller information.
**Validates: Requirements 8.1, 8.3, 8.4**

### Property 19: Duplicate Confirmation Timestamp
*For any* seller marked as duplicate confirmed, the duplicate_confirmed_at timestamp must be set and the duplicate_confirmed_by field must reference a valid employee.
**Validates: Requirements 9.3, 9.4**

### Property 20: Migration Seller Number Assignment
*For any* existing sellers after migration, each must have a unique seller number assigned in chronological order based on created_at.
**Validates: Requirements 11.2**

### Property 21: API Response Completeness
*For any* seller retrieved via API, the response must include all Phase 1 fields with their current values.
**Validates: Requirements 12.3**

### Property 22: API Filter Parameter Support
*For any* Phase 1 filterable field, the API must accept that field as a query parameter and return appropriately filtered results.
**Validates: Requirements 12.4**

### Property 23: API Validation Error Messages
*For any* invalid Phase 1 field value sent to the API, the error response must include field-specific validation details.
**Validates: Requirements 12.5**

## Error Handling

### Error Scenarios and Responses

1. **Duplicate Seller Number**
   - Status: 409 Conflict
   - Message: "Seller number already exists"
   - Action: Retry with new number generation

2. **Invalid Inquiry Source**
   - Status: 400 Bad Request
   - Message: "Invalid inquiry source code"
   - Details: List of valid codes

3. **Missing Required Fields**
   - Status: 400 Bad Request
   - Message: "Missing required fields: inquirySource, inquiryYear, inquiryDate"
   - Details: Field-specific validation errors

4. **First Caller Modification Attempt**
   - Status: 403 Forbidden
   - Message: "First caller cannot be modified once set"
   - Details: Current first caller information

5. **Duplicate Detection Warning**
   - Status: 200 OK (with warning flag)
   - Response includes: `{ hasDuplicates: true, matches: [...], canProceed: true }`

6. **Seller Number Generation Failure**
   - Status: 500 Internal Server Error
   - Message: "Failed to generate seller number"
   - Action: Retry with exponential backoff

## Testing Strategy

### Unit Testing

Unit tests will cover:
- Seller number generation logic
- Seller number format validation
- Duplicate detection algorithms
- First caller immutability enforcement
- Inquiry date validation
- Confidence level enum validation
- API request/response serialization

### Property-Based Testing

We will use **fast-check** (already in devDependencies) for property-based testing.

Each property-based test will:
- Run a minimum of 100 iterations
- Be tagged with the format: `**Feature: seller-list-phase1, Property {number}: {property_text}**`
- Test universal properties across randomly generated inputs

Property tests will cover:
- Seller number uniqueness across concurrent creations
- Sequential number generation under various creation patterns
- Duplicate detection with various phone/email formats
- Filter and sort operations with random data sets
- API validation with random invalid inputs

### Integration Testing

Integration tests will verify:
- Database migration execution and rollback
- End-to-end seller creation with duplicate detection
- API endpoints with Phase 1 fields
- Duplicate history recording and retrieval
- Concurrent seller number generation

### Migration Testing

Migration tests will:
- Test migration on empty database
- Test migration with existing sellers (various counts)
- Verify data integrity before and after migration
- Test rollback procedures
- Measure migration performance

## Performance Considerations

### Seller Number Generation

- Use database-level atomic operations for sequence increment
- Implement retry logic with exponential backoff for conflicts
- Cache current sequence number with TTL for read operations

### Duplicate Detection

- Leverage existing phone_number and email indexes
- Implement query result caching for frequently checked numbers
- Consider batch duplicate checking for bulk imports

### Database Indexes

New indexes added:
- `idx_sellers_seller_number` (unique, B-tree)
- `idx_sellers_inquiry_source` (B-tree)
- `idx_sellers_inquiry_date` (B-tree, DESC)
- `idx_sellers_is_unreachable` (B-tree)
- `idx_sellers_confidence_level` (B-tree)

Expected impact:
- Seller number lookups: O(log n)
- Duplicate detection: O(log n) per field
- Filtered queries: 10-100x faster depending on selectivity

## Security Considerations

### Data Encryption

- Phone numbers and emails remain encrypted in the sellers table
- Duplicate detection operates on encrypted values
- Historical data in seller_history table is also encrypted

### Access Control

- First caller modification requires admin role
- Duplicate confirmation records the confirming employee
- Seller number generation is system-controlled (not user-provided)

### Input Validation

- Sanitize all inquiry source codes
- Validate date ranges for inquiry dates
- Prevent SQL injection in filter parameters
- Rate limit duplicate check API to prevent enumeration attacks

## Migration Plan

### Phase 1 Migration Steps

1. **Pre-migration**
   - Backup database
   - Verify current seller count
   - Test migration on staging environment

2. **Schema Migration**
   - Add new columns to sellers table
   - Create seller_number_sequence table
   - Create seller_history table
   - Create indexes

3. **Data Migration**
   - Generate seller numbers for existing sellers (ordered by created_at)
   - Set default values for new fields
   - Verify data integrity

4. **Post-migration**
   - Update application code to use new fields
   - Deploy backend changes
   - Deploy frontend changes
   - Monitor for errors

### Rollback Plan

If issues occur:
1. Revert application code to previous version
2. Drop new indexes
3. Drop new tables (seller_history, seller_number_sequence)
4. Remove new columns from sellers table
5. Restore from backup if data corruption occurred

## Future Enhancements

Phase 1 lays the groundwork for:
- Phase 2: Visit management enhancements
- Phase 3: Competitor tracking and contract management
- Phase 4: Valuation method expansion
- Phase 5: Integration with external systems (Pinrich, Google Chat)

The seller_number field will serve as a stable identifier across all future phases.
