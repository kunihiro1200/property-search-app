# Implementation Plan: 買主詳細画面右側カラムのインライン編集拡張

## Overview

買主詳細画面の右側カラムにある「希望条件」「その他」「買付情報」セクションにインライン編集機能を追加し、従来の編集モードを廃止する。

## Tasks

- [x] 1. FIELD_SECTIONSの全フィールドにinlineEditable属性を追加
  - 希望条件セクションの全フィールドに`inlineEditable: true`を追加
  - その他セクションの全フィールドに`inlineEditable: true`を追加
  - 買付情報セクションの全フィールドに`inlineEditable: true`を追加
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. 全セクションでInlineEditableFieldを使用するようにレンダリングロジックを変更
  - 現在の条件分岐（基本情報と問合せ・内覧情報のみインライン編集）を削除
  - 全セクションで`inlineEditable`フラグがtrueのフィールドにInlineEditableFieldを使用
  - multilineフィールドは`fieldType="textarea"`を指定
  - _Requirements: 1.1, 2.1, 2.2, 3.1_

- [x] 3. 空フィールドの非表示ロジックを削除
  - 「基本情報」「問合せ・内覧情報」以外のセクションで空フィールドを非表示にするロジックを削除
  - 全セクションで空フィールドも表示されるようにする
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. 従来の編集モード関連コードを削除
  - `isEditing`状態変数を削除
  - `handleEdit`、`handleCancel`、`handleSave`関数を削除
  - `editedBuyer`状態変数を削除（インライン編集では不要）
  - `handleFieldChange`関数を削除
  - _Requirements: 5.2_

- [x] 5. 「その他編集」ボタンを削除
  - ヘッダー部分の編集ボタン群を削除
  - 関連するUI要素（キャンセル、保存ボタン）を削除
  - 不要なimport（EditIcon, SaveIcon, CancelIcon, TextField, Select, MenuItem, FormControl, Autocomplete）を削除
  - _Requirements: 5.1_

- [x] 6. Checkpoint - 動作確認
  - 全セクションでインライン編集が動作することを確認
  - 空フィールドが表示されることを確認
  - 保存が正常に動作することを確認
  - エラー時のロールバックが動作することを確認

## Notes

- 既存の`InlineEditableField`コンポーネントと`handleInlineFieldSave`関数をそのまま活用
- `saving`状態変数は削除可能（インライン編集では各フィールドが独自にローディング状態を管理）
- テストは既存のInlineEditableFieldのテストでカバーされている
