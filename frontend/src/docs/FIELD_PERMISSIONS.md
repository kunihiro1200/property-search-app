# フィールド権限システム

## 概要

フィールド権限システムは、インライン編集可能なフィールドに対して、きめ細かなアクセス制御を提供します。このシステムにより、特定のフィールドを読み取り専用にしたり、ユーザーの役割に基づいて編集権限を制御したりできます。

## 主な機能

1. **フィールドレベルの権限制御**: 各フィールドに個別の編集権限を設定
2. **読み取り専用フィールドの保護**: システム管理フィールドの編集を防止
3. **視覚的なフィードバック**: 読み取り専用フィールドにロックアイコンとツールチップを表示
4. **権限チェックの自動化**: 保存前に権限を自動的に検証
5. **拡張可能な設計**: 将来的な役割ベースのアクセス制御に対応

## 使用方法

### 基本的な使い方

```typescript
import { InlineEditableField } from '../components/InlineEditableField';

// 編集可能なフィールド
<InlineEditableField
  value={buyer.name}
  fieldName="name"
  fieldType="text"
  onSave={handleSave}
/>

// 読み取り専用フィールド
<InlineEditableField
  value={buyer.id}
  fieldName="id"
  fieldType="text"
  onSave={handleSave}
  readOnly={true}
/>

// カスタム権限を持つフィールド
<InlineEditableField
  value={buyer.email}
  fieldName="email"
  fieldType="email"
  onSave={handleSave}
  permissions={{ 
    canEdit: false, 
    reason: '管理者権限が必要です' 
  }}
/>
```

### フィールドメタデータの設定

`fieldPermissions.ts`でフィールドのメタデータを定義します：

```typescript
export const BUYER_FIELD_PERMISSIONS: Record<string, FieldMetadata> = {
  name: {
    name: 'name',
    type: 'text',
    readOnly: false,
    permissions: { canEdit: true },
    label: '名前',
    validation: [
      { type: 'required', message: '名前は必須です' }
    ]
  },
  id: {
    name: 'id',
    type: 'text',
    readOnly: true,
    permissions: { 
      canEdit: false, 
      reason: 'システム管理フィールド' 
    },
    label: 'ID'
  }
};
```

### 権限チェックユーティリティ

```typescript
import {
  checkFieldPermission,
  hasEditableFields,
  getEditableFields,
  getReadOnlyFields,
  validateEditPermission,
  getReadOnlyMessage,
} from '../utils/permissionChecker';

// フィールドの編集権限を確認
const permission = checkFieldPermission('name');
if (permission.canEdit) {
  // 編集可能
}

// 編集可能なフィールドのリストを取得
const editableFields = getEditableFields(['name', 'email', 'id']);
// => ['name', 'email']

// 読み取り専用フィールドのリストを取得
const readOnlyFields = getReadOnlyFields(['name', 'email', 'id']);
// => ['id']

// 保存前に権限を検証（エラーをスロー）
try {
  validateEditPermission('id');
} catch (error) {
  console.error(error.message); // "フィールド "id" は編集できません: システム管理フィールド"
}

// 読み取り専用の理由を取得
const message = getReadOnlyMessage('id');
// => "システム管理フィールド"
```

## システム管理フィールド

以下のフィールドは常に読み取り専用です：

- `id`: レコードの一意識別子
- `createdAt`: 作成日時
- `updatedAt`: 更新日時
- `lastModifiedBy`: 最終更新者

これらのフィールドは自動的に読み取り専用として扱われ、編集モードに入ることができません。

## 視覚的なフィードバック

### 読み取り専用フィールドのスタイリング

- **背景色**: グレー (`bg-gray-50`)
- **テキスト色**: グレー (`text-gray-500`)
- **カーソル**: 禁止マーク (`cursor-not-allowed`)
- **アイコン**: ロックアイコンを表示

### ツールチップ

読み取り専用フィールドをクリックすると、なぜ編集できないのかを説明するツールチップが3秒間表示されます。

### ホバー効果

- **編集可能なフィールド**: ホバー時に青い背景 (`bg-blue-50`) と境界線を表示
- **読み取り専用フィールド**: ホバー効果なし

## アクセシビリティ

### キーボードナビゲーション

- 読み取り専用フィールドは`tabIndex`を持たず、キーボードナビゲーションから除外されます
- EnterキーやSpaceキーでの編集モード起動も無効化されます

### スクリーンリーダー

- 読み取り専用フィールドには適切な`aria-label`が設定されます
- ツールチップの内容はスクリーンリーダーで読み上げられます

## 拡張性

### 役割ベースのアクセス制御（将来の実装）

現在のシステムは、将来的な役割ベースのアクセス制御に対応できるように設計されています：

```typescript
// 将来の実装例
function checkFieldPermission(
  fieldName: string,
  userRole?: string
): FieldPermissions {
  const metadata = getFieldMetadata(fieldName);
  
  // 役割に基づく権限チェック
  if (userRole === 'viewer') {
    return { canEdit: false, reason: '閲覧権限のみです' };
  }
  
  if (userRole === 'editor' && metadata.requiresAdmin) {
    return { canEdit: false, reason: '管理者権限が必要です' };
  }
  
  return metadata.permissions;
}
```

### カスタム権限ルール

独自の権限ルールを追加することもできます：

```typescript
// カスタム権限チェック関数
function customPermissionCheck(fieldName: string, context: any): FieldPermissions {
  // ビジネスロジックに基づいた権限チェック
  if (context.isLocked) {
    return { canEdit: false, reason: 'レコードがロックされています' };
  }
  
  return { canEdit: true };
}

// コンポーネントで使用
<InlineEditableField
  value={value}
  fieldName="name"
  fieldType="text"
  onSave={handleSave}
  permissions={customPermissionCheck('name', context)}
/>
```

## テスト

### ユニットテスト

```typescript
import { checkFieldPermission } from '../utils/permissionChecker';

test('should return canEdit: false for system-managed fields', () => {
  const permission = checkFieldPermission('id');
  expect(permission.canEdit).toBe(false);
  expect(permission.reason).toBe('システム管理フィールド');
});
```

### 統合テスト

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineEditableField } from '../components/InlineEditableField';

test('should not activate edit mode for read-only fields', async () => {
  const user = userEvent.setup();
  
  render(
    <InlineEditableField
      value="Test"
      fieldName="id"
      fieldType="text"
      onSave={jest.fn()}
      readOnly={true}
    />
  );

  await user.click(screen.getByText('Test'));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
```

## ベストプラクティス

1. **フィールドメタデータを一元管理**: すべてのフィールド定義を`fieldPermissions.ts`に集約
2. **明確な理由を提供**: 読み取り専用の理由を必ず設定し、ユーザーに分かりやすく説明
3. **一貫性のあるスタイリング**: 読み取り専用フィールドのスタイルを統一
4. **権限チェックの自動化**: `useInlineEdit`フックで自動的に権限を検証
5. **テストの充実**: 権限システムの動作を包括的にテスト

## トラブルシューティング

### フィールドが編集できない

1. `fieldPermissions.ts`でフィールドの`canEdit`が`true`になっているか確認
2. `readOnly`プロパティが`false`になっているか確認
3. カスタム`permissions`プロパティが正しく設定されているか確認

### ツールチップが表示されない

1. `permissions.reason`が設定されているか確認
2. フィールドが実際に読み取り専用になっているか確認
3. クリックイベントが正しく発火しているか確認

### 権限チェックが機能しない

1. `useInlineEdit`フックに`fieldName`が渡されているか確認
2. `validateEditPermission`が正しくインポートされているか確認
3. エラーハンドリングが適切に実装されているか確認
