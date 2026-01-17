# Design Document

## Overview

物件問い合わせ返信メール機能は、買主リストページから選択された買主に対して、その買主が問い合わせた物件の情報（property_listingsテーブルのpre_viewing_notesフィールドを含む）を取得し、シンプルなテンプレートに基づいてメール本文を自動生成する機能です。既存のEmailServiceを活用し、効率的な買主対応を実現します。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  BuyersPage                                                  │
│    └─ BuyerTable                                             │
│         └─ InquiryResponseButton (各買主行に配置)            │
│              └─ InquiryResponseEmailModal                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Express)                        │
├─────────────────────────────────────────────────────────────┤
│  /api/inquiry-response/property-info/:buyerId (GET)          │
│  /api/inquiry-response/send (POST)                           │
│                                                              │
│  InquiryResponseService                                      │
│    ├─ getPropertyInfoForBuyer()                              │
│    ├─ sendInquiryResponseEmail()                             │
│    └─ generateEmailContent()                                 │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  既存サービスの活用                           │           │
│  ├──────────────────────────────────────────────┤           │
│  │  EmailService                                │           │
│  │    └─ sendEmail()                            │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              External Services                               │
├─────────────────────────────────────────────────────────────┤
│  Supabase (buyers, property_listings)                        │
│  SMTP Server (メール送信)                                    │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **既存のEmailService**: `sendEmail()`メソッドを使用してSMTP経由でメール送信
2. **Supabaseデータベース**: `buyers`テーブルと`property_listings`テーブルから情報を取得

## Components and Interfaces

### Backend Components

#### 1. InquiryResponseService

新規作成するサービスクラス。問い合わせ返信メールの生成と送信を担当します。

```typescript
export interface PropertyInfo {
  propertyNumber: string;
  address: string;
  preViewingNotes: string | null;
  propertyType: string;
  price: number | null;
}

export interface BuyerInfo {
  id: number;
  name: string;
  email: string;
  propertyNumber: string;
}

export class InquiryResponseService {
  /**
   * 買主IDから物件情報とpre_viewing_notesを取得
   */
  async getPropertyInfoForBuyer(
    buyerId: number
  ): Promise<PropertyInfo | null>;

  /**
   * 問い合わせ返信メールを送信
   */
  async sendInquiryResponseEmail(
    buyerId: number,
    templateId: string,
    customMessage?: string
  ): Promise<{ success: boolean; message: string }>;

  /**
   * メールコンテンツを生成
   */
  private generateEmailContent(
    buyer: BuyerInfo,
    propertyInfo: PropertyInfo,
    templateId: string,
    customMessage?: string
  ): { subject: string; body: string; html: string };
}
```

#### 2. API Routes

```typescript
// /api/inquiry-response/property-info/:buyerId (GET)
interface PropertyInfoResponse {
  propertyNumber: string;
  address: string;
  preViewingNotes: string | null;
  propertyType: string;
  price: number | null;
}

// /api/inquiry-response/send (POST)
interface SendRequest {
  buyerId: number;
  templateId: string;
  customMessage?: string;
}

interface SendResponse {
  success: boolean;
  message: string;
}
```

### Frontend Components

#### 1. InquiryResponseButton

買主一覧ページの各買主行に配置されるボタンコンポーネント。

```typescript
interface InquiryResponseButtonProps {
  buyerId: number;
  buyerName: string;
  disabled?: boolean;
}

export const InquiryResponseButton: React.FC<InquiryResponseButtonProps>;
```

#### 2. InquiryResponseEmailModal

メール生成・プレビュー・送信を行うモーダルコンポーネント。

```typescript
interface InquiryResponseEmailModalProps {
  open: boolean;
  onClose: () => void;
  buyerId: number;
  buyerName: string;
}

export const InquiryResponseEmailModal: React.FC<InquiryResponseEmailModalProps>;
```

## Data Models

### Buyer Data

```typescript
interface Buyer {
  id: number;
  name: string;
  email: string;
  property_number: string;
  // ... その他のフィールド
}
```

### Property Listing Data

```typescript
interface PropertyListing {
  property_number: string;
  address: string;
  pre_viewing_notes: string | null;
  property_type: string;
  price: number | null;
  // ... その他のフィールド
}
```

### Email Template Structure

```typescript
interface EmailContent {
  subject: string;              // "【物件番号】物件に関するご案内"
  body: string;                 // プレーンテキスト版
  html: string;                 // HTML版
}

interface EmailTemplate {
  greeting: string;             // "買主名 様"
  opening: string;              // "お問い合わせいただきありがとうございます。"
  propertyInfo: {
    propertyNumber: string;     // "物件番号: XXX"
    address: string;            // "所在地: XXX"
  };
  preViewingNotes?: string;     // "【内覧前の注意事項】XXX"
  customMessage?: string;       // ユーザーが入力した追加メッセージ
  closing: string;              // "ご不明な点がございましたら、お気軽にお問い合わせください。"
}
```

## Correctness Properties

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。これは人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### Property 1: データベースからの物件情報取得の正確性

*任意の*有効な買主IDに対して、データベースから物件情報を取得した場合、取得された値は以下のいずれかである：
- 有効な物件情報オブジェクト（property_numberが存在する場合）
- null（買主にproperty_numberが設定されていない、または物件が見つからない場合）

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: メールコンテンツ生成の完全性

*任意の*有効な買主情報と物件情報に対して、生成されるメールコンテンツは：
- subject、body、htmlの3つのフィールドを含む
- 買主名が正しく挿入されている
- 物件情報（物件番号、住所）が正しく挿入されている
- pre_viewing_notesが存在する場合は含まれ、存在しない場合は省略される

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: カスタムメッセージの適切な処理

*任意の*カスタムメッセージ（空文字列を含む）に対して：
- カスタムメッセージが提供された場合、メール本文に含まれる
- カスタムメッセージが空または未定義の場合、メール本文から省略される
- カスタムメッセージの改行が適切に保持される

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: 欠損データの適切な処理

*任意の*物件に対して、オプションフィールド（pre_viewing_notes）が欠損している場合：
- pre_viewing_notesがnullまたは空の場合 → そのセクションを省略
- 必須フィールド（property_number、address）が欠損している場合 → エラーを返す

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 5: メール送信の成功確認

*任意の*有効なメール送信リクエストに対して、`EmailService.sendEmail()`が成功した場合：
- `success: true`が返される
- 成功メッセージが含まれる

**Validates: Requirements 7.1, 7.4**

## Error Handling

### Error Categories

1. **データベース接続エラー**
   - Supabaseが利用不可
   - 認証エラー
   - 対応: エラーメッセージを表示し、メール生成を中止

2. **データ欠損エラー**
   - 買主にproperty_numberが設定されていない
   - 物件が見つからない
   - 対応: エラーメッセージを表示し、ボタンを無効化

3. **メール送信エラー**
   - SMTP接続エラー
   - 認証エラー
   - ネットワークエラー
   - 対応: エラーメッセージを表示し、リトライオプションを提供

4. **バリデーションエラー**
   - 買主メールアドレスが無効
   - 買主IDが無効
   - 対応: フォームバリデーションでエラーを表示

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: any;
}
```

### Retry Strategy

- メール送信エラー: ユーザーに通知し、手動でリトライ可能
- データベース読み取りエラー: 即座に失敗（ユーザーに通知）

## Testing Strategy

### Unit Tests

以下の具体的な例とエッジケースを検証します：

1. **InquiryResponseService**
   - `getPropertyInfoForBuyer()`: 正常取得、買主が見つからない、物件が見つからないケース
   - `sendInquiryResponseEmail()`: 正常送信、メール送信エラー
   - `generateEmailContent()`: プレースホルダー置換の正確性、カスタムメッセージの処理

2. **API Routes**
   - `/property-info/:buyerId`: 正常リクエスト、買主が見つからない
   - `/send`: 正常送信、バリデーションエラー、メール送信エラー

3. **Frontend Components**
   - `InquiryResponseButton`: 有効/無効状態の切り替え
   - `InquiryResponseEmailModal`: モーダル開閉、フォーム送信、エラー表示

### Property-Based Tests

各正確性プロパティを検証するプロパティベーステストを実装します：

- **Property 1**: ランダムな買主IDでデータベース取得をテスト（100回実行）
  - **Feature: property-inquiry-response-email, Property 1**: データベースからの物件情報取得の正確性
  
- **Property 2**: ランダムなテンプレートデータでメールコンテンツ生成をテスト（100回実行）
  - **Feature: property-inquiry-response-email, Property 2**: メールコンテンツ生成の完全性
  
- **Property 3**: ランダムなカスタムメッセージでメール生成をテスト（100回実行）
  - **Feature: property-inquiry-response-email, Property 3**: カスタムメッセージの適切な処理
  
- **Property 4**: ランダムに欠損したデータでエラーハンドリングをテスト（100回実行）
  - **Feature: property-inquiry-response-email, Property 4**: 欠損データの適切な処理
  
- **Property 5**: ランダムなメール送信パラメータでメール送信をテスト（100回実行）
  - **Feature: property-inquiry-response-email, Property 5**: メール送信の成功確認

### Integration Tests

- データベースからのデータ取得 → メール生成 → メール送信の一連のフロー
- ボタンクリック → モーダル表示 → 物件情報取得 → メール送信

### Testing Framework

- **Unit Tests**: Jest
- **Property-Based Tests**: fast-check (TypeScript用PBTライブラリ)
- **Integration Tests**: Supertest + Jest
- **Frontend Tests**: React Testing Library

各プロパティテストは最低100回の反復実行を行い、ランダムな入力に対してプロパティが保持されることを検証します。
