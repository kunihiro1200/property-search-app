# Requirements Document

## Introduction

買主詳細ページにおいて、「内覧結果・後続対応」フィールドと「後続担当」フィールドがスプレッドシートとデータベース間で正しく同期されていない問題を解決する。具体的には買主番号6666などで同期の不具合が確認されている。

## Glossary

- **System**: 買主管理システム
- **Buyer_Detail_Page**: 買主詳細ページ
- **Spreadsheet**: Google スプレッドシート（買主データの元データ）
- **Database**: Supabase PostgreSQL データベース
- **Viewing_Result_Follow_Up**: 内覧結果・後続対応フィールド（スプレッドシート列名: `★内覧結果・後続対応`、DB列名: `viewing_result_follow_up`）
- **Follow_Up_Assignee**: 後続担当フィールド（スプレッドシート列名: `後続担当`、DB列名: `follow_up_assignee`）
- **Sync_Service**: BuyerSyncService - スプレッドシートとデータベース間のデータ同期を担当するサービス

## Requirements

### Requirement 1: 同期不具合の原因特定

**User Story:** As a システム管理者, I want to identify the root cause of sync failures for viewing_result_follow_up and follow_up_assignee fields, so that I can fix the underlying issue.

#### Acceptance Criteria

1. WHEN 買主番号6666のデータを調査する THEN THE System SHALL 以下の情報を収集する:
   - データベースの現在値
   - スプレッドシートの現在値
   - 最終同期日時
   - 同期ログ（存在する場合）

2. WHEN カラムマッピング設定を確認する THEN THE System SHALL 以下を検証する:
   - `buyer-column-mapping.json`に両フィールドが正しく定義されているか
   - フィールド名のスペルミスや特殊文字の問題がないか

3. WHEN 同期処理のコードを確認する THEN THE System SHALL 以下を検証する:
   - BuyerSyncServiceが両フィールドを処理しているか
   - フィールドの型変換が正しく行われているか
   - エラーハンドリングが適切か

### Requirement 2: 同期処理の修正

**User Story:** As a システム管理者, I want the sync process to correctly handle viewing_result_follow_up and follow_up_assignee fields, so that data remains consistent between spreadsheet and database.

#### Acceptance Criteria

1. WHEN スプレッドシートから買主データを読み取る THEN THE Sync_Service SHALL 以下を実行する:
   - `★内覧結果・後続対応`列の値を正しく取得する
   - `後続担当`列の値を正しく取得する
   - 空白値とnull値を適切に処理する

2. WHEN データベースに買主データを書き込む THEN THE Sync_Service SHALL 以下を実行する:
   - `viewing_result_follow_up`フィールドに正しい値を設定する
   - `follow_up_assignee`フィールドに正しい値を設定する
   - 既存データを上書きする際に値の損失がないことを確認する

3. WHEN 同期エラーが発生する THEN THE Sync_Service SHALL 以下を実行する:
   - エラーの詳細をログに記録する
   - どのフィールドで問題が発生したかを明示する
   - 同期を継続可能な場合は他のフィールドの同期を続行する

### Requirement 3: データ整合性の回復

**User Story:** As a システム管理者, I want to restore data consistency for affected buyers, so that all buyer records have correct viewing_result_follow_up and follow_up_assignee values.

#### Acceptance Criteria

1. WHEN 影響を受けた買主を特定する THEN THE System SHALL 以下を実行する:
   - データベースとスプレッドシートで値が異なる買主を検出する
   - 買主番号6666を含む全ての不整合レコードをリストアップする

2. WHEN データを修正する THEN THE System SHALL 以下を実行する:
   - スプレッドシートの値を正として、データベースを更新する
   - 更新対象の買主数と成功/失敗件数を報告する
   - バックアップまたはロールバック機能を提供する

3. WHEN 修正完了後に検証する THEN THE System SHALL 以下を実行する:
   - 買主番号6666のデータが正しく同期されていることを確認する
   - サンプルの買主レコードで同期が正常に動作することを確認する

### Requirement 4: 買主詳細ページでの表示確認

**User Story:** As a ユーザー, I want to see correct viewing_result_follow_up and follow_up_assignee values on the buyer detail page, so that I can make informed decisions.

#### Acceptance Criteria

1. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 以下を表示する:
   - 内覧結果・後続対応フィールドの最新値
   - 後続担当フィールドの最新値
   - 値が空の場合は適切なプレースホルダーまたは空白を表示する

2. WHEN フィールドを編集する THEN THE Buyer_Detail_Page SHALL 以下を実行する:
   - 変更をデータベースに保存する
   - 次回の同期時にスプレッドシートにも反映されることを保証する

3. WHEN ページをリロードする THEN THE Buyer_Detail_Page SHALL 以下を実行する:
   - データベースから最新の値を取得する
   - 同期されたデータが正しく表示されることを確認する

### Requirement 5: 同期監視とアラート

**User Story:** As a システム管理者, I want to be notified when sync issues occur for these fields, so that I can respond quickly to data inconsistencies.

#### Acceptance Criteria

1. WHEN 同期処理が実行される THEN THE Sync_Service SHALL 以下を記録する:
   - viewing_result_follow_upフィールドの同期成功/失敗
   - follow_up_assigneeフィールドの同期成功/失敗
   - 処理時刻と対象買主番号

2. WHEN 同期エラーが発生する THEN THE System SHALL 以下を実行する:
   - エラーログに詳細情報を記録する
   - 連続してエラーが発生する場合はアラートを発する

3. WHEN 同期状況を確認する THEN THE System SHALL 以下を提供する:
   - 最近の同期履歴を表示する機能
   - フィールド別の同期成功率を表示する機能
