# Requirements Document

## Introduction

買主詳細画面の右側カラム（基本情報セクション以外）にインライン編集機能を拡張する。現在、「基本情報」と「問合せ・内覧情報」セクションはインライン編集が有効だが、「希望条件」「その他」「買付情報」セクションは従来の編集モード（「その他編集」ボタン）でのみ編集可能。これらのセクションもクリックして直接編集できるようにする。

## Glossary

- **Inline_Editable_Field**: フィールドをクリックすると編集モードに入り、その場で値を変更・保存できるコンポーネント
- **Buyer_Detail_Page**: 買主詳細画面（/buyers/:buyer_number）
- **Right_Column**: 買主詳細画面の右側カラム（買主情報表示エリア）
- **Field_Section**: フィールドをグループ化したセクション（基本情報、問合せ・内覧情報、希望条件、その他、買付情報）

## Requirements

### Requirement 1: 希望条件セクションのインライン編集

**User Story:** As a 営業担当者, I want to 希望条件セクションのフィールドをクリックして直接編集できる, so that 買主の希望条件を素早く更新できる

#### Acceptance Criteria

1. WHEN ユーザーが希望条件セクションのフィールドをクリック THEN THE Inline_Editable_Field SHALL 編集モードに切り替わる
2. WHEN ユーザーが編集を完了してEnterキーを押すかフォーカスを外す THEN THE System SHALL 変更をAPIに保存する
3. WHEN 保存が成功 THEN THE System SHALL 成功メッセージを表示し、表示を更新する
4. WHEN 保存が失敗 THEN THE System SHALL エラーメッセージを表示し、元の値に戻す

### Requirement 2: その他セクションのインライン編集

**User Story:** As a 営業担当者, I want to その他セクションのフィールドをクリックして直接編集できる, so that 特記事項や家族構成などを素早く更新できる

#### Acceptance Criteria

1. WHEN ユーザーがその他セクションのフィールドをクリック THEN THE Inline_Editable_Field SHALL 編集モードに切り替わる
2. WHEN フィールドがmultiline属性を持つ THEN THE Inline_Editable_Field SHALL テキストエリアとして表示する
3. WHEN ユーザーが編集を完了 THEN THE System SHALL 変更をAPIに保存する

### Requirement 3: 買付情報セクションのインライン編集

**User Story:** As a 営業担当者, I want to 買付情報セクションのフィールドをクリックして直接編集できる, so that 買付状況を素早く更新できる

#### Acceptance Criteria

1. WHEN ユーザーが買付情報セクションのフィールドをクリック THEN THE Inline_Editable_Field SHALL 編集モードに切り替わる
2. WHEN ユーザーが編集を完了 THEN THE System SHALL 変更をAPIに保存する

### Requirement 4: 空フィールドの表示と編集

**User Story:** As a 営業担当者, I want to 空のフィールドも表示されてクリックで編集できる, so that 新しい情報を追加できる

#### Acceptance Criteria

1. WHEN フィールドの値が空 THEN THE System SHALL フィールドを「-」または空欄で表示する
2. WHEN ユーザーが空のフィールドをクリック THEN THE Inline_Editable_Field SHALL 編集モードに切り替わる
3. THE System SHALL 全てのセクションで空フィールドを表示する（現在は基本情報と問合せ・内覧情報以外は非表示）

### Requirement 5: 「その他編集」ボタンの削除

**User Story:** As a 営業担当者, I want to 全フィールドがインライン編集可能になったら「その他編集」ボタンが不要になる, so that UIがシンプルになる

#### Acceptance Criteria

1. WHEN 全セクションがインライン編集対応 THEN THE System SHALL 「その他編集」ボタンを削除する
2. THE System SHALL 従来の編集モード（isEditing状態）を削除する
