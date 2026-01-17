# Design Document

## Overview

買主詳細画面の「問合時ヒアリング」フィールドに、初期状態から囲い枠を表示する機能を実装する。既存の`InlineEditableField`コンポーネントには`alwaysShowBorder`プロパティが実装済みであるため、このプロパティを活用して実装する。

## Architecture

### 変更対象

1. **BuyerDetailPage.tsx**: 「問合時ヒアリング」フィールドに`alwaysShowBorder`プロパティを追加

### 既存コンポーネントの活用

`InlineEditableField`コンポーネントには以下のプロパティが既に実装されている：
- `alwaysShowBorder`: 常に囲い枠を表示するかどうか（boolean）
- `borderPlaceholder`: 囲い枠内に表示するプレースホルダー（string）

これらのプロパティを使用することで、最小限の変更で要件を満たすことができる。

## Components and Interfaces

### InlineEditableField（既存）

```typescript
interface InlineEditableFieldProps {
  // ... 既存のプロパティ
  alwaysShowBorder?: boolean;  // 常に囲い枠を表示するかどうか
  borderPlaceholder?: string;  // 囲い枠内に表示するプレースホルダー
}
```

### BuyerDetailPage での使用

```typescript
// 問合時ヒアリングフィールドの定義
{ 
  key: 'inquiry_hearing', 
  label: '問合時ヒアリング', 
  multiline: true, 
  inlineEditable: true,
  alwaysShowBorder: true,  // 追加
  borderPlaceholder: '問合せ時のヒアリング内容を入力'  // 追加
}
```

## Data Models

変更なし。既存のデータモデルをそのまま使用。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Border visibility with varying content

*For any* content length (empty, short, long), the Inquiry_Hearing_Field should maintain its bordered appearance with a minimum height of 120px.

**Validates: Requirements 2.3**

## Error Handling

- フィールドが存在しない場合：既存のエラーハンドリングを使用
- 保存失敗時：既存のエラーハンドリングを使用（スナックバー表示）

## Testing Strategy

### Unit Tests

- `alwaysShowBorder`プロパティが正しく適用されることを確認
- プレースホルダーが空の場合に表示されることを確認

### Manual Testing

- 買主詳細画面で「問合時ヒアリング」フィールドに囲い枠が表示されることを確認
- ホバー時の視覚的フィードバックを確認
- 通話モードの「通話メモ入力」との視覚的一貫性を確認
