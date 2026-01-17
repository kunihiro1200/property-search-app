# Design Document: Buyer Detail API Error Fix

## Overview

This design addresses critical 404 errors occurring on the buyer detail page when fetching related buyers and inquiry history. The root cause is improper UUID validation and error handling in the API endpoints. The solution involves implementing robust UUID validation, improving error handling, and ensuring data retrieval logic correctly identifies related buyers.

## Architecture

### Current System Flow

```
Frontend (BuyerDetailPage)
  ├─> RelatedBuyersSection → GET /buyers/:id/related
  └─> UnifiedInquiryHistoryTable → GET /buyers/:id/unified-inquiry-history
```

### Proposed System Flow

```
Frontend (BuyerDetailPage)
  ├─> RelatedBuyersSection → GET /buyers/:id/related
  │     └─> UUID Validation Middleware
  │           └─> RelatedBuyerService.findRelatedBuyers()
  │                 └─> Database Query (indexed on email, phone)
  │
  └─> UnifiedInquiryHistoryTable → GET /buyers/:id/unified-inquiry-history
        └─> UUID Validation Middleware
              └─> RelatedBuyerService.getUnifiedInquiryHistory()
                    └─> Database Query with JOIN
```

## Components and Interfaces

### 1. UUID Validation Middleware

**Purpose**: Validate UUID format before processing requests

**Location**: `backend/src/middleware/uuidValidator.ts`

**Interface**:
```typescript
interface UUIDValidationResult {
  isValid: boolean;
  error?: string;
}

function validateUUID(uuid: string): UUIDValidationResult;
function uuidValidationMiddleware(req: Request, res: Response, next: NextFunction): void;
```

**Implementation Strategy**:
- Use regex pattern: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Return 400 Bad Request for invalid UUIDs
- Log validation failures with request context
- Support both UUID and buyer_number formats

### 2. Enhanced RelatedBuyerService

**Current Issues**:
- No UUID validation before database queries
- Insufficient error handling for missing buyers
- No caching mechanism

**Proposed Enhancements**:

```typescript
class RelatedBuyerService {
  // Add UUID validation
  private validateBuyerId(buyerId: string): void {
    if (!this.isValidUUID(buyerId)) {
      throw new ValidationError('Invalid buyer ID format');
    }
  }

  // Enhanced findRelatedBuyers with validation
  async findRelatedBuyers(buyerId: string): Promise<RelatedBuyer[]> {
    this.validateBuyerId(buyerId);
    
    try {
      const currentBuyer = await this.getBuyerById(buyerId);
      if (!currentBuyer) {
        return []; // Return empty array instead of throwing
      }
      
      // Existing logic...
    } catch (error) {
      this.logger.error('Failed to find related buyers', { buyerId, error });
      throw new ServiceError('Failed to retrieve related buyers', error);
    }
  }

  // Enhanced getUnifiedInquiryHistory with validation
  async getUnifiedInquiryHistory(buyerIds: string[]): Promise<InquiryHistory[]> {
    // Validate all buyer IDs
    buyerIds.forEach(id => this.validateBuyerId(id));
    
    if (buyerIds.length === 0) {
      return [];
    }
    
    try {
      // Existing logic with improved error handling...
    } catch (error) {
      this.logger.error('Failed to get unified inquiry history', { buyerIds, error });
      throw new ServiceError('Failed to retrieve inquiry history', error);
    }
  }
}
```

### 3. API Route Enhancements

**Location**: `backend/src/routes/buyers.ts`

**Changes**:

```typescript
// Add UUID validation middleware
import { uuidValidationMiddleware } from '../middleware/uuidValidator';

// Enhanced /buyers/:id/related endpoint
router.get('/:id/related', 
  uuidValidationMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Handle both UUID and buyer_number
      let buyerId = id;
      if (!isValidUUID(id)) {
        const buyer = await buyerService.getByBuyerNumber(id);
        if (!buyer) {
          return res.status(404).json({ 
            error: 'Buyer not found',
            buyer_id: id 
          });
        }
        buyerId = buyer.id;
      }
      
      const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
      
      res.json({
        related_buyers: relatedBuyers,
        total_count: relatedBuyers.length
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      
      console.error('Error fetching related buyers:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch related buyers'
      });
    }
  }
);

// Enhanced /buyers/:id/unified-inquiry-history endpoint
router.get('/:id/unified-inquiry-history',
  uuidValidationMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Handle both UUID and buyer_number
      let buyerId = id;
      if (!isValidUUID(id)) {
        const buyer = await buyerService.getByBuyerNumber(id);
        if (!buyer) {
          return res.status(404).json({ 
            error: 'Buyer not found',
            buyer_id: id 
          });
        }
        buyerId = buyer.id;
      }
      
      // Get related buyers
      const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
      const allBuyerIds = [buyerId, ...relatedBuyers.map(rb => rb.id)];
      
      // Get unified inquiry history
      const inquiries = await relatedBuyerService.getUnifiedInquiryHistory(allBuyerIds);
      
      res.json({
        inquiries,
        buyer_count: allBuyerIds.length
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      
      console.error('Error fetching unified inquiry history:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch inquiry history'
      });
    }
  }
);
```

### 4. Frontend Error Handling Enhancements

**RelatedBuyersSection.tsx**:

```typescript
const fetchRelatedBuyers = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await api.get(`/buyers/${buyerId}/related`);
    setRelatedBuyers(response.data.related_buyers || []);
  } catch (err: any) {
    console.error('Failed to fetch related buyers', err);
    
    // Specific error handling
    if (err.response?.status === 404) {
      setError('買主が見つかりません');
    } else if (err.response?.status === 400) {
      setError('無効な買主IDです');
    } else {
      setError('関連買主の取得に失敗しました');
    }
    
    // Set empty array to prevent UI breaking
    setRelatedBuyers([]);
  } finally {
    setLoading(false);
  }
};
```

**UnifiedInquiryHistoryTable.tsx**:

```typescript
const fetchUnifiedHistory = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await api.get(`/buyers/${buyerId}/unified-inquiry-history`);
    setInquiries(response.data.inquiries || []);
    setBuyerNumbers(response.data.buyer_numbers || []);
  } catch (err: any) {
    console.error('Failed to fetch unified inquiry history', err);
    
    // Specific error handling
    if (err.response?.status === 404) {
      setError('買主が見つかりません');
    } else if (err.response?.status === 400) {
      setError('無効な買主IDです');
    } else {
      setError('統合問合せ履歴の取得に失敗しました');
    }
    
    // Set empty arrays to prevent UI breaking
    setInquiries([]);
    setBuyerNumbers([]);
  } finally {
    setLoading(false);
  }
};
```

## Data Models

### Buyer Model (Existing)

```typescript
interface Buyer {
  id: string;                    // UUID (primary key)
  buyer_number: string;          // Numeric identifier
  name: string | null;
  phone_number: string | null;   // Indexed for related buyer search
  email: string | null;          // Indexed for related buyer search
  property_number: string | null;
  reception_date: Date | null;
  // ... other fields
}
```

### RelatedBuyer Model (Enhanced)

```typescript
interface RelatedBuyer extends Buyer {
  relation_type: 'multiple_inquiry' | 'possible_duplicate';
  match_reason: 'phone' | 'email' | 'both';
  confidence_score?: number;     // NEW: 0-100 match confidence
}
```

### InquiryHistory Model (Enhanced)

```typescript
interface InquiryHistory {
  buyer_id: string;
  buyer_number: string;
  property_id: string | null;
  property_number: string;
  reception_date: Date;
  property_address: string | null;
  status: string | null;
  is_current_buyer: boolean;     // NEW: Distinguish current vs related
}
```

### API Response Models

```typescript
// GET /buyers/:id/related
interface RelatedBuyersResponse {
  related_buyers: RelatedBuyer[];
  total_count: number;
  current_buyer?: Buyer;         // Optional: include current buyer info
}

// GET /buyers/:id/unified-inquiry-history
interface UnifiedInquiryHistoryResponse {
  inquiries: InquiryHistory[];
  buyer_count: number;
  buyer_numbers?: string[];      // Optional: list of all buyer numbers
}

// Error Response
interface ErrorResponse {
  error: string;
  message?: string;
  buyer_id?: string;
  timestamp?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: UUID Validation Consistency

*For any* API request with a buyer ID parameter, if the ID is not a valid UUID format and not a valid buyer_number, the system should return status 400 with a descriptive error message.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 2: Related Buyers Exclusion

*For any* buyer ID, the related buyers list should never include the buyer itself (self-exclusion property).

**Validates: Requirements 5.4**

### Property 3: Empty Result Handling

*For any* valid buyer ID that exists but has no related buyers, the API should return status 200 with an empty array, not a 404 error.

**Validates: Requirements 1.3, 2.3**

### Property 4: Email/Phone Match Symmetry

*For any* two buyers A and B, if A appears in B's related buyers list due to matching email/phone, then B should appear in A's related buyers list with the same match reason.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 5: Inquiry History Completeness

*For any* buyer with related buyers, the unified inquiry history should include all inquiries from the current buyer and all related buyers, with no duplicates.

**Validates: Requirements 6.1, 6.2**

### Property 6: Date Ordering Consistency

*For any* inquiry history response, all inquiries should be ordered by reception_date in descending order (most recent first).

**Validates: Requirements 5.5, 6.4**

### Property 7: Error Response Structure

*For any* API error (400, 404, 500), the response should include an "error" field with a descriptive message and appropriate HTTP status code.

**Validates: Requirements 7.2, 7.3, 7.4**

### Property 8: Property Data Graceful Degradation

*For any* inquiry history item where property data is missing, the system should include the inquiry with null property fields rather than excluding the entire inquiry.

**Validates: Requirements 6.5**

### Property 9: Buyer Number to UUID Resolution

*For any* buyer_number that exists in the database, the API should successfully resolve it to a UUID and process the request identically to a direct UUID request.

**Validates: Requirements 4.1, 4.5**

### Property 10: Related Buyers Limit

*For any* buyer ID, the related buyers list should contain at most 50 buyers, ordered by most recent reception_date.

**Validates: Requirements 8.2**

## Error Handling

### Error Types

```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

class ServiceError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ServiceError';
  }
}
```

### Error Handling Strategy

1. **Validation Errors (400)**:
   - Invalid UUID format
   - Missing required parameters
   - Invalid parameter types

2. **Not Found Errors (404)**:
   - Buyer ID doesn't exist
   - Return empty arrays for related data instead of 404

3. **Server Errors (500)**:
   - Database connection failures
   - Unexpected exceptions
   - Log full error details for debugging

4. **Frontend Error Handling**:
   - Display user-friendly error messages
   - Provide retry buttons for failed requests
   - Continue displaying other sections on partial failures
   - Log errors to console for debugging

### Logging Strategy

```typescript
interface LogContext {
  buyerId?: string;
  endpoint: string;
  error?: Error;
  duration?: number;
  statusCode?: number;
}

function logAPIRequest(context: LogContext): void {
  console.log({
    timestamp: new Date().toISOString(),
    ...context
  });
}
```

## Testing Strategy

### Unit Tests

1. **UUID Validation Tests**:
   - Valid UUID formats
   - Invalid UUID formats
   - Null/undefined values
   - Buyer number formats

2. **RelatedBuyerService Tests**:
   - Finding related buyers by email
   - Finding related buyers by phone
   - Finding related buyers by both
   - Self-exclusion verification
   - Empty result handling

3. **API Route Tests**:
   - Valid UUID requests
   - Valid buyer_number requests
   - Invalid ID requests
   - Non-existent buyer requests
   - Error response formats

### Property-Based Tests

Each property test should run a minimum of 100 iterations with randomized inputs.

**Test 1: UUID Validation Consistency**
```typescript
// Feature: buyer-detail-api-error-fix, Property 1: UUID Validation Consistency
test('UUID validation should consistently reject invalid formats', () => {
  fc.assert(
    fc.property(
      fc.string(),
      (invalidUuid) => {
        fc.pre(!isValidUUID(invalidUuid));
        const result = validateUUID(invalidUuid);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 2: Related Buyers Exclusion**
```typescript
// Feature: buyer-detail-api-error-fix, Property 2: Related Buyers Exclusion
test('Related buyers should never include the buyer itself', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(),
      async (buyerId) => {
        const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
        expect(relatedBuyers.every(rb => rb.id !== buyerId)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 3: Empty Result Handling**
```typescript
// Feature: buyer-detail-api-error-fix, Property 3: Empty Result Handling
test('Empty related buyers should return 200 with empty array', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(),
      async (buyerId) => {
        // Assume buyer exists but has no related buyers
        const response = await request(app)
          .get(`/buyers/${buyerId}/related`);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body.related_buyers)).toBe(true);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 4: Email/Phone Match Symmetry**
```typescript
// Feature: buyer-detail-api-error-fix, Property 4: Email/Phone Match Symmetry
test('Related buyer relationships should be symmetric', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.tuple(fc.uuid(), fc.uuid()),
      async ([buyerIdA, buyerIdB]) => {
        const relatedToA = await relatedBuyerService.findRelatedBuyers(buyerIdA);
        const relatedToB = await relatedBuyerService.findRelatedBuyers(buyerIdB);
        
        const bInA = relatedToA.find(rb => rb.id === buyerIdB);
        const aInB = relatedToB.find(rb => rb.id === buyerIdA);
        
        // If B is related to A, then A should be related to B
        if (bInA) {
          expect(aInB).toBeDefined();
          expect(bInA.match_reason).toBe(aInB?.match_reason);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 5: Inquiry History Completeness**
```typescript
// Feature: buyer-detail-api-error-fix, Property 5: Inquiry History Completeness
test('Unified inquiry history should include all related buyer inquiries', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(),
      async (buyerId) => {
        const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
        const allBuyerIds = [buyerId, ...relatedBuyers.map(rb => rb.id)];
        
        const inquiries = await relatedBuyerService.getUnifiedInquiryHistory(allBuyerIds);
        
        // All inquiries should belong to one of the buyer IDs
        expect(inquiries.every(inq => 
          allBuyerIds.includes(inq.buyer_id)
        )).toBe(true);
        
        // No duplicate inquiries
        const uniqueKeys = new Set(inquiries.map(inq => 
          `${inq.buyer_id}-${inq.property_number}-${inq.reception_date}`
        ));
        expect(uniqueKeys.size).toBe(inquiries.length);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 6: Date Ordering Consistency**
```typescript
// Feature: buyer-detail-api-error-fix, Property 6: Date Ordering Consistency
test('Inquiry history should be ordered by date descending', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(),
      async (buyerId) => {
        const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
        const allBuyerIds = [buyerId, ...relatedBuyers.map(rb => rb.id)];
        
        const inquiries = await relatedBuyerService.getUnifiedInquiryHistory(allBuyerIds);
        
        // Check ordering
        for (let i = 0; i < inquiries.length - 1; i++) {
          const current = new Date(inquiries[i].reception_date);
          const next = new Date(inquiries[i + 1].reception_date);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 7: Error Response Structure**
```typescript
// Feature: buyer-detail-api-error-fix, Property 7: Error Response Structure
test('Error responses should have consistent structure', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.string(),
      async (invalidId) => {
        fc.pre(!isValidUUID(invalidId));
        
        const response = await request(app)
          .get(`/buyers/${invalidId}/related`);
        
        if (response.status >= 400) {
          expect(response.body).toHaveProperty('error');
          expect(typeof response.body.error).toBe('string');
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 8: Property Data Graceful Degradation**
```typescript
// Feature: buyer-detail-api-error-fix, Property 8: Property Data Graceful Degradation
test('Missing property data should not exclude inquiries', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(),
      async (buyerId) => {
        const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
        const allBuyerIds = [buyerId, ...relatedBuyers.map(rb => rb.id)];
        
        const inquiries = await relatedBuyerService.getUnifiedInquiryHistory(allBuyerIds);
        
        // Inquiries with null property_address should still be included
        const inquiriesWithNullAddress = inquiries.filter(inq => 
          inq.property_address === null
        );
        
        // These inquiries should still have other required fields
        inquiriesWithNullAddress.forEach(inq => {
          expect(inq.buyer_id).toBeDefined();
          expect(inq.property_number).toBeDefined();
          expect(inq.reception_date).toBeDefined();
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 9: Buyer Number to UUID Resolution**
```typescript
// Feature: buyer-detail-api-error-fix, Property 9: Buyer Number to UUID Resolution
test('Buyer number should resolve to same result as UUID', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.nat({ max: 10000 }).map(n => String(n)),
      async (buyerNumber) => {
        // Get buyer by number
        const buyer = await buyerService.getByBuyerNumber(buyerNumber);
        if (!buyer) return; // Skip if buyer doesn't exist
        
        // Fetch related buyers using both ID formats
        const byUuid = await request(app).get(`/buyers/${buyer.id}/related`);
        const byNumber = await request(app).get(`/buyers/${buyerNumber}/related`);
        
        // Results should be identical
        expect(byUuid.status).toBe(byNumber.status);
        if (byUuid.status === 200) {
          expect(byUuid.body.related_buyers).toEqual(byNumber.body.related_buyers);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Test 10: Related Buyers Limit**
```typescript
// Feature: buyer-detail-api-error-fix, Property 10: Related Buyers Limit
test('Related buyers should be limited to 50 results', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.uuid(),
      async (buyerId) => {
        const relatedBuyers = await relatedBuyerService.findRelatedBuyers(buyerId);
        
        // Should not exceed 50 buyers
        expect(relatedBuyers.length).toBeLessThanOrEqual(50);
        
        // If exactly 50, should be ordered by most recent
        if (relatedBuyers.length === 50) {
          for (let i = 0; i < relatedBuyers.length - 1; i++) {
            const current = relatedBuyers[i].reception_date;
            const next = relatedBuyers[i + 1].reception_date;
            if (current && next) {
              expect(new Date(current).getTime()).toBeGreaterThanOrEqual(
                new Date(next).getTime()
              );
            }
          }
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Tests

1. **End-to-End Flow Tests**:
   - Create buyer → Fetch related buyers → Verify results
   - Create multiple buyers with same email → Verify they appear as related
   - Update buyer contact info → Verify related buyers update

2. **Error Scenario Tests**:
   - Invalid UUID → Verify 400 response
   - Non-existent buyer → Verify 404 response
   - Database connection failure → Verify 500 response

3. **Performance Tests**:
   - Measure response time for buyers with many related buyers
   - Verify query performance with database indexes
   - Test concurrent requests

## Implementation Notes

### Database Indexes

Ensure the following indexes exist for optimal performance:

```sql
-- Buyers table indexes
CREATE INDEX IF NOT EXISTS idx_buyers_email ON buyers(email);
CREATE INDEX IF NOT EXISTS idx_buyers_phone_number ON buyers(phone_number);
CREATE INDEX IF NOT EXISTS idx_buyers_reception_date ON buyers(reception_date DESC);

-- Property listings indexes
CREATE INDEX IF NOT EXISTS idx_property_listings_property_number ON property_listings(property_number);
```

### Caching Strategy

Implement caching for related buyers to reduce database load:

```typescript
class RelatedBuyerCache {
  private cache = new Map<string, { data: RelatedBuyer[]; timestamp: number }>();
  private TTL = 5 * 60 * 1000; // 5 minutes

  get(buyerId: string): RelatedBuyer[] | null {
    const cached = this.cache.get(buyerId);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(buyerId);
      return null;
    }
    
    return cached.data;
  }

  set(buyerId: string, data: RelatedBuyer[]): void {
    this.cache.set(buyerId, { data, timestamp: Date.now() });
  }

  invalidate(buyerId: string): void {
    this.cache.delete(buyerId);
  }
}
```

### Monitoring and Logging

Implement comprehensive logging for debugging:

```typescript
function logAPICall(
  endpoint: string,
  buyerId: string,
  duration: number,
  statusCode: number,
  error?: Error
): void {
  console.log({
    timestamp: new Date().toISOString(),
    endpoint,
    buyerId,
    duration,
    statusCode,
    error: error?.message,
    stack: error?.stack
  });
}
```

## Deployment Considerations

1. **Backward Compatibility**:
   - Maintain support for both UUID and buyer_number in API requests
   - Ensure existing frontend code continues to work

2. **Database Migration**:
   - Add indexes if they don't exist
   - No schema changes required

3. **Rollback Plan**:
   - Keep old API endpoints available during transition
   - Monitor error rates after deployment
   - Have rollback scripts ready

4. **Performance Monitoring**:
   - Track API response times
   - Monitor database query performance
   - Set up alerts for error rate increases
