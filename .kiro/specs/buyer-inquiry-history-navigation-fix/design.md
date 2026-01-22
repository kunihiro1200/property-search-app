# Design Document

## Overview

買主詳細ページの問合せ履歴テーブルにおいて、物件番号クリック時の遷移先を買主詳細ページに変更し、戻るボタンを追加します。これにより、ユーザーは問合せ履歴から関連する買主情報に素早くアクセスでき、元のページに簡単に戻ることができます。

## Architecture

### Component Structure

```
BuyerDetailPage (frontend/src/pages/BuyerDetailPage.tsx)
├── InquiryHistoryTable (frontend/src/components/InquiryHistoryTable.tsx)
│   └── Property Number Links (修正対象)
└── Back Button (新規追加)
```

### Navigation Flow

```
現在の遷移:
問合せ履歴の物件番号クリック → 物件詳細ページ

新しい遷移:
問合せ履歴の物件番号クリック → 買主詳細ページ (buyer_number付き)
買主詳細ページの戻るボタン → 前のページ (ブラウザ履歴)
```

## Components and Interfaces

### 1. InquiryHistoryTable Component

**Location:** `frontend/src/components/InquiryHistoryTable.tsx`

**Current Behavior:**
- `onPropertyClick` コールバックが物件番号を受け取る
- 親コンポーネント (BuyerDetailPage) が物件詳細ページへナビゲート

**Required Changes:**
- `onPropertyClick` コールバックを `onBuyerClick` に変更
- 買主番号 (`buyerNumber`) をパラメータとして渡す
- 物件番号のクリックハンドラーを更新

**Updated Interface:**
```typescript
interface InquiryHistoryTableProps {
  inquiryHistory: InquiryHistoryItem[];
  selectedPropertyIds: Set<string>;
  onSelectionChange: (propertyIds: Set<string>) => void;
  onBuyerClick?: (buyerNumber: string) => void; // 変更: onPropertyClick → onBuyerClick
}
```

**Implementation Details:**
- 物件番号セルのクリックイベントで `onBuyerClick(item.buyerNumber)` を呼び出す
- `buyerNumber` が存在しない場合はクリック不可にする

### 2. BuyerDetailPage Component

**Location:** `frontend/src/pages/BuyerDetailPage.tsx`

**Required Changes:**

#### A. Navigation Handler Update
```typescript
// 現在
const handlePropertyClick = (propertyNumber: string) => {
  navigate(`/property-listings/${propertyNumber}`);
};

// 変更後
const handleBuyerClick = (buyerNumber: string) => {
  navigate(`/buyers/${buyerNumber}`);
};
```

#### B. Back Button Addition
```typescript
// ページヘッダーに戻るボタンを追加
<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
  <IconButton 
    onClick={() => navigate(-1)} 
    sx={{ mr: 2 }}
    aria-label="戻る"
  >
    <ArrowBackIcon />
  </IconButton>
  <Typography variant="h5" fontWeight="bold">
    {buyer.name || buyer.buyer_number}
  </Typography>
  {/* 既存のチップなど */}
</Box>
```

**Note:** 既存のコードには既に `<IconButton onClick={() => navigate('/buyers')}>` が存在しますが、これは買主一覧ページへの固定リンクです。これを `navigate(-1)` に変更してブラウザ履歴を使用します。

### 3. Navigation History Management

**Browser History API Usage:**
- `navigate(-1)` を使用してブラウザの履歴を遡る
- React Router の `useNavigate` フックを活用
- 履歴がない場合のフォールバック処理

**Fallback Strategy:**
```typescript
const handleBack = () => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate('/buyers'); // デフォルトページ
  }
};
```

## Data Models

### InquiryHistoryItem Interface

**Current:**
```typescript
export interface InquiryHistoryItem {
  buyerNumber: string;
  propertyNumber: string;
  propertyAddress: string;
  inquiryDate: string;
  status: 'current' | 'past';
  propertyId: string;
  propertyListingId: string;
}
```

**No changes required** - `buyerNumber` フィールドは既に存在します。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Navigation Target Correctness
*For any* inquiry history item with a valid buyer number, clicking the property number link should navigate to the buyer detail page with the correct buyer number parameter.

**Validates: Requirements 1.1, 1.2**

### Property 2: Back Button Visibility
*For any* buyer detail page load, the back button should be visible and positioned in the page header.

**Validates: Requirements 2.1, 2.3**

### Property 3: Back Navigation Behavior
*For any* back button click, the system should navigate to the previous page in the browser history.

**Validates: Requirements 3.1, 3.2**

### Property 4: Link Disabled for Missing Buyer Number
*For any* inquiry history item without a buyer number, the property number should be displayed as plain text without a clickable link.

**Validates: Requirements 1.4**

## Error Handling

### Invalid Buyer Number
- **Scenario:** 問合せ履歴アイテムに `buyerNumber` が存在しない
- **Handling:** 物件番号をプレーンテキストとして表示（リンクなし）
- **User Feedback:** なし（視覚的にリンクでないことが明確）

### Navigation History Empty
- **Scenario:** ブラウザ履歴が存在しない状態で戻るボタンをクリック
- **Handling:** デフォルトページ（買主一覧）にナビゲート
- **User Feedback:** なし（シームレスな遷移）

### Invalid Buyer Number in URL
- **Scenario:** URLパラメータの `buyer_number` が無効
- **Handling:** 既存のエラーハンドリングを使用（BuyerDetailPageに実装済み）
- **User Feedback:** エラーメッセージと買主一覧へのリンクを表示

## Testing Strategy

### Unit Tests

**InquiryHistoryTable Component:**
1. `buyerNumber` が存在する場合、物件番号がクリック可能であることを確認
2. `buyerNumber` が存在しない場合、物件番号がプレーンテキストであることを確認
3. 物件番号クリック時に `onBuyerClick` が正しい `buyerNumber` で呼ばれることを確認

**BuyerDetailPage Component:**
1. 戻るボタンがレンダリングされることを確認
2. 戻るボタンクリック時に `navigate(-1)` が呼ばれることを確認
3. `handleBuyerClick` が正しい買主番号でナビゲートすることを確認

### Integration Tests

1. 問合せ履歴テーブルから買主詳細ページへの遷移フロー
2. 買主詳細ページから戻るボタンで前のページに戻るフロー
3. 複数の買主詳細ページを遷移した後の戻るボタンの動作

### Manual Testing Checklist

- [ ] 問合せ履歴の物件番号をクリックして買主詳細ページに遷移できる
- [ ] 買主詳細ページに戻るボタンが表示される
- [ ] 戻るボタンをクリックして前のページに戻れる
- [ ] 買主番号がない問合せ履歴アイテムはクリック不可
- [ ] ブラウザの戻るボタンも正常に動作する
- [ ] 複数回遷移した後も戻るボタンが正常に動作する

## Implementation Notes

### Minimal Changes Approach
- 既存の `InquiryHistoryTable` コンポーネントの変更を最小限に抑える
- `BuyerDetailPage` の既存の戻るボタンを活用（`navigate('/buyers')` → `navigate(-1)` に変更）
- 新しいコンポーネントやファイルの追加は不要

### Backward Compatibility
- `onPropertyClick` を `onBuyerClick` に変更することで、意図が明確になる
- 既存の他のコンポーネントへの影響はない（InquiryHistoryTableは買主詳細ページでのみ使用）

### Accessibility Considerations
- 戻るボタンに `aria-label="戻る"` を追加
- キーボードナビゲーションのサポート（既存のMUIコンポーネントで対応済み）
