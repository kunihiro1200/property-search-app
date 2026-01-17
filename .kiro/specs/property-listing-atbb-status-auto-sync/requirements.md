# 要件定義書: 物件リストATBB状況自動同期修正

## はじめに

本機能は、物件リスト(property_listings)のATBB状況フィールドが自動的に同期されない問題(AA4885)を解決するものです。現在、スプレッドシートでATBB状況を更新しても、データベースに反映されない状態が発生しています。

## 用語集

- **AutoSyncService**: スプレッドシートとデータベース間の自動同期を管理するサービス
- **PropertyListingSyncService**: 物件リストの同期処理を実行するサービス
- **ATBB状況**: 物件の公開状態を示すフィールド(atbb_status)
- **差分検出**: スプレッドシートとデータベースの値を比較し、変更を検出する処理

## 要件

### 要件1: 自動同期サービスの起動確認と修正

**ユーザーストーリー**: システム管理者として、自動同期サービスが正しく起動することを確認したい。そうすることで、スプレッドシートの変更が自動的にデータベースに反映されることを保証できる。

#### 受入基準

1. WHEN アプリケーションが起動する THEN THE AutoSyncService SHALL 正しく初期化される
2. WHEN AutoSyncServiceが初期化される THEN THE System SHALL 環境変数を正しく読み込む
3. WHEN 環境変数が設定されている THEN THE AutoSyncService SHALL 指定された同期間隔で動作する
4. WHEN AutoSyncServiceが起動する THEN THE System SHALL 起動ログを出力する

### 要件2: ATBB状況の差分検出ロジック改善

**ユーザーストーリー**: システム管理者として、ATBB状況フィールドの変更が確実に検出されることを確認したい。そうすることで、スプレッドシートでの更新が見逃されないことを保証できる。

#### 受入基準

1. WHEN スプレッドシートのATBB状況が変更される THEN THE PropertyListingSyncService SHALL その変更を検出する
2. WHEN ATBB状況の差分が検出される THEN THE System SHALL 変更内容をログに記録する
3. WHEN 複数のフィールドが同時に変更される THEN THE System SHALL ATBB状況の変更を含むすべての変更を検出する
4. WHEN 空文字列とnullの違いがある THEN THE System SHALL それらを正しく区別して検出する

### 要件3: ATBB状況の同期実行の確実性向上

**ユーザーストーリー**: システム管理者として、検出されたATBB状況の変更が確実にデータベースに反映されることを確認したい。そうすることで、データの整合性を保証できる。

#### 受入基準

1. WHEN ATBB状況の変更が検出される THEN THE PropertyListingSyncService SHALL データベースを更新する
2. WHEN データベース更新が失敗する THEN THE System SHALL エラーをログに記録し、リトライを試みる
3. WHEN 同期が成功する THEN THE System SHALL 成功ログを出力する
4. WHEN 同期処理中にエラーが発生する THEN THE System SHALL 他のレコードの同期を継続する

### 要件4: 同期状態の診断機能

**ユーザーストーリー**: システム管理者として、AA4885のような特定物件の同期状態を診断できるツールが欲しい。そうすることで、問題の原因を迅速に特定できる。

#### 受入基準

1. WHEN 診断スクリプトが実行される THEN THE System SHALL 指定された物件番号の現在の状態を表示する
2. WHEN 診断が実行される THEN THE System SHALL スプレッドシートとデータベースの値を比較する
3. WHEN 差分が存在する THEN THE System SHALL 差分の詳細を表示する
4. WHEN 同期ログが存在する THEN THE System SHALL 最近の同期履歴を表示する

### 要件5: 手動同期トリガー機能

**ユーザーストーリー**: システム管理者として、特定の物件に対して手動で同期を実行できる機能が欲しい。そうすることで、緊急時に即座に問題を解決できる。

#### 受入基準

1. WHEN 手動同期スクリプトが実行される THEN THE System SHALL 指定された物件番号の同期を実行する
2. WHEN 手動同期が実行される THEN THE System SHALL スプレッドシートから最新データを取得する
3. WHEN 最新データが取得される THEN THE System SHALL データベースを更新する
4. WHEN 手動同期が完了する THEN THE System SHALL 結果をコンソールに出力する
