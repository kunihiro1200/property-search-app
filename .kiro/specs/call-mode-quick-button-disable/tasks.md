# Implementation Plan: Call Mode Quick Button Disable

## Overview

通話モードページのクイックボタン無効化機能を実装します。買主詳細ページの実装を参考にしながら、保存ボタンとの連携機能を追加します。

## Tasks

- [x] 1. ユーティリティとフックの実装
  - [x] 1.1 callModeQuickButtonStorage.tsを作成
    - LocalStorage操作の抽象化
    - エラーハンドリングとメモリフォールバック
    - 売主IDとボタンIDの複合キー管理
    - _Requirements: 3.1, 3.3, 6.1, 6.2, 6.3, 6.4_

  - [x] 1.2 useCallModeQuickButtonState.tsフックを作成
    - pending/persisted状態の管理
    - handleQuickButtonClick関数（pending状態に設定）
    - handleSave関数（pending→persistedに変換）
    - isButtonDisabled関数
    - getButtonState関数
    - _Requirements: 1.1, 1.2, 1.4, 4.1, 4.2, 5.1, 5.2, 5.3_

- [x] 2. CallModePageへの統合
  - [x] 2.1 useCallModeQuickButtonStateフックを統合
    - sellerId取得
    - フックの初期化
    - _Requirements: 4.1, 4.4_

  - [x] 2.2 クイックボタンのクリックハンドラーを更新
    - 無効化チェック
    - pending状態への設定
    - アクション実行の制御
    - _Requirements: 1.1, 1.2, 2.4_

  - [x] 2.3 保存ボタンのハンドラーを更新
    - handleSave関数の呼び出し
    - 保存成功時の状態永続化
    - 保存失敗時の状態保持
    - _Requirements: 5.2, 5.4_

  - [x] 2.4 視覚的フィードバックを追加
    - opacity: 0.5の適用
    - cursor: not-allowedの適用
    - ツールチップの表示（Chipコンポーネントで実装）
    - pending状態の視覚的区別（オレンジ色のChip）
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ] 3. エラーハンドリングとエッジケース
  - [ ] 3.1 LocalStorageエラーハンドリング
    - Quota exceeded処理
    - Access denied処理
    - Parse error処理
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ] 3.2 Seller ID未定義の処理
    - 機能の無効化
    - エラーログの記録
    - _Requirements: 4.4_

  - [ ] 3.3 保存失敗時の処理
    - pending状態の保持
    - エラーメッセージの表示
    - _Requirements: 5.4_

- [ ] 4. パフォーマンス最適化
  - [ ] 4.1 LocalStorage書き込みのデバウンス
    - 300msのデバウンス実装
    - _Requirements: 7.1_

  - [ ] 4.2 状態更新のバッチング
    - 複数ボタンの状態を1回の書き込みにまとめる
    - _Requirements: 7.2_

  - [ ] 4.3 非同期状態読み込み
    - ページロード時の非同期読み込み
    - _Requirements: 7.3, 7.4_

- [ ] 5. テストの実装
  - [ ]* 5.1 callModeQuickButtonStorageのユニットテスト
    - 各関数の動作確認
    - エラーハンドリングのテスト
    - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3_

  - [ ]* 5.2 useCallModeQuickButtonStateのユニットテスト
    - 各関数の動作確認
    - 状態遷移のテスト
    - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3_

  - [ ]* 5.3 統合テスト
    - クイックボタンクリック → 保存 → 永続化フロー
    - クイックボタンクリック → 離脱 → pending破棄フロー
    - ページリロード → 状態復元フロー
    - _Requirements: 1.1, 1.2, 3.2, 5.2, 5.3_

  - [ ]* 5.4 Property 1のテスト: Pending状態の永続化
    - **Property 1: Pending状態は保存後にのみ永続化される**
    - **Validates: Requirements 5.2**

  - [ ]* 5.5 Property 2のテスト: Pending状態の破棄
    - **Property 2: 保存なしでの離脱はpending状態を破棄する**
    - **Validates: Requirements 5.3**

  - [ ]* 5.6 Property 3のテスト: 売主ごとの状態独立性
    - **Property 3: 売主ごとの状態独立性**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 5.7 Property 4のテスト: LocalStorage障害時のフォールバック
    - **Property 4: LocalStorage障害時のフォールバック**
    - **Validates: Requirements 6.4**

- [ ] 6. ドキュメントとクリーンアップ
  - [ ] 6.1 コードコメントの追加
    - 各関数の説明
    - 複雑なロジックの説明
    - _Requirements: All_

  - [ ] 6.2 実装完了の確認
    - 全要件の実装確認
    - 動作確認
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 買主詳細ページの実装（`quickButtonStorage.ts`, `useQuickButtonState.ts`）を参考にする
- Pending状態とpersisted状態の管理が主な追加機能
- 保存ボタンとの連携が重要なポイント
