# Design Document

## Overview

This document outlines the technical design for implementing Gmail API-based email distribution. The system will send emails directly from the backend using Gmail API after user confirmation, replacing the current manual Gmail Web UI approach.

## Architecture

### High-Level Flow

```
User clicks "Gmailで配信" button
  ↓
EmailTemplateSelector modal opens
  ↓
User selects template and sender address
  ↓
System fetches qualified buyers (frontend)
  ↓
BuyerFilterSummaryModal opens with buyer list
  ↓
User reviews and selects recipients
  ↓
User clicks "送信する" button
  ↓
Final confirmation modal opens
  ↓
User confirms sending
  ↓
Frontend calls backend API: POST /api/emails/send-distribution
  ↓
Backend validates request
  ↓
Backend splits recipients into batches (max 100 per batch)
  ↓
Backend sends emails via Gmail API
  ↓
Backend returns success/failure response
  ↓
Frontend displays result to user
```

### Component Architecture

#### Frontend Components

1. **GmailDistributionButton.tsx**
   - Main entry point for distribution
   - Manages modal states
   - Calls backend API for sending
   - Handles success/error responses

2. **BuyerFilterSummaryModal.tsx**
   - Displays filtered buyer list
   - Shows sender address selector
   - Allows recipient selection
   - Opens final confirmation modal

3. **DistributionConfirmationModal.tsx** (NEW)
   - Shows final confirmation before sending
   - Displays sender address prominently
   - Shows recipient count
   - Shows email subject
   - Triggers API call on confirmation

#### Backend Components

1. **EmailService.ts**
   - Implements `sendDistributionEmail()` method
   - Handles Gmail API integration
   - Manages batch sending
   - Sets From and Reply-To headers

2. **emails.ts (routes)**
   - Implements `/api/emails/send-distribution` endpoint
   - Validates request parameters
   - Calls EmailService
   - Returns response

## Data Models

### Frontend Request

```typescript
interface DistributionEmailRequest {
  senderAddress: string;        // e.g., "tenant@ifoo-oita.com"
  recipients: string[];         // Array of email addresses
  subject: string;              // Email subject with placeholders replaced
  body: string;                 // Email body with placeholders replaced
  propertyNumber: string;       // For logging/tracking
}
```

### Backend Response

```typescript
interface DistributionEmailResponse {
  success: boolean;
  message: string;
  recipientCount: number;
  batchCount?: number;          // Number of batches sent
  errors?: string[];            // Array of error messages if any batch failed
}
```

### Gmail API Message Format

```typescript
interface GmailMessage {
  raw: string;  // Base64-encoded RFC 2822 formatted message
}

// Message structure:
// From: {senderAddress}
// Reply-To: {senderAddress}
// Bcc: {recipient1}, {recipient2}, ...
// Subject: {subject}
// Content-Type: text/html; charset=UTF-8
// 
// {body}
```

## Implementation Details

### Frontend: GmailDistributionButton

#### State Management

```typescript
const [loading, setLoading] = useState(false);
const [confirmationOpen, setConfirmationOpen] = useState(false);
const [distributionData, setDistributionData] = useState<{
  senderAddress: string;
  recipients: string[];
  subject: string;
  body: string;
} | null>(null);
```

#### Handle Filter Summary Confirmation

```typescript
const handleFilterSummaryConfirm = (selectedEmails: string[]) => {
  // Prepare distribution data
  const propertyData = {
    address: propertyAddress,
    propertyNumber: propertyNumber
  };
  
  // Replace template placeholders
  const subject = selectedTemplate.subject
    .replace(/{address}/g, propertyData.address)
    .replace(/{propertyNumber}/g, propertyData.propertyNumber);
  
  const body = selectedTemplate.body
    .replace(/{address}/g, propertyData.address)
    .replace(/{propertyNumber}/g, propertyData.propertyNumber);
  
  // Store distribution data
  setDistributionData({
    senderAddress: senderAddress,
    recipients: selectedEmails,
    subject: subject,
    body: body
  });
  
  // Close filter summary and open confirmation modal
  setFilterSummaryOpen(false);
  setConfirmationOpen(true);
};
```

#### Handle Final Confirmation

```typescript
const handleConfirmSend = async () => {
  if (!distributionData) return;
  
  setLoading(true);
  
  try {
    const response = await api.post('/api/emails/send-distribution', {
      senderAddress: distributionData.senderAddress,
      recipients: distributionData.recipients,
      subject: distributionData.subject,
      body: distributionData.body,
      propertyNumber: propertyNumber
    });
    
    if (response.data.success) {
      setSnackbar({
        open: true,
        message: `メールを送信しました (${response.data.recipientCount}件)`,
        severity: 'success'
      });
      setConfirmationOpen(false);
    } else {
      throw new Error(response.data.message || 'メール送信に失敗しました');
    }
  } catch (error) {
    console.error('Distribution email error:', error);
    
    // Show error with fallback option
    setSnackbar({
      open: true,
      message: 'メール送信に失敗しました。Gmail Web UIで送信しますか？',
      severity: 'error',
      action: (
        <Button color="inherit" onClick={handleFallbackToGmailUI}>
          Gmailを開く
        </Button>
      )
    });
  } finally {
    setLoading(false);
  }
};
```

#### Fallback to Gmail Web UI

```typescript
const handleFallbackToGmailUI = () => {
  if (!distributionData) return;
  
  // Generate Gmail compose URL
  const gmailUrl = generateGmailComposeUrl({
    bcc: distributionData.recipients.join(','),
    subject: distributionData.subject,
    body: distributionData.body
  });
  
  // Open Gmail in new tab
  window.open(gmailUrl, '_blank');
  
  setSnackbar({
    open: true,
    message: 'Gmailを開きました。内容を確認して送信してください。',
    severity: 'info'
  });
  
  setConfirmationOpen(false);
};
```

### Frontend: DistributionConfirmationModal (NEW)

```typescript
interface DistributionConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  senderAddress: string;
  recipientCount: number;
  subject: string;
  loading: boolean;
}

const DistributionConfirmationModal: React.FC<DistributionConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  senderAddress,
  recipientCount,
  subject,
  loading
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>メール送信確認</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            送信元
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
            {senderAddress}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            宛先数
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {recipientCount}件
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            件名
          </Typography>
          <Typography variant="body1">
            {subject}
          </Typography>
        </Box>
        
        {recipientCount > 100 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            宛先が100件を超えているため、複数回に分けて送信されます。
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? '送信中...' : '送信する'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### Backend: Email Routes

```typescript
// backend/src/routes/emails.ts

router.post('/send-distribution', async (req, res) => {
  try {
    const { senderAddress, recipients, subject, body, propertyNumber } = req.body;
    
    // Validate request
    if (!senderAddress || !recipients || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: '必須パラメータが不足しています'
      });
    }
    
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: '宛先が指定されていません'
      });
    }
    
    // Validate sender address
    const validSenders = [
      'tenant@ifoo-oita.com',
      'gyosha@ifoo-oita.com',
      'info@ifoo-oita.com'
    ];
    
    if (!validSenders.includes(senderAddress)) {
      return res.status(400).json({
        success: false,
        message: '無効な送信元アドレスです'
      });
    }
    
    // Send email via EmailService
    const result = await EmailService.sendDistributionEmail({
      senderAddress,
      recipients,
      subject,
      body,
      propertyNumber
    });
    
    res.json(result);
  } catch (error) {
    console.error('Distribution email error:', error);
    res.status(500).json({
      success: false,
      message: 'メール送信中にエラーが発生しました',
      error: error.message
    });
  }
});
```

### Backend: EmailService

```typescript
// backend/src/services/EmailService.ts

interface DistributionEmailParams {
  senderAddress: string;
  recipients: string[];
  subject: string;
  body: string;
  propertyNumber: string;
}

class EmailService {
  private static readonly MAX_BCC_PER_BATCH = 100;
  private static readonly BATCH_DELAY_MS = 1000; // 1 second between batches
  
  static async sendDistributionEmail(params: DistributionEmailParams): Promise<DistributionEmailResponse> {
    const { senderAddress, recipients, subject, body, propertyNumber } = params;
    
    // Split recipients into batches
    const batches = this.splitIntoBatches(recipients, this.MAX_BCC_PER_BATCH);
    
    console.log(`Sending distribution email for property ${propertyNumber}`);
    console.log(`Sender: ${senderAddress}`);
    console.log(`Total recipients: ${recipients.length}`);
    console.log(`Batches: ${batches.length}`);
    
    const errors: string[] = [];
    let successCount = 0;
    
    // Send each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        await this.sendBatch({
          senderAddress,
          recipients: batch,
          subject,
          body
        });
        
        successCount += batch.length;
        console.log(`Batch ${i + 1}/${batches.length} sent successfully (${batch.length} recipients)`);
        
        // Wait between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await this.delay(this.BATCH_DELAY_MS);
        }
      } catch (error) {
        console.error(`Batch ${i + 1}/${batches.length} failed:`, error);
        errors.push(`バッチ ${i + 1} の送信に失敗しました: ${error.message}`);
      }
    }
    
    // Return result
    if (errors.length === 0) {
      return {
        success: true,
        message: 'メールを送信しました',
        recipientCount: successCount,
        batchCount: batches.length
      };
    } else if (successCount > 0) {
      return {
        success: true,
        message: `一部のメールを送信しました (${successCount}/${recipients.length}件)`,
        recipientCount: successCount,
        batchCount: batches.length,
        errors
      };
    } else {
      return {
        success: false,
        message: 'メール送信に失敗しました',
        recipientCount: 0,
        batchCount: batches.length,
        errors
      };
    }
  }
  
  private static async sendBatch(params: {
    senderAddress: string;
    recipients: string[];
    subject: string;
    body: string;
  }): Promise<void> {
    const { senderAddress, recipients, subject, body } = params;
    
    // Create RFC 2822 formatted message
    const message = [
      `From: ${senderAddress}`,
      `Reply-To: ${senderAddress}`,
      `Bcc: ${recipients.join(', ')}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      body
    ].join('\r\n');
    
    // Encode message in base64url format
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send via Gmail API
    const gmail = google.gmail({ version: 'v1', auth: this.getGmailAuth() });
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
  }
  
  private static splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private static getGmailAuth() {
    // Get OAuth2 client from existing Google Auth Service
    // This assumes Gmail API credentials are already configured
    return GoogleAuthService.getOAuth2Client();
  }
}
```

## Gmail API Configuration

### Required Scopes

```typescript
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose'
];
```

### OAuth2 Setup

The system will use the existing Google OAuth2 setup from GoogleAuthService. The Gmail API credentials should be configured in the Google Cloud Console with the following:

1. Enable Gmail API
2. Add OAuth2 credentials
3. Add authorized redirect URIs
4. Configure consent screen

### Environment Variables

```bash
# .env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## Error Handling

### Frontend Error Handling

```typescript
try {
  const response = await api.post('/api/emails/send-distribution', data);
  // Handle success
} catch (error) {
  if (error.response) {
    // Server responded with error
    const message = error.response.data.message || 'メール送信に失敗しました';
    setSnackbar({
      open: true,
      message: message,
      severity: 'error'
    });
  } else if (error.request) {
    // No response from server
    setSnackbar({
      open: true,
      message: 'サーバーに接続できませんでした',
      severity: 'error'
    });
  } else {
    // Other error
    setSnackbar({
      open: true,
      message: 'エラーが発生しました',
      severity: 'error'
    });
  }
  
  // Offer fallback to Gmail Web UI
  // ... (see handleFallbackToGmailUI above)
}
```

### Backend Error Handling

```typescript
try {
  await gmail.users.messages.send(...);
} catch (error) {
  console.error('Gmail API error:', error);
  
  if (error.code === 403) {
    throw new Error('Gmail APIの権限がありません');
  } else if (error.code === 429) {
    throw new Error('送信レート制限に達しました。しばらく待ってから再試行してください');
  } else if (error.code === 400) {
    throw new Error('メールの形式が無効です');
  } else {
    throw new Error('Gmail APIエラー: ' + error.message);
  }
}
```

## Testing Strategy

### Unit Tests

1. **EmailService.sendDistributionEmail**
   - Test with single recipient
   - Test with multiple recipients (< 100)
   - Test with > 100 recipients (batch splitting)
   - Test with invalid sender address
   - Test with empty recipients
   - Test batch failure handling

2. **EmailService.sendBatch**
   - Test message formatting
   - Test base64 encoding
   - Test Gmail API call
   - Test error handling

3. **Frontend: handleConfirmSend**
   - Test successful sending
   - Test API error handling
   - Test fallback to Gmail Web UI
   - Test loading states

### Integration Tests

1. **End-to-End Distribution Flow**
   - Click distribution button
   - Select template
   - Select sender address
   - Confirm recipients
   - Confirm final modal
   - Verify email sent
   - Verify success message

2. **Batch Sending**
   - Test with 150 recipients
   - Verify 2 batches sent
   - Verify all recipients received email

3. **Error Recovery**
   - Test with invalid credentials
   - Verify fallback to Gmail Web UI
   - Test with network error
   - Verify error message displayed

### Manual Testing

1. Send to single recipient
2. Send to 50 recipients
3. Send to 150 recipients (batch test)
4. Test with different sender addresses
5. Test with different templates
6. Test error scenarios
7. Test fallback to Gmail Web UI

## Security Considerations

1. **Sender Address Validation**: Only allow whitelisted sender addresses
2. **Recipient Validation**: Validate email format before sending
3. **Rate Limiting**: Implement rate limiting on the API endpoint
4. **OAuth2 Security**: Use secure OAuth2 flow for Gmail API
5. **Error Messages**: Don't expose sensitive information in error messages
6. **Logging**: Log all distribution attempts for audit trail

## Performance Considerations

1. **Batch Sending**: Split large recipient lists into batches of 100
2. **Delay Between Batches**: Wait 1 second between batches to avoid rate limiting
3. **Async Processing**: Consider implementing queue-based processing for very large distributions
4. **Caching**: Cache OAuth2 tokens to avoid repeated authentication
5. **Connection Pooling**: Reuse HTTP connections for Gmail API calls

## Deployment Considerations

1. **Gmail API Setup**: Ensure Gmail API is enabled in Google Cloud Console
2. **OAuth2 Credentials**: Configure OAuth2 credentials for production
3. **Environment Variables**: Set production environment variables
4. **Rate Limits**: Monitor Gmail API rate limits
5. **Error Monitoring**: Set up error monitoring for distribution failures

## Future Enhancements

1. **Queue-Based Processing**: Implement background job queue for large distributions
2. **Retry Logic**: Add automatic retry for failed batches
3. **Delivery Tracking**: Track email delivery status
4. **Scheduling**: Allow scheduling distribution for later time
5. **Templates**: Support more advanced template variables
6. **Attachments**: Add support for email attachments
7. **Analytics**: Track distribution metrics and success rates
