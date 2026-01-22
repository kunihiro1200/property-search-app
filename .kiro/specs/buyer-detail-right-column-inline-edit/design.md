# Design Document

## Overview

買主詳細画面の右側カラムにある全てのセクション（希望条件、その他、買付情報）にインライン編集機能を拡張する。既存の`InlineEditableField`コンポーネントを活用し、従来の編集モード（「その他編集」ボタン）を廃止してUIをシンプル化する。

## Architecture

### 現在の構造
```
BuyerDetailPage
├── 問い合わせ履歴テーブル
├── 2カラムレイアウト
│   ├── 左カラム: 物件詳細カード
│   └── 右カラム: 買主情報セクション
│       ├── 基本情報 (インライン編集可能)
│       ├── 問合せ・内覧情報 (インライン編集可能)
│       ├── 希望条件 (従来編集モード)
│       ├── その他 (従来編集モード)
│       └── 買付情報 (従来編集モード)
└── 関連買主セクション
```

### 変更後の構造
```
BuyerDetailPage
├── 問い合わせ履歴テーブル
├── 2カラムレイアウト
│   ├── 左カラム: 物件詳細カード
│   └── 右カラム: 買主情報セクション
│       ├── 基本情報 (インライン編集可能)
│       ├── 問合せ・内覧情報 (インライン編集可能)
│       ├── 希望条件 (インライン編集可能) ← 変更
│       ├── その他 (インライン編集可能) ← 変更
│       └── 買付情報 (インライン編集可能) ← 変更
└── 関連買主セクション
```

## Components and Interfaces

### 変更対象コンポーネント

#### BuyerDetailPage.tsx
- `FIELD_SECTIONS`の全フィールドに`inlineEditable: true`を追加
- `isEditing`状態と関連ロジックを削除
- 「その他編集」ボタンを削除
- 空フィールドの非表示ロジックを削除

### 既存コンポーネント（変更なし）

#### InlineEditableField.tsx
既存のインライン編集コンポーネントをそのまま使用：
- クリックで編集モード切り替え
- Enter/フォーカスアウトで保存
- エラーハンドリング
- 読み取り専用フィールド対応

## Data Models

変更なし。既存の`Buyer`インターフェースをそのまま使用。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: クリックで編集モード切り替え
*For any* フィールド（readOnly=false）において、クリックすると編集モードに切り替わる
**Validates: Requirements 1.1, 2.1, 3.1, 4.2**

### Property 2: 編集完了時のAPI保存
*For any* フィールドの編集完了時（Enter/フォーカスアウト）、変更がある場合はAPIに保存リクエストが送信される
**Validates: Requirements 1.2, 2.3, 3.2**

### Property 3: 保存失敗時のロールバック
*For any* API保存エラー発生時、フィールドの値は編集前の値に戻る
**Validates: Requirements 1.4**

### Property 4: multilineフィールドのテキストエリア表示
*For any* multiline属性を持つフィールドは、編集時にテキストエリアとして表示される
**Validates: Requirements 2.2**

### Property 5: 空フィールドの表示
*For any* セクションにおいて、値が空のフィールドも表示される（非表示にならない）
**Validates: Requirements 4.1, 4.3**

## Error Handling

1. **API保存エラー**: エラーメッセージをSnackbarで表示し、フィールドを元の値に戻す
2. **ネットワークエラー**: 同上
3. **バリデーションエラー**: フィールドレベルでエラー表示

## Testing Strategy

### Unit Tests
- 各セクションのフィールドがInlineEditableFieldとしてレンダリングされることを確認
- 空フィールドが表示されることを確認
- 「その他編集」ボタンが存在しないことを確認

### Property Tests
- Property 1-5の検証
- 既存のInlineEditableFieldのテストを活用

### Integration Tests
- フィールド編集→API保存→UI更新の一連のフローをテスト
