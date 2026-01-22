# Design Document

## Overview

売主リストおよび物件リストのEmail送信機能に、送信元メールアドレスを選択できる機能を追加します。この機能により、ユーザーは有効な社員のメールアドレスから送信元を選択でき、売主からの返信先を制御できるようになります。

## Architecture

### Component Structure

```
Frontend:
- SenderAddressSelector (新規コンポーネント)
  - 送信元アドレス選択用のドロップダウン
  - 社員情報の表示
  
- CallModePage (既存 - 更新)
  - SenderAddressSelectorの統合
  - 選択された送信元アドレスの管理
  
- EmailTemplateSelector (既存 - 更新)
  - SenderAddressSelectorの統合
  - モーダルの上部に送信元選択ドロップダウンを表示
  - 選択された送信元アドレスを親コンポーネントに通知

- GmailDistributionButton (既存 - 更新)
  - SenderAddressSelectorの統合
  - 選択された送信元アドレスをGmail URLに含める
  - EmailTemplateSelectorとBuyerFilterSummaryModalの両方で送信元アドレスを管理

Backend:
- EmployeeService (既存 - 更新)
  - 有効な社員のメールアドレス取得API
  
- EmailService (既存 - 更新)
  - 選択された送信元アドレスの使用
```

### Data Flow

1. ユーザーがEmail送信ボタンをクリック
2. システムが有効な社員のメールアドレスを取得
3. SenderAddressSelectorが送信元アドレスのドロップダウンを表示
4. ユーザーが送信元アドレスを選択（デフォルト: tenant@ifoo-oita.com）
5. ユーザーがEmailテンプレートを選択
6. システムが選択された送信元アドレスでEmailを送信

## Components and Interfaces

### Frontend Components

#### SenderAddressSelector

送信元アドレスを選択するためのドロップダウンコンポーネント。

```typescript
interface SenderAddressSelectorProps {
  value: string;
  onChange: (email: string) => void;
  employees: Employee[];
  disabled?: boolean;
}

interface Employee {
  id: string;
  email: string;
  name: string;
  role: string;
  initials: string;
}

export default function SenderAddressSelector({
  value,
  onChange,
  employees,
  disabled = false
}: SenderAddressSelectorProps) {
  // 有効な社員のメールアドレスをフィルタリング
  const validEmployees = employees.filter(emp => emp.email);
  
  // tenant@ifoo-oita.comをデフォルトオプションとして追加
  const options = [
    { email: 'tenant@ifoo-oita.com', name: 'テナント（共有）', role: 'shared' },
    ...validEmployees.map(emp => ({
      email: emp.email,
      name: emp.name,
      role: emp.role
    }))
  ];
  
  return (
    <FormControl fullWidth size="small">
      <InputLabel>送信元</InputLabel>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        label="送信元"
      >
        {options.map((option) => (
          <MenuItem key={option.email} value={option.email}>
            <Box>
              <Typography variant="body2">{option.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {option.email}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
```

#### EmailTemplateSelector (更新)

メールテンプレート選択モーダルに送信元アドレス選択機能を追加。

```typescript
interface EmailTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: EmailTemplate) => void;
  templates: EmailTemplate[];
  senderAddress: string;  // 新規追加
  onSenderAddressChange: (address: string) => void;  // 新規追加
  employees: Employee[];  // 新規追加
}

export default function EmailTemplateSelector({
  open,
  onClose,
  onSelect,
  templates,
  senderAddress,
  onSenderAddressChange,
  employees
}: EmailTemplateSelectorProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>メールテンプレートを選択</DialogTitle>
      <DialogContent>
        {/* 送信元選択ドロップダウンを追加 */}
        <Box sx={{ mb: 3 }}>
          <SenderAddressSelector
            value={senderAddress}
            onChange={onSenderAddressChange}
            employees={employees}
          />
        </Box>
        
        {/* 既存のテンプレート選択UI */}
        <List>
          {templates.map((template) => (
            <ListItem
              key={template.id}
              button
              onClick={() => onSelect(template)}
            >
              <ListItemText
                primary={template.label}
                secondary={template.subject}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
```

### Backend APIs

#### GET /api/employees/active

有効な社員の一覧を取得するAPI。GYOSHA（業者）ユーザーは除外されます。

**Filtering Rules:**
- `is_active = true` (有効な社員のみ)
- `email IS NOT NULL AND email != ''` (メールアドレスが存在する)
- メールアドレスに "GYOSHA" が含まれない（大文字小文字を区別しない）
- ただし、`tenant@ifoo-oita.com` は常に含める

**Request:**
```
GET /api/employees/active
```

**Response:**
```json
{
  "employees": [
    {
      "id": "1",
      "email": "tomoko.kunihiro@ifoo-oita.com",
      "name": "国広智子",
      "role": "agent",
      "initials": "K"
    },
    {
      "id": "2",
      "email": "yuuko.yamamoto@ifoo-oita.com",
      "name": "山本裕子",
      "role": "agent",
      "initials": "Y"
    }
  ]
}
```

**Note:** `GYOSHA@ifoo-oita.com` のような業者用アカウントは除外されますが、`tenant@ifoo-oita.com` はデフォルト送信元として常に利用可能です。

#### POST /api/sellers/:sellerId/send-template-email (既存 - 更新)

テンプレートメールを送信するAPI。送信元アドレスを指定できるように更新。

**Request:**
```json
{
  "templateId": "template-1",
  "to": "seller@example.com",
  "subject": "件名",
  "content": "本文",
  "htmlBody": "<html>...</html>",
  "from": "tenant@ifoo-oita.com"  // 新規追加
}
```

**Response:**
```json
{
  "messageId": "msg-123",
  "sentAt": "2025-12-19T10:00:00Z",
  "success": true,
  "templateId": "template-1"
}
```

## Data Models

### Employee (既存)

```typescript
interface Employee {
  id: string;
  google_id: string;
  email: string;
  name: string;
  role: string;
  initials: string;
  last_name: string;
  first_name: string;
  chat_webhook_url?: string;
  phone_number?: string;
  created_at: Date;
  updated_at: Date;
}
```

### EmailSendRequest (更新)

```typescript
interface EmailSendRequest {
  templateId: string;
  to: string;
  subject: string;
  content: string;
  htmlBody?: string;
  from: string;  // 新規追加: 送信元メールアドレス
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Default sender address initialization

*For any* email template selector opening, the default sender address should be set to "tenant@ifoo-oita.com"

**Validates: Requirements 1.2**

### Property 2: Active employee email inclusion

*For any* active employee with a valid email address, that email address should appear in the sender address dropdown

**Validates: Requirements 2.2**

### Property 3: Inactive employee email exclusion

*For any* inactive employee, their email address should not appear in the sender address dropdown

**Validates: Requirements 2.2**

### Property 9: GYOSHA user exclusion

*For any* employee whose email address contains "GYOSHA" (case-insensitive), that email address should not appear in the sender address dropdown, except for "tenant@ifoo-oita.com"

**Validates: Requirements 2.4, 2.5**

### Property 4: Sender address validation

*For any* selected sender address, it should either be "tenant@ifoo-oita.com" or belong to an active employee

**Validates: Requirements 2.4**

### Property 5: Email From header consistency

*For any* sent email, the From header should match the selected sender address

**Validates: Requirements 1.4**

### Property 6: Email Reply-To header consistency

*For any* sent email, the Reply-To header should match the selected sender address

**Validates: Requirements 1.5**

### Property 7: Session persistence

*For any* sender address selection within a session, the selection should persist across multiple email sends

**Validates: Requirements 1.3, 5.3**

### Property 8: Cross-context consistency

*For any* sender address selection, it should be available in both seller list and property listing contexts

**Validates: Requirements 5.1, 5.2**

### Property 10: Direct email sending with correct sender

*For any* email distribution with a selected sender address, the emails should be sent directly using the API with the selected sender address as the From header

**Validates: Requirements 6.4**

### Property 11: Email sending confirmation

*For any* successful email distribution, the system should display a confirmation message with the number of emails sent and the sender address used

**Validates: Requirements 6.5, 7.6**

## Error Handling

### Frontend Error Handling

1. **Employee Data Loading Failure**
   - Display error message to user
   - Fall back to default address only
   - Log error for debugging

2. **Invalid Sender Address Selection**
   - Revert to default address
   - Display warning message
   - Log validation error

3. **Email Send Failure**
   - Display detailed error message
   - Preserve selected sender address for retry
   - Log error with sender address context

### Backend Error Handling

1. **Database Query Failure**
   - Return empty employee list
   - Log error with query details
   - Return 500 status code

2. **Invalid From Address**
   - Validate against employee list
   - Reject with 400 status code
   - Return validation error message

3. **Gmail API Failure**
   - Retry with exponential backoff
   - Log error with sender address
   - Return 502 status code

## Testing Strategy

### Unit Tests

1. **SenderAddressSelector Component**
   - Renders with default address selected
   - Displays all active employees
   - Excludes inactive employees
   - Calls onChange with selected email
   - Handles empty employee list

2. **EmployeeService**
   - Fetches active employees only
   - Filters employees with valid emails
   - Handles database errors gracefully
   - Returns sorted employee list

3. **EmailService**
   - Uses selected sender address in From header
   - Uses selected sender address in Reply-To header
   - Validates sender address before sending
   - Falls back to default on invalid address

### Property-Based Tests

1. **Property 1: Default sender address initialization**
   - Generate random UI states
   - Verify default address is always "tenant@ifoo-oita.com"

2. **Property 2: Active employee email inclusion**
   - Generate random active employees with emails
   - Verify all appear in dropdown

3. **Property 3: Inactive employee email exclusion**
   - Generate random inactive employees
   - Verify none appear in dropdown

4. **Property 4: Sender address validation**
   - Generate random sender addresses
   - Verify only valid addresses are accepted

5. **Property 5: Email From header consistency**
   - Generate random sender addresses
   - Verify From header matches selection

6. **Property 6: Email Reply-To header consistency**
   - Generate random sender addresses
   - Verify Reply-To header matches selection

7. **Property 7: Session persistence**
   - Generate random sender selections
   - Verify persistence across multiple sends

8. **Property 8: Cross-context consistency**
   - Generate random sender selections
   - Verify availability in both contexts

### Integration Tests

1. **End-to-End Email Sending**
   - Select sender address
   - Send email from seller list
   - Verify email sent with correct From/Reply-To
   - Verify activity log records sender

2. **Employee Management Integration**
   - Add new employee
   - Verify appears in sender list
   - Deactivate employee
   - Verify removed from sender list

3. **Session Management**
   - Select sender in seller list
   - Navigate to property listing
   - Verify same sender selected
   - Send email from property listing
   - Verify correct sender used

## Technical Solution

### Direct Email Sending via Existing API

**Problem:** Gmail's URL composition does not support the `from` parameter, making it impossible to pre-fill the sender address when opening Gmail compose window.

**Solution:** Use the existing email sending API (`POST /api/sellers/:sellerId/send-template-email`) to send emails directly from the system instead of opening Gmail.

**Benefits:**
- Complete control over sender address (From and Reply-To headers)
- No manual user intervention required
- Consistent with existing email sending functionality
- Automatic and reliable

**Implementation Approach:**
1. User selects sender address and email template
2. System displays BuyerFilterSummaryModal with recipient list and selected sender
3. User confirms distribution
4. System sends emails directly using existing API with selected sender address
5. System displays success/failure feedback

**Comparison with Gmail URL Approach:**
- **Gmail URL (Previous):** Opens Gmail, user must manually select sender and send each email
- **Direct API (Current):** Sends emails automatically with correct sender, no manual intervention needed

## Implementation Notes

### Session Storage

送信元アドレスの選択をセッションストレージに保存し、ページ遷移後も保持します。

```typescript
// セッションストレージのキー
const SENDER_ADDRESS_KEY = 'email_sender_address';

// 保存
sessionStorage.setItem(SENDER_ADDRESS_KEY, selectedAddress);

// 取得
const savedAddress = sessionStorage.getItem(SENDER_ADDRESS_KEY) || 'tenant@ifoo-oita.com';
```

### Employee Data Caching

社員データはフロントエンドでキャッシュし、不要なAPI呼び出しを削減します。

```typescript
// キャッシュの有効期限: 5分
const CACHE_DURATION = 5 * 60 * 1000;

interface EmployeeCache {
  data: Employee[];
  timestamp: number;
}

const getEmployees = async (): Promise<Employee[]> => {
  const cached = localStorage.getItem('employees_cache');
  if (cached) {
    const { data, timestamp }: EmployeeCache = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }
  
  const employees = await api.get('/api/employees/active');
  localStorage.setItem('employees_cache', JSON.stringify({
    data: employees.data.employees,
    timestamp: Date.now()
  }));
  
  return employees.data.employees;
};
```

### Backward Compatibility

既存のEmail送信機能との互換性を保つため、`from`パラメータが指定されていない場合は、従来通り`employeeEmail`（ログインユーザーのメールアドレス）を使用します。

```typescript
// EmailService.supabase.ts
async sendTemplateEmail(
  seller: Seller,
  subject: string,
  content: string,
  employeeEmail: string,
  employeeId: string,
  htmlBody?: string,
  from?: string  // 新規追加: オプショナル
): Promise<EmailResult> {
  // fromが指定されていない場合はemployeeEmailを使用（後方互換性）
  const senderAddress = from || employeeEmail;
  
  // メール送信処理
  // ...
}
```

### Direct Email Distribution

GmailDistributionButtonから既存のメール送信APIを使用して直接メールを送信します。

```typescript
// GmailDistributionButton.tsx
const handleSendEmails = async () => {
  setLoading(true);
  try {
    const results = await Promise.all(
      buyers.map(buyer =>
        api.post(`/api/sellers/${buyer.sellerId}/send-template-email`, {
          templateId: selectedTemplate.id,
          to: buyer.email,
          subject: emailSubject,
          content: emailBody,
          htmlBody: emailHtmlBody,
          from: senderAddress  // 選択された送信元アドレス
        })
      )
    );
    
    const successCount = results.filter(r => r.success).length;
    showSuccessMessage(`${successCount}件のメールを送信しました（送信元: ${senderAddress}）`);
  } catch (error) {
    showErrorMessage('メール送信に失敗しました');
  } finally {
    setLoading(false);
  }
};
```

### BuyerFilterSummaryModal Updates

BuyerFilterSummaryModalに送信元アドレスと送信確認UIを追加します。

```typescript
// BuyerFilterSummaryModal.tsx
<Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
  <Typography variant="body2" fontWeight="bold">
    送信元アドレス: {senderAddress}
  </Typography>
  <Typography variant="body2">
    送信先: {buyers.length}件
  </Typography>
</Box>

<Button
  variant="contained"
  onClick={handleSendEmails}
  disabled={loading}
>
  {loading ? <CircularProgress size={24} /> : 'メールを送信'}
</Button>
```

