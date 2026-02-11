# Design Document

## Overview

買主詳細ページの内覧結果ページ（BuyerViewingResultPage）における「買付情報」セクションの表示条件と機能を改善します。現在は常に表示されていますが、「★最新状況」フィールドに「買」という文字が含まれる場合のみ表示し、Google Chat への自動送信機能を実装します。

この機能により、営業担当者は買付が発生した場合のみ関連情報を入力でき、チームへの通知を自動化できます。

## Architecture

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│ BuyerViewingResultPage (Frontend)                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 内覧結果・後続対応セクション                          │  │
│  │  - 内覧日、時間、後続担当                            │  │
│  │  - 内覧結果・後続対応                                │  │
│  │  - ★最新状況 ← 表示条件の判定に使用                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 買付情報セクション（条件付き表示）                    │  │
│  │  - 買付コメント（任意）                              │  │
│  │  - 買付チャット送信ボタン（必須）                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ POST /api/google-chat/send
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend API                                                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Google Chat API Endpoint                             │  │
│  │  - メッセージ内容の動的生成                          │  │
│  │  - 買主・物件データの取得                            │  │
│  │  - Google Chat APIへのPOST                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ POST request
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Google Chat API                                             │
│  https://chat.googleapis.com/v1/spaces/...                 │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **表示条件の判定**:
   - フロントエンドで`buyer.latest_status`をチェック
   - 「買」を含み、「買付外れました」を含まない場合のみセクションを表示

2. **チャット送信**:
   - ユーザーが「買付チャット送信」ボタンをクリック
   - フロントエンドがバックエンドAPIにPOSTリクエスト
   - バックエンドが買主・物件データを取得
   - メッセージ内容を動的生成
   - Google Chat APIにPOSTリクエスト
   - 結果をフロントエンドに返す

## Components and Interfaces

### Frontend Components

#### BuyerViewingResultPage.tsx

**既存の変更点**:
- 買付情報セクションの条件付き表示ロジックを追加
- 買付チャット送信ボタンのハンドラーを実装

**新規追加**:
```typescript
// 買付情報セクションの表示条件を判定
const shouldShowOfferSection = (): boolean => {
  if (!buyer?.latest_status) return false;
  
  const status = buyer.latest_status.trim();
  
  // 「買付外れました」を含む場合は非表示
  if (status.includes('買付外れました')) return false;
  
  // 「買」を含む場合は表示
  return status.includes('買');
};

// 買付チャット送信ハンドラー
const handleOfferChatSend = async () => {
  if (!buyer || !linkedProperties || linkedProperties.length === 0) {
    setSnackbar({
      open: true,
      message: '買主または物件情報が不足しています',
      severity: 'error',
    });
    return;
  }

  try {
    // バックエンドAPIを呼び出し
    const response = await api.post('/api/google-chat/send-offer', {
      buyerNumber: buyer.buyer_number,
      propertyNumber: linkedProperties[0].property_number,
      offerComment: buyer.offer_comment || '',
    });

    setSnackbar({
      open: true,
      message: 'Google Chatに送信しました',
      severity: 'success',
    });
  } catch (error: any) {
    console.error('Failed to send chat message:', error);
    setSnackbar({
      open: true,
      message: error.response?.data?.error || 'チャット送信に失敗しました',
      severity: 'error',
    });
  }
};
```

### Backend API

#### 新規エンドポイント: POST /api/google-chat/send-offer

**リクエストボディ**:
```typescript
interface SendOfferChatRequest {
  buyerNumber: string;
  propertyNumber: string;
  offerComment?: string;
}
```

**レスポンス**:
```typescript
interface SendOfferChatResponse {
  success: boolean;
  message?: string;
  error?: string;
}
```

#### GoogleChatService.ts（新規作成）

```typescript
export class GoogleChatService {
  private readonly GOOGLE_CHAT_WEBHOOK_URL = 
    'https://chat.googleapis.com/v1/spaces/AAAA6iEDkiU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=azlyf21pENCpLLUdJPjnRNXOzsIAP550xebOMVxYRMQ';

  /**
   * 買付情報をGoogle Chatに送信
   */
  async sendOfferMessage(
    buyer: any,
    property: any,
    offerComment: string
  ): Promise<void> {
    // メッセージ内容を生成
    const message = this.generateOfferMessage(buyer, property, offerComment);
    
    // Google Chat APIにPOST
    const response = await fetch(this.GOOGLE_CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Chat API error: ${response.statusText}`);
    }
  }

  /**
   * メッセージ内容を動的生成
   */
  private generateOfferMessage(
    buyer: any,
    property: any,
    offerComment: string
  ): string {
    const brokerInquiry = buyer.broker_inquiry || '';
    const atbbStatus = property.atbb_status || '';
    
    // 業者問合せかどうか
    const isBrokerInquiry = brokerInquiry === '業者問合せ';
    
    // 専任媒介かどうか
    const isExclusive = atbbStatus.includes('専任');
    
    // メッセージのヘッダー部分
    let message = `<${buyer.buyer_number}.${buyer.latest_status}>>\n`;
    
    // 媒介契約種別による警告メッセージ
    if (isExclusive) {
      message += '⚠atbbの業者向けを非公開お願いします！！\n';
    } else if (atbbStatus.includes('一般')) {
      message += '⚠一般媒介なので、atbbは公開のままにしてください！！\n';
    }
    
    // 業者問合せの場合は他社名を追加
    if (isBrokerInquiry && buyer.other_company_name) {
      message += `他社名：${buyer.other_company_name}\n`;
    }
    
    // キャンペーン該当/未
    if (buyer.campaign_applicable) {
      message += `<<${buyer.buyer_number}.${buyer.campaign_applicable}>>\n`;
    }
    
    // 買付コメント
    if (offerComment) {
      message += `<<${buyer.buyer_number}.${offerComment}>>\n`;
    }
    
    // 物件情報
    message += `物件番号: <<${buyer.buyer_number}.${property.property_number}>>\n`;
    message += `物件所在地: <<${buyer.buyer_number}.${property.display_address || property.address}>>\n`;
    message += `価格: <<${buyer.buyer_number}.${property.price}>>\n`;
    message += `物件担当: <<${buyer.buyer_number}.${property.sales_assignee}>>\n`;
    message += `内覧担当: <<${buyer.buyer_number}.${buyer.follow_up_assignee}>>\n`;
    
    return message;
  }
}
```

## Data Models

### Buyer（買主）

**使用するフィールド**:
- `buyer_number`: 買主番号
- `latest_status`: ★最新状況（表示条件の判定に使用）
- `campaign_applicable`: キャンペーン該当/未
- `offer_comment`: 買付コメント
- `follow_up_assignee`: 後続担当
- `broker_inquiry`: 業者問合せ
- `other_company_name`: 他社名

### Property（物件）

**使用するフィールド**:
- `property_number`: 物件番号
- `display_address`: 住居表示
- `address`: 所在地（display_addressが空の場合のフォールバック）
- `price`: 価格
- `sales_assignee`: 物件担当者
- `atbb_status`: atbb_status（媒介契約種別の判定に使用）

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 買付情報セクションの表示条件（「買」を含む場合）

*For any* 買主データ where `latest_status` contains the character "買" and does not contain "買付外れました", the Offer_Info_Section should be displayed on the Viewing_Result_Page.

**Validates: Requirements 1.1**

### Property 2: 買付情報セクションの非表示条件（「買」を含まない場合）

*For any* 買主データ where `latest_status` does not contain the character "買", the Offer_Info_Section should be hidden on the Viewing_Result_Page.

**Validates: Requirements 1.3**

### Property 3: 非表示時のDOM要素の不在

*For any* 買主データ where the Offer_Info_Section is hidden, no offer-related input fields should be rendered in the DOM.

**Validates: Requirements 1.4**

### Property 4: メッセージ生成パターンの正確性

*For any* 買主データと物件データの組み合わせ, the generated chat message should contain the correct warning message and optional fields based on the combination of `broker_inquiry` and `atbb_status`:
- When `broker_inquiry` ≠ "業者問合せ" AND `atbb_status` contains "専任": message contains "⚠atbbの業者向けを非公開お願いします！！"
- When `broker_inquiry` ≠ "業者問合せ" AND `atbb_status` contains "一般": message contains "⚠一般媒介なので、atbbは公開のままにしてください！！"
- When `broker_inquiry` = "業者問合せ" AND `atbb_status` contains "専任": message contains "⚠atbbの業者向けを非公開お願いします！！" and "他社名：[other_company_name]"
- When `broker_inquiry` = "業者問合せ" AND `atbb_status` contains "一般": message contains "⚠一般媒介なので、atbbは公開のままにしてください！！" and "他社名：[other_company_name]"

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: メッセージ内の必須フィールド包含

*For any* 買主データと物件データの組み合わせ, the generated chat message should include all of the following fields: `buyer_number`, `latest_status`, `campaign_applicable`, `offer_comment`, `property_number`, `display_address`, `price`, `sales_assignee`, and `follow_up_assignee`.

**Validates: Requirements 4.5**



## Error Handling

### Frontend Error Handling

1. **データ不足エラー**:
   - 買主データまたは物件データが不足している場合
   - エラーメッセージ: "買主または物件情報が不足しています"
   - 動作: チャット送信を防止し、スナックバーでエラーを表示

2. **API通信エラー**:
   - Google Chat APIへのリクエストが失敗した場合
   - エラーメッセージ: APIから返されたエラーメッセージ、またはデフォルトメッセージ
   - 動作: スナックバーでエラーを表示

3. **ネットワークエラー**:
   - ネットワーク接続が失敗した場合
   - エラーメッセージ: "ネットワークエラーが発生しました"
   - 動作: スナックバーでエラーを表示

### Backend Error Handling

1. **データ取得エラー**:
   - 買主または物件データの取得に失敗した場合
   - HTTPステータス: 404 Not Found
   - レスポンス: `{ error: "Buyer not found" }` または `{ error: "Property not found" }`

2. **Google Chat API エラー**:
   - Google Chat APIへのリクエストが失敗した場合
   - HTTPステータス: 500 Internal Server Error
   - レスポンス: `{ error: "Failed to send chat message: [詳細]" }`
   - ログ: エラー詳細をコンソールに出力

3. **バリデーションエラー**:
   - 必須パラメータが不足している場合
   - HTTPステータス: 400 Bad Request
   - レスポンス: `{ error: "Missing required parameters" }`

### エラーログ

全てのエラーは以下の形式でコンソールに出力されます：

```typescript
console.error('[GoogleChatService] Error:', {
  buyerNumber: buyer.buyer_number,
  propertyNumber: property.property_number,
  error: error.message,
  stack: error.stack,
});
```

## Testing Strategy

### Unit Tests

Unit testsは特定の例やエッジケースを検証します：

1. **表示条件のテスト**:
   - 例1: `latest_status = "買付申込"` → セクション表示
   - 例2: `latest_status = "買付外れました"` → セクション非表示
   - 例3: `latest_status = "内覧済み"` → セクション非表示
   - 例4: `latest_status = ""` → セクション非表示

2. **UI要素の存在確認**:
   - セクション表示時: 買付コメントフィールドとボタンが存在
   - セクション非表示時: 買付関連のDOM要素が存在しない

3. **エラーハンドリング**:
   - 買主データ不足時のエラーメッセージ表示
   - 物件データ不足時のエラーメッセージ表示
   - API エラー時のエラーメッセージ表示
   - ネットワークエラー時のエラーメッセージ表示

4. **API呼び出し**:
   - ボタンクリック時にPOSTリクエストが送信される
   - 正しいエンドポイントURLが使用される
   - 成功時にスナックバーが表示される

### Property-Based Tests

Property testsは普遍的なプロパティを検証します。各テストは最低100回実行されます。

#### Test 1: 買付情報セクションの表示条件（「買」を含む場合）

**Tag**: Feature: buyer-offer-info-conditional-display, Property 1: 買付情報セクションの表示条件（「買」を含む場合）

**Generator**:
- ランダムな買主データを生成
- `latest_status`に「買」を含む文字列を設定（「買付外れました」は除外）

**Property**:
- Offer_Info_Sectionが表示される

#### Test 2: 買付情報セクションの非表示条件（「買」を含まない場合）

**Tag**: Feature: buyer-offer-info-conditional-display, Property 2: 買付情報セクションの非表示条件（「買」を含まない場合）

**Generator**:
- ランダムな買主データを生成
- `latest_status`に「買」を含まない文字列を設定

**Property**:
- Offer_Info_Sectionが非表示になる

#### Test 3: 非表示時のDOM要素の不在

**Tag**: Feature: buyer-offer-info-conditional-display, Property 3: 非表示時のDOM要素の不在

**Generator**:
- ランダムな買主データを生成
- `latest_status`に「買」を含まない文字列を設定

**Property**:
- 買付関連のDOM要素が存在しない

#### Test 4: メッセージ生成パターンの正確性

**Tag**: Feature: buyer-offer-info-conditional-display, Property 4: メッセージ生成パターンの正確性

**Generator**:
- ランダムな買主データと物件データを生成
- `broker_inquiry`を「業者問合せ」または他の値に設定
- `atbb_status`に「専任」または「一般」を含む文字列を設定

**Property**:
- 生成されたメッセージに正しい警告メッセージが含まれる
- 業者問合せの場合、他社名が含まれる

#### Test 5: メッセージ内の必須フィールド包含

**Tag**: Feature: buyer-offer-info-conditional-display, Property 5: メッセージ内の必須フィールド包含

**Generator**:
- ランダムな買主データと物件データを生成

**Property**:
- 生成されたメッセージに全ての必須フィールドが含まれる

### Integration Tests

1. **エンドツーエンドフロー**:
   - 買主詳細ページを開く
   - `latest_status`に「買付申込」を設定
   - 買付情報セクションが表示されることを確認
   - 買付コメントを入力
   - 買付チャット送信ボタンをクリック
   - Google Chat APIにメッセージが送信されることを確認
   - 成功メッセージが表示されることを確認

2. **エラーフロー**:
   - 買主詳細ページを開く
   - 物件データを削除
   - 買付チャット送信ボタンをクリック
   - エラーメッセージが表示されることを確認

### Testing Tools

- **Frontend**: Jest + React Testing Library
- **Backend**: Jest + Supertest
- **Property-Based Testing**: fast-check (TypeScript用)
- **Integration Testing**: Playwright または Cypress

### Test Configuration

全てのproperty-based testsは以下の設定で実行されます：

```typescript
import fc from 'fast-check';

fc.assert(
  fc.property(
    // generators
    fc.record({
      buyer_number: fc.string(),
      latest_status: fc.string(),
      // ...
    }),
    // property
    (buyer) => {
      // test logic
    }
  ),
  { numRuns: 100 } // 最低100回実行
);
```
