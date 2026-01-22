# Implementation Plan: Buyer Detail Related Buyers Fix

## Overview

買主詳細ページで関連買主（重複案件）が正しく表示されない問題を修正し、APIエラーを解消する。

## Tasks

- [ ] 1. APIエンドポイントの修正
  - [x] 1.1 関連買主取得エンドポイントの修正
    - `GET /api/buyers/:id/related` エンドポイントの実装確認
    - UUID形式のバリデーション追加
    - 404エラーの適切な処理
    - _Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 5.3_

  - [ ] 1.2 問い合わせ履歴取得エンドポイントの修正
    - `GET /api/buyers/:id/inquiry-history` エンドポイントの実装確認
    - 関連買主の履歴も含めて取得
    - 空配列の返却処理
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.3 APIエンドポイントのユニットテストを作成
    - 正常系: 関連買主が正しく取得できることを確認
    - 異常系: 無効なUUIDの場合のエラーハンドリング
    - 異常系: 買主が存在しない場合のエラーハンドリング
    - _Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 5.3_

- [ ] 2. BuyerServiceの修正
  - [ ] 2.1 getRelatedBuyers メソッドの実装
    - 電話番号またはメールアドレスで関連買主を検索
    - 現在の買主を除外
    - _Requirements: 1.3_

  - [ ] 2.2 getUnifiedInquiryHistory メソッドの実装
    - 現在の買主と関連買主の履歴を統合
    - 受付日でソート
    - _Requirements: 2.2_

  - [ ] 2.3 エラーハンドリングの追加
    - 無効なUUIDの検証
    - 買主が存在しない場合の処理
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 2.4 BuyerServiceのユニットテストを作成
    - getRelatedBuyers のテスト
    - getUnifiedInquiryHistory のテスト
    - エラーハンドリングのテスト
    - _Requirements: 1.3, 2.2, 5.1, 5.2, 5.3_

- [ ] 3. フロントエンドのエラーハンドリング改善
  - [ ] 3.1 BuyerDetailPageのエラーハンドリング
    - 関連買主取得失敗時の処理
    - 問い合わせ履歴取得失敗時の処理
    - エラーメッセージの表示
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.2 エラーログの追加
    - 詳細なエラー情報のログ出力
    - _Requirements: 3.4_

  - [ ]* 3.3 エラーハンドリングのユニットテストを作成
    - API失敗時の表示テスト
    - エラーメッセージの表示テスト
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. 関連買主セクションの表示改善
  - [ ] 4.1 RelatedBuyersSectionコンポーネントの更新
    - 関連買主の情報表示（買主番号、名前、電話、メール）
    - クリック時の遷移処理
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 4.2 関連買主なしの場合の表示
    - 「重複案件はありません」メッセージの表示
    - _Requirements: 4.4_

  - [ ]* 4.3 RelatedBuyersSectionのユニットテストを作成
    - 関連買主表示のテスト
    - クリック遷移のテスト
    - 関連買主なしの場合のテスト
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Checkpoint - 機能テストとレビュー
  - すべてのテストが通ることを確認
  - 手動テストを実施（買主6647と6648で確認）
  - ユーザーに質問があれば確認

- [ ] 6. 統合テストとE2Eテスト
  - [ ]* 6.1 関連買主表示の統合テストを作成
    - 買主6647の詳細ページで買主6648が表示されることを確認
    - 関連買主をクリックして遷移できることを確認

  - [ ]* 6.2 問い合わせ履歴統合の統合テストを作成
    - 買主6647の詳細ページで両方の履歴が表示されることを確認
    - 履歴が正しくソートされていることを確認

- [ ] 7. Final checkpoint - 全機能の動作確認
  - すべてのテストがパスすることを確認
  - 実際のユーザーフローで動作確認
  - ユーザーに最終確認

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- 買主6647と6648をテストケースとして使用
