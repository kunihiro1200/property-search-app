# Requirements Document

## Introduction

買主リストデータベースからデータが完全に消失したため、スプレッドシートから全データを復元する必要があります。このシステムは、買主リストスプレッドシートからデータを読み取り、データベースに安全に復元します。

## Glossary

- **Buyer_System**: 買主データを管理するシステム
- **Spreadsheet_Source**: 買主リストスプレッドシート（真実のデータソース）
- **Database**: Supabaseデータベース（buyersテーブル）
- **Recovery_Process**: データ復旧プロセス
- **Data_Validation**: データの整合性検証

## Requirements

### Requirement 1: データ消失の確認

**User Story:** As a システム管理者, I want to データ消失の範囲を正確に把握する, so that 適切な復旧計画を立てられる

#### Acceptance Criteria

1. WHEN データベースを確認する THEN THE Buyer_System SHALL 現在のレコード数を報告する
2. WHEN スプレッドシートを確認する THEN THE Buyer_System SHALL 利用可能なレコード数を報告する
3. WHEN 消失範囲を分析する THEN THE Buyer_System SHALL 完全消失か部分消失かを判定する

### Requirement 2: スプレッドシートからのデータ読み取り

**User Story:** As a Recovery_Process, I want to スプレッドシートから全買主データを読み取る, so that データベースに復元できる

#### Acceptance Criteria

1. WHEN スプレッドシートに接続する THEN THE Buyer_System SHALL 正しいスプレッドシートID（`GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`）を使用する
2. WHEN データを読み取る THEN THE Buyer_System SHALL 「買主リスト」シートから全行を取得する
3. WHEN カラムをマッピングする THEN THE Buyer_System SHALL スプレッドシートカラム名をデータベースカラム名に正しく変換する
4. WHEN 空行を検出する THEN THE Buyer_System SHALL それらをスキップする
5. WHEN 暗号化データを検出する THEN THE Buyer_System SHALL 暗号化されたまま保持する

### Requirement 3: データの検証

**User Story:** As a Recovery_Process, I want to 復元前にデータを検証する, so that 不正なデータがデータベースに入らない

#### Acceptance Criteria

1. WHEN 買主番号を検証する THEN THE Data_Validation SHALL 必須フィールドであることを確認する
2. WHEN メールアドレスを検証する THEN THE Data_Validation SHALL 形式が正しいことを確認する（存在する場合）
3. WHEN 電話番号を検証する THEN THE Data_Validation SHALL 形式が正しいことを確認する（存在する場合）
4. WHEN 重複を検出する THEN THE Data_Validation SHALL 同じ買主番号が複数存在しないことを確認する
5. IF データが不正である THEN THE Data_Validation SHALL エラーログに記録し、そのレコードをスキップする

### Requirement 4: データベースへの安全な復元

**User Story:** As a Recovery_Process, I want to データを安全にデータベースに復元する, so that データ整合性を保つ

#### Acceptance Criteria

1. WHEN 復元を開始する THEN THE Buyer_System SHALL 既存データをバックアップする（存在する場合）
2. WHEN データを挿入する THEN THE Buyer_System SHALL バッチ処理で効率的に実行する
3. WHEN エラーが発生する THEN THE Buyer_System SHALL トランザクションをロールバックする
4. WHEN 復元が完了する THEN THE Buyer_System SHALL 挿入されたレコード数を報告する
5. WHEN 復元後に検証する THEN THE Buyer_System SHALL データベースとスプレッドシートのレコード数を比較する

### Requirement 5: 復元プロセスの監視とログ

**User Story:** As a システム管理者, I want to 復元プロセスを監視する, so that 問題が発生した場合に対応できる

#### Acceptance Criteria

1. WHEN 復元を開始する THEN THE Buyer_System SHALL 開始時刻と設定をログに記録する
2. WHEN データを処理する THEN THE Buyer_System SHALL 進捗状況を定期的に報告する
3. WHEN エラーが発生する THEN THE Buyer_System SHALL 詳細なエラー情報をログに記録する
4. WHEN 復元が完了する THEN THE Buyer_System SHALL サマリーレポートを生成する
5. WHEN 復元が失敗する THEN THE Buyer_System SHALL 失敗理由と復旧手順を提示する

### Requirement 6: データ整合性の検証

**User Story:** As a システム管理者, I want to 復元後のデータ整合性を確認する, so that システムが正常に動作することを保証する

#### Acceptance Criteria

1. WHEN 復元が完了する THEN THE Buyer_System SHALL データベースの総レコード数を確認する
2. WHEN サンプルデータを検証する THEN THE Buyer_System SHALL ランダムに選択したレコードをスプレッドシートと比較する
3. WHEN 関連データを確認する THEN THE Buyer_System SHALL 物件との紐付けが正しいことを確認する
4. WHEN 暗号化データを確認する THEN THE Buyer_System SHALL 暗号化されたフィールドが正しく保存されていることを確認する
5. IF 整合性エラーを検出する THEN THE Buyer_System SHALL 詳細なエラーレポートを生成する

### Requirement 7: ロールバック機能

**User Story:** As a システム管理者, I want to 問題が発生した場合にロールバックできる, so that システムを安全な状態に戻せる

#### Acceptance Criteria

1. WHEN 復元前にバックアップを作成する THEN THE Buyer_System SHALL 既存データを一時テーブルに保存する
2. WHEN ロールバックを実行する THEN THE Buyer_System SHALL バックアップから元の状態に復元する
3. WHEN ロールバックが完了する THEN THE Buyer_System SHALL 復元前の状態に戻ったことを確認する
4. IF バックアップが存在しない THEN THE Buyer_System SHALL 警告を表示し、ロールバックをスキップする

### Requirement 8: 再発防止

**User Story:** As a システム管理者, I want to データ消失の再発を防止する, so that 同じ問題が起きない

#### Acceptance Criteria

1. WHEN データ消失の原因を分析する THEN THE Buyer_System SHALL 原因を特定し、ログに記録する
2. WHEN 定期バックアップを設定する THEN THE Buyer_System SHALL 自動バックアップスケジュールを提案する
3. WHEN データ整合性チェックを実装する THEN THE Buyer_System SHALL 定期的な整合性チェック機能を提供する
4. WHEN アラート機能を実装する THEN THE Buyer_System SHALL データ消失を検出した場合に通知する

## Notes

- スプレッドシートが真実のデータソースであり、データベースはキャッシュとして機能する
- 暗号化されたデータ（氏名、住所、電話番号、メールアドレス）は暗号化されたまま保存する
- 復元プロセスは冪等性を持つべき（複数回実行しても同じ結果になる）
- 大量データの処理のため、バッチ処理とプログレス表示が重要
