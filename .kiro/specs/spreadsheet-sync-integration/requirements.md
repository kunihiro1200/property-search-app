# Requirements Document

## Introduction

本システムは、既存のGoogleスプレッドシート（約1万行の売主データ）とSupabaseデータベース間のデータ移行および同期機能を実装します。主な機能は以下の通りです:
1. スプレッドシートからSupabaseへの初回データ移行
2. ブラウザアプリケーションでの編集内容をスプレッドシートに自動反映（一方向同期）
3. 査定依頼メールからの自動売主登録（既存システムとの統合）

## Glossary

- **System**: 売主管理システム（Supabase + React フロントエンド）
- **Spreadsheet**: Googleスプレッドシート（既存の本番データ約1万行）
- **Supabase**: バックエンドデータベース（PostgreSQL）
- **Sync Service**: スプレッドシートとSupabase間のデータ同期を管理するサービス
- **Initial Migration**: スプレッドシートからSupabaseへの初回データ移行
- **One-way Sync**: 一方向同期（ブラウザ → スプレッドシート）
- **Email Integration**: 査定依頼メールからの自動登録機能
- **Google Sheets API**: GoogleスプレッドシートにアクセスするためのAPI
- **Webhook**: データ変更時に自動的に通知を受け取る仕組み

## Requirements

### Requirement 1: 初回データ移行

**User Story:** システム管理者として、既存のスプレッドシートデータをSupabaseに移行したい。これにより、現在のデータを失うことなく新システムを使い始めることができる。

#### Acceptance Criteria

1. WHEN 管理者が移行スクリプトを実行する THEN THE System SHALL スプレッドシートから全データを読み取り、Supabaseに挿入する
2. WHEN データ移行中にエラーが発生する THEN THE System SHALL エラー内容をログに記録し、移行を中断する
3. WHEN データ移行が完了する THEN THE System SHALL 移行されたレコード数と成功/失敗の詳細をレポートする
4. WHEN スプレッドシートのカラムとSupabaseのカラムが一致しない THEN THE System SHALL カラムマッピング設定に基づいてデータを変換する
5. WHEN 重複データが検出される THEN THE System SHALL 既存データをスキップまたは更新する（設定可能）

### Requirement 2: Googleスプレッドシート認証

**User Story:** システム管理者として、Google Sheets APIを使用してスプレッドシートにアクセスしたい。これにより、データの読み書きが可能になる。

#### Acceptance Criteria

1. WHEN システムが起動する THEN THE System SHALL Google Cloud Consoleで設定されたサービスアカウント認証情報を読み込む
2. WHEN 認証情報が無効または期限切れである THEN THE System SHALL エラーメッセージを表示し、管理者に通知する
3. WHEN スプレッドシートへのアクセス権限が不足している THEN THE System SHALL 必要な権限をログに記録し、エラーを返す
4. WHEN 認証が成功する THEN THE System SHALL スプレッドシートの読み書きが可能な状態になる

### Requirement 3: Supabaseからスプレッドシートへの同期

**User Story:** ユーザーとして、ブラウザアプリで売主データを編集したとき、その変更がスプレッドシートにも反映されてほしい。これにより、スプレッドシートを見ている他のメンバーも最新情報を確認できる。

#### Acceptance Criteria

1. WHEN ユーザーがブラウザで売主データを作成する THEN THE System SHALL Supabaseに保存し、スプレッドシートに新しい行を追加する
2. WHEN ユーザーがブラウザで売主データを更新する THEN THE System SHALL Supabaseを更新し、スプレッドシートの対応する行を更新する
3. WHEN ユーザーがブラウザで売主データを削除する THEN THE System SHALL Supabaseから削除し、スプレッドシートの対応する行を削除する（または削除フラグを設定する）
4. WHEN 同期中にネットワークエラーが発生する THEN THE System SHALL リトライ処理を実行し、失敗した場合はエラーログを記録する
5. WHEN 同期処理が5秒以上かかる THEN THE System SHALL バックグラウンドで非同期処理を実行し、ユーザーの操作をブロックしない

### Requirement 4: 査定依頼メールからの自動登録

**User Story:** システム管理者として、会社に査定依頼メールが届いたとき、自動的に売主番号を生成してSupabaseに登録したい。これにより、手動入力の手間が省ける。

#### Acceptance Criteria

1. WHEN 査定依頼メールが届く THEN THE System SHALL メール内容を解析し、売主情報を抽出する
2. WHEN 売主情報が抽出される THEN THE System SHALL 自動的に売主番号（AA + 連番）を生成する
3. WHEN 売主番号が生成される THEN THE System SHALL Supabaseに新しい売主レコードを作成する
4. WHEN Supabaseにレコードが作成される THEN THE System SHALL スプレッドシートにも同じデータを追加する
5. WHEN メール解析に失敗する THEN THE System SHALL エラーログを記録し、管理者に通知する

### Requirement 5: 既存メールシステムとの統合

**User Story:** 開発者として、既存の別フォルダーにあるメール処理システムと統合したい。これにより、既存の仕組みを活用できる。

#### Acceptance Criteria

1. WHEN 既存メールシステムが査定依頼を検知する THEN THE System SHALL 統合APIを呼び出して売主情報を渡す
2. WHEN 統合APIが呼び出される THEN THE System SHALL 売主情報を受け取り、Supabaseに保存する
3. WHEN Supabaseに保存される THEN THE System SHALL スプレッドシートにも同期する
4. WHEN 既存システムとの通信に失敗する THEN THE System SHALL リトライ処理を実行し、エラーログを記録する
5. WHEN 既存システムから不正なデータが送信される THEN THE System SHALL バリデーションエラーを返し、処理を中断する

### Requirement 6: 同期ステータス監視

**User Story:** システム管理者として、同期処理の状態を監視したい。これにより、問題が発生した場合に迅速に対応できる。

#### Acceptance Criteria

1. WHEN 同期処理が実行される THEN THE System SHALL 同期開始時刻、終了時刻、処理件数をログに記録する
2. WHEN 同期エラーが発生する THEN THE System SHALL エラーの詳細（エラーメッセージ、スタックトレース、対象レコード）をログに記録する
3. WHEN 管理者が同期ステータスを確認する THEN THE System SHALL 最後の同期時刻、成功/失敗件数、エラーログを表示する
4. WHEN 同期処理が連続して失敗する THEN THE System SHALL 管理者にアラート通知を送信する
5. WHEN 同期処理のパフォーマンスが低下する THEN THE System SHALL 処理時間の統計情報をログに記録する

### Requirement 7: データマッピング設定

**User Story:** システム管理者として、スプレッドシートのカラムとSupabaseのカラムのマッピングを設定したい。これにより、カラム名が異なる場合でも正しくデータを同期できる。

#### Acceptance Criteria

1. WHEN システムが初期化される THEN THE System SHALL 設定ファイルからカラムマッピング情報を読み込む
2. WHEN スプレッドシートのカラム名がSupabaseと異なる THEN THE System SHALL マッピング設定に基づいてカラムを変換する
3. WHEN データ型が異なる THEN THE System SHALL 型変換ルールに基づいてデータを変換する（例: 文字列→数値、日付フォーマット変換）
4. WHEN マッピング設定が見つからないカラムがある THEN THE System SHALL 警告をログに記録し、該当カラムをスキップする
5. WHEN カスタム変換ロジックが必要な THEN THE System SHALL 変換関数を設定ファイルで指定できる

### Requirement 8: バッチ処理とパフォーマンス

**User Story:** システム管理者として、大量のデータを効率的に同期したい。これにより、1万行のデータでもパフォーマンスの問題が発生しない。

#### Acceptance Criteria

1. WHEN 大量のデータを同期する THEN THE System SHALL バッチ処理（例: 100件ずつ）でデータを処理する
2. WHEN バッチ処理中にエラーが発生する THEN THE System SHALL 該当バッチをスキップし、次のバッチを継続処理する
3. WHEN 同期処理が実行される THEN THE System SHALL 処理時間が1万行で5分以内に完了する
4. WHEN 同期処理が実行される THEN THE System SHALL データベース接続をプールして再利用する
5. WHEN 同期処理が実行される THEN THE System SHALL Google Sheets APIのレート制限（100リクエスト/100秒）を遵守する

### Requirement 9: 手動同期トリガー

**User Story:** システム管理者として、必要に応じて手動で同期を実行したい。これにより、緊急時や初回移行後の確認が可能になる。

#### Acceptance Criteria

1. WHEN 管理者が手動同期ボタンをクリックする THEN THE System SHALL 即座にSupabaseからスプレッドシートへの同期処理を開始する
2. WHEN 手動同期が実行される THEN THE System SHALL 同期の進行状況をリアルタイムで表示する
3. WHEN 手動同期が完了する THEN THE System SHALL 結果サマリー（成功件数、失敗件数、エラー詳細）を表示する
4. WHEN 自動同期が実行中である THEN THE System SHALL 手動同期の実行を拒否し、メッセージを表示する
5. WHEN 手動同期が実行される THEN THE System SHALL 全データ同期または差分同期を選択できる

### Requirement 10: ロールバック機能

**User Story:** システム管理者として、同期処理で問題が発生した場合にロールバックしたい。これにより、データの破損を防ぐことができる。

#### Acceptance Criteria

1. WHEN 同期処理が開始される THEN THE System SHALL 変更前のデータのスナップショットを作成する
2. WHEN 管理者がロールバックを実行する THEN THE System SHALL スナップショットからデータを復元する
3. WHEN ロールバックが完了する THEN THE System SHALL 復元されたレコード数をレポートする
4. WHEN スナップショットが存在しない THEN THE System SHALL エラーメッセージを表示し、ロールバックを中断する
5. WHEN ロールバックが実行される THEN THE System SHALL ロールバック操作をログに記録する
