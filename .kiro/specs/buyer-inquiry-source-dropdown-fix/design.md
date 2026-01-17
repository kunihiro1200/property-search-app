# Design Document

## Overview

買主新規登録画面（`NewBuyerPage.tsx`）の問合せ元選択フィールドを、ハードコードされた選択肢から`buyerInquirySourceOptions.ts`で定義された統一された選択肢に変更する。これにより、買主詳細ページと同じUI/UXを提供し、選択肢の一元管理を実現する。

## Architecture

### 現在の実装

```
NewBuyerPage.tsx
├── Select コンポーネント
└── ハードコードされた MenuItem (スーモ、ホームズ、アットホームなど)
```

### 修正後の実装

```
NewBuyerPage.tsx
├── Autocomplete コンポーネント
├── INQUIRY_SOURCE_OPTIONS をインポート
└── カテゴリ別グループ化表示
```

## Components and Interfaces

### 修正対象コンポーネント

**NewBuyerPage.tsx**
- 問合せ元フィールドを`Select`から`Autocomplete`に変更
- `buyerInquirySourceOptions.ts`から`INQUIRY_SOURCE_OPTIONS`をインポート
- カテゴリ別グループ化を実装

### 使用する既存インターフェース

```typescript
interface InquirySourceOption {
  value: string;
  label: string;
  category: string;
}
```

## Data Models

変更なし。既存の`INQUIRY_SOURCE_OPTIONS`配列を使用する。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 選択肢の一貫性

*For any* 買主関連画面（新規登録、詳細表示）において、問合せ元の選択肢は`INQUIRY_SOURCE_OPTIONS`から取得され、すべての画面で同じ選択肢が表示される

**Validates: Requirements 1.1, 1.2, 2.2, 2.3, 2.4**

### Property 2: カテゴリグループ化の保持

*For any* 問合せ元の選択肢表示において、選択肢はカテゴリ別にグループ化され、各選択肢は正しいカテゴリに属している

**Validates: Requirements 1.3**

### Property 3: 値の保存の正確性

*For any* 選択された問合せ元の値において、保存される値は選択肢の`value`プロパティと一致する

**Validates: Requirements 1.4**

### Property 4: フィルタリング機能

*For any* ユーザー入力において、Autocompleteコンポーネントは入力内容に基づいて選択肢を正しくフィルタリングする

**Validates: Requirements 1.5**

## Error Handling

- 選択肢が見つからない場合: 空の選択肢として扱う（既存の動作を維持）
- 無効な値が保存されている場合: Autocompleteは`null`を表示し、ユーザーが再選択できるようにする

## Testing Strategy

### Unit Tests

- `NewBuyerPage`コンポーネントのレンダリングテスト
- 問合せ元フィールドが正しく表示されることを確認
- 選択肢が`INQUIRY_SOURCE_OPTIONS`から取得されることを確認

### Property-Based Tests

このタスクは主にUIコンポーネントの修正であり、ロジックの変更は最小限のため、Property-Based Testは不要。代わりに、以下の手動テストを実施する:

1. 物件詳細ページから買主新規登録画面を開き、問合せ元の選択肢を確認
2. 買主リストページから買主新規登録画面を開き、問合せ元の選択肢を確認
3. 両方の画面で同じ選択肢が表示されることを確認
4. カテゴリ別グループ化が正しく機能することを確認
5. 選択した値が正しく保存されることを確認

### Integration Tests

- 買主新規登録フローの統合テスト
- 問合せ元を選択して買主を登録し、データベースに正しく保存されることを確認

## Implementation Details

### 変更箇所

**frontend/src/pages/NewBuyerPage.tsx**

1. インポートの追加:
```typescript
import { Autocomplete } from '@mui/material';
import { INQUIRY_SOURCE_OPTIONS } from '../utils/buyerInquirySourceOptions';
```

2. 問合せ元フィールドの置き換え:
```typescript
// 変更前
<FormControl fullWidth>
  <InputLabel>問合せ元</InputLabel>
  <Select
    value={inquirySource}
    label="問合せ元"
    onChange={(e) => setInquirySource(e.target.value)}
  >
    <MenuItem value="">選択してください</MenuItem>
    <MenuItem value="スーモ">スーモ</MenuItem>
    // ... その他のハードコードされた選択肢
  </Select>
</FormControl>

// 変更後
<Autocomplete
  fullWidth
  options={INQUIRY_SOURCE_OPTIONS}
  groupBy={(option) => option.category}
  getOptionLabel={(option) => option.label}
  value={INQUIRY_SOURCE_OPTIONS.find(opt => opt.value === inquirySource) || null}
  onChange={(_, newValue) => setInquirySource(newValue?.value || '')}
  renderInput={(params) => (
    <TextField
      {...params}
      label="問合せ元"
    />
  )}
/>
```

### スタイリング

- `BuyerDetailPage.tsx`と同じスタイリングを適用
- `size="small"`は不要（新規登録画面では通常サイズを使用）

## Performance Considerations

- `INQUIRY_SOURCE_OPTIONS`は静的な配列なので、パフォーマンスへの影響は最小限
- Autocompleteコンポーネントは内部で効率的なフィルタリングを実装しているため、追加の最適化は不要

## Security Considerations

- 選択肢の値はフロントエンドで定義されているが、バックエンドでのバリデーションは既存の実装に依存
- 追加のセキュリティ対策は不要

## Deployment Notes

- フロントエンドのみの変更
- バックエンドの変更は不要
- データベースの変更は不要
- 既存のデータとの互換性は保たれる
