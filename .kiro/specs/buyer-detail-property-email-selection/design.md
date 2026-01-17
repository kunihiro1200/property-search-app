# 買主詳細ページ - 問い合わせ履歴テーブルとメール送信機能 - Design Document

## Overview

買主詳細ページに問い合わせ履歴をテーブル形式で表示し、複数の物件を選択して「内覧前伝達事項」を含むメールを送信できる機能を設計します。この機能により、営業担当者は買主の全ての問い合わせ履歴を一覧で確認し、特定の物件についてまとめてメールを送信できるようになります。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         BuyerDetailPage.tsx                          │   │
│  │  - State: selectedPropertyIds, inquiryHistory       │   │
│  │  - Handlers: selection, clear, email                │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│                          ├─────────────────────┐             │
│                          │                     │             │
│  ┌───────────────────────▼──────┐  ┌──────────▼──────────┐  │
│  │  InquiryHistoryTable.tsx    │  │ InquiryResponse     │  │
│  │  - Checkbox selection       │  │ EmailModal.tsx      │  │
│  │  - Sort by date             │  │ - Auto-fill buyer  │  │
│  │  - Visual distinction       │  │ - Pre-viewing notes│  │
│  └─────────────────────────────┘  └─────────────────────┘  │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │ API Calls
┌───────────────────────────▼───────────────────────────────────┐
│                    Backend (Express)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  GET /api/buyers/:buyerId/inquiry-history           │   │
│  │  - Fetch all inquiry history                        │   │
│  │  - Merge duplicate buyer numbers                    │   │
│  │  - Sort by inquiry date                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/inquiry-response/generate                │   │
│  │  - Include pre-viewing notes in email body          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/inquiry-response/send                    │   │
│  │  - Send email via Gmail API                         │   │
│  │  - Save email history                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /api/email-history                            │   │
│  │  - Save email sending history                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │ Database Queries
┌───────────────────────────▼───────────────────────────────────┐
│                    Database (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────┤
│  - buyers                                                     │
│  - property_listings (includes pre_viewing_notes)            │
│  - email_history (new table)                                 │
└─────────────────────────────────────────────────────────────┘
```


## Components and Interfaces

### Frontend Components

#### 1. InquiryHistoryTable Component

**Purpose**: Display buyer's inquiry history in a table format with selection capabilities

**Props Interface**:
```typescript
interface InquiryHistoryTableProps {
  buyerId: string;
  inquiryHistory: InquiryHistoryItem[];
  selectedPropertyIds: Set<string>;
  onSelectionChange: (propertyIds: Set<string>) => void;
  onPropertyClick?: (propertyId: string) => void;
}

interface InquiryHistoryItem {
  buyerNumber: string;
  propertyNumber: string;
  propertyAddress: string;
  inquiryDate: string;
  status: 'current' | 'past';
  propertyId: string;
  propertyListingId: string;
}
```

**State**:
```typescript
interface InquiryHistoryTableState {
  sortOrder: 'asc' | 'desc';
  sortColumn: 'inquiryDate' | 'propertyNumber';
}
```

**Key Features**:
- Material-UI Table components for consistent styling
- Checkbox column for multi-selection
- Visual distinction between current and past inquiries
- Sortable columns (inquiry date, property number)
- Row click handler for property details navigation
- Select all/deselect all functionality

**Styling**:
```typescript
const styles = {
  currentInquiry: {
    backgroundColor: '#e3f2fd', // Light blue
  },
  pastInquiry: {
    backgroundColor: '#f5f5f5', // Light gray
  },
  selectedRow: {
    backgroundColor: '#bbdefb', // Darker blue
  },
  statusBadge: {
    current: {
      backgroundColor: '#2196f3',
      color: 'white',
    },
    past: {
      backgroundColor: '#9e9e9e',
      color: 'white',
    },
  },
};
```

#### 2. BuyerDetailPage Updates

**New State**:
```typescript
interface BuyerDetailPageState {
  // Existing state...
  selectedPropertyIds: Set<string>;
  inquiryHistory: InquiryHistoryItem[];
  isLoadingHistory: boolean;
  showPropertyCards: boolean; // Toggle between table and cards
}
```

**New Handlers**:
```typescript
const handleSelectionChange = (propertyIds: Set<string>) => {
  setSelectedPropertyIds(propertyIds);
};

const handleClearSelection = () => {
  setSelectedPropertyIds(new Set());
};

const handleGmailSend = () => {
  // Open InquiryResponseEmailModal with selected properties
  const selectedProperties = inquiryHistory
    .filter(item => selectedPropertyIds.has(item.propertyId))
    .map(item => ({
      id: item.propertyListingId,
      propertyNumber: item.propertyNumber,
      address: item.propertyAddress,
      // ... other property fields
    }));
  
  setEmailModalOpen(true);
  setEmailModalProperties(selectedProperties);
};

const handleEmailSuccess = () => {
  // Clear selection after successful email send
  setSelectedPropertyIds(new Set());
  setEmailModalOpen(false);
  // Optionally refresh inquiry history
};
```

**UI Layout**:
```tsx
<Box>
  {/* Selection Controls */}
  <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
    {selectedPropertyIds.size > 0 && (
      <>
        <Typography variant="body2">
          {selectedPropertyIds.size}件選択中
        </Typography>
        <Button 
          variant="outlined" 
          size="small"
          onClick={handleClearSelection}
        >
          選択をクリア
        </Button>
      </>
    )}
    <Button
      variant="contained"
      disabled={selectedPropertyIds.size === 0}
      onClick={handleGmailSend}
      startIcon={<EmailIcon />}
    >
      Gmail送信 ({selectedPropertyIds.size}件)
    </Button>
  </Box>

  {/* Inquiry History Table */}
  <InquiryHistoryTable
    buyerId={buyerId}
    inquiryHistory={inquiryHistory}
    selectedPropertyIds={selectedPropertyIds}
    onSelectionChange={handleSelectionChange}
    onPropertyClick={handlePropertyClick}
  />

  {/* Collapsible Property Cards Section */}
  <Accordion defaultExpanded={false}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography>物件詳細カード</Typography>
    </AccordionSummary>
    <AccordionDetails>
      {properties.map(property => (
        <PropertyInfoCard key={property.id} property={property} />
      ))}
    </AccordionDetails>
  </Accordion>
</Box>
```

#### 3. InquiryResponseEmailModal Updates

**Updated Props**:
```typescript
interface InquiryResponseEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProperties: PropertyListing[];
  onSuccess?: () => void;
  // New props for buyer auto-fill
  buyerInfo?: {
    name: string;
    email: string;
    buyerId: string;
  };
}
```

**Email Body Generation**:
```typescript
const generateEmailBody = (
  properties: PropertyListing[],
  template: string
): string => {
  let body = template;
  
  // Add pre-viewing notes for each property
  const notesSection = properties
    .map(property => {
      const notes = property.preViewingNotes || '特になし';
      return `
【物件番号: ${property.propertyNumber}】
住所: ${property.address}

内覧前伝達事項:
${notes}
      `.trim();
    })
    .join('\n\n');
  
  body += '\n\n' + notesSection;
  
  return body;
};
```


### Backend Services

#### 1. BuyerService - New Method

**Method**: `getInquiryHistory(buyerId: string)`

**Purpose**: Fetch all inquiry history for a buyer, including past buyer numbers

**Implementation**:
```typescript
async getInquiryHistory(buyerId: string): Promise<InquiryHistoryItem[]> {
  // 1. Get current buyer information
  const buyer = await this.getBuyerById(buyerId);
  
  // 2. Get all buyer numbers (current + past duplicates)
  const buyerNumbers = await this.getAllBuyerNumbers(buyer.buyerNumber);
  
  // 3. Fetch property listings for all buyer numbers
  const properties = await db.query(`
    SELECT 
      pl.id as property_listing_id,
      pl.property_number,
      pl.address,
      pl.inquiry_date,
      b.buyer_number,
      CASE 
        WHEN b.buyer_number = $1 THEN 'current'
        ELSE 'past'
      END as status
    FROM property_listings pl
    JOIN buyers b ON pl.buyer_id = b.id
    WHERE b.buyer_number = ANY($2)
    ORDER BY pl.inquiry_date DESC
  `, [buyer.buyerNumber, buyerNumbers]);
  
  return properties.rows.map(row => ({
    buyerNumber: row.buyer_number,
    propertyNumber: row.property_number,
    propertyAddress: row.address,
    inquiryDate: row.inquiry_date,
    status: row.status,
    propertyId: row.property_listing_id,
    propertyListingId: row.property_listing_id,
  }));
}

private async getAllBuyerNumbers(currentBuyerNumber: string): Promise<string[]> {
  // Query to find all related buyer numbers (including duplicates)
  const result = await db.query(`
    WITH RECURSIVE buyer_chain AS (
      -- Start with current buyer
      SELECT buyer_number, duplicate_of
      FROM buyers
      WHERE buyer_number = $1
      
      UNION
      
      -- Find all buyers that reference this buyer
      SELECT b.buyer_number, b.duplicate_of
      FROM buyers b
      INNER JOIN buyer_chain bc ON b.duplicate_of = bc.buyer_number
    )
    SELECT DISTINCT buyer_number FROM buyer_chain
  `, [currentBuyerNumber]);
  
  return result.rows.map(row => row.buyer_number);
}
```

#### 2. EmailHistoryService - New Service

**Purpose**: Manage email sending history

**Interface**:
```typescript
interface EmailHistoryRecord {
  id?: number;
  buyerId: number;
  propertyIds: number[];
  recipientEmail: string;
  subject: string;
  body: string;
  sentBy: number; // employee_id
  sentAt?: Date;
  createdAt?: Date;
}

class EmailHistoryService {
  async saveEmailHistory(record: EmailHistoryRecord): Promise<number> {
    const result = await db.query(`
      INSERT INTO email_history (
        buyer_id,
        property_ids,
        recipient_email,
        subject,
        body,
        sent_by,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
      record.buyerId,
      record.propertyIds,
      record.recipientEmail,
      record.subject,
      record.body,
      record.sentBy,
    ]);
    
    return result.rows[0].id;
  }
  
  async getEmailHistory(buyerId: number): Promise<EmailHistoryRecord[]> {
    const result = await db.query(`
      SELECT 
        eh.*,
        e.name as sent_by_name
      FROM email_history eh
      JOIN employees e ON eh.sent_by = e.id
      WHERE eh.buyer_id = $1
      ORDER BY eh.sent_at DESC
    `, [buyerId]);
    
    return result.rows;
  }
}
```

#### 3. InquiryResponseService - Updates

**Updated Method**: `generateEmailContent`

```typescript
async generateEmailContent(
  properties: PropertyListing[],
  templateId: string,
  buyerInfo?: { name: string; email: string }
): Promise<{ subject: string; body: string }> {
  // Get email template
  const template = await this.getEmailTemplate(templateId);
  
  // Replace placeholders
  let subject = template.subject;
  let body = template.body;
  
  if (buyerInfo) {
    subject = subject.replace('{{buyerName}}', buyerInfo.name);
    body = body.replace('{{buyerName}}', buyerInfo.name);
  }
  
  // Add pre-viewing notes section
  const notesSection = this.formatPreViewingNotes(properties);
  body += '\n\n' + notesSection;
  
  return { subject, body };
}

private formatPreViewingNotes(properties: PropertyListing[]): string {
  return properties
    .map(property => {
      const notes = property.preViewingNotes || '特になし';
      return `
【物件番号: ${property.propertyNumber}】
住所: ${property.address}

内覧前伝達事項:
${notes}
      `.trim();
    })
    .join('\n\n');
}
```

**Updated Method**: `sendEmail`

```typescript
async sendEmail(
  recipientEmail: string,
  subject: string,
  body: string,
  buyerId: number,
  propertyIds: number[],
  sentBy: number
): Promise<void> {
  try {
    // Send email via Gmail API
    await this.gmailService.sendEmail({
      to: recipientEmail,
      subject,
      body,
    });
    
    // Save email history
    await this.emailHistoryService.saveEmailHistory({
      buyerId,
      propertyIds,
      recipientEmail,
      subject,
      body,
      sentBy,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('メール送信に失敗しました');
  }
}
```


### API Endpoints

#### 1. GET /api/buyers/:buyerId/inquiry-history

**Purpose**: Fetch all inquiry history for a buyer

**Request**:
- Path parameter: `buyerId` (string)

**Response**:
```typescript
{
  inquiryHistory: [
    {
      buyerNumber: "6647",
      propertyNumber: "AA12345",
      propertyAddress: "大分市○○町1-2-3",
      inquiryDate: "2024-01-15",
      status: "current",
      propertyId: "123",
      propertyListingId: "123"
    },
    {
      buyerNumber: "6648",
      propertyNumber: "AA12346",
      propertyAddress: "大分市△△町4-5-6",
      inquiryDate: "2023-12-01",
      status: "past",
      propertyId: "124",
      propertyListingId: "124"
    }
  ]
}
```

**Error Responses**:
- 404: Buyer not found
- 500: Server error

#### 2. POST /api/email-history

**Purpose**: Save email sending history

**Request Body**:
```typescript
{
  buyerId: number;
  propertyIds: number[];
  recipientEmail: string;
  subject: string;
  body: string;
  sentBy: number; // employee_id
}
```

**Response**:
```typescript
{
  id: number;
  message: "Email history saved successfully"
}
```

**Error Responses**:
- 400: Invalid request body
- 500: Server error

#### 3. GET /api/email-history/:buyerId

**Purpose**: Retrieve email history for a buyer

**Request**:
- Path parameter: `buyerId` (string)

**Response**:
```typescript
{
  emailHistory: [
    {
      id: 1,
      buyerId: 123,
      propertyIds: [456, 789],
      recipientEmail: "buyer@example.com",
      subject: "物件のご案内",
      body: "...",
      sentBy: 10,
      sentByName: "山田太郎",
      sentAt: "2024-01-15T10:30:00Z",
      createdAt: "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 4. POST /api/inquiry-response/generate (Updated)

**Purpose**: Generate email content with pre-viewing notes

**Request Body**:
```typescript
{
  propertyIds: number[];
  templateId: string;
  buyerInfo?: {
    name: string;
    email: string;
  };
}
```

**Response**:
```typescript
{
  subject: string;
  body: string; // Includes pre-viewing notes
}
```

#### 5. POST /api/inquiry-response/send (Updated)

**Purpose**: Send email and save history

**Request Body**:
```typescript
{
  recipientEmail: string;
  subject: string;
  body: string;
  buyerId: number;
  propertyIds: number[];
  sentBy: number;
}
```

**Response**:
```typescript
{
  success: true;
  message: "Email sent successfully",
  emailHistoryId: number;
}
```


## Data Models

### Database Schema

#### New Table: email_history

```sql
CREATE TABLE email_history (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  property_ids INTEGER[] NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_history_property_ids_not_empty CHECK (array_length(property_ids, 1) > 0)
);

-- Indexes for performance
CREATE INDEX idx_email_history_buyer_id ON email_history(buyer_id);
CREATE INDEX idx_email_history_sent_at ON email_history(sent_at DESC);
CREATE INDEX idx_email_history_sent_by ON email_history(sent_by);
CREATE INDEX idx_email_history_property_ids ON email_history USING GIN(property_ids);

-- Comments for documentation
COMMENT ON TABLE email_history IS 'Stores history of emails sent to buyers';
COMMENT ON COLUMN email_history.property_ids IS 'Array of property listing IDs included in the email';
COMMENT ON COLUMN email_history.sent_by IS 'Employee ID who sent the email';
```

#### Existing Table: property_listings

**Relevant Columns**:
- `id`: Primary key
- `property_number`: Property identifier (e.g., "AA12345")
- `address`: Property address
- `inquiry_date`: Date of inquiry
- `buyer_id`: Foreign key to buyers table
- `pre_viewing_notes`: Column BQ - 内覧前伝達事項

**Column Mapping**:
The `pre_viewing_notes` field corresponds to column BQ in the spreadsheet and should be mapped in the `property-listing-column-mapping.json` configuration file.

#### Existing Table: buyers

**Relevant Columns**:
- `id`: Primary key
- `buyer_number`: Buyer identifier (e.g., "6647")
- `name`: Buyer name
- `email`: Buyer email address
- `duplicate_of`: Reference to another buyer_number if this is a duplicate

### TypeScript Interfaces

#### Frontend Types

```typescript
// InquiryHistoryItem.ts
export interface InquiryHistoryItem {
  buyerNumber: string;
  propertyNumber: string;
  propertyAddress: string;
  inquiryDate: string;
  status: 'current' | 'past';
  propertyId: string;
  propertyListingId: string;
}

// EmailHistoryRecord.ts
export interface EmailHistoryRecord {
  id: number;
  buyerId: number;
  propertyIds: number[];
  recipientEmail: string;
  subject: string;
  body: string;
  sentBy: number;
  sentByName: string;
  sentAt: string;
  createdAt: string;
}

// PropertyListing.ts (extended)
export interface PropertyListing {
  id: string;
  propertyNumber: string;
  address: string;
  inquiryDate: string;
  preViewingNotes?: string; // Column BQ
  // ... other existing fields
}
```

#### Backend Types

```typescript
// types/emailHistory.ts
export interface EmailHistoryRecord {
  id?: number;
  buyerId: number;
  propertyIds: number[];
  recipientEmail: string;
  subject: string;
  body: string;
  sentBy: number;
  sentAt?: Date;
  createdAt?: Date;
}

export interface EmailHistoryWithSender extends EmailHistoryRecord {
  sentByName: string;
}

// types/inquiryHistory.ts
export interface InquiryHistoryItem {
  buyerNumber: string;
  propertyNumber: string;
  propertyAddress: string;
  inquiryDate: Date;
  status: 'current' | 'past';
  propertyId: number;
  propertyListingId: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Inquiry History Completeness
*For any* buyer with inquiry history, fetching their inquiry history should return all property listings associated with both their current buyer number and any past duplicate buyer numbers.

**Validates: Requirements US-1.1, US-1.2**

### Property 2: Selection State Consistency
*For any* set of selected property IDs, the selection state should remain consistent across UI updates, and the count of selected items should always equal the size of the selected property IDs set.

**Validates: Requirements US-2.1, US-2.2, US-3.1**

### Property 3: Email Content Inclusion
*For any* set of selected properties with pre-viewing notes, the generated email body should include the pre-viewing notes for each selected property in the specified format.

**Validates: Requirements US-5.3**

### Property 4: Email History Persistence
*For any* successfully sent email, a corresponding email history record should be created in the database with all required fields populated (buyer ID, property IDs, recipient email, subject, body, sender ID, timestamp).

**Validates: Requirements US-6.1, US-6.2**

### Property 5: Selection Clear Idempotence
*For any* selection state, clearing the selection should result in an empty selection set, and clearing an already empty selection should have no effect.

**Validates: Requirements US-3.2**

### Property 6: Status Classification Correctness
*For any* inquiry history item, if the buyer number matches the current buyer's number, the status should be 'current', otherwise it should be 'past'.

**Validates: Requirements US-1.6**

### Property 7: Buyer Info Auto-fill Accuracy
*For any* buyer with a name and email address, when opening the email modal with buyer info provided, the recipient name and email fields should be pre-populated with the buyer's information.

**Validates: Requirements US-5.4**

### Property 8: Email History Immutability
*For any* saved email history record, the record should not be deletable or modifiable through the API, ensuring audit trail integrity.

**Validates: Requirements US-6.3**


## Error Handling

### Frontend Error Handling

#### 1. API Request Failures

**Scenario**: Failed to fetch inquiry history
```typescript
try {
  const response = await api.get(`/api/buyers/${buyerId}/inquiry-history`);
  setInquiryHistory(response.data.inquiryHistory);
} catch (error) {
  console.error('Failed to fetch inquiry history:', error);
  setError('問い合わせ履歴の取得に失敗しました');
  // Show error toast/snackbar
  enqueueSnackbar('問い合わせ履歴の取得に失敗しました', { variant: 'error' });
}
```

**Scenario**: Failed to send email
```typescript
try {
  await api.post('/api/inquiry-response/send', emailData);
  enqueueSnackbar('メールを送信しました', { variant: 'success' });
  handleEmailSuccess();
} catch (error) {
  console.error('Failed to send email:', error);
  enqueueSnackbar('メール送信に失敗しました', { variant: 'error' });
  // Keep modal open so user can retry
}
```

#### 2. Validation Errors

**Scenario**: No properties selected
```typescript
const handleGmailSend = () => {
  if (selectedPropertyIds.size === 0) {
    enqueueSnackbar('物件を選択してください', { variant: 'warning' });
    return;
  }
  // Proceed with email modal
};
```

**Scenario**: Invalid buyer email
```typescript
const validateBuyerEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    enqueueSnackbar('有効なメールアドレスを入力してください', { variant: 'error' });
    return false;
  }
  return true;
};
```

#### 3. Empty State Handling

**Scenario**: No inquiry history
```tsx
{inquiryHistory.length === 0 ? (
  <Box sx={{ textAlign: 'center', py: 4 }}>
    <Typography variant="body1" color="text.secondary">
      問い合わせ履歴がありません
    </Typography>
  </Box>
) : (
  <InquiryHistoryTable {...props} />
)}
```

### Backend Error Handling

#### 1. Database Errors

**Scenario**: Failed to fetch inquiry history
```typescript
async getInquiryHistory(buyerId: string): Promise<InquiryHistoryItem[]> {
  try {
    const buyer = await this.getBuyerById(buyerId);
    if (!buyer) {
      throw new NotFoundError('Buyer not found');
    }
    
    const buyerNumbers = await this.getAllBuyerNumbers(buyer.buyerNumber);
    const properties = await db.query(/* ... */);
    
    return properties.rows.map(/* ... */);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('Database error in getInquiryHistory:', error);
    throw new InternalServerError('Failed to fetch inquiry history');
  }
}
```

#### 2. Email Sending Errors

**Scenario**: Gmail API failure
```typescript
async sendEmail(emailData: EmailData): Promise<void> {
  try {
    await this.gmailService.sendEmail({
      to: emailData.recipientEmail,
      subject: emailData.subject,
      body: emailData.body,
    });
    
    // Save history only after successful send
    await this.emailHistoryService.saveEmailHistory(emailData);
  } catch (error) {
    if (error.code === 'GMAIL_QUOTA_EXCEEDED') {
      throw new ServiceUnavailableError('Gmail送信制限に達しました。しばらく待ってから再試行してください。');
    }
    console.error('Failed to send email:', error);
    throw new InternalServerError('メール送信に失敗しました');
  }
}
```

#### 3. Validation Errors

**Scenario**: Invalid request body
```typescript
router.post('/api/email-history', async (req, res) => {
  const { buyerId, propertyIds, recipientEmail, subject, body, sentBy } = req.body;
  
  // Validation
  if (!buyerId || !propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
    return res.status(400).json({
      error: 'Invalid request: buyerId and propertyIds are required',
    });
  }
  
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    return res.status(400).json({
      error: 'Invalid request: valid recipientEmail is required',
    });
  }
  
  if (!subject || !body) {
    return res.status(400).json({
      error: 'Invalid request: subject and body are required',
    });
  }
  
  if (!sentBy) {
    return res.status(400).json({
      error: 'Invalid request: sentBy (employee ID) is required',
    });
  }
  
  try {
    const historyId = await emailHistoryService.saveEmailHistory({
      buyerId,
      propertyIds,
      recipientEmail,
      subject,
      body,
      sentBy,
    });
    
    res.json({ id: historyId, message: 'Email history saved successfully' });
  } catch (error) {
    console.error('Failed to save email history:', error);
    res.status(500).json({ error: 'Failed to save email history' });
  }
});
```

#### 4. Transaction Rollback

**Scenario**: Email sent but history save failed
```typescript
async sendEmailWithHistory(emailData: EmailData): Promise<void> {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Send email first
    await this.gmailService.sendEmail({
      to: emailData.recipientEmail,
      subject: emailData.subject,
      body: emailData.body,
    });
    
    // Save history
    await client.query(`
      INSERT INTO email_history (...)
      VALUES (...)
    `, [...]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
```

### Error Response Format

All API errors should follow a consistent format:

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Example
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request: propertyIds cannot be empty",
  "details": {
    "field": "propertyIds",
    "value": []
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```


## Testing Strategy

### Unit Testing

#### Frontend Unit Tests

**1. InquiryHistoryTable Component Tests**

```typescript
describe('InquiryHistoryTable', () => {
  it('should render inquiry history items', () => {
    const mockHistory = [
      {
        buyerNumber: '6647',
        propertyNumber: 'AA12345',
        propertyAddress: '大分市○○町',
        inquiryDate: '2024-01-15',
        status: 'current',
        propertyId: '123',
        propertyListingId: '123',
      },
    ];
    
    render(
      <InquiryHistoryTable
        buyerId="1"
        inquiryHistory={mockHistory}
        selectedPropertyIds={new Set()}
        onSelectionChange={jest.fn()}
      />
    );
    
    expect(screen.getByText('AA12345')).toBeInTheDocument();
    expect(screen.getByText('大分市○○町')).toBeInTheDocument();
  });
  
  it('should handle checkbox selection', () => {
    const onSelectionChange = jest.fn();
    const mockHistory = [/* ... */];
    
    render(<InquiryHistoryTable {...props} onSelectionChange={onSelectionChange} />);
    
    const checkbox = screen.getAllByRole('checkbox')[1]; // First data row
    fireEvent.click(checkbox);
    
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['123']));
  });
  
  it('should apply correct styling for current vs past inquiries', () => {
    const mockHistory = [
      { /* current inquiry */ status: 'current', /* ... */ },
      { /* past inquiry */ status: 'past', /* ... */ },
    ];
    
    const { container } = render(<InquiryHistoryTable {...props} />);
    
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0]).toHaveStyle({ backgroundColor: '#e3f2fd' }); // current
    expect(rows[1]).toHaveStyle({ backgroundColor: '#f5f5f5' }); // past
  });
});
```

**2. BuyerDetailPage Tests**

```typescript
describe('BuyerDetailPage - Inquiry History', () => {
  it('should fetch and display inquiry history on mount', async () => {
    const mockHistory = [/* ... */];
    api.get.mockResolvedValue({ data: { inquiryHistory: mockHistory } });
    
    render(<BuyerDetailPage buyerId="1" />);
    
    await waitFor(() => {
      expect(screen.getByText('AA12345')).toBeInTheDocument();
    });
  });
  
  it('should enable Gmail button when properties are selected', () => {
    render(<BuyerDetailPage buyerId="1" />);
    
    const gmailButton = screen.getByText(/Gmail送信/);
    expect(gmailButton).toBeDisabled();
    
    // Select a property
    const checkbox = screen.getAllByRole('checkbox')[1];
    fireEvent.click(checkbox);
    
    expect(gmailButton).toBeEnabled();
    expect(gmailButton).toHaveTextContent('Gmail送信 (1件)');
  });
  
  it('should clear selection when clear button is clicked', () => {
    render(<BuyerDetailPage buyerId="1" />);
    
    // Select properties
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getAllByRole('checkbox')[2]);
    
    expect(screen.getByText('2件選択中')).toBeInTheDocument();
    
    // Clear selection
    fireEvent.click(screen.getByText('選択をクリア'));
    
    expect(screen.queryByText('2件選択中')).not.toBeInTheDocument();
  });
});
```

#### Backend Unit Tests

**1. BuyerService Tests**

```typescript
describe('BuyerService.getInquiryHistory', () => {
  it('should return inquiry history for buyer with current and past numbers', async () => {
    const mockBuyer = { id: 1, buyerNumber: '6647' };
    const mockBuyerNumbers = ['6647', '6648'];
    const mockProperties = [/* ... */];
    
    jest.spyOn(buyerService, 'getBuyerById').mockResolvedValue(mockBuyer);
    jest.spyOn(buyerService, 'getAllBuyerNumbers').mockResolvedValue(mockBuyerNumbers);
    db.query.mockResolvedValue({ rows: mockProperties });
    
    const result = await buyerService.getInquiryHistory('1');
    
    expect(result).toHaveLength(mockProperties.length);
    expect(result[0].status).toBe('current');
    expect(result[1].status).toBe('past');
  });
  
  it('should throw NotFoundError when buyer does not exist', async () => {
    jest.spyOn(buyerService, 'getBuyerById').mockResolvedValue(null);
    
    await expect(buyerService.getInquiryHistory('999')).rejects.toThrow(NotFoundError);
  });
});
```

**2. EmailHistoryService Tests**

```typescript
describe('EmailHistoryService', () => {
  it('should save email history record', async () => {
    const mockRecord = {
      buyerId: 1,
      propertyIds: [123, 456],
      recipientEmail: 'buyer@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      sentBy: 10,
    };
    
    db.query.mockResolvedValue({ rows: [{ id: 1 }] });
    
    const historyId = await emailHistoryService.saveEmailHistory(mockRecord);
    
    expect(historyId).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO email_history'),
      expect.arrayContaining([
        mockRecord.buyerId,
        mockRecord.propertyIds,
        mockRecord.recipientEmail,
        mockRecord.subject,
        mockRecord.body,
        mockRecord.sentBy,
      ])
    );
  });
  
  it('should retrieve email history for buyer', async () => {
    const mockHistory = [
      { id: 1, buyerId: 1, /* ... */ },
      { id: 2, buyerId: 1, /* ... */ },
    ];
    
    db.query.mockResolvedValue({ rows: mockHistory });
    
    const result = await emailHistoryService.getEmailHistory(1);
    
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
  });
});
```

### Property-Based Testing

Property-based tests should run with a minimum of 100 iterations to ensure comprehensive coverage.

**1. Selection State Consistency (Property 2)**

```typescript
import fc from 'fast-check';

describe('Property 2: Selection State Consistency', () => {
  /**
   * Feature: buyer-detail-property-email-selection
   * Property 2: For any set of selected property IDs, the selection state should 
   * remain consistent across UI updates, and the count of selected items should 
   * always equal the size of the selected property IDs set.
   */
  it('should maintain consistent selection state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 0, maxLength: 20 }),
        (propertyIds) => {
          const selectedSet = new Set(propertyIds);
          
          // The count should always equal the set size
          expect(selectedSet.size).toBe(new Set(propertyIds).size);
          
          // Adding the same ID again should not change the size
          const originalSize = selectedSet.size;
          if (propertyIds.length > 0) {
            selectedSet.add(propertyIds[0]);
            expect(selectedSet.size).toBe(originalSize);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**2. Email Content Inclusion (Property 3)**

```typescript
describe('Property 3: Email Content Inclusion', () => {
  /**
   * Feature: buyer-detail-property-email-selection
   * Property 3: For any set of selected properties with pre-viewing notes, 
   * the generated email body should include the pre-viewing notes for each 
   * selected property in the specified format.
   */
  it('should include all pre-viewing notes in email body', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            propertyNumber: fc.string({ minLength: 5, maxLength: 10 }),
            address: fc.string({ minLength: 10, maxLength: 50 }),
            preViewingNotes: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (properties) => {
          const emailBody = generateEmailBody(properties, 'template');
          
          // Each property should be mentioned in the email
          properties.forEach(property => {
            expect(emailBody).toContain(property.propertyNumber);
            expect(emailBody).toContain(property.address);
            
            // Pre-viewing notes should be included (or "特になし" if empty)
            if (property.preViewingNotes) {
              expect(emailBody).toContain(property.preViewingNotes);
            } else {
              expect(emailBody).toContain('特になし');
            }
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**3. Email History Persistence (Property 4)**

```typescript
describe('Property 4: Email History Persistence', () => {
  /**
   * Feature: buyer-detail-property-email-selection
   * Property 4: For any successfully sent email, a corresponding email history 
   * record should be created in the database with all required fields populated.
   */
  it('should persist email history with all required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          buyerId: fc.integer({ min: 1, max: 10000 }),
          propertyIds: fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
          recipientEmail: fc.emailAddress(),
          subject: fc.string({ minLength: 1, maxLength: 100 }),
          body: fc.string({ minLength: 1, maxLength: 1000 }),
          sentBy: fc.integer({ min: 1, max: 100 }),
        }),
        async (emailData) => {
          // Mock successful email send
          gmailService.sendEmail.mockResolvedValue(undefined);
          db.query.mockResolvedValue({ rows: [{ id: 1 }] });
          
          await inquiryResponseService.sendEmail(
            emailData.recipientEmail,
            emailData.subject,
            emailData.body,
            emailData.buyerId,
            emailData.propertyIds,
            emailData.sentBy
          );
          
          // Verify email history was saved with all fields
          expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO email_history'),
            expect.arrayContaining([
              emailData.buyerId,
              emailData.propertyIds,
              emailData.recipientEmail,
              emailData.subject,
              emailData.body,
              emailData.sentBy,
            ])
          );
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**1. End-to-End Email Sending Flow**

```typescript
describe('Email Sending Integration', () => {
  it('should complete full email sending flow', async () => {
    // Setup: Create buyer and properties
    const buyer = await createTestBuyer();
    const properties = await createTestProperties(buyer.id, 3);
    
    // Step 1: Fetch inquiry history
    const historyResponse = await request(app)
      .get(`/api/buyers/${buyer.id}/inquiry-history`)
      .expect(200);
    
    expect(historyResponse.body.inquiryHistory).toHaveLength(3);
    
    // Step 2: Generate email content
    const generateResponse = await request(app)
      .post('/api/inquiry-response/generate')
      .send({
        propertyIds: properties.map(p => p.id),
        templateId: 'default',
        buyerInfo: {
          name: buyer.name,
          email: buyer.email,
        },
      })
      .expect(200);
    
    expect(generateResponse.body.body).toContain(properties[0].preViewingNotes);
    
    // Step 3: Send email
    const sendResponse = await request(app)
      .post('/api/inquiry-response/send')
      .send({
        recipientEmail: buyer.email,
        subject: generateResponse.body.subject,
        body: generateResponse.body.body,
        buyerId: buyer.id,
        propertyIds: properties.map(p => p.id),
        sentBy: 1,
      })
      .expect(200);
    
    expect(sendResponse.body.success).toBe(true);
    expect(sendResponse.body.emailHistoryId).toBeDefined();
    
    // Step 4: Verify email history was saved
    const historyCheckResponse = await request(app)
      .get(`/api/email-history/${buyer.id}`)
      .expect(200);
    
    expect(historyCheckResponse.body.emailHistory).toHaveLength(1);
    expect(historyCheckResponse.body.emailHistory[0].propertyIds).toEqual(
      properties.map(p => p.id)
    );
  });
});
```

### Manual Testing Checklist

- [ ] Load buyer detail page for buyer 6647
- [ ] Verify inquiry history table displays both current (6647) and past (6648) inquiries
- [ ] Verify visual distinction between current and past inquiries
- [ ] Select multiple properties using checkboxes
- [ ] Verify selection count updates correctly
- [ ] Click "選択をクリア" and verify all selections are cleared
- [ ] Select properties and click "Gmail送信"
- [ ] Verify email modal opens with buyer info pre-filled
- [ ] Verify email body includes pre-viewing notes for all selected properties
- [ ] Send email and verify success message
- [ ] Verify selection is cleared after successful send
- [ ] Check database to confirm email history was saved
- [ ] Verify email history includes all required fields
- [ ] Test with properties that have no pre-viewing notes
- [ ] Test with buyer that has no past inquiries
- [ ] Test error scenarios (network failure, invalid email, etc.)

