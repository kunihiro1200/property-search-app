# Design Document: 買主詳細画面のGoogle Chat送信機能

## Overview

買主詳細画面に「担当への確認事項」フィールドを使ったGoogle Chat送信機能を追加します。この機能により、買主担当者が物件担当者へ質問や伝言を簡単に送信できるようになります。

### 主要な設計決定

1. **フィールドの配置**: 「担当への確認事項」フィールドを「問合時ヒアリング」フィールドの下に移動
2. **送信先の自動決定**: スタッフ管理スプレッドシートから物件担当者のWebhook URLを自動取得
3. **データベース変更**: `buyers`テーブルに`confirmation_to_assignee`カラムを追加
4. **システム隔離**: 買主管理システムのみに影響を限定

### 技術スタック

- **フロントエンド**: React + TypeScript + Material-UI
- **バックエンド**: Express.js + Supabase
- **外部API**: Google Chat Webhook API
- **スプレッドシート**: Google Sheets API

---

## Architecture

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                    買主詳細画面                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 問合時ヒアリング                                      │  │
│  │ [テキストエリア]                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 担当への確認事項                                      │  │
│  │ [テキストエリア]                                      │  │
│  │                                                        │  │
│  │ 担当者 Y に送信                                       │  │
│  │ [送信ボタン]                                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ POST /api/buyers/:buyer_number/send-confirmation
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    バックエンドAPI                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BuyerService                                          │  │
│  │ - getByBuyerNumber()                                  │  │
│  │ - getLinkedProperties()                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ StaffManagementService                                │  │
│  │ - getWebhookUrl(assigneeName)                         │  │
│  │ - キャッシュ機能（60分）                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ GoogleChatService                                     │  │
│  │ - sendMessage(webhookUrl, message)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ POST Webhook URL
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Chat                               │
│  担当者のチャットルームにメッセージを送信                    │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **フィールド表示判定**:
   - フロントエンド: `buyers.property_number`が存在するか確認
   - フロントエンド: `property_listings.sales_assignee`が存在するか確認
   - 両方存在する場合のみ「担当への確認事項」フィールドを表示

2. **送信処理**:
   - フロントエンド: 送信ボタンクリック
   - バックエンド: `POST /api/buyers/:buyer_number/send-confirmation`
   - バックエンド: `StaffManagementService.getWebhookUrl()`でWebhook URLを取得
   - バックエンド: `GoogleChatService.sendMessage()`でメッセージ送信
   - フロントエンド: 成功/エラーメッセージを表示

3. **エラーハンドリング**:
   - 担当者が見つからない場合: エラーメッセージを表示
   - Webhook URLが空の場合: エラーメッセージを表示
   - Google Chat API エラー: エラーメッセージを表示

---

## Components and Interfaces

### 1. フロントエンドコンポーネント

#### ConfirmationToAssignee.tsx

**責務**: 「担当への確認事項」フィールドと送信UIを表示

**Props**:
```typescript
interface ConfirmationToAssigneeProps {
  buyer: Buyer;
  propertyAssignee: string | null;
  onSendSuccess: () => void;
}
```

**State**:
```typescript
interface ConfirmationToAssigneeState {
  confirmationText: string;
  isSending: boolean;
  error: string | null;
  successMessage: string | null;
}
```

**主要メソッド**:
- `handleSend()`: 送信ボタンクリック時の処理
- `handleTextChange()`: テキスト変更時の処理

**表示条件**:
- `buyer.property_number`が存在する
- `propertyAssignee`が存在する（nullでない）

**UI構成**:
```
┌──────────────────────────────────────────────────────┐
│ 担当への確認事項                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [テキストエリア]                                  │ │
│ │                                                    │ │
│ │                                                    │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ （テキストが入力されている場合のみ表示）              │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 担当者 Y に送信                                   │ │
│ │ [送信ボタン]                                      │ │
│ └──────────────────────────────────────────────────┘ │
│                                                        │
│ （成功メッセージ）                                    │
│ ✓ 送信しました                                        │
│                                                        │
│ （エラーメッセージ）                                  │
│ ✗ 担当者が見つかりませんでした                        │
└──────────────────────────────────────────────────────┘
```

#### BuyerDetailPage.tsx の変更

**変更内容**:
1. `BUYER_FIELD_SECTIONS`から`confirmation_to_assignee`を削除
2. 「問合時ヒアリング」フィールドの下に`<ConfirmationToAssignee>`コンポーネントを配置
3. `linkedProperties`から`sales_assignee`を取得

**配置位置**:
```typescript
// 問合せ内容セクション
<Box>
  {/* 問合時ヒアリング */}
  <InlineEditableField ... />
  
  {/* 担当への確認事項（新規追加） */}
  {linkedProperties.length > 0 && linkedProperties[0].sales_assignee && (
    <ConfirmationToAssignee
      buyer={buyer}
      propertyAssignee={linkedProperties[0].sales_assignee}
      onSendSuccess={() => {
        setSnackbar({
          open: true,
          message: '送信しました',
          severity: 'success'
        });
      }}
    />
  )}
  
  {/* その他のフィールド */}
</Box>
```

### 2. バックエンドサービス

#### GoogleChatService.ts

**責務**: Google Chat Webhook APIへのメッセージ送信

**インターフェース**:
```typescript
interface GoogleChatMessage {
  text: string;
}

interface SendMessageResult {
  success: boolean;
  error?: string;
}

class GoogleChatService {
  /**
   * Google ChatにメッセージをPOST
   * @param webhookUrl - Webhook URL
   * @param message - 送信するメッセージ
   * @returns 送信結果
   */
  async sendMessage(
    webhookUrl: string,
    message: string
  ): Promise<SendMessageResult>;
}
```

**実装詳細**:
- `axios`を使用してPOSTリクエストを送信
- タイムアウト: 10秒
- リトライ: なし（エラーはそのまま返す）
- エラーハンドリング:
  - ネットワークエラー
  - タイムアウト
  - 4xx/5xxレスポンス

**メッセージフォーマット**:
```json
{
  "text": "【買主からの確認事項】\n買主番号: 6666\n買主名: 山田太郎\n物件番号: AA13501\n\n確認事項:\nこの物件の駐車場は何台分ありますか？"
}
```

#### StaffManagementService.ts

**責務**: スタッフ管理スプレッドシートからWebhook URLを取得

**インターフェース**:
```typescript
interface StaffInfo {
  initials: string;
  name: string;
  chatWebhook: string | null;
}

interface GetWebhookUrlResult {
  success: boolean;
  webhookUrl?: string;
  error?: string;
}

class StaffManagementService {
  private cache: Map<string, StaffInfo>;
  private cacheExpiry: number;
  
  /**
   * 担当者名からWebhook URLを取得
   * @param assigneeName - 担当者名（イニシャルまたは名前）
   * @returns Webhook URL取得結果
   */
  async getWebhookUrl(assigneeName: string): Promise<GetWebhookUrlResult>;
  
  /**
   * スタッフ管理スプレッドシートからデータを取得
   * @returns スタッフ情報の配列
   */
  private async fetchStaffData(): Promise<StaffInfo[]>;
  
  /**
   * キャッシュをクリア
   */
  clearCache(): void;
}
```

**実装詳細**:
- `GoogleSheetsClient`を使用してスプレッドシートを読み取り
- スプレッドシートID: `19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs`
- シート名: `スタッフ`
- カラムマッピング:
  - A列: イニシャル
  - C列: 名前
  - F列: Chat webhook
- キャッシュ: 60分間
- 検索ロジック:
  1. イニシャル（A列）で完全一致検索
  2. 名前（C列）で完全一致検索
  3. どちらも一致しない場合はエラー

**エラーハンドリング**:
- スプレッドシートアクセスエラー
- 担当者が見つからない
- Webhook URLが空

#### BuyerService.ts の変更

**変更内容**: なし（既存のメソッドを使用）

**使用するメソッド**:
- `getByBuyerNumber(buyerNumber: string)`: 買主情報を取得
- `getLinkedProperties(buyerId: string)`: 紐づく物件を取得

### 3. APIエンドポイント

#### POST /api/buyers/:buyer_number/send-confirmation

**責務**: 担当への確認事項をGoogle Chatに送信

**リクエスト**:
```typescript
interface SendConfirmationRequest {
  confirmationText: string;
}
```

**レスポンス（成功）**:
```typescript
interface SendConfirmationResponse {
  success: true;
  message: string;
}
```

**レスポンス（エラー）**:
```typescript
interface SendConfirmationErrorResponse {
  success: false;
  error: string;
}
```

**処理フロー**:
1. `buyer_number`で買主を取得
2. 買主が存在しない場合は404エラー
3. `property_number`が存在しない場合は400エラー
4. 紐づく物件を取得
5. `sales_assignee`が存在しない場合は400エラー
6. `StaffManagementService.getWebhookUrl()`でWebhook URLを取得
7. Webhook URLが取得できない場合は404エラー
8. メッセージをフォーマット
9. `GoogleChatService.sendMessage()`でメッセージ送信
10. 送信結果を返す

**エラーコード**:
- 400: リクエストが不正（confirmationTextが空、property_numberが存在しない、sales_assigneeが存在しない）
- 404: 買主が見つからない、担当者が見つからない、Webhook URLが設定されていない
- 500: サーバーエラー（スプレッドシートアクセスエラー、Google Chat APIエラー）

---

## Data Models

### Database Schema

#### buyers テーブルの変更

**新規カラム**:
```sql
ALTER TABLE buyers
ADD COLUMN confirmation_to_assignee TEXT;
```

**カラム定義**:
- `confirmation_to_assignee`: 担当への確認事項（TEXT型、NULL許可）

**マイグレーションファイル**:
```sql
-- Migration: Add confirmation_to_assignee to buyers table
-- Date: 2026-02-06

ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS confirmation_to_assignee TEXT;

COMMENT ON COLUMN buyers.confirmation_to_assignee IS '担当への確認事項';
```

### スプレッドシート構造

#### スタッフ管理スプレッドシート

**スプレッドシートID**: `19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs`

**シート名**: `スタッフ`

**カラム構造**:
| 列 | カラム名 | 説明 | 例 |
|----|---------|------|-----|
| A | イニシャル | スタッフのイニシャル | Y, U, I, K, M, W |
| B | （未使用） | - | - |
| C | 名前 | スタッフの氏名 | 山田太郎 |
| D | （未使用） | - | - |
| E | （未使用） | - | - |
| F | Chat webhook | Google Chat Webhook URL | https://chat.googleapis.com/v1/spaces/... |

**データ例**:
```
A列（イニシャル） | C列（名前） | F列（Chat webhook）
Y                | 山田太郎    | https://chat.googleapis.com/v1/spaces/AAAA/messages?key=xxx
U                | 上田花子    | https://chat.googleapis.com/v1/spaces/BBBB/messages?key=yyy
I                | 井上次郎    | https://chat.googleapis.com/v1/spaces/CCCC/messages?key=zzz
```

### API データモデル

#### SendConfirmationRequest
```typescript
interface SendConfirmationRequest {
  confirmationText: string; // 確認事項のテキスト
}
```

#### SendConfirmationResponse
```typescript
interface SendConfirmationResponse {
  success: boolean;
  message?: string;
  error?: string;
}
```

#### GoogleChatMessage
```typescript
interface GoogleChatMessage {
  text: string; // フォーマット済みメッセージ
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Confirmation Field Display Condition

*For any* buyer record and linked property, the confirmation field should be displayed if and only if both `property_number` exists in the buyer record AND `sales_assignee` exists in the linked property.

**Validates: Requirements 1.2, 1.3**

### Property 2: Send Section Display Condition

*For any* confirmation text input, the send section should be displayed if and only if the confirmation text is non-empty (contains at least one non-whitespace character).

**Validates: Requirements 2.1, 2.4**

### Property 3: Send Section Content

*For any* displayed send section with a property assignee name, the section should contain both a send button AND a label in the format "担当者 {assignee_name} に送信".

**Validates: Requirements 2.2, 2.3**

### Property 4: Staff Webhook Lookup

*For any* property assignee name (either initials or full name), searching the staff spreadsheet should return the matching staff member's webhook URL from column F if a match is found in column A (initials) OR column C (name).

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Message Format

*For any* buyer with buyer_number, name, property_number, and confirmation text, the formatted message should contain all four values in the specified format: "【買主からの確認事項】\n買主番号: {buyer_number}\n買主名: {name}\n物件番号: {property_number}\n\n確認事項:\n{confirmation_text}".

**Validates: Requirements 4.2**

### Property 6: Message Sending

*For any* valid webhook URL and formatted message, calling the Google Chat API should result in a POST request to the webhook URL with the message as the request body.

**Validates: Requirements 4.1**

### Property 7: Confirmation Field Persistence

*For any* confirmation text, after successfully sending the message, the confirmation field content should remain unchanged (not cleared).

**Validates: Requirements 4.5**

### Property 8: Error Retry Capability

*For any* error that occurs during the send process, the send button should remain enabled to allow the user to retry.

**Validates: Requirements 5.4**

### Property 9: Error Logging

*For any* error that occurs during the send process, an error log entry should be created with the error details.

**Validates: Requirements 5.5**

### Property 10: Database Field Persistence

*For any* confirmation text update, the value should be saved to the `buyers.confirmation_to_assignee` column in the database.

**Validates: Requirements 6.3**

### Property 11: Spreadsheet Sync

*For any* confirmation text update when sync is enabled, the value should be synchronized to the Google Spreadsheet.

**Validates: Requirements 6.4**

---

## Error Handling

### エラー分類

#### 1. バリデーションエラー（400 Bad Request）

**発生条件**:
- `confirmationText`が空または未定義
- `property_number`が存在しない
- `sales_assignee`が存在しない

**処理**:
- エラーメッセージをレスポンスで返す
- フロントエンドでエラーメッセージを表示
- ログに記録

**エラーメッセージ例**:
```json
{
  "success": false,
  "error": "確認事項を入力してください"
}
```

#### 2. リソース未検出エラー（404 Not Found）

**発生条件**:
- 買主が見つからない（`buyer_number`が無効）
- 担当者が見つからない（スタッフスプレッドシートに存在しない）
- Webhook URLが設定されていない

**処理**:
- エラーメッセージをレスポンスで返す
- フロントエンドでエラーメッセージを表示
- ログに記録

**エラーメッセージ例**:
```json
{
  "success": false,
  "error": "担当者が見つかりませんでした"
}
```

#### 3. 外部サービスエラー（500 Internal Server Error）

**発生条件**:
- スプレッドシートアクセスエラー
- Google Chat API エラー
- ネットワークエラー
- タイムアウト

**処理**:
- エラーメッセージをレスポンスで返す
- フロントエンドでエラーメッセージを表示
- 詳細なエラーログを記録
- リトライ可能な状態を維持

**エラーメッセージ例**:
```json
{
  "success": false,
  "error": "メッセージの送信に失敗しました: Connection timeout"
}
```

### エラーハンドリング戦略

#### フロントエンド

```typescript
try {
  const response = await api.post(
    `/api/buyers/${buyer_number}/send-confirmation`,
    { confirmationText }
  );
  
  if (response.data.success) {
    setSuccessMessage('送信しました');
    setError(null);
  }
} catch (error: any) {
  const errorMessage = error.response?.data?.error 
    || 'メッセージの送信に失敗しました';
  
  setError(errorMessage);
  setSuccessMessage(null);
  
  // ログに記録
  console.error('[ConfirmationToAssignee] Send failed:', error);
}
```

#### バックエンド

```typescript
try {
  // 処理
} catch (error: any) {
  console.error('[SendConfirmation] Error:', {
    buyerNumber,
    error: error.message,
    stack: error.stack
  });
  
  res.status(500).json({
    success: false,
    error: `メッセージの送信に失敗しました: ${error.message}`
  });
}
```

### リトライ戦略

**リトライ対象**:
- ネットワークエラー: なし（ユーザーが手動でリトライ）
- タイムアウト: なし（ユーザーが手動でリトライ）
- Google Chat API エラー: なし（ユーザーが手動でリトライ）

**理由**:
- メッセージ送信は冪等性が保証されない（同じメッセージが複数回送信される可能性）
- ユーザーが送信内容を確認してから再送信する方が安全

### ログ記録

**ログレベル**:
- `INFO`: 正常な送信
- `WARN`: バリデーションエラー、リソース未検出
- `ERROR`: 外部サービスエラー、予期しないエラー

**ログ内容**:
```typescript
console.log('[SendConfirmation] Success:', {
  buyerNumber,
  propertyNumber,
  assignee,
  timestamp: new Date().toISOString()
});

console.error('[SendConfirmation] Error:', {
  buyerNumber,
  propertyNumber,
  assignee,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

---

## Testing Strategy

### テスト方針

**デュアルテストアプローチ**:
- **Unit tests**: 特定の例、エッジケース、エラー条件を検証
- **Property tests**: 普遍的なプロパティを全入力にわたって検証

両方のテストは補完的であり、包括的なカバレッジに必要です。

### Unit Testing

**対象**:
- 特定の例（特定の買主データ、特定の担当者名）
- エッジケース（空文字列、特殊文字、長いテキスト）
- エラー条件（存在しない買主、存在しない担当者、無効なWebhook URL）
- 統合ポイント（コンポーネント間の連携）

**テストケース例**:

#### GoogleChatService

```typescript
describe('GoogleChatService', () => {
  describe('sendMessage', () => {
    it('should send message to valid webhook URL', async () => {
      const service = new GoogleChatService();
      const webhookUrl = 'https://chat.googleapis.com/v1/spaces/test/messages?key=xxx';
      const message = 'Test message';
      
      const result = await service.sendMessage(webhookUrl, message);
      
      expect(result.success).toBe(true);
    });
    
    it('should return error for invalid webhook URL', async () => {
      const service = new GoogleChatService();
      const webhookUrl = 'invalid-url';
      const message = 'Test message';
      
      const result = await service.sendMessage(webhookUrl, message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('無効なWebhook URL');
    });
    
    it('should handle network timeout', async () => {
      const service = new GoogleChatService();
      const webhookUrl = 'https://chat.googleapis.com/v1/spaces/test/messages?key=xxx';
      const message = 'Test message';
      
      // Mock timeout
      jest.spyOn(axios, 'post').mockRejectedValue(new Error('timeout'));
      
      const result = await service.sendMessage(webhookUrl, message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });
});
```

#### StaffManagementService

```typescript
describe('StaffManagementService', () => {
  describe('getWebhookUrl', () => {
    it('should find staff by initials', async () => {
      const service = new StaffManagementService();
      
      const result = await service.getWebhookUrl('Y');
      
      expect(result.success).toBe(true);
      expect(result.webhookUrl).toBeDefined();
    });
    
    it('should find staff by name', async () => {
      const service = new StaffManagementService();
      
      const result = await service.getWebhookUrl('山田太郎');
      
      expect(result.success).toBe(true);
      expect(result.webhookUrl).toBeDefined();
    });
    
    it('should return error for non-existent staff', async () => {
      const service = new StaffManagementService();
      
      const result = await service.getWebhookUrl('存在しない担当者');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('担当者が見つかりませんでした');
    });
    
    it('should return error for empty webhook URL', async () => {
      const service = new StaffManagementService();
      
      // Mock staff with empty webhook
      jest.spyOn(service as any, 'fetchStaffData').mockResolvedValue([
        { initials: 'Z', name: 'テスト', chatWebhook: null }
      ]);
      
      const result = await service.getWebhookUrl('Z');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('担当者のChat webhook URLが設定されていません');
    });
    
    it('should use cache for repeated requests', async () => {
      const service = new StaffManagementService();
      const fetchSpy = jest.spyOn(service as any, 'fetchStaffData');
      
      await service.getWebhookUrl('Y');
      await service.getWebhookUrl('Y');
      
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
```

#### ConfirmationToAssignee Component

```typescript
describe('ConfirmationToAssignee', () => {
  it('should display field when property assignee exists', () => {
    const buyer = { buyer_number: '6666', name: '山田太郎', property_number: 'AA13501' };
    const propertyAssignee = 'Y';
    
    render(<ConfirmationToAssignee buyer={buyer} propertyAssignee={propertyAssignee} />);
    
    expect(screen.getByLabelText('担当への確認事項')).toBeInTheDocument();
  });
  
  it('should show send section when text is entered', () => {
    const buyer = { buyer_number: '6666', name: '山田太郎', property_number: 'AA13501' };
    const propertyAssignee = 'Y';
    
    render(<ConfirmationToAssignee buyer={buyer} propertyAssignee={propertyAssignee} />);
    
    const textarea = screen.getByLabelText('担当への確認事項');
    fireEvent.change(textarea, { target: { value: 'テスト確認事項' } });
    
    expect(screen.getByText(/担当者 Y に送信/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument();
  });
  
  it('should hide send section when text is empty', () => {
    const buyer = { buyer_number: '6666', name: '山田太郎', property_number: 'AA13501' };
    const propertyAssignee = 'Y';
    
    render(<ConfirmationToAssignee buyer={buyer} propertyAssignee={propertyAssignee} />);
    
    expect(screen.queryByText(/担当者 Y に送信/)).not.toBeInTheDocument();
  });
  
  it('should display success message after successful send', async () => {
    const buyer = { buyer_number: '6666', name: '山田太郎', property_number: 'AA13501' };
    const propertyAssignee = 'Y';
    
    jest.spyOn(api, 'post').mockResolvedValue({ data: { success: true } });
    
    render(<ConfirmationToAssignee buyer={buyer} propertyAssignee={propertyAssignee} />);
    
    const textarea = screen.getByLabelText('担当への確認事項');
    fireEvent.change(textarea, { target: { value: 'テスト確認事項' } });
    
    const sendButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('送信しました')).toBeInTheDocument();
    });
  });
  
  it('should not clear text after successful send', async () => {
    const buyer = { buyer_number: '6666', name: '山田太郎', property_number: 'AA13501' };
    const propertyAssignee = 'Y';
    
    jest.spyOn(api, 'post').mockResolvedValue({ data: { success: true } });
    
    render(<ConfirmationToAssignee buyer={buyer} propertyAssignee={propertyAssignee} />);
    
    const textarea = screen.getByLabelText('担当への確認事項') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'テスト確認事項' } });
    
    const sendButton = screen.getByRole('button', { name: '送信' });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(textarea.value).toBe('テスト確認事項');
    });
  });
});
```

### Property-Based Testing

**対象**:
- 普遍的なプロパティ（全入力にわたって成立する性質）
- ランダム入力による包括的なカバレッジ

**Property-Based Testing ライブラリ**: `fast-check` (TypeScript/JavaScript用)

**設定**:
- 最小100回の反復実行
- 各プロパティテストは設計書のプロパティを参照

**テストケース例**:

```typescript
import fc from 'fast-check';

describe('Property-Based Tests', () => {
  /**
   * Feature: buyer-confirmation-to-assignee-chat
   * Property 1: Confirmation Field Display Condition
   */
  it('should display confirmation field iff property_number and sales_assignee exist', () => {
    fc.assert(
      fc.property(
        fc.record({
          property_number: fc.option(fc.string({ minLength: 1 }), { nil: null }),
          sales_assignee: fc.option(fc.string({ minLength: 1 }), { nil: null })
        }),
        ({ property_number, sales_assignee }) => {
          const shouldDisplay = property_number !== null && sales_assignee !== null;
          
          // Test logic
          const isDisplayed = checkConfirmationFieldDisplay(property_number, sales_assignee);
          
          expect(isDisplayed).toBe(shouldDisplay);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: buyer-confirmation-to-assignee-chat
   * Property 2: Send Section Display Condition
   */
  it('should display send section iff confirmation text is non-empty', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (confirmationText) => {
          const hasNonWhitespace = confirmationText.trim().length > 0;
          
          // Test logic
          const isDisplayed = checkSendSectionDisplay(confirmationText);
          
          expect(isDisplayed).toBe(hasNonWhitespace);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: buyer-confirmation-to-assignee-chat
   * Property 5: Message Format
   */
  it('should format message with all required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          buyer_number: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          property_number: fc.string({ minLength: 1 }),
          confirmation_text: fc.string({ minLength: 1 })
        }),
        ({ buyer_number, name, property_number, confirmation_text }) => {
          const message = formatConfirmationMessage({
            buyer_number,
            name,
            property_number,
            confirmation_text
          });
          
          expect(message).toContain('【買主からの確認事項】');
          expect(message).toContain(`買主番号: ${buyer_number}`);
          expect(message).toContain(`買主名: ${name}`);
          expect(message).toContain(`物件番号: ${property_number}`);
          expect(message).toContain(`確認事項:\n${confirmation_text}`);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: buyer-confirmation-to-assignee-chat
   * Property 7: Confirmation Field Persistence
   */
  it('should not clear confirmation text after successful send', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        async (confirmationText) => {
          const initialText = confirmationText;
          
          // Mock successful send
          jest.spyOn(api, 'post').mockResolvedValue({ data: { success: true } });
          
          // Simulate send
          await sendConfirmation(confirmationText);
          
          // Text should remain unchanged
          const currentText = getConfirmationText();
          expect(currentText).toBe(initialText);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: buyer-confirmation-to-assignee-chat
   * Property 10: Database Field Persistence
   */
  it('should save confirmation text to database', () => {
    fc.assert(
      fc.property(
        fc.record({
          buyer_number: fc.string({ minLength: 1 }),
          confirmation_text: fc.string()
        }),
        async ({ buyer_number, confirmation_text }) => {
          // Save to database
          await updateBuyerConfirmation(buyer_number, confirmation_text);
          
          // Retrieve from database
          const buyer = await getBuyerByNumber(buyer_number);
          
          expect(buyer.confirmation_to_assignee).toBe(confirmation_text);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 統合テスト

**対象**:
- エンドツーエンドのフロー
- 複数のコンポーネント間の連携

**テストケース例**:

```typescript
describe('Integration Tests', () => {
  it('should send confirmation message end-to-end', async () => {
    // Setup
    const buyer = await createTestBuyer({
      buyer_number: '6666',
      name: '山田太郎',
      property_number: 'AA13501'
    });
    
    const property = await createTestProperty({
      property_number: 'AA13501',
      sales_assignee: 'Y'
    });
    
    // Execute
    const response = await request(app)
      .post(`/api/buyers/${buyer.buyer_number}/send-confirmation`)
      .send({ confirmationText: 'テスト確認事項' });
    
    // Verify
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('送信しました');
  });
});
```

### テストカバレッジ目標

- **Unit tests**: 80%以上のコードカバレッジ
- **Property tests**: 全てのCorrectness Propertiesをカバー
- **Integration tests**: 主要なユーザーフローをカバー

---

## Implementation Notes

### 実装順序

1. **データベースマイグレーション**: `buyers.confirmation_to_assignee`カラムを追加
2. **GoogleChatService**: メッセージ送信機能を実装
3. **StaffManagementService**: Webhook URL取得機能を実装
4. **APIエンドポイント**: `/api/buyers/:buyer_number/send-confirmation`を実装
5. **フロントエンドコンポーネント**: `ConfirmationToAssignee`を実装
6. **BuyerDetailPageの変更**: コンポーネントを配置
7. **テスト**: Unit tests、Property tests、Integration testsを実装

### 依存関係

- `axios`: HTTP リクエスト
- `@supabase/supabase-js`: データベースアクセス
- `googleapis`: Google Sheets API
- `fast-check`: Property-Based Testing
- `@testing-library/react`: React コンポーネントテスト
- `jest`: テストフレームワーク

### 環境変数

```bash
# スタッフ管理スプレッドシート
STAFF_SPREADSHEET_ID=19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs
STAFF_SHEET_NAME=スタッフ

# Google Sheets API認証
GOOGLE_SERVICE_ACCOUNT_JSON=<JSON文字列>
# または
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

### セキュリティ考慮事項

1. **Webhook URLの保護**: スプレッドシートへのアクセスを制限
2. **入力検証**: XSS攻撃を防ぐため、ユーザー入力をサニタイズ
3. **レート制限**: Google Chat APIの呼び出し回数を制限
4. **エラーメッセージ**: 機密情報を含まないエラーメッセージを返す

### パフォーマンス考慮事項

1. **キャッシュ**: スタッフ情報を60分間キャッシュ
2. **タイムアウト**: Google Chat APIのタイムアウトを10秒に設定
3. **非同期処理**: メッセージ送信を非同期で実行

---

## Backward Compatibility

**この機能は新規追加のため、後方互換性の問題はありません。**

**確認事項**:
- ✅ 既存のAPIエンドポイントを変更しない
- ✅ 既存のデータベーススキーマを破壊しない（カラム追加のみ）
- ✅ 既存のフロントエンドコンポーネントを変更しない（新規コンポーネント追加のみ）
- ✅ システム隔離ルールを遵守（買主管理システムのみに影響）

---

**最終更新日**: 2026年2月6日  
**作成者**: Kiro AI Assistant  
**レビュー状態**: 承認待ち

