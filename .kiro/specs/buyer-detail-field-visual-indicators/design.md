# Design Document: Buyer Detail Field Visual Indicators

## Overview

買主詳細画面のUI改善として、内覧結果関連フィールドのグループ化と、編集可能フィールドの視覚的識別機能を実装する。これにより、ユーザーはカーソルを持っていかなくても編集可能なフィールドを一目で識別でき、関連するフィールドがグループ化されて情報の把握が容易になる。

## Architecture

### Component Structure

```
BuyerDetailPage.tsx
├── ViewingResultGroup (新規コンポーネント)
│   ├── viewing_result_follow_up
│   ├── follow_up_assignee
│   └── latest_status
└── InlineEditableField.tsx (既存コンポーネントの拡張)
    ├── EditableTextIndicator
    ├── EditableDropdownIndicator
    └── ReadOnlyIndicator
```

### Design Approach

1. **ViewingResultGroupコンポーネント**: 内覧結果関連フィールドを薄い背景色でグループ化
2. **InlineEditableFieldの拡張**: 常時表示の視覚的インジケーターを追加
3. **フィールドタイプ別スタイリング**: テキスト入力とプルダウンを視覚的に区別

## Components and Interfaces

### ViewingResultGroup Component

```typescript
interface ViewingResultGroupProps {
  buyer: Buyer;
  onFieldSave: (fieldName: string, value: any) => Promise<{ success: boolean; error?: string }>;
  buyerId: string;
}

const ViewingResultGroup: React.FC<ViewingResultGroupProps> = ({
  buyer,
  onFieldSave,
  buyerId,
}) => {
  // 内覧結果・後続対応、後続担当、最新状況をグループ化して表示
  // 薄い青色の背景と微妙なボーダーで囲む
};
```

### InlineEditableField Props Extension

```typescript
interface InlineEditableFieldProps {
  // 既存のprops
  value: any;
  fieldName: string;
  fieldType: 'text' | 'email' | 'phone' | 'date' | 'dropdown' | 'textarea' | 'number';
  onSave: (value: any) => Promise<void>;
  readOnly?: boolean;
  // ...

  // 新規追加props
  showEditIndicator?: boolean;  // 編集可能インジケーターを常時表示するか（デフォルト: true）
  indicatorStyle?: 'border' | 'underline' | 'icon';  // インジケーターのスタイル
}
```

### Visual Indicator Styles

```typescript
// 編集可能フィールドの基本スタイル
const editableFieldStyles = {
  border: '1px solid',
  borderColor: 'rgba(0, 0, 0, 0.23)',  // MUIのデフォルトボーダー色
  borderRadius: 1,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'action.hover',
  },
};

// プルダウンフィールドの追加スタイル
const dropdownFieldStyles = {
  ...editableFieldStyles,
  // ドロップダウン矢印アイコンを常時表示
};

// 読み取り専用フィールドのスタイル
const readOnlyFieldStyles = {
  border: 'none',
  bgcolor: 'transparent',
};

// 内覧結果グループのスタイル
const viewingResultGroupStyles = {
  bgcolor: 'rgba(33, 150, 243, 0.08)',  // 薄い青色
  border: '1px solid',
  borderColor: 'rgba(33, 150, 243, 0.2)',
  borderRadius: 2,
  p: 2,
  mb: 2,
};
```

## Data Models

既存のデータモデルに変更なし。UIコンポーネントのスタイリングのみの変更。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Editable fields have consistent visible borders

*For any* editable field in the Buyer_Detail_Page, the field SHALL have a visible border with consistent styling (color, width, radius) regardless of hover state.

**Validates: Requirements 2.1, 4.1, 5.1, 5.2**

### Property 2: Dropdown fields have visible dropdown indicators

*For any* dropdown-type editable field in the Buyer_Detail_Page, the field SHALL display a dropdown arrow icon that is visible at all times (not just on hover).

**Validates: Requirements 2.2, 3.1, 3.2**

### Property 3: Read-only fields do not display editable indicators

*For any* read-only field in the Buyer_Detail_Page, the field SHALL NOT display an editable border or edit indicator, maintaining a flat appearance.

**Validates: Requirements 2.3**

### Property 4: Text fields have edit indicators

*For any* editable text field in the Buyer_Detail_Page, the field SHALL have either an edit icon, underline, or visible border to indicate editability, and empty fields SHALL display a placeholder.

**Validates: Requirements 4.2, 4.3**

### Property 5: Different field types have distinct visual styles

*For any* pair of fields where one is a dropdown and one is a text input, the fields SHALL have visually distinct styles (dropdown has arrow icon, multiline text has larger area).

**Validates: Requirements 3.3, 4.4**

## Error Handling

- フィールドの保存エラー時は既存のSnackbar通知を使用
- スタイリングの適用に失敗した場合はデフォルトスタイルにフォールバック

## Testing Strategy

### Unit Tests

1. ViewingResultGroupコンポーネントが正しいフィールドを含むことを確認
2. InlineEditableFieldが正しいスタイルを適用することを確認
3. 読み取り専用フィールドに編集インジケーターが表示されないことを確認

### Property-Based Tests

1. **Property 1**: すべての編集可能フィールドに一貫したボーダースタイルが適用されることを検証
2. **Property 2**: すべてのドロップダウンフィールドにドロップダウンアイコンが表示されることを検証
3. **Property 3**: すべての読み取り専用フィールドに編集インジケーターが表示されないことを検証

### Integration Tests

1. BuyerDetailPageで内覧結果グループが正しく表示されることを確認
2. フィールドの編集操作が正常に動作することを確認
3. ホバー時のスタイル変更が正しく動作することを確認

### Visual Regression Tests

1. 内覧結果グループの背景色とボーダーが正しく表示されることを確認
2. 編集可能フィールドのボーダーが常時表示されることを確認
3. ドロップダウンアイコンが常時表示されることを確認
