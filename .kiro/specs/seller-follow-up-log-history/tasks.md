# Implementation Plan

- [x] 1. バックエンド: FollowUpLogHistoryServiceの実装


  - FollowUpLogHistoryServiceクラスを作成し、スプレッドシートからデータを取得する機能を実装
  - GoogleSheetsClientを使用してスプレッドシートAPIと連携
  - CacheManagerを使用してデータをキャッシュ（5分間のTTL）
  - _Requirements: 1.4, 4.3, 5.1, 5.2, 7.1, 7.2_



- [ ] 1.1 データモデルとカラムマッピングの定義
  - FollowUpLogHistoryEntry型を定義
  - カラムマッピング設定ファイルを作成


  - _Requirements: 1.2, 3.1-3.5_

- [x] 1.2 スプレッドシートからのデータ取得機能

  - fetchFromSpreadsheetメソッドを実装
  - エラーハンドリングを追加（ネットワークエラー、認証エラーなど）
  - _Requirements: 1.4, 4.2, 5.3_

- [x] 1.3 データマッピングとフィルタリング機能

  - mapRowToEntryメソッドを実装（日付パース、ブール値変換を含む）
  - filterBySellerNumberメソッドを実装
  - データを日付順（降順）にソート
  - _Requirements: 1.2, 1.3, 1.5, 3.1-3.5_

- [ ] 1.4 キャッシュ管理機能
  - CacheManagerを使用してデータをキャッシュ
  - キャッシュの鮮度チェック機能を実装
  - forceRefreshパラメータでキャッシュをバイパス
  - _Requirements: 4.3, 7.1, 7.2_

- [ ]* 1.5 FollowUpLogHistoryServiceのプロパティベーステスト
  - **Property 1: Data Filtering Correctness**
  - **Validates: Requirements 1.5**

- [ ]* 1.6 FollowUpLogHistoryServiceのプロパティベーステスト
  - **Property 2: Chronological Ordering**
  - **Validates: Requirements 1.3**

- [ ]* 1.7 FollowUpLogHistoryServiceのプロパティベーステスト
  - **Property 3: Cache Freshness**
  - **Validates: Requirements 7.2**

- [x]* 1.8 FollowUpLogHistoryServiceのプロパティベーステスト


  - **Property 4: Column Mapping Completeness**
  - **Validates: Requirements 1.2, 3.1-3.5**

- [ ]* 1.9 FollowUpLogHistoryServiceのユニットテスト
  - データ取得、マッピング、フィルタリング、エラーハンドリングのテスト
  - _Requirements: 1.2, 1.3, 1.5, 4.2_


- [ ] 2. バックエンド: APIエンドポイントの実装
  - GET /api/sellers/:sellerNumber/follow-up-logs/history エンドポイントを作成
  - FollowUpLogHistoryServiceを呼び出してデータを取得

  - refreshクエリパラメータをサポート
  - 認証・認可ミドルウェアを適用
  - _Requirements: 1.1, 1.4, 1.5, 5.3, 6.2_

- [ ] 2.1 レスポンス形式の実装
  - 成功レスポンス（data, cached, lastUpdated）
  - エラーレスポンス（error, message）
  - _Requirements: 4.2, 6.5_

- [ ] 2.2 エラーハンドリングの実装
  - スプレッドシートアクセスエラーの処理
  - キャッシュエラーの処理
  - ログ記録
  - _Requirements: 4.2, 5.4, 6.5, 7.5_

- [x]* 2.3 APIエンドポイントのプロパティベーステスト


  - **Property 5: Refresh Idempotence**
  - **Validates: Requirements 6.2, 6.4**

- [ ]* 2.4 APIエンドポイントのプロパティベーステスト
  - **Property 6: Error Handling Preservation**

  - **Validates: Requirements 4.2, 6.5, 7.5**

- [ ]* 2.5 APIエンドポイントのユニットテスト
  - 正常系、エラー系、認証・認可のテスト
  - _Requirements: 1.1, 4.2, 5.3_


- [ ] 3. フロントエンド: FollowUpLogHistoryTableコンポーネントの実装
  - Reactコンポーネントを作成
  - APIからデータを取得する機能を実装
  - ローディング状態とエラー状態を管理
  - _Requirements: 1.1, 2.1, 4.1, 6.3_


- [ ] 3.1 テーブルレイアウトの実装
  - 全カラムを表示するテーブルを作成
  - レスポンシブデザインを適用
  - 日付フォーマット（YYYY/MM/DD HH:MM）
  - ブール値フィールドの視覚的インジケーター（チェックマーク、アイコン）

  - _Requirements: 1.2, 3.1-3.5_

- [ ] 3.2 リフレッシュ機能の実装
  - リフレッシュボタンを追加
  - ボタンクリック時にAPIを呼び出し（refresh=trueパラメータ）
  - ローディングインジケーターを表示
  - 成功・エラー通知を表示
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_



- [ ] 3.3 自動同期機能の実装
  - コンポーネントマウント時にデータを取得
  - キャッシュの鮮度をチェック（5分以上古い場合は自動更新）
  - バックグラウンドで同期を実行
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.4 視覚的分離の実装


  - 履歴データセクションのヘッダーラベルを追加（「APPSHEET履歴データ」など）
  - 現在の追客ログフィールドとの視覚的分離（余白、境界線など）
  - 履歴データ専用のスタイルを適用


  - _Requirements: 2.1, 2.2, 2.3_




- [ ]* 3.5 FollowUpLogHistoryTableコンポーネントのユニットテスト
  - レンダリング、ローディング状態、エラー状態、リフレッシュ機能のテスト
  - _Requirements: 1.1, 2.1, 6.1-6.5_

- [ ] 4. フロントエンド: 通話モードページへの統合
  - CallModePageコンポーネントにFollowUpLogHistoryTableを追加
  - 既存の追客ログフィールドの下に配置
  - sellerNumberをpropsとして渡す
  - _Requirements: 1.1, 2.1, 2.4_

- [ ]* 4.1 統合のユニットテスト
  - CallModePageでのコンポーネント配置とprops渡しのテスト
  - _Requirements: 1.1, 2.1_

- [ ] 5. 設定とデプロイメント
  - 環境変数を.envに追加（FOLLOW_UP_LOG_SPREADSHEET_ID, FOLLOW_UP_LOG_SHEET_NAME, FOLLOW_UP_LOG_CACHE_TTL）
  - カラムマッピング設定ファイルを配置
  - _Requirements: 5.1, 5.2_

- [ ] 6. チェックポイント - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、問題があればユーザーに質問する

- [ ] 7. 手動テストとドキュメント作成
  - 実際のスプレッドシートデータを使用して手動テスト
  - エラーケースのテスト（ネットワークエラー、認証エラーなど）
  - パフォーマンステスト（大量データでの動作確認）
  - ユーザーガイドの作成
  - _Requirements: 1.1-1.5, 2.1-2.4, 3.1-3.5, 4.1-4.4, 6.1-6.5, 7.1-7.5_
