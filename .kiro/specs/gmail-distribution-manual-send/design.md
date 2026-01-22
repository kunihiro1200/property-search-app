# Design Document

## Overview

This document outlines the technical design for converting the Gmail distribution feature from automatic email sending to manual sending via Gmail compose window. The change removes direct email sending and instead opens a pre-populated Gmail compose window for user review and manual sending.

## Architecture

### Component Flow

```
User clicks "Gmailで配信" button
  ↓
EmailTemplateSelector modal opens
  ↓
User selects template and sender address
  ↓
System fetches qualified buyers
  ↓
BuyerFilterSummaryModal opens with buyer list
  ↓
User reviews and selects recipients
  ↓
User clicks "Gmailを開く" button
  ↓
System generates Gmail compose URL
  ↓
Gmail opens in new tab with pre-populated content
  ↓
User reviews and manually sends email in Gmail
```

### Key Components

1. **GmailDistributionButton.tsx**
   - Main entry point for Gmail distribution
   - Manages modal states and data flow
   - Generates Gmail compose URL
   - Opens Gmail in new tab

2. **BuyerFilterSummaryModal.tsx**
   - Displays filtered buyer list
   - Shows sender address selector
   - Allows recipient selection
   - Triggers Gmail compose window opening

3. **gmailComposeUrl.ts** (utility)
   - Generates Gmail compose URL with parameters
   - Handles BCC recipient limits
   - URL encodes all parameters

## Data Flow

### 1. Button Click Handler

```typescript
handleButtonClick() {
  // Validate distribution areas
  if (!distributionAreas) {
    show warning message
    return
  }
  
  // Open template selector
  setTemplateSelectorOpen(true)
}
```

### 2. Template Selection Handler

```typescript
handleTemplateSelect(template) {
  setLoading(true)
  
  // Fetch qualified buyers with enhanced filtering
  const result = await gmailDistributionService.fetchQualifiedBuyerEmailsEnhanced(
    propertyNumber,
    true // include details
  )
  
  if (result.count === 0) {
    show warning message
    return
  }
  
  // Store buyer data and open filter summary modal
  setBuyerData(result)
  setFilterSummaryOpen(true)
  setTemplateSelectorOpen(false)
}
```

### 3. Filter Summary Confirmation Handler

```typescript
handleFilterSummaryConfirm(selectedEmails) {
  // Check BCC limit
  if (isBccLimitExceeded(selectedEmails)) {
    show warning message
    emailsToSend = limitBccRecipients(selectedEmails)
  }
  
  // Prepare property data
  const propertyData = {
    address: propertyAddress,
    propertyNumber: propertyNumber
  }
  
  // Replace template placeholders
  const subject = selectedTemplate.subject
    .replace(/{address}/g, propertyData.address)
    .replace(/{propertyNumber}/g, propertyData.propertyNumber)
  
  const body = selectedTemplate.body
    .replace(/{address}/g, propertyData.address)
    .replace(/{propertyNumber}/g, propertyData.propertyNumber)
  
  // Generate Gmail compose URL
  const gmailUrl = generateGmailComposeUrl({
    bcc: emailsToSend.join(','),
    subject: subject,
    body: body
  })
  
  // Open Gmail in new tab
  const newWindow = window.open(gmailUrl, '_blank')
  
  // Check for popup blocker
  if (!newWindow || newWindow.closed) {
    show error message
    return
  }
  
  // Show success message
  show success message with instructions
  
  // Close modal
  setFilterSummaryOpen(false)
}
```

## Gmail Compose URL Generation

### URL Structure

```
https://mail.google.com/mail/?view=cm&fs=1&to=&bcc={bcc}&su={subject}&body={body}
```

### Parameters

- `view=cm`: Compose mode
- `fs=1`: Full screen
- `to=`: Empty (no direct recipients)
- `bcc={bcc}`: Comma-separated email addresses
- `su={subject}`: URL-encoded subject
- `body={body}`: URL-encoded body

### BCC Limit Handling

- Maximum BCC recipients: 500 (Gmail limit)
- If exceeded, show warning and limit to first 500
- Display warning message to user

## User Interface Changes

### GmailDistributionButton

**Before:**
- Button label: "Gmailで配信"
- Loading indicator during email sending
- Success message: "メールを送信しました"

**After:**
- Button label: "Gmailで配信" (unchanged)
- No loading indicator for email sending
- Success message: "Gmailを開きました (X件の宛先)\n送信元: {sender}\n\n内容を確認して、Gmailで送信ボタンを押してください。"

### BuyerFilterSummaryModal

**Before:**
- Confirm button: "配信する"
- Loading indicator during sending

**After:**
- Confirm button: "Gmailを開く (X件)"
- No loading indicator
- Info alert: "メールアドレスを選択してGmailを開きます。Gmailで内容を確認してから送信してください。"

## Removed Functionality

### Direct Email Sending

The following functionality has been removed:

1. **EmailService integration**
   - No longer calls backend email sending API
   - No longer handles email sending responses
   - No longer manages email sending state

2. **Loading States**
   - Removed loading indicator for email sending
   - Kept loading indicator for buyer data fetching only

3. **Success/Error Messages**
   - Removed "メールを送信しました" success message
   - Removed email sending error messages
   - Kept Gmail opening success/error messages

## Error Handling

### Popup Blocker Detection

```typescript
const newWindow = window.open(gmailUrl, '_blank')

if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
  setSnackbar({
    open: true,
    message: 'ポップアップがブロックされました。ブラウザの設定を確認してください。',
    severity: 'error'
  })
  return
}
```

### Distribution Areas Validation

```typescript
if (!distributionAreas || distributionAreas.trim() === '') {
  setSnackbar({
    open: true,
    message: '配信エリア番号が設定されていません。物件詳細ページで配信エリア番号を計算・設定してください。',
    severity: 'warning'
  })
  return
}
```

### No Qualified Buyers

```typescript
if (result.count === 0) {
  setSnackbar({
    open: true,
    message: '配信対象の買主が見つかりませんでした',
    severity: 'warning'
  })
  return
}
```

### BCC Limit Exceeded

```typescript
if (isBccLimitExceeded(selectedEmails)) {
  setSnackbar({
    open: true,
    message: `宛先が${MAX_BCC_RECIPIENTS}件を超えています。最初の${MAX_BCC_RECIPIENTS}件のみ追加されます。`,
    severity: 'warning'
  })
  emailsToSend = limitBccRecipients(selectedEmails)
}
```

## Session Storage

### Sender Address Persistence

```typescript
const SENDER_ADDRESS_KEY = 'gmail_sender_address'
const DEFAULT_SENDER = 'tenant@ifoo-oita.com'

// Load on mount
useEffect(() => {
  const savedAddress = sessionStorage.getItem(SENDER_ADDRESS_KEY)
  if (savedAddress) {
    setSenderAddress(savedAddress)
  }
}, [])

// Save on change
const handleSenderAddressChange = (address: string) => {
  setSenderAddress(address)
  sessionStorage.setItem(SENDER_ADDRESS_KEY, address)
}
```

## Testing Considerations

### Manual Testing Checklist

1. Click "Gmailで配信" button
2. Verify distribution areas validation
3. Select email template
4. Verify buyer data fetching
5. Review buyer filter summary
6. Select/deselect recipients
7. Verify sender address selection
8. Click "Gmailを開く" button
9. Verify Gmail opens in new tab
10. Verify BCC recipients are populated
11. Verify subject is populated
12. Verify body is populated
13. Verify user can edit content
14. Verify user can manually send email
15. Verify success message appears
16. Verify popup blocker detection

### Edge Cases

1. No distribution areas set
2. No qualified buyers found
3. BCC limit exceeded (>500 recipients)
4. Popup blocker enabled
5. No email addresses selected
6. Invalid sender address
7. Template placeholders not replaced

## Security Considerations

1. **URL Encoding**: All parameters are URL-encoded to prevent injection
2. **BCC Only**: Recipients are in BCC to protect privacy
3. **No Direct Sending**: System never sends emails directly, reducing security risks
4. **Session Storage**: Sender address stored in session storage (cleared on browser close)

## Performance Considerations

1. **No Backend Load**: Removing direct email sending reduces backend load
2. **Client-Side URL Generation**: Gmail URL generated on client side
3. **Lazy Loading**: Buyer data fetched only when needed
4. **Session Persistence**: Sender address persisted to reduce repeated selections

## Browser Compatibility

- Chrome: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Edge: ✅ Fully supported

Note: Popup blockers may need to be disabled for the site.

## Future Enhancements

1. **Multiple Batches**: Support sending to >500 recipients in multiple batches
2. **Email Preview**: Show email preview before opening Gmail
3. **Template Variables**: Support more template variables
4. **Attachment Support**: Add support for email attachments
5. **Send History**: Track when Gmail was opened (not when sent)
