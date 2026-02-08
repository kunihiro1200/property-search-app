# Implementation Plan: 買主サイドバーステータス表示

## Overview

買主リストのサイドバーに「カテゴリ > ステータス表示」機能を実装します。AppSheetのIFSロジックと同一の優先順位でステータスを算出し、サイドバーに表示します。

実装は以下の順序で進めます：
1. バックエンド: ステータス算出ロジック（純粋関数）
2. バックエンド: BuyerServiceとAPIエンドポイント
3. フロントエンド: サイドバーUI
4. テスト: Unit/Property-Based/Integration Tests

## Tasks

- [x] 1. バックエンド基盤の実装
  - [x] 1.1 AppSheetカラムマッピング定義を作成
    - `backend/src/config/buyer-appsheet-mapping.ts`を作成
    - APPSHEET_TO_DB_MAPPINGオブジェクトを定義
    - _Requirements: 1.5, 7.3_
  
  - [x] 1.2 ステータス定義を作成
    - `backend/src/config/buyer-status-definitions.ts`を作成
    - STATUS_DEFINITIONSオブジェクトを定義（35種類のステータス）
    - 各ステータスに優先順位、説明、色を設定
    - _Requirements: 1.1, 1.4_
  
  - [x] 1.3 日付ヘルパー関数を実装
    - `backend/src/utils/dateHelpers.ts`を作成
    - isToday(), isTomorrow(), getDayOfWeek(), isPast()を実装
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 1.4 フィールドヘルパー関数を実装
    - `backend/src/utils/fieldHelpers.ts`を作成
    - isBlank(), isNotBlank(), contains()を実装
    - _Requirements: 4.3, 4.4, 4.5_

- [x] 2. ステータス算出ロジックの実装
  - [x] 2.1 BuyerStatusCalculatorの基本構造を作成
    - `backend/src/services/BuyerStatusCalculator.ts`を作成
    - BuyerData型、StatusResult型を定義
    - calculateBuyerStatus()関数の骨組みを実装
    - _Requirements: 1.1, 9.1_
  
  - [x] 2.2 条件評価関数を実装（Priority 1-10）
    - evaluateCondition1() - 査定アンケート回答あり
    - evaluateCondition2() - 業者問合せあり
    - evaluateCondition3() - 内覧日前日
    - evaluateCondition4() - 内覧未確定
    - evaluateCondition5() - 一般媒介_内覧後売主連絡未
    - evaluateCondition6() - ⑯当日TEL
    - evaluateCondition7() - 問合メール未対応
    - evaluateCondition8() - 3回架電未
    - evaluateCondition9-15() - 担当者別内覧後未入力（Y/生/U/久/K/I/R）
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 3.3_
  
  - [x] 2.3 条件評価関数を実装（Priority 11-20）
    - evaluateCondition16-22() - 担当者別次電日空欄（Y/久/U/R/K/I/生）
    - _Requirements: 1.4, 3.2_
  
  - [x] 2.4 条件評価関数を実装（Priority 21-27）
    - evaluateCondition23-30() - 担当者別（Y/W/U/生/K/久/I/R）
    - evaluateCondition31() - ピンリッチ未登録
    - evaluateCondition32() - 内覧促進メール（Pinrich）
    - evaluateCondition33() - 要内覧促進客
    - evaluateCondition34() - 買付有り、物件不適合の内覧促進客
    - evaluateCondition35() - メアド確認必要
    - _Requirements: 1.4, 2.5, 3.1_
  
  - [x] 2.5 条件判定ループを実装
    - calculateBuyerStatus()内で全条件を優先順位順に評価
    - 最初に一致した条件のステータスを返す
    - どの条件にも一致しない場合は空文字列を返す
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 2.6 エラーハンドリングを追加
    - try-catchでエラーをキャッチ
    - エラー時はデフォルトステータス（空文字列）を返す
    - エラーをログに記録
    - _Requirements: 8.2, 8.4, 8.5_

- [x] 3. BuyerServiceの拡張
  - [x] 3.1 getBuyersWithStatus()メソッドを実装
    - `backend/src/services/BuyerService.ts`を修正
    - 全買主を取得し、各買主のステータスを算出
    - calculated_statusフィールドを追加
    - _Requirements: 6.1_
  
  - [x] 3.2 getStatusCategories()メソッドを実装
    - ステータスごとの買主数をカウント
    - StatusCategory[]を返す
    - _Requirements: 5.2_
  
  - [x] 3.3 getBuyersByStatus()メソッドを実装
    - 特定のステータスに該当する買主を返す
    - フィルタリング機能
    - _Requirements: 5.6_
  
  - [x] 3.4 エラーハンドリングを追加
    - データベース接続エラーの処理
    - 必須フィールド欠損の検証
    - エラーログの記録
    - _Requirements: 8.1, 8.3, 8.5_

- [x] 4. APIエンドポイントの実装
  - [x] 4.1 GET /api/buyers エンドポイントを拡張
    - `backend/src/routes/buyers.ts`を修正
    - calculated_statusを含む買主データを返す
    - _Requirements: 6.1_
  
  - [x] 4.2 GET /api/buyers/status-categories エンドポイントを追加
    - ステータスカテゴリー一覧を返す
    - _Requirements: 5.2_
  
  - [x] 4.3 GET /api/buyers?status=XXX エンドポイントを拡張
    - statusクエリパラメータでフィルタリング
    - _Requirements: 5.6_

- [x] 5. Checkpoint - バックエンド動作確認
  - 全てのAPIエンドポイントが正常に動作することを確認
  - ステータス算出ロジックが正しく動作することを確認
  - エラーハンドリングが適切に機能することを確認
  - 質問があればユーザーに確認

- [x] 6. フロントエンド: サイドバーコンポーネントの実装
  - [x] 6.1 BuyerStatusSidebarコンポーネントを作成
    - `frontend/src/components/BuyerStatusSidebar.tsx`を作成
    - ステータスカテゴリーを表示
    - クリックでフィルタリング
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 6.2 既存のサイドバーを置き換え
    - 既存のカテゴリー機能を削除
    - BuyerStatusSidebarを統合
    - _Requirements: 5.1, 5.7_
  
  - [x] 6.3 ステータスフィルタリング機能を実装
    - selectedStatusステートを管理
    - onStatusSelectハンドラーを実装
    - APIからフィルタリングされた買主を取得
    - _Requirements: 5.6_

- [x] 7. フロントエンド: BuyerListコンポーネントの修正
  - [x] 7.1 BuyerListコンポーネントを修正
    - `frontend/src/components/BuyerList.tsx`を修正
    - BuyerStatusSidebarを統合
    - ステータスフィルタリングを実装
    - _Requirements: 5.1, 5.6_
  
  - [x] 7.2 買主データにcalculated_statusを追加
    - BuyerSummary型を拡張
    - calculated_statusを表示
    - _Requirements: 5.3, 5.4_

- [x] 8. Checkpoint - フロントエンド動作確認
  - サイドバーが正しく表示されることを確認
  - ステータスフィルタリングが動作することを確認
  - 既存のカテゴリー機能が削除されていることを確認
  - 質問があればユーザーに確認

- [ ] 9. Unit Testsの実装
  - [ ]* 9.1 日付ヘルパー関数のテスト
    - `backend/src/utils/dateHelpers.test.ts`を作成
    - isToday(), isTomorrow(), getDayOfWeek(), isPast()のテスト
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 9.2 フィールドヘルパー関数のテスト
    - `backend/src/utils/fieldHelpers.test.ts`を作成
    - isBlank(), isNotBlank(), contains()のテスト
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [ ]* 9.3 BuyerStatusCalculatorのテスト（Priority 1-10）
    - `backend/src/services/BuyerStatusCalculator.test.ts`を作成
    - 各条件評価関数のテスト
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 3.3_
  
  - [ ]* 9.4 BuyerStatusCalculatorのテスト（Priority 11-27）
    - 残りの条件評価関数のテスト
    - _Requirements: 1.4, 2.5, 3.1, 3.2_
  
  - [ ]* 9.5 優先順位とフォールバックのテスト
    - 複数条件一致時の優先順位テスト
    - 全条件不一致時のフォールバックテスト
    - _Requirements: 1.2, 1.3_

- [ ] 10. Property-Based Testsの実装
  - [ ]* 10.1 Property 1-5のテスト
    - **Property 1: 条件判定の優先順位保証**
    - **Validates: Requirements 1.2**
    - **Property 2: 全条件の正確な実装**
    - **Validates: Requirements 1.1, 1.4**
    - **Property 3: フォールバック動作**
    - **Validates: Requirements 1.3**
    - **Property 4: カラムマッピングの正確性**
    - **Validates: Requirements 1.5**
    - **Property 5: 内覧日前日判定（木曜日）**
    - **Validates: Requirements 2.1**
  
  - [ ]* 10.2 Property 6-10のテスト
    - **Property 6: 内覧日前日判定（木曜日以外）**
    - **Validates: Requirements 2.2**
    - **Property 7: 内覧後未入力判定**
    - **Validates: Requirements 2.3**
    - **Property 8: 当日TEL判定**
    - **Validates: Requirements 2.4**
    - **Property 9: 内覧促進メール判定**
    - **Validates: Requirements 2.5**
    - **Property 10: 担当者別ステータス**
    - **Validates: Requirements 3.1**
  
  - [ ]* 10.3 Property 11-15のテスト
    - **Property 11: 担当者別次電日空欄**
    - **Validates: Requirements 3.2**
    - **Property 12: 担当者別内覧後未入力**
    - **Validates: Requirements 3.3**
    - **Property 13: 担当者イニシャルの正確な判定**
    - **Validates: Requirements 3.4**
    - **Property 14: AND条件の評価**
    - **Validates: Requirements 4.1**
    - **Property 15: OR条件の評価**
    - **Validates: Requirements 4.2**
  
  - [ ]* 10.4 Property 16-20のテスト
    - **Property 16: ISBLANK条件の評価**
    - **Validates: Requirements 4.3**
    - **Property 17: ISNOTBLANK条件の評価**
    - **Validates: Requirements 4.4**
    - **Property 18: CONTAINS条件の評価**
    - **Validates: Requirements 4.5**
    - **Property 19: ステータスフィルタリング**
    - **Validates: Requirements 5.6**
    - **Property 20: キャッシュの動作**
    - **Validates: Requirements 6.2**
  
  - [ ]* 10.5 Property 21-28のテスト
    - **Property 21: キャッシュの無効化**
    - **Validates: Requirements 6.3**
    - **Property 22: パフォーマンス保証**
    - **Validates: Requirements 6.4**
    - **Property 23: エラーログの記録**
    - **Validates: Requirements 6.5**
    - **Property 24: マッピングエラーのログ記録**
    - **Validates: Requirements 7.5**
    - **Property 25: エラー時のデフォルトステータス**
    - **Validates: Requirements 8.2**
    - **Property 26: 必須フィールド欠損時のエラーログ**
    - **Validates: Requirements 8.3**
    - **Property 27: エラー耐性**
    - **Validates: Requirements 8.4**
    - **Property 28: エラー詳細のログ記録**
    - **Validates: Requirements 8.5**

- [ ] 11. Integration Testsの実装
  - [ ]* 11.1 BuyerServiceのテスト
    - `backend/src/services/BuyerService.integration.test.ts`を作成
    - getBuyersWithStatus()のテスト
    - getStatusCategories()のテスト
    - getBuyersByStatus()のテスト
    - _Requirements: 6.1, 5.2, 5.6_
  
  - [ ]* 11.2 APIエンドポイントのテスト
    - `backend/src/routes/buyers.integration.test.ts`を作成
    - GET /api/buyersのテスト
    - GET /api/buyers/status-categoriesのテスト
    - GET /api/buyers?status=XXXのテスト
    - _Requirements: 6.1, 5.2, 5.6_

- [ ] 12. Performance Testsの実装
  - [ ]* 12.1 ステータス算出のパフォーマンステスト
    - `backend/src/services/BuyerStatusCalculator.performance.test.ts`を作成
    - 1000件の買主データを5秒以内に処理することを検証
    - _Requirements: 6.4_

- [x] 13. Final Checkpoint - 全体動作確認
  - 全てのテストがパスすることを確認
  - フロントエンドとバックエンドが正しく連携することを確認
  - エラーハンドリングが適切に機能することを確認
  - パフォーマンスが要件を満たすことを確認
  - 質問があればユーザーに確認

## Notes

- タスクに`*`が付いているものはオプション（テスト関連）で、スキップ可能です
- 各タスクは前のタスクに依存しているため、順番に実行してください
- Checkpointタスクでは、必ず動作確認を行い、問題があれば修正してください
- Property-Based Testsは各プロパティを100回以上実行してください
- エラーハンドリングは全てのタスクで考慮してください
