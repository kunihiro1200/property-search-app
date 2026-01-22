# Design Document

## Overview

通話モードページのSMS送信機能を刷新し、7つの新しいテンプレートに完全置き換えを行う。各テンプレートは売主情報（サイト、名前、物件所在地、査定額、訪問日時、担当者など）を動的に埋め込み、サイト別に異なる内容を生成する。既存のSMSテンプレート配列を新しい定義で上書きし、フロントエンドのCallModePageコンポーネントで使用する。

## Architecture

### Component Structure

```
CallModePage (frontend/src/pages/CallModePage.tsx)
├── SMS Template Dropdown (Select component)
├── Confirmation Dialog (Dialog component)
└── SMS Template Generator (utility functions)
```

### Data Flow

1. User selects SMS template from dropdown
2. System generates message content using seller data and template logic
3. Confirmation dialog displays template label and preview
4. User confirms → System opens SMS app with pre-filled content
5. System records activity in database
6. Activity history refreshes to show new SMS record

## Components and Interfaces

### Frontend Components

#### 1. SMS Template Definition

```typescript
interface SMSTemplate {
  id: string;
  label: string;
  generator: (seller: Seller, property: PropertyInfo | null) => string;
}
```

#### 2. Template Generator Functions

各テンプレートは独立した生成関数を持つ:

```typescript
// 1. 初回不通時キャンセル案内
const generateInitialCancellationGuidance = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const site = seller.site || seller.inquirySite || '';
  const name = seller.name || '';
  const propertyAddress = property?.address || seller.address || '';
  
  // サイト別の分岐ロジック
  if (site === 'ウ') {
    return `${name}様\n\nこの度はイエウールより${propertyAddress}の査定依頼をいただきましてありがとうございます...`;
  } else if (site === 'L' || site === 'Y') {
    return `${name}様\n\nこの度は${propertyAddress}の査定依頼をいただきましてありがとうございます...`;
  }
  // ... 他のサイト分岐
};

// 2. キャンセル案内
const generateCancellationGuidance = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  // サイト別のキャンセル案内ロジック
};

// 3. 査定Sメール
const generateValuationSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  const propertyAddress = property?.address || seller.address || '';
  const amount1 = seller.valuationAmount1 
    ? Math.round(seller.valuationAmount1 / 10000) 
    : 0;
  const amount2 = seller.valuationAmount2 
    ? Math.round(seller.valuationAmount2 / 10000) 
    : 0;
  const amount3 = seller.valuationAmount3 
    ? Math.round(seller.valuationAmount3 / 10000) 
    : 0;
  
  let message = `${name}様\n\n${propertyAddress}の査定をさせていただきました...`;
  
  // 築年不明の場合の注記
  if (!property?.buildYear || property.buildYear <= 0) {
    message += '\n新築年が不明のため、築年35年で算出しております。相違がある場合はお申し付けくださいませ。';
  }
  
  return message;
};

// 4. 訪問事前通知メール
const generateVisitReminderSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  const appointmentDate = seller.appointmentDate 
    ? new Date(seller.appointmentDate) 
    : null;
  
  if (!appointmentDate) {
    return `${name}様\n\n訪問予定日時が設定されていません。`;
  }
  
  const dayOfWeek = appointmentDate.toLocaleDateString('ja-JP', { weekday: 'long' });
  const isThursday = dayOfWeek === '木曜日';
  const dayText = isThursday ? '明後日' : '明日';
  
  const dateText = appointmentDate.toLocaleDateString('ja-JP', { 
    month: 'long', 
    day: 'numeric' 
  });
  const timeText = appointmentDate.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `【訪問、打合せのご連絡　☆返信不可☆】\n${name}様\n\nお世話になっております...`;
};

// 5. 訪問後御礼メール
const generatePostVisitThankYouSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  const assignee = seller.visitAssignee || seller.assignedTo || '';
  
  // 営担コードから名前へのマッピング
  const assigneeNameMap: Record<string, string> = {
    'U': '裏',
    'M': '河野',
    'Y': '山本',
    'W': '和田',
    'K': '国広',
  };
  
  const assigneeName = assigneeNameMap[assignee] || assignee;
  
  return `${name}様\n\nお世話になっております。㈱いふうの${assigneeName}です...`;
};

// 6. 除外前・長期客Sメール
const generateLongTermCustomerSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  const propertyAddress = property?.address || seller.address || '';
  
  return `${name}様\n\nお世話になっております。大分市舞鶴町にございます不動産会社のいふうです...`;
};

// 7. 当社が電話したというリマインドメール
const generateCallReminderSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  const name = seller.name || '';
  
  return `${name}様\n\nお世話になっております。先ほどお電話でお話させていただきましてありがとうございました...`;
};
```

#### 3. SMS Template Array

```typescript
const smsTemplates: SMSTemplate[] = [
  {
    id: 'initial_cancellation',
    label: '初回不通時キャンセル案内',
    generator: generateInitialCancellationGuidance,
  },
  {
    id: 'cancellation',
    label: 'キャンセル案内',
    generator: generateCancellationGuidance,
  },
  {
    id: 'valuation',
    label: '査定Sメール',
    generator: generateValuationSMS,
  },
  {
    id: 'visit_reminder',
    label: '訪問事前通知メール',
    generator: generateVisitReminderSMS,
  },
  {
    id: 'post_visit_thank_you',
    label: '訪問後御礼メール',
    generator: generatePostVisitThankYouSMS,
  },
  {
    id: 'long_term_customer',
    label: '除外前・長期客Sメール',
    generator: generateLongTermCustomerSMS,
  },
  {
    id: 'call_reminder',
    label: '当社が電話したというリマインドメール',
    generator: generateCallReminderSMS,
  },
];
```

### Backend Components

バックエンドの変更は最小限:

1. Activity記録時に新しいテンプレートラベルを受け入れる
2. 既存のSMS activity記録APIをそのまま使用

## Data Models

### Seller Model (既存)

```typescript
interface Seller {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  address: string;
  site?: string; // サイト（ウ、L、Y、す、H等）
  inquirySite?: string; // 反響元サイト
  
  // 査定情報
  valuationAmount1?: number;
  valuationAmount2?: number;
  valuationAmount3?: number;
  
  // 訪問情報
  appointmentDate?: string | Date;
  visitAssignee?: string; // 営担（U, M, Y, W, K）
  assignedTo?: string;
  
  // その他
  property?: PropertyInfo;
  // ...
}
```

### PropertyInfo Model (既存)

```typescript
interface PropertyInfo {
  id?: string;
  sellerId: string;
  address: string;
  buildYear?: number;
  // ...
}
```

### Activity Model (既存)

```typescript
interface Activity {
  id: string;
  sellerId: string;
  employeeId: string;
  type: 'sms'; // ActivityType.SMS
  content: string; // 例: "【初回不通時キャンセル案内】を送信"
  result: 'sent';
  createdAt: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

1.1 WHEN the User views the Call Mode Page THEN the System SHALL display an SMS template dropdown with exactly 7 options in the following order
Thoughts: This is testing that the UI displays a specific set of options in a specific order. We can test this by checking that the dropdown contains exactly 7 items and that they appear in the correct sequence.
Testable: yes - example

1.2 WHEN the User selects a template from the dropdown THEN the System SHALL display a confirmation dialog showing the template label and content preview
Thoughts: This is testing UI behavior across all templates. We can generate random seller data and verify that selecting any template opens a dialog with the correct label and preview.
Testable: yes - property

1.3 WHEN the User confirms sending THEN the System SHALL open the device SMS application with the Seller phone number and pre-filled message content
Thoughts: This is testing that the SMS app opens with correct data. This is a browser/device integration that's difficult to test automatically.
Testable: no

1.4 WHEN the User confirms sending THEN the System SHALL record the SMS activity in the activity log with the template label
Thoughts: This is testing that for any template selection and confirmation, an activity record is created. We can test this across all templates.
Testable: yes - property

1.5 WHEN the SMS is sent THEN the System SHALL refresh the activity history to show the new SMS record
Thoughts: This is testing UI state update behavior. We can verify that after sending, the activity list contains the new record.
Testable: yes - property

2.1 WHEN the Seller site is "ウ" (イエウール) THEN the System SHALL generate a message containing イエウール-specific cancellation instructions
Thoughts: This is testing specific output for a specific input. This is an example test case.
Testable: yes - example

2.2 WHEN the Seller site is "L" or "Y" THEN the System SHALL generate a message with reply-based cancellation instructions
Thoughts: This is testing that for specific site values, the output contains specific content. These are example test cases.
Testable: yes - example

2.3 WHEN the Seller site is "す" THEN the System SHALL generate a message with Google Forms cancellation link
Thoughts: This is testing specific output for a specific input.
Testable: yes - example

2.4 WHEN the Seller site is "H" THEN the System SHALL generate a message without specific cancellation instructions
Thoughts: This is testing specific output for a specific input.
Testable: yes - example

2.5 WHEN the template is generated THEN the System SHALL include the Seller name, property address, and company information in the message
Thoughts: This is testing that for any seller data, the generated message contains required fields. This is a property that should hold across all inputs.
Testable: yes - property

3.1-3.4 (キャンセル案内 site-specific tests)
Thoughts: Similar to 2.1-2.4, these are example test cases for specific site values.
Testable: yes - example

3.5 WHEN the template is generated THEN the System SHALL include the Seller name and property address in the message
Thoughts: This is a property that should hold for all seller data.
Testable: yes - property

4.1 WHEN the User selects the valuation SMS template THEN the System SHALL generate a message containing three valuation amounts formatted as price ranges in 万円 units
Thoughts: This is testing that for any seller with valuation data, the message contains properly formatted prices.
Testable: yes - property

4.2 WHEN the build year is unknown or zero THEN the System SHALL include a notice that the valuation was calculated assuming 35 years old
Thoughts: This is testing conditional content inclusion based on build year. This is an edge case.
Testable: edge-case

4.3 WHEN the template is generated THEN the System SHALL include the Seller name, property address, appointment booking link, and company contact information
Thoughts: This is testing that required fields are always present.
Testable: yes - property

4.4 WHEN the template is generated THEN the System SHALL mention that the User has potential buyers interested in the area
Thoughts: This is testing that specific content is always included.
Testable: yes - property

4.5 WHEN the valuation amounts are not set THEN the System SHALL use auto-calculated values if available
Thoughts: This is testing fallback behavior. This is an edge case.
Testable: edge-case

5.1 WHEN the appointment day is Thursday THEN the System SHALL generate a message stating "明後日"
Thoughts: This is testing specific output for a specific day of week.
Testable: yes - example

5.2 WHEN the appointment day is not Thursday THEN the System SHALL generate a message stating "明日"
Thoughts: This is testing output for all non-Thursday days.
Testable: yes - property

5.3 WHEN the template is generated THEN the System SHALL include the Seller name, appointment datetime, company contact information, and business hours notice
Thoughts: This is testing that required fields are always present.
Testable: yes - property

5.4 WHEN the template is generated THEN the System SHALL indicate that the message is reply-disabled and provide alternative contact methods
Thoughts: This is testing that specific content is always included.
Testable: yes - property

5.5 WHEN the template is generated THEN the System SHALL format the appointment date as "M月D日" and time as "HH:MM"
Thoughts: This is testing date/time formatting across all appointment dates.
Testable: yes - property

6.1 WHEN the User selects the post-visit thank-you template THEN the System SHALL generate a message thanking the Seller for their time
Thoughts: This is testing that specific content is always included.
Testable: yes - property

6.2 WHEN the template is generated THEN the System SHALL include the Seller name and the assigned employee name
Thoughts: This is testing that required fields are always present.
Testable: yes - property

6.3-6.4 (営担 mapping tests)
Thoughts: These are testing specific mappings from codes to names.
Testable: yes - example

6.5 WHEN the template is generated THEN the System SHALL include company name and encourage the Seller to contact with any questions
Thoughts: This is testing that specific content is always included.
Testable: yes - property

7.1-7.5 (除外前・長期客Sメール and リマインドメール tests)
Thoughts: Similar patterns - testing that required fields and content are always present.
Testable: yes - property

9.1 WHEN the System generates any SMS template THEN the System SHALL convert "[改行]" placeholders to actual line breaks
Thoughts: This is testing string replacement across all templates and all inputs.
Testable: yes - property

9.2 WHEN the System generates any SMS template THEN the System SHALL handle empty or null Seller data fields gracefully without breaking the message format
Thoughts: This is testing error handling with missing data. This is an edge case.
Testable: edge-case

9.3 WHEN the System generates any SMS template THEN the System SHALL ensure proper spacing between sections for readability
Thoughts: This is subjective and difficult to test automatically.
Testable: no

9.4 WHEN the System generates any SMS template THEN the System SHALL limit message length to reasonable SMS constraints
Thoughts: This is testing that for any input, the output length is within bounds.
Testable: yes - property

9.5 WHEN the System generates any SMS template THEN the System SHALL preserve Japanese character encoding correctly
Thoughts: This is testing character encoding, which is typically handled by the platform.
Testable: no

10.1 WHEN the System loads the Call Mode Page THEN the System SHALL remove all existing SMS template definitions
Thoughts: This is testing that old templates are not present. This is an example test.
Testable: yes - example

10.2 WHEN the System displays the SMS dropdown THEN the System SHALL show only the 7 new templates in the specified order
Thoughts: This is the same as 1.1.
Testable: yes - example

10.3 WHEN the User attempts to access old templates THEN the System SHALL not provide any access to previous template definitions
Thoughts: This is testing that old template IDs are not accessible. This is an example test.
Testable: yes - example

10.4 WHEN the System records SMS activities THEN the System SHALL use the new template labels in activity logs
Thoughts: This is testing that for any new template, the activity log uses the correct label.
Testable: yes - property

10.5 WHEN the System displays activity history THEN the System SHALL correctly display SMS activities sent using the new templates
Thoughts: This is testing UI display of activity records.
Testable: yes - property

### Property Reflection

After reviewing all properties, I identify the following redundancies:

- Properties 1.2, 1.4, and 1.5 all test the confirmation and recording flow - these can be combined into a single comprehensive property
- Properties 2.5, 3.5, 4.3, 5.3, 6.2, 7.1-7.5 all test that required fields are included - these can be combined into one property per template
- Properties 10.2 and 1.1 are identical - remove 10.2
- Properties 4.1, 4.3, 4.4 can be combined into one comprehensive valuation SMS property

### Correctness Properties

Property 1: Template dropdown displays exactly 7 templates in correct order
*For any* Call Mode Page load, the SMS template dropdown should contain exactly 7 options in this order: 初回不通時キャンセル案内、キャンセル案内、査定Sメール、訪問事前通知メール、訪問後御礼メール、除外前・長期客Sメール、当社が電話したというリマインドメール
**Validates: Requirements 1.1, 10.2**

Property 2: Template selection triggers confirmation dialog
*For any* template selection, the system should display a confirmation dialog containing the template label and a preview of the generated message content
**Validates: Requirements 1.2**

Property 3: SMS confirmation creates activity record
*For any* template confirmation, the system should create an activity record with type 'sms', content containing the template label, and result 'sent'
**Validates: Requirements 1.4**

Property 4: Activity history updates after SMS send
*For any* SMS send action, the activity history should refresh and include the newly created SMS activity record
**Validates: Requirements 1.5, 10.5**

Property 5: Initial cancellation guidance includes required fields
*For any* seller data, the 初回不通時キャンセル案内 template should include the seller name, property address, and company information
**Validates: Requirements 2.5**

Property 6: Cancellation guidance includes required fields
*For any* seller data, the キャンセル案内 template should include the seller name and property address
**Validates: Requirements 3.5**

Property 7: Valuation SMS includes all required components
*For any* seller with valuation data, the 査定Sメール template should include seller name, property address, three valuation amounts formatted in 万円, appointment booking link, buyer interest mention, and company contact information
**Validates: Requirements 4.1, 4.3, 4.4**

Property 8: Visit reminder includes required fields and proper date formatting
*For any* seller with appointment date, the 訪問事前通知メール template should include seller name, formatted appointment date (M月D日), formatted time (HH:MM), company contact information, business hours notice, and reply-disabled notice
**Validates: Requirements 5.3, 5.4, 5.5**

Property 9: Non-Thursday appointments use "明日" text
*For any* appointment date that is not Thursday, the visit reminder should contain the text "明日"
**Validates: Requirements 5.2**

Property 10: Post-visit thank you includes required fields
*For any* seller data, the 訪問後御礼メール template should include seller name, mapped employee name, thank you message, and company name
**Validates: Requirements 6.1, 6.2, 6.5**

Property 11: Long-term customer SMS includes required fields
*For any* seller data, the 除外前・長期客Sメール template should include seller name, property address, buyer interest mention, appointment booking link, opt-out offer, company address, sales record link, and phone number
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

Property 12: Call reminder SMS includes required fields
*For any* seller data, the 当社が電話したというリマインドメール template should include seller name, call confirmation message, callback time request, reply welcome notice, company address, sales record link, and phone number
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

Property 13: Line break placeholders are converted
*For any* generated SMS message, all "[改行]" placeholders should be converted to actual line break characters (\n)
**Validates: Requirements 9.1**

Property 14: Message length is within SMS constraints
*For any* generated SMS message, the total character length should not exceed 670 characters (standard Japanese SMS limit)
**Validates: Requirements 9.4**

Property 15: Activity logs use new template labels
*For any* SMS activity created after template replacement, the activity content should contain one of the 7 new template labels
**Validates: Requirements 10.4**

## Error Handling

### Missing Data Handling

1. **Missing Seller Name**: Use empty string, template should still be valid
2. **Missing Property Address**: Fall back to seller.address
3. **Missing Site**: Default to empty string, template should handle gracefully
4. **Missing Valuation Amounts**: Display "未設定" or skip valuation-specific content
5. **Missing Appointment Date**: Display error message in preview
6. **Missing Employee Assignment**: Use empty string or "担当者"

### Validation Errors

1. **Invalid Template ID**: Show error alert, prevent SMS send
2. **Empty Phone Number**: Disable SMS send button
3. **Message Generation Failure**: Show error dialog with details
4. **Activity Recording Failure**: Show warning but allow retry

### Error Messages

```typescript
const ERROR_MESSAGES = {
  MISSING_PHONE: '電話番号が設定されていません',
  MISSING_APPOINTMENT: '訪問予定日時が設定されていません',
  MISSING_VALUATION: '査定額が設定されていません',
  GENERATION_FAILED: 'メッセージの生成に失敗しました',
  ACTIVITY_FAILED: '活動履歴の記録に失敗しました',
};
```

## Testing Strategy

### Unit Testing

Unit tests will cover:

1. **Template Array Structure**: Verify 7 templates exist in correct order
2. **Generator Function Signatures**: Verify all generators accept (Seller, PropertyInfo | null) and return string
3. **Site-Specific Examples**: Test each site value produces expected output for initial cancellation and cancellation guidance templates
4. **Employee Code Mapping**: Test U→裏, M→河野, Y→山本, W→和田, K→国広 mappings
5. **Date Formatting**: Test appointment date formats correctly as "M月D日" and time as "HH:MM"
6. **Thursday Detection**: Test that Thursday appointments use "明後日" and others use "明日"
7. **Line Break Conversion**: Test "[改行]" is replaced with "\n"
8. **Missing Data Handling**: Test templates handle null/undefined values gracefully

### Property-Based Testing

We will use **fast-check** (JavaScript/TypeScript property-based testing library) for property-based tests.

Each property-based test will run a minimum of 100 iterations with randomly generated seller data.

Property-based tests will verify:

1. **Property 2**: Template selection confirmation dialog - Generate random template selections and verify dialog appears with correct label
2. **Property 3**: Activity record creation - Generate random template confirmations and verify activity records are created
3. **Property 4**: Activity history refresh - Generate random SMS sends and verify history updates
4. **Property 5-12**: Required fields inclusion - Generate random seller data and verify each template includes all required fields
5. **Property 13**: Line break conversion - Generate random messages and verify all "[改行]" are converted
6. **Property 14**: Message length constraints - Generate random seller data and verify all messages are within 670 characters
7. **Property 15**: New template labels in logs - Generate random SMS activities and verify labels match new templates

Each property-based test will be tagged with:
```typescript
// Feature: sms-template-replacement, Property X: [property description]
```

### Integration Testing

Integration tests will verify:

1. End-to-end SMS send flow from dropdown selection to activity log update
2. Confirmation dialog display and interaction
3. SMS app opening with correct parameters (manual testing required)
4. Activity history API integration

## Implementation Notes

### Template Replacement Strategy

1. **Complete Replacement**: Remove all existing template definitions from `smsTemplates` array
2. **No Migration**: Old template IDs will no longer be valid
3. **Activity History**: Old SMS activities will remain in database with old labels
4. **Backward Compatibility**: Not required - this is a complete replacement

### Performance Considerations

1. **Template Generation**: All generators are synchronous and fast (< 1ms)
2. **Message Length**: Keep templates concise to avoid SMS splitting
3. **Dropdown Rendering**: 7 options is small, no virtualization needed

### Security Considerations

1. **Data Sanitization**: Seller data should already be sanitized in database
2. **XSS Prevention**: Use React's built-in escaping for dialog preview
3. **Phone Number Validation**: Validate format before opening SMS app

### Localization

All templates are in Japanese. No localization required.

### Browser Compatibility

SMS app opening uses `window.location.href = 'sms:...'` which is supported in:
- iOS Safari
- Android Chrome
- Desktop browsers (may open default SMS app if available)

## Dependencies

### Frontend Dependencies

- React (existing)
- Material-UI (existing)
- TypeScript (existing)

### Backend Dependencies

- No new dependencies required
- Uses existing Activity API

## Deployment Considerations

1. **Zero Downtime**: Frontend-only change, can be deployed without backend changes
2. **Rollback**: Simple - revert to previous frontend build
3. **Testing**: Test on staging environment with real seller data
4. **User Training**: Provide documentation on new template names and usage

## Future Enhancements

1. **Template Customization**: Allow users to edit template content
2. **Template Analytics**: Track which templates are most used
3. **A/B Testing**: Test different template variations
4. **SMS Delivery Tracking**: Integrate with SMS gateway for delivery confirmation
5. **Template Versioning**: Keep history of template changes
