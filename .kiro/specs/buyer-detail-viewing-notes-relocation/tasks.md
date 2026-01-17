# Implementation Plan: Buyer Detail Viewing Notes Relocation

## Overview

買主詳細画面において、内覧前伝達事項（viewing_notes）を物件詳細カード内に移動し、最新状況（latest_status）をドロップダウンとして機能させる実装を行います。

## Tasks

- [x] 1. ViewingNotesFieldコンポーネントの作成
  - 黄色背景 (#FFF9E6) を持つフィールドコンポーネントを作成
  - 編集モードと表示モードの両方に対応
  - 空値時のプレースホルダー表示を実装
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [ ]* 1.1 ViewingNotesFieldのunit testを作成
  - 表示モードでの値表示をテスト
  - 編集モードでの入力受付をテスト
  - 黄色背景の適用をテスト
  - 空値時のプレースホルダー表示をテスト
  - _Requirements: 1.2, 1.4, 1.5_

- [x] 2. LatestStatusDropdownコンポーネントの作成
  - Material-UI Autocompleteを使用
  - 16個の定義済みオプションを設定
  - freeSoloモードを有効化
  - 空値時の "（未設定）" 表示を実装
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 2.1 LatestStatusDropdownのunit testを作成
  - 16個のオプション表示をテスト
  - freeSoloモードでのカスタム入力をテスト
  - 選択時のonChange呼び出しをテスト
  - 空値時の表示をテスト
  - _Requirements: 2.2, 2.4, 2.5_

- [x] 3. PropertyInfoCardコンポーネントの修正
  - viewing_notesセクションを追加
  - カード下部に視覚的に分離して配置
  - ViewingNotesFieldコンポーネントを統合
  - 編集モードと表示モードの切り替えに対応
  - _Requirements: 1.1, 1.3, 3.2, 3.3_

- [ ]* 3.1 PropertyInfoCardのunit testを更新
  - viewing_notesセクションの表示をテスト
  - 編集モードと表示モードの切り替えをテスト
  - viewing_notes変更時のonChange呼び出しをテスト
  - _Requirements: 1.1, 1.3_

- [x] 4. BuyerDetailPageコンポーネントの修正
  - FIELD_SECTIONSからviewing_notesを除外
  - PropertyInfoCardにviewing_notesを渡すよう修正
  - LatestStatusDropdownコンポーネントを統合
  - 2カラムレイアウトを維持
  - _Requirements: 1.3, 2.1, 2.2, 3.1, 3.4_

- [ ]* 4.1 Property test: ViewingNotes表示位置の一貫性
  - **Property 1: ViewingNotes表示位置の一貫性**
  - **Validates: Requirements 1.1, 1.3**

- [ ]* 4.2 Property test: ViewingNotes背景色の適用
  - **Property 2: ViewingNotes背景色の適用**
  - **Validates: Requirements 1.2, 1.4**

- [ ]* 4.3 Property test: ViewingNotes保存の整合性
  - **Property 6: ViewingNotes保存の整合性**
  - **Validates: Requirements 4.1, 4.2**

- [x] 5. Checkpoint - 基本機能の動作確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. データ保存処理の実装
  - viewing_notesの保存処理を実装
  - latest_statusの保存処理を実装
  - 成功メッセージの表示を実装
  - エラーハンドリングを実装
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 6.1 Integration testを作成
  - viewing_notesの編集から保存までのフローをテスト
  - latest_statusのドロップダウン選択から保存までのフローをテスト
  - エラーハンドリングをテスト
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. 複数物件対応の実装
  - 複数物件が紐づく買主での表示を確認
  - 各PropertyInfoCardでviewing_notesが表示されることを確認
  - _Requirements: 3.3, 3.5_

- [ ]* 7.1 Property test: 複数物件での表示
  - **Property 8: 複数物件での表示**
  - **Validates: Requirements 3.3**

- [x] 8. Final checkpoint - 全体動作確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
