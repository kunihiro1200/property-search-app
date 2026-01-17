# Implementation Plan: Buyer Detail UI Enhancement

## Overview

買主詳細画面において、内覧前伝達事項フィールドの視認性向上と、★最新状況フィールドのドロップダウン化を実装する。

## Tasks

- [x] 1. データベーススキーマの更新
  - `sellers`テーブルに`viewing_notes`カラムを追加
  - マイグレーションファイルを作成
  - _Requirements: 3.1, 3.2_

- [x] 2. ViewingNotesFieldコンポーネントの実装
  - [x] 2.1 コンポーネントファイルを作成
    - `frontend/src/components/ViewingNotesField.tsx`を作成
    - Props interfaceを定義
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 背景色付きフィールドの実装
    - 編集モード: multiline TextFieldに背景色を適用
    - 表示モード: Typographyに背景色を適用
    - 空値の場合も背景色を表示
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.3 ViewingNotesFieldのunit testを作成
    - 背景色の適用を確認
    - 編集モードと表示モードの切り替えを確認
    - 空値の場合の表示を確認
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. LatestStatusDropdownコンポーネントの実装
  - [x] 3.1 コンポーネントファイルを作成
    - `frontend/src/components/LatestStatusDropdown.tsx`を作成
    - Props interfaceを定義
    - 選択肢リストを定数として定義
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Autocompleteドロップダウンの実装
    - Material-UIのAutocompleteを使用
    - freeSoloオプションを有効化（カスタム値対応）
    - 編集モードと表示モードの切り替え
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.3 LatestStatusDropdownのunit testを作成
    - すべての選択肢が表示されることを確認
    - カスタム値の入力と表示を確認
    - 既存値の初期選択を確認
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. BuyerDetailPageの統合
  - [x] 4.1 FIELD_SECTIONSの更新
    - 「問合せ・内覧情報」セクションに`viewing_notes`フィールドを追加
    - `latest_status`フィールドに`component: 'LatestStatusDropdown'`を指定
    - _Requirements: 1.1, 2.1_

  - [x] 4.2 レンダリングロジックの更新
    - フィールドレンダリング時に`component`プロパティをチェック
    - ViewingNotesFieldとLatestStatusDropdownを条件付きでレンダリング
    - _Requirements: 1.1, 2.1_

  - [x] 4.3 Buyer interfaceの更新
    - `frontend/src/types/index.ts`に`viewing_notes`フィールドを追加
    - _Requirements: 3.2_

  - [ ]* 4.4 統合テストの実施
    - フィールドの表示と編集を確認
    - データの保存と読み込みを確認
    - エラーハンドリングを確認
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. バックエンドAPIの確認
  - [x] 5.1 BuyerServiceの確認
    - `viewing_notes`フィールドが正しく処理されることを確認
    - 既存の`latest_status`フィールドの処理を確認
    - _Requirements: 3.1, 3.4_

  - [ ]* 5.2 APIエンドポイントのテスト
    - GET /api/buyers/:buyer_numberで`viewing_notes`が返されることを確認
    - PUT /api/buyers/:buyer_numberで`viewing_notes`が保存されることを確認
    - _Requirements: 3.1, 3.3, 3.4_

- [x] 6. Checkpoint - 機能テストとレビュー
  - すべてのテストが通ることを確認
  - 手動テストを実施
  - ユーザーに質問があれば確認

- [ ] 7. デプロイ準備
  - [ ] 7.1 マイグレーションの実行
    - 開発環境でマイグレーションを実行
    - データの整合性を確認
    - _Requirements: 3.1, 3.2_

  - [ ] 7.2 本番環境へのデプロイ
    - フロントエンドのビルドとデプロイ
    - バックエンドのデプロイ
    - マイグレーションの実行
    - _Requirements: すべて_

  - [ ]* 7.3 デプロイ後の動作確認
    - 本番環境で買主詳細画面を開く
    - 内覧前伝達事項の背景色を確認
    - 最新状況ドロップダウンの動作を確認
    - データの保存と読み込みを確認
    - _Requirements: すべて_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

## Property-Based Tests

以下のproperty-based testsを実装する（各テストは最低100回の反復）:

- [ ]* Property Test 1: 内覧前伝達事項の背景色表示
  - **Property 1: 背景色の一貫性**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* Property Test 2: 最新状況ドロップダウンの選択肢
  - **Property 2: ドロップダウン選択肢の完全性**
  - **Validates: Requirements 2.2, 2.3**

- [ ]* Property Test 3: データ保存の整合性
  - **Property 3: データ保存の正確性**
  - **Validates: Requirements 3.1, 3.4**

- [ ]* Property Test 4: 既存データの互換性
  - **Property 4: 既存データの互換性**
  - **Validates: Requirements 2.5, 2.6, 3.2, 3.3**

## Implementation Order

推奨される実装順序:

1. **Phase 1**: データベース準備（Task 1）
2. **Phase 2**: コンポーネント実装（Tasks 2-3）
3. **Phase 3**: 統合（Task 4）
4. **Phase 4**: バックエンド確認（Task 5）
5. **Phase 5**: テストとデプロイ（Tasks 6-7）

## Rollback Plan

問題が発生した場合:

1. フロントエンドの変更をロールバック
2. `viewing_notes`カラムは削除しない（データ損失を防ぐため）
3. 既存の`latest_status`データは影響を受けない
