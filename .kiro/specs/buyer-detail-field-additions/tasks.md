# Implementation Plan: 買主詳細ページフィールド追加・削除

## Overview

買主詳細ページ（BuyerDetailPage.tsx）に新しいフィールドを追加し、不要なフィールドを非表示にする。既存のインライン編集機能とドロップダウンコンポーネントのパターンを活用して実装する。

## Tasks

- [x] 1. ドロップダウンオプションファイルの作成
  - [x] 1.1 buyerFieldOptions.ts を作成し、すべてのドロップダウン選択肢を定義
    - inquiry_email_phone: 済/未/不通/電話番号なし/不要
    - three_calls_confirmed: 3回架電OK/3回架電未/他
    - email_type: 10個の選択肢
    - distribution_type: 要/不要
    - _Requirements: 1.2, 2.2, 3.2, 6.2_

- [x] 2. BuyerDetailPage.tsx の修正
  - [x] 2.1 新しいオプションファイルをインポート
    - buyerFieldOptions.ts からオプションをインポート
    - _Requirements: 1.1, 2.1, 3.1, 6.1_

  - [x] 2.2 基本情報セクションから不要フィールドを削除
    - line_id (LINE) を削除
    - nickname (ニックネーム) を削除
    - current_residence (現住居) を削除
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 2.3 問合せ・内覧情報セクションに新規フィールドを追加
    - inquiry_email_phone: ドロップダウン
    - three_calls_confirmed: ドロップダウン
    - email_type: ドロップダウン
    - distribution_type: ドロップダウン
    - owned_home_hearing: テキスト入力
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1_

  - [x] 2.4 その他セクションに担当への確認事項フィールドを追加
    - confirmation_to_assignee: 複数行テキスト入力
    - _Requirements: 5.1, 5.2_

  - [x] 2.5 新規ドロップダウンフィールドのレンダリング処理を追加
    - inquiry_email_phone, three_calls_confirmed, email_type, distribution_type の各フィールドに対してドロップダウンレンダリングを実装
    - _Requirements: 1.3, 2.3, 3.3, 6.3_

- [x] 3. Checkpoint - 動作確認
  - すべてのフィールドが正しく表示されることを確認
  - ドロップダウンの選択肢が正しいことを確認
  - 削除されたフィールドが表示されないことを確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- バックエンドのカラムマッピングは既に存在するため、バックエンド変更は不要
- 既存のInlineEditableFieldコンポーネントとドロップダウンパターンを活用
- データベースのカラムは削除せず、UIからの表示のみを非表示にする
