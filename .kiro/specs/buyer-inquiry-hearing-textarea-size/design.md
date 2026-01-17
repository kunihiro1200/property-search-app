# Design Document

## Overview

買主詳細ページの「問合時ヒアリング」フィールドにおいて、編集モード時のテキストエリアサイズが表示モードより小さくなる問題を修正する。InlineEditableFieldコンポーネントのtextareaタイプの編集時レンダリングを改善し、表示モードと同等のサイズを維持する。

## Architecture

既存のInlineEditableFieldコンポーネントを修正する。変更は主にrenderInput関数内のtextareaケースに対して行う。

```
InlineEditableField
├── 表示モード（現状維持）
│   └── minHeight: 120px（alwaysShowBorder && textarea）
└── 編集モード（修正対象）
    └── TextField (multiline)
        ├── minRows: 6（現状の4から増加）
        └── sx: { minHeight: 120px }
```

## Components and Interfaces

### InlineEditableField コンポーネント修正

**変更箇所**: `frontend/src/components/InlineEditableField.tsx`

```typescript
// 現在の実装
case 'textarea':
  return (
    <TextField
      {...commonProps}
      multiline
      rows={multiline ? 4 : 2}  // 固定行数
    />
  );

// 修正後の実装
case 'textarea':
  return (
    <TextField
      {...commonProps}
      multiline
      minRows={6}  // 最小行数を増加
      maxRows={20} // 最大行数を設定（無制限に伸びないように）
      sx={{
        ...commonProps.sx,
        '& .MuiInputBase-root': {
          minHeight: alwaysShowBorder ? 120 : 80,
        },
      }}
    />
  );
```

### Props変更

既存のpropsに変更なし。`alwaysShowBorder`プロパティを活用して、表示モードと編集モードの一貫性を保つ。

## Data Models

データモデルの変更なし。UIコンポーネントの表示ロジックのみの修正。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 編集時テキストエリアの最小高さ維持

*For any* textareaタイプのInlineEditableFieldで、alwaysShowBorderがtrueの場合、編集モード時のテキストエリアの最小高さは120px以上である

**Validates: Requirements 1.1, 1.2**

### Property 2: テキストエリアの自動高さ調整

*For any* textareaタイプのInlineEditableFieldで、内容が最小行数を超える場合、テキストエリアの高さは内容に応じて自動的に拡張される（最大行数まで）

**Validates: Requirements 1.3**

## Error Handling

- テキストエリアのサイズ変更に関するエラーは発生しない（CSSスタイリングのみの変更）
- 既存の保存処理のエラーハンドリングは維持

## Testing Strategy

### Unit Tests

1. InlineEditableFieldコンポーネントのtextareaタイプで、alwaysShowBorder=trueの場合に適切なスタイルが適用されることを確認
2. 編集モード時のテキストエリアが最小高さを維持することを確認

### Manual Testing

1. 買主詳細ページで「問合時ヒアリング」フィールドをクリックして編集モードに入る
2. テキストエリアのサイズが表示モードと同等であることを確認
3. 長いテキストを入力した際にテキストエリアが適切に拡張されることを確認
4. 編集完了後、正常に保存されることを確認
