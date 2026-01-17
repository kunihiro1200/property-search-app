# Design Document

## Overview

買主詳細画面の「問合時ヒアリング」フィールドに、売主詳細画面の「通話メモ入力」セクションと同様のクイック入力ボタン機能を追加する。ユーザーがボタンをクリックすると、対応するテキストがヒアリングフィールドに追加される。

## Architecture

### コンポーネント構成

```
BuyerDetailPage
├── InquiryHearingQuickInputSection (新規)
│   ├── Typography (ラベル: ヒアリング項目)
│   └── Box (flex-wrap)
│       └── Chip[] (クイック入力ボタン)
└── InlineEditableField (既存: inquiry_hearing)
```

### データフロー

1. ユーザーがクイック入力ボタンをクリック
2. BuyerDetailPageの状態（buyer.inquiry_hearing）を更新
3. handleInlineFieldSaveを呼び出してDBに保存
4. InlineEditableFieldが新しい値で再レンダリング

## Components and Interfaces

### InquiryHearingQuickInputSection

BuyerDetailPage内に直接実装するセクション。

```typescript
// クイック入力ボタンの定義
const INQUIRY_HEARING_QUICK_INPUTS = [
  { label: '初見か', text: '初見か：' },
  { label: '希望時期', text: '希望時期：' },
  { label: '駐車場希望台数', text: '駐車場希望台数：' },
  { label: 'リフォーム予算', text: 'リフォーム込みの予算（最高額）：' },
  { label: '持ち家か', text: '持ち家か：' },
  { label: '他物件', text: '他に気になる物件はあるか？：' },
];

// クイック入力ボタンクリックハンドラー
const handleQuickInputClick = async (text: string) => {
  const currentValue = buyer?.inquiry_hearing || '';
  const newValue = currentValue 
    ? `${currentValue}\n${text}` 
    : text;
  
  await handleInlineFieldSave('inquiry_hearing', newValue);
};
```

### UI構造

```tsx
<Box sx={{ mb: 1 }}>
  <Typography variant="subtitle2" gutterBottom>
    ヒアリング項目
  </Typography>
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
    {INQUIRY_HEARING_QUICK_INPUTS.map((item) => (
      <Chip
        key={item.label}
        label={item.label}
        onClick={() => handleQuickInputClick(item.text)}
        size="small"
        clickable
      />
    ))}
  </Box>
</Box>
```

## Data Models

既存のbuyerオブジェクトのinquiry_hearingフィールドを使用。新しいデータモデルは不要。

```typescript
interface Buyer {
  // ... 既存フィールド
  inquiry_hearing?: string;  // 問合時ヒアリング
  // ...
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: クイック入力テキスト追加の正確性

*For any* クイック入力ボタンのクリックと任意の既存フィールド値に対して、ボタンのテキストがフィールドに正しく追加される（既存値がある場合は改行を挟んで追加、空の場合は直接追加）

**Validates: Requirements 2.1, 2.2, 2.3**

## Error Handling

1. **保存失敗時**: handleInlineFieldSaveがエラーを返した場合、Snackbarでエラーメッセージを表示
2. **buyerがnullの場合**: クイック入力ボタンを無効化または非表示

## Testing Strategy

### Unit Tests

- クイック入力ボタンが正しくレンダリングされることを確認
- 各ボタンのラベルと順序を確認
- ボタンクリック時のハンドラー呼び出しを確認

### Property-Based Tests

- Property 1: 任意の既存値とボタンテキストの組み合わせで、正しい結果が得られることを確認
  - 空文字列 + テキスト → テキストのみ
  - 既存テキスト + テキスト → 既存テキスト + 改行 + テキスト

### Integration Tests

- ボタンクリック後にDBに正しく保存されることを確認
- UIが更新されることを確認
