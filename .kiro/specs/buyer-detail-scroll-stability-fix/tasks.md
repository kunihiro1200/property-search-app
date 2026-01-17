# Implementation Plan: Buyer Detail Scroll Stability Fix

## Overview

買主詳細画面の右側列スクロール時の震え問題を修正するための実装計画です。安定した高さ管理、CSS最適化、パフォーマンス改善を段階的に実装します。

## Tasks

- [x] 1. viewportUtilsの改善
  - `calculateContainerHeight`関数を改善してエラーハンドリングを強化
  - `debounceResize`関数を実装（throttleの代わり）
  - `validateHeight`関数を追加して高さの範囲チェックを実装
  - _Requirements: 2.1, 2.2, 2.4, 5.1_

- [ ]* 1.1 viewportUtilsのunit testを作成
  - `calculateContainerHeight`の境界値テスト
  - `debounceResize`のタイミングテスト
  - `validateHeight`の範囲チェックテスト
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2. useStableContainerHeightフックの作成
  - 新しいカスタムフック`useStableContainerHeight`を実装
  - 初期マウント時の高さ計算ロジック
  - デバウンスされたリサイズハンドラー
  - エラーハンドリングとフォールバック処理
  - 開発モードでのデバッグログ
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 5.1, 5.3, 6.2_

- [ ]* 2.1 useStableContainerHeightのunit testを作成
  - 初期高さ計算のテスト
  - デバウンス動作のテスト
  - エラーハンドリングのテスト
  - フォールバック値のテスト
  - _Requirements: 2.1, 2.2, 5.1_

- [x] 3. ScrollableColumnコンポーネントの最適化
  - CSS `contain`プロパティを追加
  - `will-change`プロパティを適切に設定
  - `transform: translateZ(0)`でハードウェアアクセラレーションを有効化
  - `overscroll-behavior: contain`を追加
  - Passive event listenerを実装
  - スクロールイベントのthrottle処理を追加
  - _Requirements: 3.1, 3.2, 3.5, 4.2, 4.3_

- [ ]* 3.1 ScrollableColumnのunit testを作成
  - スクロールイベントハンドリングのテスト
  - CSS最適化の適用テスト
  - Passive listenerの設定テスト
  - _Requirements: 3.1, 4.2_

- [x] 4. BuyerDetailPageの更新
  - `useStableContainerHeight`フックを統合
  - 既存の`calculateContainerHeight`呼び出しを置き換え
  - 既存の`throttleResize`を削除
  - スクロール位置管理ロジックを簡素化
  - エラーバウンダリーを追加
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 5.5_

- [ ] 5. Property-based testsの実装
  - [ ] 5.1 Property 1: Height Stability During Scrollのテスト実装
    - **Property 1: Height Stability During Scroll**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [ ] 5.2 Property 2: Minimum Height Guaranteeのテスト実装
    - **Property 2: Minimum Height Guarantee**
    - **Validates: Requirements 2.4, 5.2**
  
  - [ ] 5.3 Property 3: Debounce Effectivenessのテスト実装
    - **Property 3: Debounce Effectiveness**
    - **Validates: Requirements 2.2**
  
  - [ ] 5.4 Property 4: Scroll Position Preservationのテスト実装
    - **Property 4: Scroll Position Preservation**
    - **Validates: Requirements 3.3**
  
  - [ ] 5.5 Property 5: Error Recoveryのテスト実装
    - **Property 5: Error Recovery**
    - **Validates: Requirements 5.1, 5.3, 5.5**
  
  - [ ] 5.6 Property 6: Performance Targetのテスト実装
    - **Property 6: Performance Target**
    - **Validates: Requirements 4.1**

- [ ] 6. Integration testsの実装
  - スクロール安定性テスト（右側列）
  - スクロール安定性テスト（左側列）
  - リサイズ動作テスト
  - 連続リサイズでのデバウンステスト
  - エラーリカバリーテスト
  - _Requirements: 1.1, 1.2, 2.2, 5.1, 5.5_

- [ ] 7. パフォーマンステストとチューニング
  - Chrome DevToolsでスクロールパフォーマンスを測定
  - 60fps維持の確認
  - Lighthouseでパフォーマンススコアを測定
  - メモリリークチェック
  - イベントリスナーのクリーンアップ確認
  - _Requirements: 4.1, 4.4, 4.5_

- [ ] 8. 開発モードデバッグ機能の追加
  - レイアウトシフト検出の警告ログ
  - 高さ計算結果のログ出力
  - スクロールパフォーマンスメトリクスのログ
  - 開発モード専用の視覚的インジケーター
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Checkpoint - すべてのテストが通ることを確認
  - すべてのunit testsが成功することを確認
  - すべてのproperty-based testsが成功することを確認
  - すべてのintegration testsが成功することを確認
  - パフォーマンステストの結果を確認
  - ユーザーに質問があれば確認

- [ ] 10. ドキュメントの更新
  - コンポーネントのJSDocコメントを更新
  - 使用例をREADMEに追加
  - トラブルシューティングガイドを作成
  - パフォーマンスベストプラクティスを文書化
  - _Requirements: 6.1, 6.2, 6.3_

## Notes

- タスク1〜4は順番に実装する必要があります（依存関係あり）
- Property-based tests（タスク5）は並行して実装可能
- `*`マークのタスクはオプション（テスト関連）ですが、品質保証のため実装を推奨
- パフォーマンステスト（タスク7）は実装完了後に実施
- 各タスク完了後、該当する要件が満たされているか確認してください

