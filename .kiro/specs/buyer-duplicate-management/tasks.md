# Implementation Plan: 買主関連表示機能

## Overview

本実装計画は、買主関連表示機能を段階的に実装するためのタスクリストです。関連買主の検出、分類、表示機能を実装し、プロパティベーステストで正確性を検証します。

## Tasks

- [x] 1. Backend: RelatedBuyerService実装
  - RelatedBuyerServiceクラスを作成
  - 関連買主検索ロジックを実装
  - 関係分類ロジックを実装
  - _Requirements: 1.1, 1.2, 2.2, 2.3_

- [ ]* 1.1 Write property test for related buyer detection
  - **Property 1: 関連買主検出の完全性**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 1.2 Write property test for self-exclusion
  - **Property 2: 自己参照の除外**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 1.3 Write property test for relation classification
  - **Property 3: 関係分類の正確性**
  - **Validates: Requirements 2.2, 2.3**

- [x] 2. Backend: 統合問合せ履歴機能実装
  - 統合問合せ履歴取得メソッドを実装
  - 日付順ソート機能を実装
  - _Requirements: 3.1, 3.2, 3.4_

- [ ]* 2.1 Write property test for unified history completeness
  - **Property 4: 統合履歴の完全性**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 2.2 Write property test for history sorting
  - **Property 5: 履歴ソート順の正確性**
  - **Validates: Requirements 3.4**

- [x] 3. Backend: API endpoints実装
  - GET /api/buyers/:id/related エンドポイントを実装
  - GET /api/buyers/:id/unified-inquiry-history エンドポイントを実装
  - エラーハンドリングを実装
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [ ]* 3.1 Write unit tests for API endpoints
  - Test successful responses
  - Test error cases (buyer not found, etc.)
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 4. Database: インデックス追加
  - phone_numberにインデックスを追加
  - emailにインデックスを追加
  - パフォーマンステストを実施
  - _Requirements: 1.1, 1.2_

- [x] 5. Frontend: RelatedBuyersSection実装
  - RelatedBuyersSectionコンポーネントを作成
  - 関連買主リストの表示を実装
  - 関係タイプのラベル表示を実装
  - _Requirements: 1.3, 1.4, 2.2, 2.3_

- [ ]* 5.1 Write unit tests for RelatedBuyersSection
  - Test rendering with related buyers
  - Test rendering without related buyers
  - Test relation type labels
  - _Requirements: 1.3, 1.4, 2.2, 2.3_

- [x] 6. Frontend: UnifiedInquiryHistoryTable実装
  - UnifiedInquiryHistoryTableコンポーネントを作成
  - 統合履歴の表示を実装
  - 買主番号インジケーターを実装
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 6.1 Write unit tests for UnifiedInquiryHistoryTable
  - Test rendering with multiple buyers
  - Test buyer number indicators
  - Test date sorting
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Frontend: RelatedBuyerNotificationBadge実装
  - RelatedBuyerNotificationBadgeコンポーネントを作成
  - 通知バッジの表示ロジックを実装
  - スクロール機能を実装
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 7.1 Write property test for notification badge display
  - **Property 6: 通知バッジの表示条件**
  - **Validates: Requirements 4.1, 4.2**

- [x] 8. Frontend: 買主詳細ページ統合
  - 買主詳細ページに関連買主セクションを追加
  - 買主詳細ページに統合問合せ履歴を追加
  - 買主詳細ページに通知バッジを追加
  - _Requirements: 1.3, 3.1, 4.1_

- [ ]* 8.1 Write integration tests for buyer detail page
  - Test complete flow with related buyers
  - Test UI interactions
  - _Requirements: 1.3, 3.1, 4.1_

- [ ] 9. Backend: キャッシング実装
  - RelatedBuyerServiceにキャッシュ機能を追加
  - キャッシュTTLを設定（5分）
  - キャッシュ無効化ロジックを実装
  - _Requirements: 1.1, 1.2_

- [ ]* 9.1 Write unit tests for caching
  - Test cache hit
  - Test cache miss
  - Test cache expiration
  - _Requirements: 1.1, 1.2_

- [x] 10. Backend: 同期ロジックの検証
  - buyer_numberが主キーとして使用されていることを確認
  - 重複する電話番号・メールアドレスが許可されていることを確認
  - _Requirements: 5.1, 5.2, 5.5_

- [ ]* 10.1 Write property test for sync logic invariance
  - **Property 7: 同期ロジックの不変性**
  - **Validates: Requirements 5.1, 5.2, 5.5**

- [x] 11. Checkpoint - 機能テスト
  - すべてのテストが通ることを確認
  - 手動で機能をテスト
  - ユーザーに質問があれば確認

- [x] 12. Documentation: ユーザーガイド作成
  - 関連買主機能の使い方を文書化
  - 複数問合せと重複の違いを説明
  - 真の重複の対応方法を説明
  - _Requirements: 2.2, 2.3_

- [x] 13. Final checkpoint - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [ ] 14. Bug Fix: フロントエンドのカラム名修正
  - RelatedBuyersSectionで`inquiry_date`を`reception_date`に修正
  - UnifiedInquiryHistoryTableで`reception_date`の使用を確認
  - _Requirements: 1.3, 1.4, 3.1_

## Notes

- タスクに`*`が付いているものはオプションで、より速いMVPのためにスキップ可能です
- 各タスクは特定の要件を参照しており、トレーサビリティを確保しています
- チェックポイントで段階的な検証を行います
- プロパティテストは普遍的な正確性プロパティを検証します
- ユニットテストは特定の例とエッジケースを検証します
