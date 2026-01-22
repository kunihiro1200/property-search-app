# Implementation Plan

## Phase 1: データベーススキーマとバックエンド基盤

- [-] 1. データベースマイグレーション作成



  - [ ] 1.1 propertiesテーブルの作成
    - property_number (PK), seller_number (FK), address, property_type, status等のカラム定義
    - sellersテーブルへの外部キー制約
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 site_registrationsテーブルの作成
    - id, property_number (FK), site_name, registered_at, status, unregistered_at, unregister_reason等
    - _Requirements: 2.1, 2.4_
  - [ ] 1.3 buyersテーブルの作成
    - buyer_id (PK), name (暗号化), phone_number (暗号化), email (暗号化), confidence, assigned_to等
    - _Requirements: 3.1, 3.2_
  - [ ] 1.4 buyer_inquiriesテーブルの作成
    - id, buyer_id (FK), property_number (FK), inquiry_date, inquiry_content, inquiry_source等
    - _Requirements: 3.3_
  - [ ] 1.5 viewingsテーブルの作成
    - id, property_number (FK), buyer_id (FK), viewing_date, assignee, calendar_event_id, status, result等
    - _Requirements: 4.1_
  - [ ] 1.6 worksテーブルの作成
    - work_id (PK), property_number (FK), status等
    - _Requirements: 5.1_
  - [ ] 1.7 work_tasksテーブルの作成
    - task_id (PK), work_id (FK), task_type, title, due_date, completed, assignee等
    - _Requirements: 5.2, 6.1_
  - [ ] 1.8 task_assignee_historyテーブルの作成
    - id, task_id (FK), previous_assignee, new_assignee, changed_at, changed_by等
    - _Requirements: 6.4_
  - [ ] 1.9 インデックスの作成
    - 検索・フィルタリング用のインデックス
    - _Requirements: 1.5, 3.5, 5.5_

- [ ] 2. Checkpoint - マイグレーション確認
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: バックエンドサービス実装

- [ ] 3. 物件管理サービス (PropertyService) の実装
  - [ ] 3.1 PropertyServiceクラスの作成
    - createFromSeller, getProperty, listProperties, updateProperty メソッド
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 3.2 Property 1のプロパティテスト作成
    - **Property 1: 売主から物件へのデータコピー**
    - **Validates: Requirements 1.1**
  - [ ]* 3.3 Property 2のプロパティテスト作成
    - **Property 2: 物件番号と売主番号の一致**
    - **Validates: Requirements 1.2**
  - [ ] 3.4 問合せ記録機能の実装
    - recordInquiry メソッド
    - _Requirements: 1.4_
  - [ ]* 3.5 Property 4のプロパティテスト作成
    - **Property 4: 問合せ記録の完全性**
    - **Validates: Requirements 1.4**
  - [ ] 3.6 物件リストフィルタリングの実装
    - サイト掲載状況、内覧予定、契約進捗でのフィルタ
    - _Requirements: 1.5_
  - [ ]* 3.7 Property 5のプロパティテスト作成
    - **Property 5: 物件リストのフィルタリング**
    - **Validates: Requirements 1.5**

- [ ] 4. サイト登録管理の実装
  - [ ] 4.1 SiteRegistrationServiceクラスの作成
    - registerToSite, unregisterFromSite, getSiteRegistrations メソッド
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 4.2 Property 6, 7, 8, 9のプロパティテスト作成
    - **Property 6: サイト登録の記録**
    - **Property 7: サイト登録状況の一覧表示**
    - **Property 8: サイト登録更新の記録**
    - **Property 9: サイト削除の記録**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [ ] 5. Checkpoint - 物件サービス確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. 買主管理サービス (BuyerService) の実装
  - [ ] 6.1 BuyerServiceクラスの作成
    - createBuyer, getBuyer, listBuyers, updateBuyer メソッド
    - 個人情報の暗号化処理
    - _Requirements: 3.1, 3.2_
  - [ ]* 6.2 Property 10, 11のプロパティテスト作成
    - **Property 10: 買主連絡先の完全性**
    - **Property 11: 買主識別子の一意性**
    - **Validates: Requirements 3.1, 3.2**
  - [ ] 6.3 物件問合せ紐付け機能の実装
    - linkToProperty メソッド
    - _Requirements: 3.3_
  - [ ]* 6.4 Property 12のプロパティテスト作成
    - **Property 12: 買主と複数物件の紐付け**
    - **Validates: Requirements 3.3**
  - [ ] 6.5 買主リストフィルタリングの実装
    - 確度、内覧予定、担当者でのフィルタ
    - _Requirements: 3.5_
  - [ ]* 6.6 Property 13のプロパティテスト作成
    - **Property 13: 買主リストのフィルタリング**
    - **Validates: Requirements 3.5**

- [ ] 7. 内覧管理の実装
  - [ ] 7.1 ViewingServiceクラスの作成
    - createViewing, recordViewingResult, cancelViewing, getViewingHistory メソッド
    - _Requirements: 4.1, 4.3, 4.5_
  - [ ]* 7.2 Property 14, 16, 17のプロパティテスト作成
    - **Property 14: 内覧予約の完全性**
    - **Property 16: 内覧結果の記録**
    - **Property 17: 内覧履歴のフィルタリング**
    - **Validates: Requirements 4.1, 4.3, 4.5**
  - [ ] 7.3 Googleカレンダー連携の実装
    - 内覧予約時のカレンダーイベント作成、キャンセル時の削除
    - _Requirements: 4.2, 4.4_
  - [ ]* 7.4 Property 15のプロパティテスト作成
    - **Property 15: 内覧予約のラウンドトリップ**
    - **Validates: Requirements 4.2, 4.4**

- [ ] 8. Checkpoint - 買主サービス確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. 案件管理サービス (WorkService) の実装
  - [ ] 9.1 WorkServiceクラスの作成
    - createWork, getWork, listWorks メソッド
    - _Requirements: 5.1_
  - [ ]* 9.2 Property 18のプロパティテスト作成
    - **Property 18: 案件作成とキーの一致**
    - **Validates: Requirements 5.1**
  - [ ] 9.3 業務タスク自動生成の実装
    - 案件作成時に5つのタスクを自動生成
    - _Requirements: 5.2_
  - [ ]* 9.4 Property 19のプロパティテスト作成
    - **Property 19: 業務タスクの自動生成**
    - **Validates: Requirements 5.2**
  - [ ] 9.5 タスク更新機能の実装
    - updateTask, reassignTask メソッド
    - _Requirements: 5.3, 6.4_
  - [ ]* 9.6 Property 20, 24のプロパティテスト作成
    - **Property 20: タスク更新の記録**
    - **Property 24: 担当者変更履歴の記録**
    - **Validates: Requirements 5.3, 6.4**
  - [ ] 9.7 案件リストフィルタリングの実装
    - 進捗状況、期限、担当者でのフィルタ
    - _Requirements: 5.5_
  - [ ]* 9.8 Property 21のプロパティテスト作成
    - **Property 21: 案件リストのフィルタリング**
    - **Validates: Requirements 5.5**

- [ ] 10. タスク期限管理の実装
  - [ ] 10.1 期限設定と遅延フラグの実装
    - 期限日の記録、遅延フラグの自動計算
    - _Requirements: 6.1, 6.3_
  - [ ]* 10.2 Property 22, 23のプロパティテスト作成
    - **Property 22: タスク期限の記録**
    - **Property 23: 遅延フラグの設定**
    - **Validates: Requirements 6.1, 6.3**
  - [ ] 10.3 担当者別タスク一覧の実装
    - getTasksByAssignee メソッド
    - _Requirements: 6.5_
  - [ ]* 10.4 Property 25のプロパティテスト作成
    - **Property 25: 担当者別タスク一覧**
    - **Validates: Requirements 6.5**
  - [ ] 10.5 期限通知機能の実装
    - 期限が近づいた場合の通知生成
    - _Requirements: 6.2_

- [ ] 11. Checkpoint - 案件サービス確認
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: 横断機能とダッシュボード

- [ ] 12. 横断検索サービス (CrossSearchService) の実装
  - [ ] 12.1 CrossSearchServiceクラスの作成
    - searchBySellerNumber, getWorkloadByAssignee メソッド
    - _Requirements: 7.5, 10.4_
  - [ ]* 12.2 Property 29, 34のプロパティテスト作成
    - **Property 29: 売主番号による横断検索**
    - **Property 34: 担当者別業務の横断取得**
    - **Validates: Requirements 7.5, 10.4**

- [ ] 13. エンティティ間リレーションの実装
  - [ ] 13.1 各サービスにリレーション取得メソッドを追加
    - 売主→物件、物件→売主/買主/案件、買主→物件、案件→物件/売主/買主
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 13.2 Property 26, 27, 28のプロパティテスト作成
    - **Property 26: 売主から物件へのリンク**
    - **Property 27: 物件から関連エンティティへのリンク**
    - **Property 28: 買主から物件へのリンク**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 14. ダッシュボードサービス (DashboardService) の実装
  - [ ] 14.1 DashboardServiceクラスの作成
    - getStatistics, getPendingCounts メソッド
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.4_
  - [ ]* 14.2 Property 30, 31のプロパティテスト作成
    - **Property 30: ダッシュボード統計の正確性**
    - **Property 31: 未対応件数の正確性**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 9.4**

- [ ] 15. スタッフマスタ連携の実装
  - [ ] 15.1 スタッフマスタ参照機能の実装
    - 担当者選択時のスタッフマスタ参照
    - _Requirements: 10.1, 10.2_
  - [ ]* 15.2 Property 32, 33のプロパティテスト作成
    - **Property 32: スタッフマスタの参照**
    - **Property 33: スタッフ情報の一括更新**
    - **Validates: Requirements 10.1, 10.3**

- [ ] 16. Checkpoint - 横断機能確認
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: APIエンドポイント

- [ ] 17. 物件APIエンドポイントの作成
  - [ ] 17.1 /api/properties ルートの作成
    - GET /api/properties - 物件リスト取得
    - POST /api/properties - 物件作成（売主からコピー）
    - GET /api/properties/:propertyNumber - 物件詳細取得
    - PUT /api/properties/:propertyNumber - 物件更新
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - [ ] 17.2 /api/properties/:propertyNumber/inquiries ルートの作成
    - POST - 問合せ記録
    - GET - 問合せ一覧取得
    - _Requirements: 1.4_
  - [ ] 17.3 /api/properties/:propertyNumber/sites ルートの作成
    - POST - サイト登録
    - GET - サイト登録状況取得
    - DELETE - サイト登録解除
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 18. 買主APIエンドポイントの作成
  - [ ] 18.1 /api/buyers ルートの作成
    - GET /api/buyers - 買主リスト取得
    - POST /api/buyers - 買主作成
    - GET /api/buyers/:buyerId - 買主詳細取得
    - PUT /api/buyers/:buyerId - 買主更新
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  - [ ] 18.2 /api/buyers/:buyerId/inquiries ルートの作成
    - POST - 物件問合せ紐付け
    - GET - 問合せ履歴取得
    - _Requirements: 3.3_
  - [ ] 18.3 /api/viewings ルートの作成
    - POST - 内覧予約作成
    - GET - 内覧一覧取得
    - PUT /api/viewings/:viewingId - 内覧結果記録
    - DELETE /api/viewings/:viewingId - 内覧キャンセル
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 19. 案件APIエンドポイントの作成
  - [ ] 19.1 /api/works ルートの作成
    - GET /api/works - 案件リスト取得
    - POST /api/works - 案件作成
    - GET /api/works/:workId - 案件詳細取得
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  - [ ] 19.2 /api/works/:workId/tasks ルートの作成
    - GET - タスク一覧取得
    - PUT /api/works/:workId/tasks/:taskId - タスク更新
    - _Requirements: 5.3, 6.1, 6.3, 6.4_
  - [ ] 19.3 /api/tasks/assignee/:assigneeId ルートの作成
    - GET - 担当者別タスク一覧取得
    - _Requirements: 6.5_

- [ ] 20. 横断検索・ダッシュボードAPIエンドポイントの作成
  - [ ] 20.1 /api/search ルートの作成
    - GET /api/search?sellerNumber=xxx - 売主番号で横断検索
    - _Requirements: 7.5_
  - [ ] 20.2 /api/dashboard ルートの作成
    - GET /api/dashboard/statistics - ダッシュボード統計取得
    - GET /api/dashboard/pending - 未対応件数取得
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.4_
  - [ ] 20.3 /api/workload/:assigneeId ルートの作成
    - GET - 担当者別業務取得
    - _Requirements: 10.4_

- [ ] 21. Checkpoint - API確認
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: フロントエンド実装

- [ ] 22. 型定義とAPIクライアントの更新
  - [ ] 22.1 フロントエンド型定義の追加
    - Property, Buyer, Work, WorkTask等の型定義
    - _Requirements: 1.3, 3.4, 5.4_
  - [ ] 22.2 APIクライアントの拡張
    - propertyApi, buyerApi, workApi, dashboardApi の追加
    - _Requirements: 全般_

- [ ] 23. サイドバーナビゲーションの更新
  - [ ] 23.1 サイドバーコンポーネントの更新
    - 売主リスト、物件リスト、買主リスト、案件リストへのリンク追加
    - 未対応件数のバッジ表示
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 24. 物件管理ページの作成
  - [ ] 24.1 PropertiesPage コンポーネントの作成
    - 物件リスト表示、フィルタリング機能
    - _Requirements: 1.5_
  - [ ] 24.2 PropertyDetailPage コンポーネントの作成
    - 物件詳細表示、サイト登録状況、問合せ一覧
    - 関連エンティティへのリンク
    - _Requirements: 1.3, 2.2, 7.2_
  - [ ] 24.3 NewPropertyPage コンポーネントの作成
    - 売主からの物件作成フォーム
    - _Requirements: 1.1, 1.2_
  - [ ] 24.4 SiteRegistrationForm コンポーネントの作成
    - サイト登録・解除フォーム
    - _Requirements: 2.1, 2.3, 2.4_

- [ ] 25. 買主管理ページの作成
  - [ ] 25.1 BuyersPage コンポーネントの作成
    - 買主リスト表示、フィルタリング機能
    - _Requirements: 3.5_
  - [ ] 25.2 BuyerDetailPage コンポーネントの作成
    - 買主詳細表示、問合せ履歴、内覧履歴
    - 関連物件へのリンク
    - _Requirements: 3.4, 7.3_
  - [ ] 25.3 NewBuyerPage コンポーネントの作成
    - 買主登録フォーム
    - _Requirements: 3.1_
  - [ ] 25.4 ViewingForm コンポーネントの作成
    - 内覧予約フォーム、結果記録フォーム
    - _Requirements: 4.1, 4.3_

- [ ] 26. 案件管理ページの作成
  - [ ] 26.1 WorksPage コンポーネントの作成
    - 案件リスト表示、フィルタリング機能
    - _Requirements: 5.5_
  - [ ] 26.2 WorkDetailPage コンポーネントの作成
    - 案件詳細表示、タスクチェックリスト
    - 関連エンティティへのリンク
    - _Requirements: 5.4, 7.4_
  - [ ] 26.3 TaskList コンポーネントの作成
    - タスク一覧表示、完了チェック、期限表示、遅延フラグ
    - _Requirements: 5.3, 6.1, 6.3_
  - [ ] 26.4 TaskAssigneeChange コンポーネントの作成
    - 担当者変更フォーム
    - _Requirements: 6.4_

- [ ] 27. ダッシュボードページの作成
  - [ ] 27.1 DashboardPage コンポーネントの作成
    - 統計カード（売主、物件、買主、案件）
    - 期間フィルタ
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 28. 横断検索機能の実装
  - [ ] 28.1 CrossSearchComponent コンポーネントの作成
    - 売主番号での横断検索フォーム
    - 検索結果表示（売主、物件、案件、買主）
    - _Requirements: 7.5_

- [ ] 29. 売主詳細ページの更新
  - [ ] 29.1 SellerDetailPage の更新
    - 関連物件へのリンク追加
    - _Requirements: 7.1_

- [ ] 30. Checkpoint - フロントエンド確認
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: 統合テストと最終確認

- [ ] 31. 統合テストの作成
  - [ ]* 31.1 エンドツーエンドテストの作成
    - 売主登録→物件作成→買主登録→内覧予約→案件作成のフロー
    - _Requirements: 全般_

- [ ] 32. Final Checkpoint - 全テスト確認
  - Ensure all tests pass, ask the user if questions arise.

