# Design Document

## Overview

買主詳細ページにおける重複買主の問合せ履歴表示とGmail送信機能の問題を修正します。バックエンドAPIは既に重複買主の履歴を統合する実装になっていますが、フロントエンドでのエラーハンドリングと物件詳細取得の改善が必要です。

## Architecture

### Component Structure

```
BuyerDetailPage (Frontend)
├── InquiryHistoryTable (Component)
├── InquiryResponseEmailModal (Component)
└── API Calls
    ├── GET /api/buyers/:id/inquiry-history
    └── GET /api/property-listings/:id

BuyerService (Backend)
├── getInquiryHistory() - Already implements duplicate buyer history
└── Returns unified history from current and past buyers

PropertyListingService (Backend)
└── getById() - Fetch property listing details
```

### Data Flow

1. **Inquiry History Display**:
   - Frontend calls `/api/buyers/:id/inquiry-history`
   - Backend fetches current buyer and past buyers from `past_buyer_list`
   - Backend aggregates all property numbers from all related buyers
   - Backend fetches property listings and maps to inquiry history format
   - Frontend displays unified history with buyer number annotations

2. **Gmail Send**:
   - User selects properties from inquiry history table
   - User clicks Gmail send button
   - Frontend fetches full property details for selected properties
   - Frontend opens email modal with property details
   - User composes and sends email

## Components and Interfaces

### Frontend: BuyerDetailPage

**Current Issues**:
1. Error handling for inquiry history fetch is insufficient
2. Property details fetch in `handleGmailSend` fails with 404 errors
3. No validation that property listings exist before attempting fetch

**Improvements**:
```typescript
interface BuyerDetailPageState {
  inquiryHistoryTable: InquiryHistoryItem[];
  isLoadingHistory: boolean;
  selectedPropertyIds: Set<string>;
  // ... other state
}

// Enhanced error handling
const fetchInquiryHistoryTable = async () => {
  try {
    setIsLoadingHistory(true);
    const res = await api.get(`/api/buyers/${id}/inquiry-history`);
    
    // Validate response structure
    if (!res.data || !res.data.inquiryHistory) {
      throw new Error('Invalid response format');
    }
    
    setInquiryHistoryTable(res.data.inquiryHistory || []);
  } catch (error) {
    console.error('Failed to fetch inquiry history:', error);
    setSnackbar({
      open: true,
      message: '問い合わせ履歴の取得に失敗しました',
      severity: 'error',
    });
    setInquiryHistoryTable([]); // Set empty array on error
  } finally {
    setIsLoadingHistory(false);
  }
};

// Enhanced Gmail send with better error handling
const handleGmailSend = async () => {
  if (selectedPropertyIds.size === 0) {
    setSnackbar({
      open: true,
      message: '物件を選択してください',
      severity: 'warning',
    });
    return;
  }

  try {
    // Fetch full property details for selected properties
    const selectedProperties = await Promise.all(
      Array.from(selectedPropertyIds).map(async (propertyListingId) => {
        try {
          const res = await api.get(`/api/property-listings/${propertyListingId}`);
          return res.data;
        } catch (error: any) {
          console.error(`Failed to fetch property ${propertyListingId}:`, error);
          // Return null for failed fetches
          return null;
        }
      })
    );

    // Filter out null values (failed fetches)
    const validProperties = selectedProperties.filter(p => p !== null);

    if (validProperties.length === 0) {
      setSnackbar({
        open: true,
        message: '選択された物件の情報を取得できませんでした',
        severity: 'error',
      });
      return;
    }

    if (validProperties.length < selectedProperties.length) {
      setSnackbar({
        open: true,
        message: `${selectedProperties.length - validProperties.length}件の物件情報を取得できませんでした`,
        severity: 'warning',
      });
    }

    setEmailModalProperties(validProperties);
    setEmailModalOpen(true);
  } catch (error) {
    console.error('Failed to fetch property details:', error);
    setSnackbar({
      open: true,
      message: '物件情報の取得に失敗しました',
      severity: 'error',
    });
  }
};
```

### Backend: BuyerService.getInquiryHistory

**Current Implementation** (Already correct):
- Fetches current buyer
- Parses `past_buyer_list` to get duplicate buyer numbers
- Fetches property numbers from all related buyers
- Aggregates and deduplicates property numbers
- Fetches property listings
- Maps to inquiry history format with buyer number annotations
- Sorts by inquiry date

**No changes needed** - Implementation already handles duplicate buyers correctly.

### Backend: Property Listings API

**Issue**: Some property listing IDs in inquiry history may not exist in `property_listings` table.

**Root Cause Analysis**:
- Inquiry history references `property_listings.id`
- Some properties may have been deleted or not synced properly
- Need to handle missing properties gracefully

**Solution**: Add validation in frontend before attempting fetch.

## Data Models

### InquiryHistoryItem (Frontend)

```typescript
interface InquiryHistoryItem {
  buyerNumber: string;        // Which buyer number this inquiry came from
  propertyNumber: string;     // Property number (e.g., "AA12345")
  propertyAddress: string;    // Property address
  inquiryDate: string;        // Inquiry/reception date
  status: 'current' | 'past'; // Current buyer or past duplicate
  propertyId: string;         // Property listing ID
  propertyListingId: string;  // Same as propertyId
}
```

### Inquiry History Response (Backend)

```typescript
interface InquiryHistoryResponse {
  inquiryHistory: Array<{
    buyerNumber: string;
    propertyNumber: string;
    propertyAddress: string;
    inquiryDate: string;
    status: 'current' | 'past';
    propertyId: string;
    propertyListingId: string;
  }>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Inquiry History Completeness
*For any* buyer with duplicate records, the inquiry history should include all properties from all related buyer numbers (current and past).

**Validates: Requirements 1.1, 1.2**

### Property 2: Buyer Number Annotation
*For any* inquiry history item, the buyer number field should correctly identify which buyer number the inquiry came from.

**Validates: Requirements 1.3**

### Property 3: Status Marking
*For any* inquiry history item, items from the current buyer should be marked as 'current' and items from past duplicates should be marked as 'past'.

**Validates: Requirements 1.5**

### Property 4: Error Handling Graceful Degradation
*For any* API call that fails, the system should display an error message and continue functioning without crashing.

**Validates: Requirements 2.3, 3.1, 3.2**

### Property 5: Property Fetch Resilience
*For any* set of selected properties, if some property details cannot be fetched, the system should proceed with the properties that were successfully fetched.

**Validates: Requirements 2.2, 2.3**

### Property 6: Empty Selection Validation
*For any* Gmail send attempt with no properties selected, the system should display a warning message and not proceed.

**Validates: Requirements 2.4**

## Error Handling

### Frontend Error Scenarios

1. **Inquiry History Fetch Failure**:
   - Log error to console
   - Display user-friendly error message
   - Set inquiry history to empty array
   - Allow page to continue functioning

2. **Property Details Fetch Failure (404)**:
   - Log specific property ID that failed
   - Continue fetching other properties
   - Display warning if some properties failed
   - Proceed with successfully fetched properties

3. **All Property Details Fetch Failure**:
   - Display error message
   - Do not open email modal
   - Keep selection intact for retry

4. **No Properties Selected**:
   - Display warning message
   - Do not proceed with email send

### Backend Error Scenarios

1. **Buyer Not Found**:
   - Return 404 with clear error message
   - Include buyer ID in error message

2. **Property Listings Not Found**:
   - Return empty array (not an error)
   - Log warning for debugging

3. **Database Query Failure**:
   - Return 500 with error message
   - Log full error details for debugging

## Testing Strategy

### Unit Tests

1. **Frontend: fetchInquiryHistoryTable**
   - Test successful fetch with valid data
   - Test fetch with empty response
   - Test fetch with network error
   - Test fetch with invalid response format

2. **Frontend: handleGmailSend**
   - Test with no properties selected
   - Test with valid properties
   - Test with some properties returning 404
   - Test with all properties returning 404

3. **Backend: getInquiryHistory**
   - Test with buyer having no duplicates
   - Test with buyer having one duplicate
   - Test with buyer having multiple duplicates
   - Test with buyer not found
   - Test with properties not found

### Integration Tests

1. **End-to-End Inquiry History Display**
   - Create buyer with duplicates
   - Verify all properties from all buyers are displayed
   - Verify buyer numbers are correctly annotated
   - Verify status markers are correct

2. **End-to-End Gmail Send**
   - Select properties from inquiry history
   - Click Gmail send button
   - Verify email modal opens with correct properties
   - Verify error handling for missing properties

### Property-Based Tests

1. **Property 1: Inquiry History Completeness**
   - Generate random buyer with random number of duplicates
   - Generate random properties for each buyer
   - Verify inquiry history includes all properties

2. **Property 4: Error Handling Graceful Degradation**
   - Generate random API errors
   - Verify system continues functioning
   - Verify error messages are displayed

## Implementation Notes

### Key Changes Required

1. **Frontend: BuyerDetailPage.tsx**
   - Enhance error handling in `fetchInquiryHistoryTable`
   - Enhance error handling in `handleGmailSend`
   - Add validation for empty responses
   - Add resilience for partial property fetch failures

2. **Backend: No changes required**
   - Current implementation already handles duplicate buyers correctly
   - API returns unified history with proper annotations

### Migration Strategy

1. Deploy backend changes (none required)
2. Deploy frontend changes
3. Test with known duplicate buyers (e.g., 6647 and 6648)
4. Monitor error logs for any remaining issues

### Performance Considerations

- Inquiry history fetch may be slow for buyers with many duplicates
- Consider caching inquiry history results
- Consider pagination for large inquiry histories

### Security Considerations

- Ensure user has permission to view buyer details
- Validate buyer ID format to prevent injection
- Sanitize error messages to avoid exposing sensitive data
