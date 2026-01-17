# Task 3 Complete: Email History API Implementation

## Summary

Task 3 (バックエンド - メール送信履歴API) has been successfully completed. This includes the creation of the EmailHistoryService and the implementation of email history tracking endpoints.

## Completed Work

### 3.1 EmailHistoryService Created ✅

**File**: `backend/src/services/EmailHistoryService.ts`

**Implemented Methods**:
- `saveEmailHistory(params)` - Saves email history records for each property sent to a buyer
- `getEmailHistory(buyerId)` - Retrieves all email history for a specific buyer
- `hasBeenEmailed(buyerId, propertyNumber)` - Checks if a property has been emailed to a buyer
- `getEmailedProperties(buyerId)` - Gets all properties that have been emailed to a buyer

**Key Features**:
- Handles duplicate constraint gracefully (logs but doesn't fail)
- Creates one record per property per email send
- Sorts history by sent_at descending (most recent first)
- Proper error handling and logging

### 3.3 POST /api/buyers/:buyerId/email-history Endpoint ✅

**File**: `backend/src/routes/buyers.ts`

**Endpoint**: `POST /api/buyers/:buyerId/email-history`

**Request Body**:
```typescript
{
  propertyNumbers: string[];
  recipientEmail: string;
  subject: string;
  body: string;
  sentBy: string;
  emailType?: string;
}
```

**Response**:
```typescript
{
  success: true;
  message: "Email history saved successfully";
  historyIds: number[];
}
```

**Validation**:
- Validates propertyNumbers is non-empty array
- Validates recipientEmail is provided
- Validates subject and body are provided
- Validates sentBy is provided
- Returns 400 for validation errors
- Returns 500 for server errors

### 3.4 GET /api/buyers/:buyerId/email-history Endpoint ✅

**File**: `backend/src/routes/buyers.ts`

**Endpoint**: `GET /api/buyers/:buyerId/email-history`

**Response**:
```typescript
{
  emailHistory: Array<{
    id: number;
    buyerId: string;
    propertyNumber: string;
    sentAt: Date;
    emailType: string;
    createdAt: Date;
  }>
}
```

**Features**:
- Returns all email history for the buyer
- Sorted by sent_at descending
- Proper error handling

## Additional Work Completed

### 4.3 InquiryResponseService Updated ✅

**File**: `backend/src/services/InquiryResponseService.ts`

**Changes**:
- Added `EmailHistoryService` import and initialization
- Updated `InquiryResponseEmailParams` interface to include optional `buyerId`
- Modified `sendInquiryResponseEmail()` to save email history after successful send
- Email history save errors are logged but don't fail the email send

**Updated Flow**:
1. Send email via EmailService
2. If successful and buyerId provided:
   - Save email history for each property
   - Log errors but continue (don't fail the send)
3. Return success result

### InquiryResponse Routes Updated ✅

**File**: `backend/src/routes/inquiryResponse.ts`

**Changes**:
- Updated `POST /api/inquiry-response/send` to accept optional `buyerId` in request body
- Passes `buyerId` to `sendInquiryResponseEmail()` for history tracking

## Database Schema

The `email_history` table was already created in migration 056:

```sql
CREATE TABLE IF NOT EXISTS email_history (
    id SERIAL PRIMARY KEY,
    buyer_id TEXT NOT NULL REFERENCES buyers(buyer_id) ON DELETE CASCADE,
    property_number TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_type TEXT,
    UNIQUE(buyer_id, property_number, email_type),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_email_history_buyer_id` - For buyer lookups
- `idx_email_history_property_number` - For property lookups
- `idx_email_history_sent_at` - For date sorting

## API Usage Examples

### Save Email History

```bash
POST /api/buyers/6647/email-history
Content-Type: application/json

{
  "propertyNumbers": ["AA12345", "AA12346"],
  "recipientEmail": "buyer@example.com",
  "subject": "物件のご案内",
  "body": "...",
  "sentBy": "yamada@ifoo-oita.com",
  "emailType": "inquiry_response"
}
```

### Get Email History

```bash
GET /api/buyers/6647/email-history
```

Response:
```json
{
  "emailHistory": [
    {
      "id": 1,
      "buyerId": "6647",
      "propertyNumber": "AA12345",
      "sentAt": "2024-01-15T10:30:00Z",
      "emailType": "inquiry_response",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "buyerId": "6647",
      "propertyNumber": "AA12346",
      "sentAt": "2024-01-15T10:30:00Z",
      "emailType": "inquiry_response",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Send Email with History Tracking

```bash
POST /api/inquiry-response/send
Content-Type: application/json

{
  "propertyNumbers": ["AA12345"],
  "buyerName": "山田太郎",
  "buyerEmail": "buyer@example.com",
  "senderAddress": "yamada@ifoo-oita.com",
  "buyerId": "6647",
  "emailContent": {
    "subject": "物件のご案内",
    "body": "..."
  }
}
```

## Testing Recommendations

### Manual Testing

1. **Test email history save**:
   - Send POST request to `/api/buyers/:buyerId/email-history`
   - Verify response contains historyIds
   - Check database for created records

2. **Test email history retrieval**:
   - Send GET request to `/api/buyers/:buyerId/email-history`
   - Verify all history records are returned
   - Verify sorting (most recent first)

3. **Test duplicate constraint**:
   - Send same email history twice
   - Verify second request logs but doesn't fail
   - Verify only one record exists in database

4. **Test email send with history**:
   - Send email via `/api/inquiry-response/send` with buyerId
   - Verify email is sent
   - Verify history is saved
   - Check database for email_history records

### Integration Testing

Test the complete flow:
1. Get buyer inquiry history
2. Select properties
3. Send email with buyerId
4. Verify email history is saved
5. Retrieve email history
6. Verify new records appear

## Next Steps

### Task 4.1: Update Email Content Generation

The next task is to update `InquiryResponseService.generateEmailContent()` to include pre-viewing notes in the email body. This is already partially implemented (the service fetches pre-viewing info from the spreadsheet), but may need formatting updates.

### Task 5: Backend Checkpoint

After Task 4 is complete, we should:
1. Test all backend endpoints
2. Verify email history is saved correctly
3. Verify pre-viewing notes are included in emails
4. Check error handling

### Task 6+: Frontend Implementation

Once backend is verified, proceed with frontend implementation:
- InquiryHistoryTable component
- BuyerDetailPage updates
- InquiryResponseEmailModal updates

## Notes

- Email history save errors are logged but don't fail the email send (graceful degradation)
- The unique constraint prevents duplicate sends of the same property to the same buyer
- The service supports multiple email types (inquiry_response, distribution, etc.)
- All timestamps are stored with timezone information
- The buyer_id references buyers(buyer_id) with CASCADE delete

## Files Modified

1. `backend/src/services/EmailHistoryService.ts` - Created
2. `backend/src/services/InquiryResponseService.ts` - Updated
3. `backend/src/routes/buyers.ts` - Updated
4. `backend/src/routes/inquiryResponse.ts` - Updated
5. `.kiro/specs/buyer-detail-property-email-selection/tasks.md` - Updated

## Migration Status

Migration 056 is ready to execute. The SQL has been generated and needs to be run in Supabase SQL Editor:

```bash
npx ts-node migrations/run-056-migration.ts
```

Then copy the SQL output and run it in Supabase.
