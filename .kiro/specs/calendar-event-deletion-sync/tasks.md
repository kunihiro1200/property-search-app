# Implementation Plan

- [x] 1. データベーススキーマの作成





  - [x] 1.1 calendar_webhook_channelsテーブルのマイグレーションを作成


    - テーブル定義、インデックス、外部キー制約を含む
    - _Requirements: 2.1, 2.4, 2.5_
  - [x] 1.2 calendar_sync_tokensテーブルのマイグレーションを作成


    - テーブル定義、インデックス、UNIQUE制約を含む
    - _Requirements: 4.1, 4.4_
  - [x] 1.3 マイグレーションを実行して検証


    - _Requirements: 2.1, 4.1_

- [x] 2. CalendarWebhookServiceの実装




  - [ ] 2.1 基本的なサービスクラスとインターフェースを作成
    - WebhookChannel、WebhookHeaders型定義を含む

    - BaseRepositoryを継承
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Webhook登録機能を実装（registerWebhook）
    - Google Calendar API watch エンドポイントを呼び出し
    - チャンネルIDとリソースIDをデータベースに保存
    - 有効期限を記録
    - _Requirements: 2.1, 2.2, 2.4_
  - [ ]* 2.3 Property test: Webhook creation on calendar connection
    - **Property 8: Webhook creation on calendar connection**
    - **Validates: Requirements 2.4**

  - [ ]* 2.4 Property test: Valid callback URL generation
    - **Property 6: Valid callback URL generation**
    - **Validates: Requirements 2.2**
  - [ ] 2.5 Webhook更新機能を実装（renewWebhook）
    - 既存のWebhookを停止
    - 新しいWebhookを登録
    - データベースを更新

    - _Requirements: 2.3_
  - [ ]* 2.6 Property test: Webhook renewal before expiration
    - **Property 7: Webhook renewal before expiration**
    - **Validates: Requirements 2.3**
  - [ ] 2.7 Webhook削除機能を実装（unregisterWebhook）
    - Google Calendar API stop エンドポイントを呼び出し

    - データベースからチャンネル情報を削除
    - _Requirements: 2.5_
  - [ ]* 2.8 Property test: Webhook cancellation on calendar disconnection
    - **Property 9: Webhook cancellation on calendar disconnection**
    - **Validates: Requirements 2.5**
  - [ ] 2.9 Webhook署名検証機能を実装（verifyWebhookSignature）
    - X-Goog-Channel-IDとX-Goog-Channel-Tokenを検証
    - データベースの登録情報と照合
    - _Requirements: 3.1, 3.2_

  - [ ]* 2.10 Property test: Webhook signature verification
    - **Property 10: Webhook signature verification**
    - **Validates: Requirements 3.1**
  - [ ]* 2.11 Property test: Invalid signature rejection
    - **Property 11: Invalid signature rejection**
    - **Validates: Requirements 3.2**
  - [ ] 2.12 Webhook通知処理機能を実装（handleWebhookNotification）
    - 署名を検証
    - リソース状態を確認
    - CalendarSyncServiceを呼び出して変更を同期
    - 冪等性を保証（メッセージ番号で重複チェック）




    - _Requirements: 1.1, 3.3, 3.4_
  - [x]* 2.13 Property test: Webhook notification processing

    - **Property 1: Webhook notification processing**
    - **Validates: Requirements 1.1, 3.3**
  - [ ]* 2.14 Property test: Idempotent notification processing
    - **Property 12: Idempotent notification processing**
    - **Validates: Requirements 3.4**

- [ ] 3. CalendarSyncServiceの実装
  - [ ] 3.1 基本的なサービスクラスとインターフェースを作成
    - SyncResult型定義を含む

    - BaseRepositoryを継承
    - _Requirements: 4.1, 4.2_
  - [ ] 3.2 Sync token管理機能を実装
    - getSyncToken: データベースから取得
    - saveSyncToken: データベースに保存
    - _Requirements: 4.1, 4.4_
  - [ ]* 3.3 Property test: Sync token usage in periodic sync
    - **Property 13: Sync token usage in periodic sync**

    - **Validates: Requirements 4.1**
  - [ ]* 3.4 Property test: Sync token update after sync
    - **Property 15: Sync token update after sync**
    - **Validates: Requirements 4.4**

  - [ ] 3.5 増分同期機能を実装（syncCalendarChanges）
    - Sync tokenを使用してGoogle Calendar APIを呼び出し
    - 変更されたイベントを取得
    - 削除されたイベント（status: 'cancelled'）を識別
    - 新しいsync tokenを保存
    - _Requirements: 4.1, 4.2, 4.4_
  - [x]* 3.6 Property test: Deleted event identification




    - **Property 14: Deleted event identification**
    - **Validates: Requirements 4.2**
  - [ ] 3.7 削除イベント処理機能を実装（processDeletedEvents）
    - 各削除イベントIDに対してCalendarServiceを呼び出し
    - バッチ処理で効率的に削除

    - エラーハンドリング（存在しないイベントIDの場合）
    - _Requirements: 1.2, 1.3, 1.4_
  - [ ] 3.8 リトライロジックを実装
    - 指数バックオフ（1s, 2s, 4s, 8s, 16s）
    - 最大5回のリトライ
    - エラーログ記録
    - _Requirements: 4.5_
  - [ ]* 3.9 Property test: Exponential backoff on sync failure
    - **Property 16: Exponential backoff on sync failure**
    - **Validates: Requirements 4.5**

- [ ] 4. CalendarServiceの拡張
  - [ ] 4.1 calendar_event_idによる予約検索機能を実装（findAppointmentByCalendarEventId）
    - データベースクエリを実装
    - エラーハンドリング




    - _Requirements: 1.2_
  - [ ]* 4.2 Property test: Appointment lookup by calendar event ID
    - **Property 2: Appointment lookup by calendar event ID**
    - **Validates: Requirements 1.2**

  - [ ] 4.3 calendar_event_idによる予約削除機能を実装（deleteAppointmentByCalendarEventId）
    - 予約を検索
    - 予約が見つからない場合はログを記録して正常終了

    - 予約を削除
    - アクティビティログを作成（ソース: "Google Calendar Sync"）
    - 売主レコードは変更しない

    - _Requirements: 1.2, 1.3, 1.4, 1.5, 5.2, 5.3_
  - [ ]* 4.4 Property test: Appointment deletion for deleted calendar events
    - **Property 3: Appointment deletion for deleted calendar events**




    - **Validates: Requirements 1.3, 4.3**
  - [ ]* 4.5 Property test: Activity log creation with source tracking
    - **Property 4: Activity log creation with source tracking**

    - **Validates: Requirements 1.5, 5.1, 5.2**
  - [x]* 4.6 Property test: Seller record preservation



    - **Property 5: Seller record preservation**

    - **Validates: Requirements 5.3**

- [ ] 5. Webhook APIエンドポイントの実装
  - [x] 5.1 POST /api/webhooks/calendar エンドポイントを作成


    - リクエストヘッダーを検証
    - CalendarWebhookService.handleWebhookNotificationを呼び出し




    - エラーハンドリング（401, 404, 410, 400）
    - 非同期処理で迅速に応答
    - _Requirements: 1.1, 3.1, 3.2, 3.3_

  - [x] 5.2 POST /api/auth/google/calendar/webhook/register エンドポイントを作成


    - 認証チェック
    - CalendarWebhookService.registerWebhookを呼び出し
    - _Requirements: 2.1, 2.2_
  - [ ] 5.3 POST /api/auth/google/calendar/webhook/unregister エンドポイントを作成
    - 認証チェック
    - CalendarWebhookService.unregisterWebhookを呼び出し
    - _Requirements: 2.5_
  - [ ] 5.4 GET /api/auth/google/calendar/webhook/status エンドポイントを作成
    - 認証チェック
    - Webhook登録状態を返す
    - _Requirements: 2.1_

- [ ] 6. GoogleAuthServiceの統合
  - [ ] 6.1 カレンダー接続時のWebhook自動登録を実装
    - exchangeCodeForTokens内でWebhook登録を呼び出し
    - エラーハンドリング（Webhook失敗時も接続は成功）
    - _Requirements: 2.4_
  - [ ] 6.2 カレンダー切断時のWebhook自動削除を実装
    - revokeAccess内でWebhook削除を呼び出し
    - エラーハンドリング
    - _Requirements: 2.5_

- [ ] 7. 定期同期ジョブの実装
  - [ ] 7.1 定期同期ジョブのスクリプトを作成
    - 15分ごとに実行
    - 全ての接続済み従業員のカレンダーを同期
    - CalendarSyncService.syncCalendarChangesを呼び出し
    - エラーログ記録
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 7.2 Webhook更新ジョブのスクリプトを作成
    - 1日1回実行
    - 有効期限が24時間以内のWebhookを更新
    - CalendarWebhookService.renewWebhookを呼び出し
    - _Requirements: 2.3_

- [ ] 8. 環境変数とデプロイ設定
  - [ ] 8.1 環境変数を設定
    - WEBHOOK_BASE_URL: 公開URL
    - WEBHOOK_VERIFICATION_TOKEN: 検証トークン
    - _Requirements: 2.2_
  - [ ] 8.2 本番環境でのHTTPS設定を確認
    - Webhook エンドポイントがHTTPSでアクセス可能か確認
    - _Requirements: 2.2_

- [ ] 9. Checkpoint - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、問題があればユーザーに質問する
