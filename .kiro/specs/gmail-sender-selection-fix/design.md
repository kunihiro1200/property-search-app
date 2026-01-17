# Design Document

## Overview

Gmail配信機能において、選択した送信元アドレスから正しくメールが送信されるように、Gmail APIの「Send As」機能を実装します。現在の問題は、`From`ヘッダーを設定しても、実際の送信は認証されたアカウントから行われることです。この設計では、Gmail APIの`sendAs`パラメータを使用して、正しい送信元アドレスからメールを送信できるようにします。

## Architecture

### Current Architecture (問題のある実装)

```
User selects sender → Frontend sends request with 'from' parameter
                    ↓
                Backend creates email with From header
                    ↓
                Gmail API sends email (always from authenticated account)
                    ↓
                Email received with wrong sender
```

### New Architecture (修正後)

```
User selects sender → Frontend sends request with 'senderAddress' parameter
                    ↓
                Backend validates sender is in allowed list
                    ↓
                Backend creates email with sendAs parameter
                    ↓
                Gmail API sends email from specified Send As address
                    ↓
                Email received with correct sender
```

## Components and Interfaces

### 1. EmailService (Backend)

**Modified Methods:**

```typescript
interface SendBatchParams {
  senderAddress: string;      // 送信元アドレス (Send As address)
  recipients: string[];       // 受信者リスト
  subject: string;           // 件名
  body: string;              // 本文
}

class EmailService {
  // Send As アドレスのホワイトリスト
  private readonly ALLOWED_SEND_AS_ADDRESSES = [
    'tenant@ifoo-oita.com',
    'gyosha@ifoo-oita.com',
    'hiromitsu-kakui@ifoo-oita.com',
    'tomoko.kunihiro@ifoo-oita.com'
  ];

  /**
   * Send As アドレスを検証
   */
  private validateSendAsAddress(address: string): void {
    if (!this.ALLOWED_SEND_AS_ADDRESSES.includes(address)) {
      throw new Error(`Invalid Send As address: ${address}`);
    }
  }

  /**
   * Gmail APIでSend Asを使用してバッチ送信
   */
  private async sendBatch(params: SendBatchParams): Promise<void> {
    this.validateSendAsAddress(params.senderAddress);
    
    const message = this.createMessage({
      from: params.senderAddress,
      bcc: params.recipients,
      subject: params.subject,
      body: params.body
    });
    
    // Gmail API with sendAs parameter
    await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: message
      }
    }, {
      // Send As パラメータを使用
      headers: {
        'X-Goog-Send-As': params.senderAddress
      }
    });
  }
}
```

### 2. Gmail Distribution Service (Frontend)

**No changes required** - フロントエンドは既に`senderAddress`を送信しているため、変更不要です。

### 3. API Routes (Backend)

**Modified Endpoint:**

```typescript
router.post('/send-distribution', async (req, res) => {
  const { senderAddress, recipients, subject, body, propertyNumber } = req.body;
  
  // 送信元アドレスの検証
  const validSenders = [
    'tenant@ifoo-oita.com',
    'gyosha@ifoo-oita.com',
    'hiromitsu-kakui@ifoo-oita.com',
    'tomoko.kunihiro@ifoo-oita.com'
  ];
  
  if (!validSenders.includes(senderAddress)) {
    return res.status(400).json({
      success: false,
      message: '無効な送信元アドレスです'
    });
  }
  
  // EmailServiceを使用してメールを送信
  const result = await emailService.sendDistributionEmail({
    senderAddress,
    recipients,
    subject,
    body,
    propertyNumber
  });
  
  res.json(result);
});
```

## Data Models

### Send As Configuration

```typescript
interface SendAsConfig {
  address: string;           // Send As アドレス
  displayName: string;       // 表示名
  isDefault: boolean;        // デフォルトアドレスかどうか
  isVerified: boolean;       // 検証済みかどうか
  replyToAddress?: string;   // 返信先アドレス (オプション)
}

// 設定例
const sendAsConfigs: SendAsConfig[] = [
  {
    address: 'tenant@ifoo-oita.com',
    displayName: '株式会社いふう (一般)',
    isDefault: true,
    isVerified: true
  },
  {
    address: 'gyosha@ifoo-oita.com',
    displayName: '株式会社いふう (業者)',
    isDefault: false,
    isVerified: true
  },
  {
    address: 'hiromitsu-kakui@ifoo-oita.com',
    displayName: '角井宏充',
    isDefault: false,
    isVerified: true
  }
];
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Send As Address Validation
*For any* email send request, if the sender address is not in the allowed list, then the system should reject the request with a clear error message
**Validates: Requirements 1.2, 2.4**

### Property 2: Correct Sender in Sent Email
*For any* successfully sent email, the "From" field in the received email should match the selected sender address
**Validates: Requirements 1.3**

### Property 3: Gmail Sent Folder Consistency
*For any* sent email, the email should appear in the Gmail sent folder of the authenticated account (not necessarily the Send As address)
**Validates: Requirements 1.4**

Note: Gmail APIの仕様上、Send Asで送信したメールは認証アカウントの送信済みフォルダに保存されます。

### Property 4: Configuration Validation
*For any* sender address in the allowed list, the system should verify that it is properly configured as a Send As address before allowing its use
**Validates: Requirements 2.2, 5.1**

### Property 5: Error Message Clarity
*For any* configuration error, the error message should include the sender address, the authenticated account, and specific configuration steps needed
**Validates: Requirements 1.2, 3.2**

## Error Handling

### Error Scenarios

1. **Invalid Send As Address**
   - Error Code: `INVALID_SEND_AS_ADDRESS`
   - Message: `送信元アドレス '{address}' は許可されていません`
   - HTTP Status: 400
   - Retryable: No

2. **Send As Not Configured**
   - Error Code: `SEND_AS_NOT_CONFIGURED`
   - Message: `送信元アドレス '{address}' がGmailの「別のアドレスから送信」に設定されていません`
   - HTTP Status: 500
   - Retryable: No
   - Action: 管理者にGmail設定を確認するよう促す

3. **Send As Not Verified**
   - Error Code: `SEND_AS_NOT_VERIFIED`
   - Message: `送信元アドレス '{address}' が確認されていません`
   - HTTP Status: 500
   - Retryable: No
   - Action: Gmail設定で確認メールを再送信

4. **Gmail API Error**
   - Error Code: `GMAIL_API_ERROR`
   - Message: Gmail APIからのエラーメッセージ
   - HTTP Status: 502
   - Retryable: Yes (一部のエラー)

### Error Logging

```typescript
interface EmailSendError {
  timestamp: Date;
  senderAddress: string;
  authenticatedAccount: string;
  errorCode: string;
  errorMessage: string;
  recipients: number;
  propertyNumber?: string;
}
```

## Testing Strategy

### Unit Tests

1. **Send As Address Validation**
   - Test valid addresses are accepted
   - Test invalid addresses are rejected
   - Test empty/null addresses are rejected

2. **Message Creation**
   - Test From header is set correctly
   - Test BCC recipients are formatted correctly
   - Test subject encoding (Japanese characters)

3. **Error Handling**
   - Test error messages are clear and actionable
   - Test error codes are correct
   - Test retryable vs non-retryable errors

### Integration Tests

1. **Gmail API Integration**
   - Test email is sent with correct Send As address
   - Test email appears in sent folder
   - Test recipient receives email with correct sender

2. **End-to-End Flow**
   - Test user selects sender → email sent → recipient receives
   - Test error scenarios with real Gmail API responses

### Manual Testing Checklist

1. **Gmail Configuration**
   - [ ] Verify Send As addresses are configured in Gmail
   - [ ] Verify Send As addresses are verified
   - [ ] Test sending from each Send As address

2. **Email Delivery**
   - [ ] Send test email from each sender address
   - [ ] Verify recipient sees correct sender
   - [ ] Verify reply-to address works correctly

3. **Error Scenarios**
   - [ ] Test with unconfigured Send As address
   - [ ] Test with unverified Send As address
   - [ ] Verify error messages are helpful

## Gmail "Send As" Setup Guide

### Prerequisites

- Gmail account with OAuth2 authentication configured
- Admin access to the Gmail account (for Send As configuration)

### Setup Steps

1. **Configure Send As in Gmail Web Interface**
   ```
   1. Log in to Gmail as the authenticated account (e.g., tomoko.kunihiro@ifoo-oita.com)
   2. Click Settings (⚙️) → See all settings
   3. Go to "Accounts and Import" tab
   4. In "Send mail as" section, click "Add another email address"
   5. Enter the email address (e.g., hiromitsu-kakui@ifoo-oita.com)
   6. Choose "Treat as an alias" (recommended)
   7. Click "Next Step" → "Send Verification"
   8. Verify the email address by clicking the link in the verification email
   ```

2. **Verify OAuth2 Scopes**
   ```
   Required scope: https://www.googleapis.com/auth/gmail.send
   
   This scope allows sending emails on behalf of the authenticated user,
   including Send As addresses.
   ```

3. **Test Send As Configuration**
   ```typescript
   // Test script to verify Send As is working
   const testSendAs = async () => {
     const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
     
     // List Send As addresses
     const response = await gmail.users.settings.sendAs.list({
       userId: 'me'
     });
     
     console.log('Available Send As addresses:', response.data.sendAs);
   };
   ```

### Troubleshooting

**Problem: Email still sent from authenticated account**
- Solution: Verify Send As address is added and verified in Gmail settings
- Check: Gmail API scope includes `gmail.send`

**Problem: "Send As not found" error**
- Solution: Add the address in Gmail → Settings → Accounts → Send mail as
- Verify: The address appears in the Send As list

**Problem: "Send As not verified" error**
- Solution: Click "Resend verification" in Gmail settings
- Check: Verification email in the Send As address inbox

## Implementation Notes

### Gmail API Limitations

1. **Send As addresses must be pre-configured** in Gmail settings
2. **Verification required** for external addresses
3. **Alias vs Non-alias**: "Treat as alias" is recommended for organizational addresses
4. **Rate limits**: Same as regular Gmail API (100 emails per second per user)

### Security Considerations

1. **Whitelist validation**: Only allow pre-approved Send As addresses
2. **Audit logging**: Log all email sends with sender address
3. **Error messages**: Don't expose internal configuration details to end users

### Performance Considerations

1. **No additional API calls**: Send As uses the same Gmail API endpoint
2. **Caching**: Cache Send As configuration to avoid repeated API calls
3. **Batch sending**: Same batch size limits apply (100 BCC per email)

## Migration Plan

### Phase 1: Backend Implementation
1. Update `EmailService.sendBatch()` to use Send As
2. Add Send As address validation
3. Update error handling

### Phase 2: Gmail Configuration
1. Configure Send As addresses in Gmail
2. Verify all addresses
3. Test sending from each address

### Phase 3: Testing
1. Unit tests for validation logic
2. Integration tests with Gmail API
3. Manual testing with real email delivery

### Phase 4: Deployment
1. Deploy backend changes
2. Monitor error logs for Send As issues
3. Update documentation

### Rollback Plan

If Send As doesn't work:
1. Revert to previous code (From header only)
2. Document the limitation
3. Consider alternative solutions (individual OAuth2 tokens)
