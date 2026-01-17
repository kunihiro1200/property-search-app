# Design Document

## Overview

This design enhances the call history summary generation system to provide more accurate call counting, improved chronological ordering, and intelligent content summarization. The system will parse timestamps from spreadsheet comments, consolidate information from multiple sources, and generate concise, non-redundant summaries organized into predefined sections.

## Architecture

### Current System
- `/api/summarize/call-memos` endpoint receives an array of memo strings
- `generateSimpleSummary()` function extracts keywords and generates sections
- Simple keyword matching for content categorization
- No timestamp parsing from comments
- No deduplication or summarization logic

### Enhanced System
- Extend the existing summarize endpoint to accept structured data (communication history + spreadsheet comments)
- Add timestamp parsing module for extracting call dates from comments
- Add content summarization module for consolidating and condensing information
- Add intelligent categorization with deduplication
- Maintain backward compatibility with existing memo array format

## Components and Interfaces

### 1. TimestampParser

**Purpose**: Extract call timestamps from spreadsheet comments

**Interface**:
```typescript
interface TimestampParser {
  parseTimestamps(text: string): Date[];
  countCallsFromComments(comments: string[]): number;
}
```

**Implementation Details**:
- Regex pattern: `/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})/g`
- Handles single and double-digit months/days
- Supports 24-hour time format
- Returns array of Date objects for sorting
- Counts unique timestamps per comment

### 2. ContentSummarizer

**Purpose**: Consolidate and summarize information from multiple sources

**Interface**:
```typescript
interface ContentSummarizer {
  summarize(texts: string[], category: SummaryCategory): string;
  deduplicateContent(texts: string[]): string[];
  extractKeyFacts(text: string, keywords: string[]): string;
}

enum SummaryCategory {
  SITUATION = 'situation',
  OWNER = 'owner',
  TIMING = 'timing',
  REASON = 'reason',
  PROPERTY = 'property',
  CONFIDENCE = 'confidence',
  CONTACT = 'contact',
  OTHER = 'other'
}
```

**Implementation Details**:
- Sentence-level deduplication using similarity matching
- Keyword-based extraction with context
- Concatenation with intelligent truncation
- Preserves most important information (recent + keyword-rich)

### 3. CommentSorter

**Purpose**: Sort comments in reverse chronological order

**Interface**:
```typescript
interface CommentSorter {
  sortByTimestamp(comments: CommentEntry[]): CommentEntry[];
}

interface CommentEntry {
  text: string;
  timestamp?: Date;
  createdAt?: Date;
}
```

**Implementation Details**:
- Extract timestamps from comment text using TimestampParser
- Use most recent timestamp if multiple exist
- Fall back to createdAt if no timestamp found
- Sort in descending order (newest first)

### 4. Enhanced SummaryGenerator

**Purpose**: Generate comprehensive, non-redundant summaries

**Interface**:
```typescript
interface SummaryGenerator {
  generateEnhancedSummary(input: SummaryInput): string;
}

interface SummaryInput {
  communicationHistory: ActivityLog[];
  spreadsheetComments: string[];
  sellerData?: Partial<Seller>;
}
```

**Implementation Details**:
- Combine communication history and spreadsheet comments
- Parse timestamps for call counting
- Sort all entries by timestamp (newest first)
- Extract and summarize content by category
- Generate formatted output with sections

## Data Models

### Input Data Structure

```typescript
interface EnhancedSummaryRequest {
  sellerId: string;
  communicationHistory?: ActivityLog[];
  spreadsheetComments?: string[];
  // Backward compatibility
  memos?: string[];
}

interface ActivityLog {
  id: string;
  employeeId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, any>;
  createdAt: Date;
}
```

### Output Data Structure

```typescript
interface SummaryOutput {
  summary: string;
  metadata: {
    totalCalls: number;
    callsFromHistory: number;
    callsFromComments: number;
    sectionsGenerated: string[];
    oldestEntry: Date;
    newestEntry: Date;
  };
}
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Timestamp parsing accuracy
*For any* spreadsheet comment containing timestamp patterns in the format "[month]/[day] [hour]:[minute]", the parser should correctly extract all valid timestamps regardless of single or double-digit formatting
**Validates: Requirements 1.1, 5.1, 5.2, 5.3**

### Property 2: Call count accuracy
*For any* combination of communication history entries and spreadsheet comments with timestamps, the total call count should equal the sum of phone call activities in history plus unique timestamps in comments, with no duplicates
**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

### Property 3: Chronological ordering preservation
*For any* set of communication history entries and spreadsheet comments, when sorted by timestamp, the newest entry should appear first and the oldest entry should appear last in the output
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 4: Content deduplication
*For any* set of entries containing duplicate or highly similar information, the summarized output should contain each unique piece of information only once per section
**Validates: Requirements 3.2**

### Property 5: Section ordering consistency
*For any* generated summary, the sections should appear in the specified order: 次のアクション, 通話回数, 連絡可能時間, 状況, 名義人, 売却時期, 売却理由, 物件情報, 確度, その他
**Validates: Requirements 3.5**

### Property 6: Information categorization correctness
*For any* text containing category-specific keywords (situation, owner, timing, reason, property, confidence, contact), the information should be extracted and placed in the corresponding section
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**

### Property 7: Error resilience
*For any* comment containing malformed timestamps or causing parsing errors, the system should continue processing remaining comments and log errors without failing
**Validates: Requirements 5.4, 5.5**

### Property 8: Output format consistency
*For any* generated summary, each section should be labeled with the correct Japanese header format (e.g., "【通話回数】X回", "【状況】...", etc.)
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10**

## Error Handling

### Timestamp Parsing Errors
- **Invalid format**: Skip the malformed pattern, log warning, continue processing
- **Invalid date values**: Skip (e.g., 13/45 would be invalid), log warning
- **Ambiguous dates**: Assume current year if year not specified

### Content Extraction Errors
- **No matching keywords**: Place content in 【その他】 section
- **Empty sections**: Omit section from output entirely
- **Encoding issues**: Attempt UTF-8 decoding, log error if fails

### API Errors
- **Missing required data**: Return 400 with clear error message
- **Processing timeout**: Return 500 with retryable flag
- **Database errors**: Log error, return 500 with retryable flag

## Testing Strategy

### Unit Testing
- Test TimestampParser with various date/time formats
- Test ContentSummarizer deduplication logic
- Test CommentSorter with mixed timestamp sources
- Test keyword extraction for each category
- Test error handling for malformed inputs

### Property-Based Testing
We will use **fast-check** (JavaScript/TypeScript property-based testing library) to verify the correctness properties.

Each property-based test should:
- Run a minimum of 100 iterations
- Generate random but valid input data
- Verify the property holds for all generated inputs
- Be tagged with the property number and description

**Property Test Examples**:
1. Generate random comments with timestamps → verify all are parsed correctly
2. Generate random combinations of history + comments → verify call count is accurate
3. Generate random entry sets → verify chronological ordering
4. Generate entries with duplicate content → verify deduplication
5. Generate random summaries → verify section order
6. Generate text with category keywords → verify correct categorization
7. Generate malformed timestamps → verify error resilience
8. Generate random summaries → verify output format

### Integration Testing
- Test full summarize endpoint with real seller data
- Test backward compatibility with existing memo array format
- Test performance with large comment sets (100+ entries)
- Test with actual spreadsheet comment formats from production

### Manual Testing
- Review generated summaries for readability and accuracy
- Compare with examples provided in requirements
- Verify Japanese text formatting and labels
- Test with edge cases from production data

## Implementation Plan

### Phase 1: Core Parsing and Counting
1. Implement TimestampParser module
2. Extend summarize endpoint to accept structured data
3. Implement call counting logic with deduplication
4. Add unit tests for parsing and counting

### Phase 2: Sorting and Organization
1. Implement CommentSorter module
2. Add chronological sorting logic
3. Implement section ordering
4. Add unit tests for sorting

### Phase 3: Summarization and Categorization
1. Implement ContentSummarizer module
2. Add keyword-based categorization for each section
3. Implement deduplication logic
4. Add unit tests for summarization

### Phase 4: Integration and Output Formatting
1. Integrate all modules into SummaryGenerator
2. Implement output formatting with Japanese labels
3. Add error handling and logging
4. Add integration tests

### Phase 5: Property-Based Testing
1. Set up fast-check testing framework
2. Implement property tests for each correctness property
3. Run property tests with 100+ iterations
4. Fix any issues discovered by property tests

### Phase 6: Refinement and Optimization
1. Review generated summaries for quality
2. Tune keyword lists and extraction logic
3. Optimize performance for large datasets
4. Add caching if needed

## Performance Considerations

### Expected Load
- Typical: 10-50 entries per seller
- Maximum: 200+ entries for high-activity sellers
- Response time target: < 2 seconds

### Optimization Strategies
- Limit text processing to most recent 200 entries
- Cache parsed timestamps within request lifecycle
- Use efficient string matching algorithms
- Truncate very long summaries (max 2000 characters per section)

### Scalability
- Stateless processing allows horizontal scaling
- No database writes during summarization
- Can be moved to background job if needed

## Dependencies

### External Libraries
- **fast-check**: Property-based testing framework
- **date-fns**: Date parsing and manipulation (if needed)

### Internal Services
- ActivityLogService: Fetch communication history
- SellerService: Fetch seller data and spreadsheet comments

### Database Tables
- activity_logs: Communication history entries
- sellers: Seller data including comments field

## Migration Strategy

### Backward Compatibility
- Maintain existing `/api/summarize/call-memos` endpoint
- Accept both old format (memos array) and new format (structured data)
- Gradually migrate frontend to use new format

### Rollout Plan
1. Deploy new endpoint alongside existing one
2. Test with subset of users
3. Monitor for errors and quality issues
4. Gradually migrate all users
5. Deprecate old format after 3 months

## Monitoring and Logging

### Metrics to Track
- Summary generation time (p50, p95, p99)
- Timestamp parsing success rate
- Error rate by error type
- Section generation frequency

### Logging
- Log all parsing errors with context
- Log summary generation time
- Log input data size (number of entries)
- Log output data size (character count)

## Future Enhancements

### Potential Improvements
- AI-powered summarization using LLM
- Sentiment analysis for confidence assessment
- Automatic next action recommendations
- Multi-language support
- Summary quality scoring
- User feedback collection for continuous improvement
