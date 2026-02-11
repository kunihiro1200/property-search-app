# Implementation Plan: 買主問合せ時ヒアリング自動反映機能

## Overview

問合せ時ヒアリングのテキストフィールドに入力された特定のパターンを自動的にパースし、希望条件フィールドに反映する機能を実装します。バックエンドでパース処理を実行し、最終更新日時による上書きルールを適用します。

## Tasks

- [x] 1. データベーススキーマの拡張
  - buyersテーブルに最終更新日時カラムを追加
  - マイグレーションスクリプトを作成
  - _Requirements: 6.1, 6.4_

- [x] 2. InquiryHearingParserサービスの実装
  - [x] 2.1 InquiryHearingParserクラスの作成
    - parseInquiryHearing()メソッドを実装
    - extractFieldValue()メソッドを実装
    - _Requirements: 1.1, 2.1, 2.2, 2.3_
  
  - [ ]* 2.2 パターンマッチングのプロパティテスト
    - **Property 1: パターンマッチング正確性**
    - **Validates: Requirements 2.1**
  
  - [ ]* 2.3 複数パターン抽出のプロパティテスト
    - **Property 2: 複数パターン抽出**
    - **Validates: Requirements 1.3**
  
  - [x] 2.4 価格帯マッピング機能の実装
    - mapPriceRange()メソッドを実装
    - 価格帯選択肢のマッピングロジックを実装
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 2.5 価格帯マッピングのプロパティテスト
    - **Property 3: 価格帯マッピング正確性**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [x] 2.6 上書きルールの実装
    - shouldOverwrite()メソッドを実装
    - 最終更新日時による判定ロジックを実装
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 2.7 上書きルールのプロパティテスト
    - **Property 4: 上書きルール遵守（希望条件が新しい場合）**
    - **Property 5: 上書きルール遵守（問合せ時ヒアリングが新しい場合）**
    - **Property 6: NULL値の上書き**
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [x] 3. BuyerServiceの拡張
  - [x] 3.1 update()メソッドの拡張
    - 問合せ時ヒアリング更新時にInquiryHearingParserを呼び出し
    - パース結果を希望条件フィールドに反映
    - 最終更新日時を設定
    - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.4_
  
  - [x] 3.2 エラーハンドリングの実装
    - パースエラー時も保存を成功させる
    - エラーログを記録
    - _Requirements: 1.2, 6.3_
  
  - [ ]* 3.3 パースエラー時の保存成功プロパティテスト
    - **Property 7: パースエラー時の保存成功**
    - **Validates: Requirements 1.2, 6.3**
  
  - [x] 3.4 トランザクション処理の実装
    - 複数フィールドの更新をトランザクション内で実行
    - エラー時のロールバック処理
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 3.5 トランザクション整合性のプロパティテスト
    - **Property 8: トランザクション整合性**
    - **Validates: Requirements 6.2**
  
  - [ ]* 3.6 最終更新日時の一貫性プロパティテスト
    - **Property 9: 最終更新日時の一貫性**
    - **Validates: Requirements 6.4**

- [ ] 4. Checkpoint - バックエンドのテスト実行
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. フロントエンドの修正
  - [x] 5.1 BuyerDesiredConditionsPageのクイックボタン名変更
    - 「リフォーム込みの予算（最高額）」→「予算」に変更
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 5.2 クイックボタンの動作確認テスト
    - ボタン名が正しく表示されることを確認
    - ボタンの動作が維持されることを確認
    - _Requirements: 5.2_

- [ ] 6. 統合テストとエンドツーエンドテスト
  - [ ] 6.1 問合せ時ヒアリング保存の統合テスト
    - 問合せ時ヒアリングを保存して希望条件フィールドが更新されることを確認
    - _Requirements: 1.1, 1.3_
  
  - [ ] 6.2 上書きルールの統合テスト
    - 最終更新日時による上書きルールが正しく動作することを確認
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [ ]* 6.3 パターンマッチング失敗時のスキッププロパティテスト
    - **Property 10: パターンマッチング失敗時のスキップ**
    - **Validates: Requirements 2.4**
  
  - [ ] 6.4 エラーハンドリングの統合テスト
    - パースエラー時も保存が成功することを確認
    - データベースエラー時にロールバックされることを確認
    - _Requirements: 1.2, 6.2, 6.3_

- [ ] 7. ログとモニタリングの実装
  - [ ] 7.1 パース処理のログ記録
    - 処理開始、パターンマッチング成功、上書き発生、エラーをログに記録
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 8. パフォーマンステスト
  - [ ] 8.1 問合せ時ヒアリング保存のパフォーマンステスト
    - 2秒以内に処理が完了することを確認
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases

