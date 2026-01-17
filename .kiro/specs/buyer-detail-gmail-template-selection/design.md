# Design Document

## Overview

買主詳細ページのGmail送信機能を改善し、問合せ履歴の件数に関わらずメール送信を可能にする。ユーザーは複数のメールテンプレートから選択でき、複数の物件問合せがある場合は送信対象の物件を選択できる。システムは選択されたテンプレートと物件情報を統合し、送信履歴を記録する。

## Architecture

### Component Structure

```
BuyerDetailPage
├── InquiryHistorySection
│   └── GmailSendButton (always visible when inquiries > 0)
│
├── EmailCompositionFlow
│   ├── TemplateSelectionModal
│   │   ├── TemplateList
│   │   └── TemplatePreview
│   │
│   ├── PropertySelectionModal (only for multiple inquiries)
│   │   └── PropertyList
│   │
│   └── EmailCompositionForm
│       ├── TemplateContent (with merged property data)
│       └── SendButton
│
└── EmailHistoryService (backend)
    ├── recordEmailSent()
    └── associateWithProperty()
```

### Data Flow

1. User clicks Gmail Send Button
2. System checks inquiry count
3. If multiple inquiries: Show Property Selector → User selects property
4. Show Template Selector → User selects template
5. System merges template with property data
6. Show Email Composition Form with merged content
7. User reviews and sends
8. System records email in history with associations

## Components and Interfaces

### Frontend Components

#### GmailSendButton Component

```typescript
interface GmailSendButtonProps {
  buyerId: string;
  inquiryHistory: InquiryHistoryItem[];
  defaultPropertyId?: string; // Property that was clicked to open buyer detail
}

// Visibility logic
const shouldShowButton = inquiryHistory.length > 0;
```

#### TemplateSelectionModal Component

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  placeholders: string[]; // e.g., ['{{propertyAddress}}', '{{price}}']
}

interface TemplateSelectionModalProps {
  isOpen: boolean;
  templates: EmailTemplate[];
  onSelect: (template: EmailTemplate) => void;
  onCancel: () => void;
}
```

#### PropertySelectionModal Component

```typescript
interface PropertySelectionModalProps {
  isOpen: boolean;
  properties: PropertyInfo[];
  defaultSelectedId?: string;
  onSelect: (propertyId: string) => void;
  onCancel: () => void;
}

interface PropertyInfo {
  id: string;
  propertyNumber: string;
  address: string;
  price: number;
  inquiryDate: Date;
}
```

#### EmailCompositionForm Component

```typescript
interface EmailCompositionFormProps {
  buyerId: string;
  propertyId?: string;
  templateId: string;
  mergedContent: {
    subject: string;
    body: string;
  };
  onSend: (emailData: EmailData) => Promise<void>;
  onCancel: () => void;
}

interface EmailData {
  buyerId: string;
  propertyId?: string;
  templateId: string;
  subject: string;
  body: string;
  recipientEmail: string;
}
```

### Backend Services

#### EmailTemplateService

```typescript
class EmailTemplateService {
  // Get all available email templates
  async getTemplates(): Promise<EmailTemplate[]>;
  
  // Get a specific template by ID
  async getTemplateById(templateId: string): Promise<EmailTemplate>;
  
  // Merge template with property data
  mergePlaceholders(
    template: EmailTemplate,
    propertyData: PropertyData
  ): { subject: string; body: string };
}

interface PropertyData {
  propertyNumber: string;
  address: string;
  price: number;
  landArea?: number;
  buildingArea?: number;
  [key: string]: any; // Additional property fields
}
```

#### EmailHistoryService

```typescript
class EmailHistoryService {
  // Record sent email
  async recordEmailSent(emailRecord: EmailRecord): Promise<void>;
  
  // Get email history for a buyer
  async getEmailHistory(buyerId: string): Promise<EmailRecord[]>;
}

interface EmailRecord {
  id: string;
  buyerId: string;
  propertyId?: string;
  templateId: string;
  templateName: string;
  subject: string;
  body: string;
  recipientEmail: string;
  sentAt: Date;
  sentBy: string; // Employee ID
}
```

#### GmailSendService

```typescript
class GmailSendService {
  // Send email via Gmail API
  async sendEmail(emailData: EmailData): Promise<SendResult>;
  
  // Validate email data before sending
  validateEmailData(emailData: EmailData): ValidationResult;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

## Data Models

### Email Templates Storage

テンプレートは設定ファイルまたはデータベースに保存:

```typescript
// Example template structure
const emailTemplates: EmailTemplate[] = [
  {
    id: 'inquiry-response',
    name: '問合せ返信',
    description: '物件問合せに対する返信テンプレート',
    subject: '【{{propertyNumber}}】物件のお問い合わせありがとうございます',
    body: `
{{buyerName}}様

お問い合わせいただきありがとうございます。

物件番号: {{propertyNumber}}
所在地: {{propertyAddress}}
価格: {{price}}円

詳細につきましては、お気軽にお問い合わせください。

よろしくお願いいたします。
    `,
    placeholders: [
      '{{buyerName}}',
      '{{propertyNumber}}',
      '{{propertyAddress}}',
      '{{price}}'
    ]
  },
  {
    id: 'viewing-invitation',
    name: '内覧案内',
    description: '物件内覧の案内テンプレート',
    subject: '【{{propertyNumber}}】内覧のご案内',
    body: `
{{buyerName}}様

{{propertyNumber}}の内覧についてご案内いたします。

物件所在地: {{propertyAddress}}

ご都合の良い日時をお知らせください。

よろしくお願いいたします。
    `,
    placeholders: [
      '{{buyerName}}',
      '{{propertyNumber}}',
      '{{propertyAddress}}'
    ]
  },
  {
    id: 'follow-up',
    name: 'フォローアップ',
    description: '問合せ後のフォローアップテンプレート',
    subject: '{{propertyNumber}}の件でご連絡',
    body: `
{{buyerName}}様

先日お問い合わせいただいた物件について、
その後ご検討状況はいかがでしょうか。

物件番号: {{propertyNumber}}
所在地: {{propertyAddress}}

ご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。
    `,
    placeholders: [
      '{{buyerName}}',
      '{{propertyNumber}}',
      '{{propertyAddress}}'
    ]
  }
];
```

### Database Schema Extension

既存の`email_history`テーブルに以下のカラムを追加:

```sql
ALTER TABLE email_history
ADD COLUMN template_id VARCHAR(100),
ADD COLUMN template_name VARCHAR(200);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Button visibility consistency
*For any* buyer with one or more inquiry history records, the Gmail send button should always be visible on the buyer detail page.
**Validates: Requirements 1.1**

### Property 2: Template selection completeness
*For any* template selection action, the system should display all available templates with their names and descriptions.
**Validates: Requirements 2.2, 2.5**

### Property 3: Single inquiry auto-selection
*For any* buyer with exactly one inquiry history record, clicking the Gmail send button should automatically select that property without showing a property selector.
**Validates: Requirements 3.1, 3.2**

### Property 4: Multiple inquiry default selection
*For any* buyer with multiple inquiry history records, when a specific property context exists (property was clicked), that property should be pre-selected in the property selector.
**Validates: Requirements 4.3**

### Property 5: Placeholder replacement completeness
*For any* template with placeholders and selected property, all placeholders in the template should be replaced with corresponding property data values.
**Validates: Requirements 5.1, 5.2**

### Property 6: Email history recording
*For any* successfully sent email, the system should create a record in the email history table with buyer ID, property ID (if applicable), template ID, and timestamp.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 7: Error feedback provision
*For any* failed operation (template loading, email sending), the system should display an error message and provide a retry option.
**Validates: Requirements 7.3, 7.5**

## Error Handling

### Template Loading Errors
- Network failures: Display retry button with error message
- No templates available: Show informative message to contact administrator
- Template parsing errors: Log error and skip invalid templates

### Email Sending Errors
- Gmail API errors: Display specific error message from API
- Network timeouts: Provide retry option with exponential backoff
- Invalid email data: Validate before sending and show validation errors

### Property Selection Errors
- No properties found: Should not occur (button hidden when no inquiries)
- Property data missing: Use fallback values or show warning

### User Experience Errors
- Modal close during operation: Confirm before closing if data entered
- Concurrent operations: Disable buttons during processing
- Session timeout: Redirect to login with return URL

## Testing Strategy

### Unit Tests
- Template placeholder replacement logic
- Property selection default logic (single vs multiple inquiries)
- Email data validation
- Error message generation

### Property-Based Tests
- Property 1: Test with various inquiry counts (1, 2, 5, 10, 100)
- Property 2: Test with different template sets (empty, single, multiple)
- Property 3: Test with single inquiry scenarios
- Property 4: Test with multiple inquiries and various default selections
- Property 5: Test with templates containing different placeholder combinations
- Property 6: Test email recording with various property/template combinations
- Property 7: Test error scenarios with different failure types

Each property test should run minimum 100 iterations with randomized test data.

### Integration Tests
- Full email composition flow from button click to send
- Template selection → property selection → composition → send
- Email history recording after successful send
- Gmail API integration
- Database transaction handling

### Manual Testing
- UI responsiveness and visual feedback
- Modal interactions and transitions
- Template preview rendering
- Property selection UX with different inquiry counts
- Error message clarity and actionability
