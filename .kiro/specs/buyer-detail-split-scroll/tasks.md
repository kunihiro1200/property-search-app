# Implementation Plan: Buyer Detail Split Scroll

## Overview

買主詳細画面の左右の列を独立してスクロールできるようにする機能を実装します。ScrollableColumnコンポーネントを新規作成し、既存のBuyerDetailPageに統合します。

## Tasks

- [x] 1. ScrollableColumnコンポーネントの実装
  - 独立したスクロール領域を提供する再利用可能なコンポーネントを作成
  - スクロールイベントのハンドリング
  - カスタムスクロールバーのスタイリング
  - ARIA属性の設定
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

- [ ]* 1.1 ScrollableColumnコンポーネントのunit tests
  - スクロールイベントが正しく発火するかテスト
  - onScrollコールバックが正しく呼ばれるかテスト
  - ARIA属性が正しく設定されているかテスト
  - **Property 7: Accessibility Compliance**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 2. ビューポート高さ計算ロジックの実装
  - calculateContainerHeight関数の実装
  - ウィンドウリサイズイベントのハンドリング
  - リサイズイベントのthrottle処理
  - _Requirements: 2.3, 2.4_

- [ ]* 2.1 高さ計算ロジックのunit tests
  - calculateContainerHeight関数が正しい値を返すかテスト
  - 異なるビューポートサイズで正しく動作するかテスト
  - **Property 4: Dynamic Height Calculation**
  - **Validates: Requirements 2.3, 2.4**

- [x] 3. BuyerDetailPageのレイアウト改修
  - Gridレイアウトからflexboxレイアウトへの変更
  - ScrollableColumnコンポーネントの統合
  - 左右の列の幅比率の調整（42% / 58%）
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 3.1 独立スクロールのproperty test
  - ランダムなスクロール量で左列をスクロール
  - 右列の位置が変わらないことを確認
  - **Property 1: Independent Scroll Behavior**
  - **Validates: Requirements 1.1, 1.2**

- [x] 4. レスポンシブ対応の実装
  - タブレットブレークポイント（900px）以下での縦積みレイアウト
  - モバイルでの単一スクロールコンテナ
  - メディアクエリの設定
  - _Requirements: 2.1, 2.2_

- [ ]* 4.1 レスポンシブ動作のproperty test
  - ランダムなビューポート幅を生成
  - 適切なレイアウトが適用されることを確認
  - **Property 3: Responsive Layout Adaptation**
  - **Validates: Requirements 2.1, 2.2**

- [x] 5. スクロール位置の保存と復元
  - 各列のスクロール位置をstateで管理
  - ユーザーアクション後のスクロール位置保持
  - エラーハンドリングの実装
  - _Requirements: 1.5_

- [ ]* 5.1 スクロール位置保持のproperty test
  - ランダムなスクロール位置を設定
  - 様々なユーザーアクションを実行
  - スクロール位置が保持されることを確認
  - **Property 2: Scroll Position Preservation**
  - **Validates: Requirements 1.5**

- [x] 6. キーボードナビゲーションの実装
  - フォーカス管理の実装
  - 矢印キー、Page Up/Downのハンドリング
  - フォーカスインジケーターの追加
  - _Requirements: 3.3, 4.2_

- [ ]* 6.1 キーボードナビゲーションのintegration test
  - キーボードで各列にフォーカス
  - 矢印キーでスクロールできることを確認
  - **Property 5: Keyboard Navigation Support**
  - **Validates: Requirements 3.3**

- [x] 7. マウスホイールスクロールの最適化
  - カーソル位置に基づくスクロール対象の判定
  - スムーズスクロールの実装
  - _Requirements: 3.1, 3.4_

- [ ]* 7.1 マウスホイールスクロールのunit test
  - マウスホイールイベントが正しく処理されるかテスト
  - カーソル下の列のみがスクロールすることを確認
  - **Property 6: Mouse Wheel Scroll Targeting**
  - **Validates: Requirements 3.4**

- [x] 8. パフォーマンス最適化
  - リサイズイベントのthrottle実装
  - スクロールイベントのthrottle実装
  - 不要な再レンダリングの防止（React.memo、useMemo）
  - _Requirements: 3.1_

- [ ] 9. Checkpoint - 基本機能の動作確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. アクセシビリティの強化
  - スクリーンリーダー対応の改善
  - コントラスト比の確認
  - フォーカス管理の最終調整
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 10.1 アクセシビリティのintegration test
  - スクリーンリーダーで各領域が正しく読み上げられるかテスト
  - キーボードのみで全機能が使えるかテスト
  - **Property 7: Accessibility Compliance**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 11. エラーハンドリングとフォールバック
  - ビューポート高さ取得エラーのハンドリング
  - スクロール位置復元エラーのハンドリング
  - デフォルト値の設定
  - _Requirements: 1.1, 1.2, 2.3_

- [x] 12. ブラウザ互換性の確認
  - Chrome, Firefox, Safari, Edgeでの動作確認
  - スクロールバースタイルの互換性確認
  - ポリフィルの追加（必要に応じて）
  - _Requirements: 3.1_

- [ ] 13. Final checkpoint - 全機能の統合テスト
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
