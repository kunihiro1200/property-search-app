# Implementation Plan: 買主詳細画面 問合時ヒアリング囲い枠表示

## Overview

買主詳細画面の「問合時ヒアリング」フィールドに初期状態から囲い枠を表示する。既存の`InlineEditableField`コンポーネントの`alwaysShowBorder`プロパティを活用して実装する。

## Tasks

- [x] 1. BuyerDetailPageのフィールド定義を更新
  - [x] 1.1 FIELD_SECTIONSの「問合時ヒアリング」フィールドに`alwaysShowBorder`プロパティを追加
    - `alwaysShowBorder: true`を追加
    - `borderPlaceholder: '問合せ時のヒアリング内容を入力'`を追加
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 InlineEditableFieldコンポーネントへのプロパティ渡しを実装
    - フィールド定義から`alwaysShowBorder`と`borderPlaceholder`を取得してコンポーネントに渡す
    - _Requirements: 1.1, 1.3, 1.4, 2.1_

- [x] 2. 動作確認
  - [x] 2.1 買主詳細画面で「問合時ヒアリング」フィールドの表示を確認
    - 初期状態で囲い枠が表示されることを確認 ✓
    - プレースホルダーが表示されることを確認 ✓
    - ホバー時の視覚的フィードバックを確認 ✓
    - _Requirements: 1.1, 1.2, 1.3, 2.1_
    - **完了**: ユーザーがスクリーンショットで動作確認済み

## Notes

- 既存の`InlineEditableField`コンポーネントには`alwaysShowBorder`プロパティが実装済み
- 最小限の変更で要件を満たすことができる
- テストは手動確認で実施
