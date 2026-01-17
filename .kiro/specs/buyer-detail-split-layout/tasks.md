# Implementation Plan: Buyer Detail Split Layout

## Overview

買主詳細ページを2カラムレイアウトに変更し、左側に物件情報、右側に買主情報を表示する。

## Tasks

- [ ] 1. PropertyInfoPanelコンポーネントの作成
  - [ ] 1.1 コンポーネントファイルの作成
    - `frontend/src/components/PropertyInfoPanel.tsx`を作成
    - Props interfaceを定義
    - _Requirements: 1.1_

  - [ ] 1.2 物件なしの場合の表示
    - 「紐づく物件がありません」メッセージを表示
    - _Requirements: 1.5_

  - [ ] 1.3 物件セレクターの実装
    - 複数物件がある場合、ドロップダウンを表示
    - 物件数の表示
    - _Requirements: 2.1, 2.4_

  - [ ] 1.4 PropertyInfoCardの統合
    - 選択された物件のPropertyInfoCardを表示
    - _Requirements: 2.3_

  - [ ]* 1.5 PropertyInfoPanelのユニットテストを作成
    - 物件なしの場合のテスト
    - 単一物件の場合のテスト
    - 複数物件の場合のテスト
    - 物件選択のテスト
    - _Requirements: 1.5, 2.1, 2.3, 2.4_

- [ ] 2. PropertyInfoCardコンポーネントの更新
  - [ ] 2.1 Props の追加
    - `showNavigateButton` propを追加
    - `buyerContext` propを追加
    - `onClose` propをオプショナルに変更
    - _Requirements: 4.1, 4.3_

  - [ ] 2.2 物件詳細ページへのリンクボタン
    - `showNavigateButton`がtrueの場合、リンクボタンを表示
    - クリック時に物件詳細ページに遷移
    - _Requirements: 4.1, 4.2_

  - [ ] 2.3 視覚的インジケーターの追加
    - 物件がクリック可能であることを示すスタイル
    - _Requirements: 4.4_

  - [ ]* 2.4 PropertyInfoCardのユニットテストを作成
    - リンクボタン表示のテスト
    - 遷移処理のテスト
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. BuyerDetailPageのレイアウト変更
  - [ ] 3.1 Gridレイアウトの実装
    - Material-UIのGridコンポーネントを使用
    - 左側40%、右側60%の配分
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.2 物件選択状態の管理
    - selectedPropertyId stateを追加
    - 最初の物件を自動選択
    - _Requirements: 1.4_

  - [ ] 3.3 PropertyInfoPanelの配置
    - 左側Gridアイテムに配置
    - sticky positioningを適用
    - _Requirements: 1.1, 3.2_

  - [ ] 3.4 買主情報セクションの配置
    - 右側Gridアイテムに配置
    - 既存のセクションを維持
    - _Requirements: 1.1_

  - [ ]* 3.5 BuyerDetailPageのユニットテストを作成
    - 2カラムレイアウトのレンダリングテスト
    - 物件選択状態の管理テスト
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 4. 独立スクロールの実装
  - [ ] 4.1 買主情報パネルのスクロール設定
    - 独立したスクロール領域を設定
    - _Requirements: 3.1_

  - [ ] 4.2 物件情報パネルの固定
    - sticky positioningで上部に固定
    - _Requirements: 3.2_

  - [ ] 4.3 スタイリングの統一
    - 両パネルの一貫したスタイル
    - 適切なスペーシング
    - _Requirements: 3.3_

  - [ ]* 4.4 スクロール動作のテストを作成
    - 独立スクロールの確認
    - sticky positioningの確認
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. レスポンシブデザインの実装
  - [ ] 5.1 ブレークポイントの設定
    - xs={12}: モバイル（全幅）
    - md={5}: タブレット以上（左側40%）
    - md={7}: タブレット以上（右側60%）
    - _Requirements: 3.4_

  - [ ] 5.2 モバイル表示の最適化
    - 縦積みレイアウト
    - 物件情報を上部に配置
    - _Requirements: 3.4_

  - [ ]* 5.3 レスポンシブデザインのテストを作成
    - 各ブレークポイントでのレンダリング確認
    - モバイル表示の確認
    - _Requirements: 3.4_

- [ ] 6. 物件切り替え機能の実装
  - [ ] 6.1 物件選択ハンドラーの実装
    - onPropertySelect関数を実装
    - selectedPropertyId stateを更新
    - _Requirements: 2.2_

  - [ ] 6.2 PropertyInfoCardの更新
    - 選択された物件に基づいて表示を更新
    - _Requirements: 2.2_

  - [ ]* 6.3 物件切り替えのユニットテストを作成
    - 物件選択時の状態更新テスト
    - 表示更新のテスト
    - _Requirements: 2.2_

- [ ] 7. Checkpoint - 機能テストとレビュー
  - すべてのテストが通ることを確認
  - 手動テストを実施
  - ユーザーに質問があれば確認

- [ ] 8. 統合テストとE2Eテスト
  - [ ]* 8.1 レイアウトの統合テストを作成
    - 2カラムレイアウトの表示確認
    - 物件情報と買主情報の配置確認

  - [ ]* 8.2 物件切り替えの統合テストを作成
    - 物件選択フローの確認
    - 表示更新の確認

  - [ ]* 8.3 遷移の統合テストを作成
    - 物件詳細ページへの遷移確認
    - 買主コンテキストの受け渡し確認

- [ ] 9. Final checkpoint - 全機能の動作確認
  - すべてのテストがパスすることを確認
  - 実際のユーザーフローで動作確認
  - ユーザーに最終確認

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

## Property-Based Tests

以下のproperty-based testsを実装する（各テストは最低100回の反復）:

- [ ]* Property Test 1: Layout displays two columns
  - **Property 1: Layout displays two columns**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ]* Property Test 2: First property is selected by default
  - **Property 2: First property is selected by default**
  - **Validates: Requirements 1.4**

- [ ]* Property Test 3: Property selector updates display
  - **Property 3: Property selector updates display**
  - **Validates: Requirements 2.2**

- [ ]* Property Test 4: Independent scrolling
  - **Property 4: Independent scrolling**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* Property Test 5: Navigation preserves context
  - **Property 5: Navigation preserves context**
  - **Validates: Requirements 4.3**
