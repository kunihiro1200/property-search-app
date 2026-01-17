# Requirements Document

## Introduction

買主詳細画面において、現在必須項目として設定されているフィールド（メールアドレス、電話番号、氏名）のバリデーションを削除し、すべてのフィールドを任意入力にする機能。ユーザーが空の値でも保存できるようにする。

## Glossary

- **Inline_Editable_Field**: 買主詳細画面でクリックして編集可能なフィールドコンポーネント
- **Validation_Rule**: フィールドの入力値を検証するルール
- **Required_Validation**: 値が空でないことを検証するバリデーション

## Requirements

### Requirement 1: メールアドレスフィールドの必須バリデーション削除

**User Story:** As a ユーザー, I want メールアドレスを空のまま保存できるようにしたい, so that 不完全な買主情報でも登録できる

#### Acceptance Criteria

1. WHEN ユーザーがメールアドレスフィールドを空にして保存する THEN THE System SHALL 値を空のまま保存する
2. WHEN メールアドレスフィールドが空の状態で編集を終了する THEN THE System SHALL エラーメッセージを表示しない
3. WHEN メールアドレスに値が入力されている場合 THEN THE System SHALL メールアドレス形式のバリデーションのみを実行する

### Requirement 2: 電話番号フィールドの必須バリデーション削除

**User Story:** As a ユーザー, I want 電話番号を空のまま保存できるようにしたい, so that 電話番号が不明な買主も登録できる

#### Acceptance Criteria

1. WHEN ユーザーが電話番号フィールドを空にして保存する THEN THE System SHALL 値を空のまま保存する
2. WHEN 電話番号フィールドが空の状態で編集を終了する THEN THE System SHALL エラーメッセージを表示しない
3. WHEN 電話番号に値が入力されている場合 THEN THE System SHALL 電話番号形式のバリデーションのみを実行する

### Requirement 3: 氏名フィールドの必須バリデーション削除

**User Story:** As a ユーザー, I want 氏名を空のまま保存できるようにしたい, so that 氏名が不明な買主も登録できる

#### Acceptance Criteria

1. WHEN ユーザーが氏名フィールドを空にして保存する THEN THE System SHALL 値を空のまま保存する
2. WHEN 氏名フィールドが空の状態で編集を終了する THEN THE System SHALL エラーメッセージを表示しない
3. WHEN 氏名に値が入力されている場合 THEN THE System SHALL 最小文字数のバリデーションを実行しない

### Requirement 4: 形式バリデーションの維持

**User Story:** As a システム管理者, I want 入力された値の形式チェックは維持したい, so that データの品質を保てる

#### Acceptance Criteria

1. WHEN メールアドレスに無効な形式の値が入力された場合 THEN THE System SHALL 形式エラーメッセージを表示する
2. WHEN 電話番号に無効な形式の値が入力された場合 THEN THE System SHALL 形式エラーメッセージを表示する
3. WHEN 値が空の場合 THEN THE System SHALL 形式バリデーションをスキップする
