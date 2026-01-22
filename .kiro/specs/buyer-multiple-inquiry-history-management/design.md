# Design Document

## Overview

買主の複数問い合わせ履歴を効果的に管理・表示するための設計。既存のデータ構造（最新買主番号のみDB保存、過去番号は「past_buyer_list」カラムに記録）を維持しつつ、UIレイヤーでの表示と操作性を大幅に改善する。

主な改善点:
- 買主詳細ページでの過去問い合わせ履歴の可視化
- 過去買主番号に対する内覧結果の記録機能
- 複数物件情報を含むメール配信の自動生成

## Architecture

### Component Structure

```
Frontend Layer
├── BuyerDetailPage (enhanced)
│   ├── PastBuyerNumbersList (new)
│   ├── InquiryHistoryTimeline (new)
│   └── ViewingResultsSection (enhanced)
├── EmailComposer (enhanced)
│   ├── MultiPropertySelector (new)
│   └── PropertyInfoFormatter (new)
└── BuyerInquiryIndicator (new)

Backend Layer
├── BuyerService (enhanced)
│   ├── getPastBuyerNumbers()
│   ├── getInquiryHistoryByBuyerNumber()
│   └── linkViewingResultToBuyerNumber()
├── EmailGenerationService (enhanced)
│   ├── generateMultiPropertyEmail()
│   └── formatPropertyTransmissionNotes()
└── PropertyService (enhanced)
    └── getTransmissionNotesByPropertyNumber()
```

### Data Flow

1. **Past Buyer Numbers Retrieval**:
   - Frontend requests buyer details
   - Backend parses `past_buyer_list` column
   - Returns structured array of past buyer numbers with metadata

2. **Viewing Result Recording**:
   - User selects buyer number (current or past)
   - System links viewing result to specific property inquiry
   - Stores buyer number reference with viewing result

3. **Multi-Property Email Generation**:
   - User selects multiple properties for a buyer
   - System retrieves transmission notes for each property
   - Generates formatted email with property sections

## Components and Interfaces

### 1. PastBuyerNumbersList Component

**Purpose**: Display all past buyer numbers for a buyer with inquiry details

**Props**:
```typescript
interface PastBuyerNumbersListProps {
  buyerId: number;
  pastBuyerNumbers: PastBuyerNumber[];
  onBuyerNumberClick: (buyerNumber: string) => void;
}

interface PastBuyerNumber {
  buyerNumber: string;
  propertyNumber: string;
  inquiryDate: string;
  inquirySource: string;
  status: string;
}
```

**UI Design**:
- Collapsible section with badge showing count
- Each past buyer number as an expandable card
- Property number, inquiry date, and source displayed
- Click to expand full inquiry details

### 2. InquiryHistoryTimeline Component

**Purpose**: Visual timeline of all inquiries across buyer numbers

**Props**:
```typescript
interface InquiryHistoryTimelineProps {
  buyerId: number;
  inquiries: InquiryHistoryItem[];
}

interface InquiryHistoryItem {
  buyerNumber: string;
  propertyNumber: string;
  inquiryDate: Date;
  viewingDate?: Date;
  viewingResult?: string;
  currentStatus: string;
}
```

**UI Design**:
- Vertical timeline with date markers
- Each inquiry as a timeline node
- Visual connection between related buyer numbers
- Color coding for status (active, viewed, closed)

### 3. ViewingResultsSection Component (Enhanced)

**Purpose**: Record and display viewing results with buyer number selection

**New Features**:
- Dropdown to select buyer number (current or past)
- Auto-populate property number based on selected buyer number
- Display viewing results grouped by buyer number

**Interface**:
```typescript
interface ViewingResultInput {
  buyerId: number;
  buyerNumber: string;  // Can be current or past
  propertyNumber: string;
  viewingDate: Date;
  result: string;
  notes: string;
}
```

### 4. MultiPropertySelector Component

**Purpose**: Select multiple properties for email distribution

**Props**:
```typescript
interface MultiPropertySelectorProps {
  buyerId: number;
  availableProperties: PropertyInquiry[];
  selectedProperties: string[];
  onSelectionChange: (propertyNumbers: string[]) => void;
}

interface PropertyInquiry {
  propertyNumber: string;
  propertyAddress: string;
  inquiryDate: string;
  buyerNumber: string;
}
```

**UI Design**:
- Checkbox list of all properties the buyer inquired about
- Show property number, address, and inquiry date
- Indicate which buyer number each inquiry is associated with
- Select all / deselect all buttons

### 5. PropertyInfoFormatter Component

**Purpose**: Format property information for email body

**Interface**:
```typescript
interface PropertyEmailSection {
  propertyNumber: string;
  propertyAddress: string;
  transmissionNotes: string;
  additionalInfo?: {
    price?: string;
    size?: string;
    features?: string[];
  };
}

function formatMultiPropertyEmail(
  properties: PropertyEmailSection[]
): string;
```

**Email Format**:
```
件名: 物件情報のご案内（物件番号: AA12345, AA12346, AA12347）

お世話になっております。

ご問い合わせいただきました物件について、情報をお送りいたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━
【物件1】物件番号: AA12345
━━━━━━━━━━━━━━━━━━━━━━━━━━
所在地: [住所]

[伝達事項の内容]

━━━━━━━━━━━━━━━━━━━━━━━━━━
【物件2】物件番号: AA12346
━━━━━━━━━━━━━━━━━━━━━━━━━━
所在地: [住所]

[伝達事項の内容]

━━━━━━━━━━━━━━━━━━━━━━━━━━
【物件3】物件番号: AA12347
━━━━━━━━━━━━━━━━━━━━━━━━━━
所在地: [住所]

[伝達事項の内容]

━━━━━━━━━━━━━━━━━━━━━━━━━━

ご不明な点がございましたら、お気軽にお問い合わせください。
```

## Data Models

### Enhanced Buyer Model

```typescript
interface Buyer {
  id: number;
  buyer_number: string;  // Current/latest buyer number
  past_buyer_list: string;  // Comma-separated past buyer numbers
  name: string;
  email: string;
  phone: string;
  // ... other fields
}

// Parsed structure for frontend use
interface BuyerWithHistory {
  id: number;
  currentBuyerNumber: string;
  pastBuyerNumbers: string[];
  inquiries: BuyerInquiry[];
  viewingResults: ViewingResult[];
  // ... other fields
}

interface BuyerInquiry {
  buyerNumber: string;  // Which buyer number this inquiry is under
  propertyNumber: string;
  inquiryDate: Date;
  inquirySource: string;
  status: string;
}
```

### Viewing Result Model (Enhanced)

```typescript
interface ViewingResult {
  id: number;
  buyer_id: number;
  buyer_number: string;  // NEW: Track which buyer number
  property_number: string;
  viewing_date: Date;
  result: string;
  notes: string;
  created_at: Date;
}
```

### Email Generation Request

```typescript
interface MultiPropertyEmailRequest {
  buyerId: number;
  propertyNumbers: string[];
  templateType: string;
  customMessage?: string;
}

interface MultiPropertyEmailResponse {
  subject: string;
  body: string;
  recipients: string[];
  propertyDetails: PropertyEmailSection[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Past Buyer Numbers Completeness

*For any* buyer record with a non-empty `past_buyer_list` column, parsing and displaying the past buyer numbers should return all buyer numbers contained in that column without loss or duplication.

**Validates: Requirements 1.1, 1.2**

### Property 2: Viewing Result Linkage

*For any* viewing result recorded with a specific buyer number, retrieving viewing results for that buyer should include the result with the correct buyer number association.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Inquiry Grouping Consistency

*For any* buyer with multiple inquiries, grouping inquiries by buyer number should result in each inquiry appearing exactly once under its associated buyer number.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Multi-Property Email Completeness

*For any* set of selected property numbers, the generated email should contain a distinct section for each property number with its associated transmission notes.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 5: Transmission Notes Retrieval

*For any* valid property number, retrieving transmission notes should return the notes associated with that property or an empty string if no notes exist.

**Validates: Requirements 5.1, 5.2**

### Property 6: Buyer Number Relationship Display

*For any* buyer with past buyer numbers, the UI should display a visual indicator and the count should equal the number of entries in the parsed `past_buyer_list`.

**Validates: Requirements 6.1, 6.2, 6.3**

## Error Handling

### Past Buyer List Parsing Errors

- **Invalid format**: If `past_buyer_list` contains invalid data, log error and display empty list
- **Partial data**: If some buyer numbers are invalid, display valid ones and log warning
- **Empty list**: Gracefully handle empty or null `past_buyer_list`

### Viewing Result Recording Errors

- **Invalid buyer number**: Validate buyer number exists in current or past list before saving
- **Duplicate entries**: Prevent duplicate viewing results for same buyer number + property combination
- **Missing property**: Validate property number exists before linking viewing result

### Email Generation Errors

- **Missing transmission notes**: Use placeholder text when notes are unavailable
- **Invalid property numbers**: Skip invalid properties and log warning
- **Empty selection**: Require at least one property to be selected
- **Email size limit**: Warn if email body exceeds reasonable size (e.g., 100KB)

### UI Error States

- **Loading failures**: Display error message with retry option
- **Network errors**: Show offline indicator and queue actions for retry
- **Validation errors**: Inline validation messages for form inputs

## Testing Strategy

### Unit Tests

1. **Past Buyer List Parser**:
   - Test parsing comma-separated values
   - Test handling empty strings
   - Test handling malformed data
   - Test trimming whitespace

2. **Email Formatter**:
   - Test single property formatting
   - Test multiple property formatting
   - Test empty transmission notes handling
   - Test special characters in notes

3. **Buyer Number Validator**:
   - Test validation against current buyer number
   - Test validation against past buyer numbers
   - Test invalid buyer number rejection

### Property-Based Tests

Each property test should run minimum 100 iterations with randomized inputs.

1. **Property 1 Test**: Generate random `past_buyer_list` strings, parse them, and verify no data loss
   - **Feature: buyer-multiple-inquiry-history-management, Property 1: Past Buyer Numbers Completeness**

2. **Property 2 Test**: Generate random viewing results with buyer numbers, verify retrieval includes all results
   - **Feature: buyer-multiple-inquiry-history-management, Property 2: Viewing Result Linkage**

3. **Property 3 Test**: Generate random inquiry sets, verify grouping produces correct partitions
   - **Feature: buyer-multiple-inquiry-history-management, Property 3: Inquiry Grouping Consistency**

4. **Property 4 Test**: Generate random property selections, verify email contains all sections
   - **Feature: buyer-multiple-inquiry-history-management, Property 4: Multi-Property Email Completeness**

5. **Property 5 Test**: Generate random property numbers, verify transmission notes retrieval
   - **Feature: buyer-multiple-inquiry-history-management, Property 5: Transmission Notes Retrieval**

6. **Property 6 Test**: Generate random buyer records with past numbers, verify UI indicator count
   - **Feature: buyer-multiple-inquiry-history-management, Property 6: Buyer Number Relationship Display**

### Integration Tests

1. **End-to-End Buyer Detail Flow**:
   - Load buyer with past numbers
   - Expand past buyer number details
   - Record viewing result for past buyer number
   - Verify result appears in correct section

2. **Multi-Property Email Flow**:
   - Select buyer with multiple inquiries
   - Select multiple properties
   - Generate email
   - Verify email format and content
   - Send email and verify delivery

3. **Database Integration**:
   - Test viewing result storage with buyer number
   - Test retrieval of viewing results by buyer number
   - Test transaction rollback on errors

### Manual Testing Scenarios

1. **Buyer with 3+ past buyer numbers**:
   - Verify all past numbers display
   - Verify clicking each shows correct inquiry details
   - Verify timeline shows all inquiries chronologically

2. **Recording viewing result for past buyer number**:
   - Select past buyer number from dropdown
   - Verify property number auto-populates
   - Save and verify result appears under correct buyer number

3. **Generating email for 3 properties**:
   - Select 3 properties with different transmission notes
   - Generate email
   - Verify formatting is readable
   - Verify all property information is present

## Implementation Notes

### Database Considerations

- No schema changes required for `buyers` table
- Add `buyer_number` column to `viewing_results` table (if not exists)
- Add index on `viewing_results.buyer_number` for performance
- Consider adding `buyer_inquiry_history` table for better normalization (future enhancement)

### Performance Considerations

- Cache parsed past buyer numbers to avoid repeated parsing
- Lazy load inquiry details when expanding past buyer numbers
- Paginate viewing results if count exceeds threshold (e.g., 50)
- Optimize email generation for large property selections (batch processing)

### Backward Compatibility

- Existing viewing results without `buyer_number` should default to current buyer number
- Existing email templates should continue to work for single property
- UI should gracefully handle buyers with no past buyer numbers

### Future Enhancements

1. **Buyer Merge Tool**: UI to merge duplicate buyer records and consolidate past buyer numbers
2. **Inquiry Analytics**: Dashboard showing inquiry patterns across buyer numbers
3. **Smart Property Recommendations**: Suggest properties based on past inquiry history
4. **Email Templates**: Pre-defined templates for common multi-property scenarios
