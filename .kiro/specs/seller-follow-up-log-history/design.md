# Design Document

## Overview

This feature adds historical follow-up log data display to the call mode page. It retrieves legacy follow-up activity records from a Google Spreadsheet (previously managed in APPSHEET) and displays them in a read-only table format below the current follow-up log field. The system will leverage existing spreadsheet sync infrastructure and caching mechanisms to provide efficient data access.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Call Mode Page (Frontend)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Current Follow-Up Log Field (Existing)                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Historical Follow-Up Log Table (New)                  │ │
│  │  - Refresh Button                                      │ │
│  │  - Data Table with Columns                            │ │
│  │  - Loading/Error States                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Layer                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  GET /api/sellers/:sellerNumber/follow-up-logs/history │ │
│  │  - Fetch from cache or spreadsheet                     │ │
│  │  - Filter by seller number                            │ │
│  │  - Return formatted data                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              FollowUpLogHistoryService                       │
│  - Fetch data from Google Sheets                            │
│  - Map columns to data model                                │
│  - Filter by seller number                                  │
│  - Cache management (5-minute TTL)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CacheManager (Existing)                         │
│  - Store follow-up log data with freshness metadata         │
│  - Check cache age                                          │
│  - Invalidate stale data                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         GoogleSheetsClient (Existing)                        │
│  - Authenticate with Google Sheets API                      │
│  - Fetch data from spreadsheet                              │
│  - Handle API errors                                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initial Load**: When the call mode page loads, the frontend requests historical follow-up log data for the current seller
2. **Cache Check**: The backend checks if cached data exists and is fresh (< 5 minutes old)
3. **Fetch from Spreadsheet**: If cache is stale or missing, fetch data from Google Sheets
4. **Filter and Format**: Filter data by seller number and format for display
5. **Cache Update**: Store fetched data in cache with timestamp
6. **Return to Frontend**: Send formatted data to frontend for display
7. **Manual Refresh**: User can trigger manual refresh, which bypasses cache and fetches fresh data

## Components and Interfaces

### Backend Components

#### 1. FollowUpLogHistoryService

**Purpose**: Manages retrieval and caching of historical follow-up log data from Google Sheets.

**Methods**:
```typescript
class FollowUpLogHistoryService {
  /**
   * Get historical follow-up logs for a specific seller
   * @param sellerNumber - The seller number to filter by
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   * @returns Array of historical follow-up log entries
   */
  async getHistoricalLogs(
    sellerNumber: string, 
    forceRefresh: boolean = false
  ): Promise<FollowUpLogHistoryEntry[]>

  /**
   * Fetch all follow-up log data from spreadsheet
   * @returns Raw spreadsheet data
   */
  private async fetchFromSpreadsheet(): Promise<any[][]>

  /**
   * Map spreadsheet row to FollowUpLogHistoryEntry
   * @param row - Raw spreadsheet row data
   * @returns Mapped follow-up log entry
   */
  private mapRowToEntry(row: any[]): FollowUpLogHistoryEntry

  /**
   * Filter entries by seller number
   * @param entries - All follow-up log entries
   * @param sellerNumber - Seller number to filter by
   * @returns Filtered entries
   */
  private filterBySellerNumber(
    entries: FollowUpLogHistoryEntry[], 
    sellerNumber: string
  ): FollowUpLogHistoryEntry[]
}
```

#### 2. API Route Handler

**Endpoint**: `GET /api/sellers/:sellerNumber/follow-up-logs/history`

**Query Parameters**:
- `refresh` (optional): If "true", force refresh from spreadsheet

**Response**:
```typescript
{
  success: boolean;
  data: FollowUpLogHistoryEntry[];
  cached: boolean;
  lastUpdated: string; // ISO timestamp
}
```

**Error Response**:
```typescript
{
  success: false;
  error: string;
  message: string;
}
```

### Frontend Components

#### 1. FollowUpLogHistoryTable Component

**Purpose**: Display historical follow-up log data in a table format.

**Props**:
```typescript
interface FollowUpLogHistoryTableProps {
  sellerNumber: string;
}
```

**State**:
```typescript
interface FollowUpLogHistoryState {
  data: FollowUpLogHistoryEntry[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshing: boolean;
}
```

**Features**:
- Automatic data fetch on mount
- Manual refresh button
- Loading and error states
- Responsive table layout
- Date formatting
- Visual indicators for boolean fields

#### 2. Integration with Call Mode Page

The `FollowUpLogHistoryTable` component will be added to the existing call mode page below the current follow-up log field, with clear visual separation.

## Data Models

### FollowUpLogHistoryEntry

```typescript
interface FollowUpLogHistoryEntry {
  // Core fields
  date: Date;                          // 日付
  followUpLogId: string;               // 追客ログID
  sellerNumber: string;                // 売主番号
  comment: string;                     // コメント
  
  // Assignee fields
  assigneeFirstHalf: string;           // 担当者（前半）
  assigneeSecondHalf: string;          // 担当者（後半）
  assigneeAll: string;                 // 担当者（全）
  assigneeHalf: string;                // 担当者（半）
  
  // Status fields
  firstHalfCompleted: boolean;         // 前半完了
  secondHalfCompleted: boolean;        // 後半完了
  secondCallDueToNoAnswer: boolean;    // 不在による2回目架電
}
```

### Column Mapping Configuration

```json
{
  "spreadsheetId": "1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I",
  "sheetName": "売主追客ログ",
  "columnMapping": {
    "date": "A",
    "followUpLogId": "B",
    "sellerNumber": "C",
    "comment": "D",
    "assigneeFirstHalf": "E",
    "assigneeSecondHalf": "F",
    "assigneeAll": "G",
    "assigneeHalf": "H",
    "firstHalfCompleted": "I",
    "secondHalfCompleted": "J",
    "secondCallDueToNoAnswer": "K"
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Data Filtering Correctness
*For any* seller number and any set of follow-up log entries, filtering by that seller number should return only entries where the sellerNumber field matches exactly.
**Validates: Requirements 1.5**

### Property 2: Chronological Ordering
*For any* set of follow-up log entries, when sorted for display, each entry's date should be greater than or equal to the date of the entry that follows it (most recent first).
**Validates: Requirements 1.3**

### Property 3: Cache Freshness
*For any* cached follow-up log data, if the cache timestamp is older than 5 minutes, the system should fetch fresh data from the spreadsheet.
**Validates: Requirements 7.2**

### Property 4: Column Mapping Completeness
*For any* spreadsheet row with all required columns present, mapping that row to a FollowUpLogHistoryEntry should produce an entry with all fields populated (no undefined values for required fields).
**Validates: Requirements 1.2, 3.1-3.5**

### Property 5: Refresh Idempotence
*For any* follow-up log data state, performing a refresh operation twice in succession should result in the same data being displayed (assuming no changes in the spreadsheet).
**Validates: Requirements 6.2, 6.4**

### Property 6: Error Handling Preservation
*For any* error state during data fetch, the system should preserve existing cached data and display it to the user rather than clearing the display.
**Validates: Requirements 4.2, 6.5, 7.5**

## Error Handling

### Spreadsheet Access Errors

**Scenarios**:
- Network timeout
- Authentication failure
- Spreadsheet not found
- Permission denied
- Rate limit exceeded

**Handling**:
1. Log error with full context (spreadsheet ID, sheet name, error details)
2. Return cached data if available
3. Display user-friendly error message
4. Provide retry mechanism (manual refresh button)

### Data Parsing Errors

**Scenarios**:
- Invalid date format
- Missing required columns
- Unexpected data types

**Handling**:
1. Log parsing error with row details
2. Skip invalid rows and continue processing valid data
3. Include warning in response about skipped rows
4. Display partial data with warning message

### Cache Errors

**Scenarios**:
- Redis connection failure
- Cache corruption
- Memory limits exceeded

**Handling**:
1. Fall back to direct spreadsheet fetch
2. Log cache error
3. Continue operation without caching
4. Display data normally to user

## Testing Strategy

### Unit Tests

1. **FollowUpLogHistoryService Tests**
   - Test data fetching from spreadsheet
   - Test column mapping logic
   - Test filtering by seller number
   - Test cache hit/miss scenarios
   - Test error handling for various failure modes

2. **Column Mapper Tests**
   - Test mapping of all column types
   - Test handling of missing columns
   - Test date parsing
   - Test boolean field conversion

3. **API Route Tests**
   - Test successful data retrieval
   - Test force refresh parameter
   - Test error responses
   - Test authentication/authorization

### Integration Tests

1. **End-to-End Data Flow**
   - Test complete flow from API request to spreadsheet fetch
   - Test cache integration
   - Test data filtering and formatting

2. **Frontend Component Tests**
   - Test component rendering with data
   - Test loading states
   - Test error states
   - Test refresh button functionality

### Property-Based Tests

Property-based tests will be implemented for each correctness property defined above, using a suitable PBT library for TypeScript (e.g., fast-check).

## Performance Considerations

### Caching Strategy

- **Cache Key**: `follow-up-log-history:all`
- **TTL**: 5 minutes
- **Invalidation**: Manual refresh bypasses cache
- **Storage**: Redis (via existing CacheManager)

### Data Volume

- Expected: ~1000-5000 total records
- Per seller: ~10-50 records average
- Spreadsheet fetch: ~1-2 seconds
- Cache retrieval: <100ms

### Optimization Techniques

1. **Lazy Loading**: Only fetch data when call mode page is accessed
2. **Client-Side Filtering**: After initial fetch, filter in memory
3. **Pagination**: If record count exceeds 100 per seller, implement pagination
4. **Virtual Scrolling**: For large datasets, render only visible rows

## Security Considerations

### Authentication

- Use existing Google Sheets API authentication
- Service account credentials stored securely in environment variables
- No user-level authentication required (read-only access)

### Authorization

- Verify user has access to seller record before returning follow-up log data
- Use existing middleware for seller access control

### Data Privacy

- Follow-up log data contains sensitive seller information
- Ensure data is only accessible to authorized users
- Log access for audit purposes

## Deployment Considerations

### Configuration

Add to `.env`:
```
FOLLOW_UP_LOG_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
FOLLOW_UP_LOG_SHEET_NAME=売主追客ログ
FOLLOW_UP_LOG_CACHE_TTL=300
```

### Migration

No database migration required (read-only feature).

### Rollback Plan

If issues arise:
1. Remove frontend component from call mode page
2. Disable API endpoint
3. No data cleanup required (no writes)

### Monitoring

- Track API response times
- Monitor cache hit rate
- Log spreadsheet API errors
- Alert on high error rates

## Future Enhancements

1. **Search and Filter**: Add client-side search across comments and assignees
2. **Export**: Allow users to export historical data to CSV
3. **Archival**: Move old spreadsheet data to database for better performance
4. **Real-time Updates**: Implement webhook-based updates when spreadsheet changes
5. **Advanced Analytics**: Aggregate statistics on follow-up activities over time
