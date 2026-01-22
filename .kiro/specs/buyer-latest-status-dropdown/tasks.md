# Implementation Plan: Buyer Latest Status Dropdown

## Overview

買主詳細ページの「★最新状況」フィールドをプルダウン選択式に変更する実装タスク。既存のInlineEditableFieldコンポーネントを活用し、最小限の変更で実装する。

## Tasks

- [x] 1. 最新状況オプション定義ファイルの作成
  - [x] 1.1 `frontend/src/utils/buyerLatestStatusOptions.ts` を作成
    - 16個の選択肢を指定順序で定義
    - LatestStatusOption インターフェースを定義
    - LATEST_STATUS_OPTIONS 配列をエクスポート
    - _Requirements: 1.1, 1.2_

  - [ ]* 1.2 オプション定義のユニットテストを作成
    - オプション数が16個であることを確認
    - 順序が正しいことを確認
    - 各オプションのvalue/labelが正しいことを確認
    - _Requirements: 1.1_

- [x] 2. BuyerDetailPageの更新
  - [x] 2.1 buyerLatestStatusOptionsをインポート
    - LATEST_STATUS_OPTIONS をインポート
    - _Requirements: 2.1_

  - [x] 2.2 BUYER_FIELD_SECTIONSのlatest_statusフィールド定義を更新
    - fieldType: 'dropdown' を追加
    - _Requirements: 2.1_

  - [x] 2.3 latest_statusフィールドのレンダリング処理を追加
    - inquiry_sourceと同様のパターンでドロップダウンを実装
    - LATEST_STATUS_OPTIONS を options として渡す
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. チェックポイント - 動作確認
  - ブラウザで買主詳細ページを開き、★最新状況フィールドがドロップダウンとして表示されることを確認
  - 選択肢が16個すべて表示されることを確認
  - 選択→保存が正常に動作することを確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 4. Property-Based Tests
  - [ ]* 4.1 Property 1: Options Definition Completeness
    - **Property 1: Options Definition Completeness**
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 4.2 Property 3: Existing Value Display
    - **Property 3: Existing Value Display**
    - **Validates: Requirements 2.4, 4.1, 4.2**

  - [ ]* 4.3 Property 4: Backward Compatibility
    - **Property 4: Backward Compatibility**
    - **Validates: Requirements 2.5, 4.3, 4.4**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
