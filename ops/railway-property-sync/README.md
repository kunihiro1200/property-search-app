# 物件同期：Railway定期実行への切替候補（未デプロイ）

**このフォルダをコミットしてもRailwayのサービスやトリガーは作成されません。**

GitHub Actionsの `schedule` が何度も欠落する場合、既存のメール監視・スクレイピング用サービスとは分離した**新規・専用のRailway Cronサービス**に切り替えるためのソースです。

- Dockerfileはcurl/jqだけを含み、依存する物件情報・認証キーをコンテナ内に持ちません。
- 実行時にRailwayサービス環境変数 `CRON_SECRET` を読み取り、秘密値を標準出力・ファイルへ記録しません。
- `POST /api/internal/property-sync-and-wait` に送信し、HTTP 200かつ `complete:true`、`failed:0`、更新件数が1以上でなければ非ゼロ終了します。
- Railwayが `17,47 * * * *`（UTC、日本時間も毎時17分・47分）に起動して終了するジョブです。実行プロセスが終了しないと次の起動がスキップされるため、スクリプトは必ず終了します。

## 本番導入前の条件

1. **PR #18、#19の認証保護・同期完了APIを本番反映し、隔離テストで確認**する。
2. 新規Railwayサービスにこのディレクトリをルートとして設定し、`railway.json` を適用する。既存mail/scrapeサービスは変更しない。
3. 専用サービスのSecret Variablesへ `CRON_SECRET` を登録する。絶対にGitHub/GASコード・ログ・チャットへ値を貼らない。
4. **同時にGitHubとRailwayを両方有効化しないこと。** Railwayへ切り替える直前にGitHub側の同期スケジュールを無効化し、各種手動・GAS同期トリガーも重複がないか確認する。
5. RailwayのCron実行履歴・ログを確認し、2回以上連続して `Completed sync verified` となること、Supabaseへの実更新が対応することを確認する。
6. 30分ごとの実行間隔・デプロイコストは契約プランで事前確認する。

**現在未実施**：Railwayサービス作成・デプロイ、環境変数登録、GitHub Actions無効化、同期実行、本番変更。すべて本番切替時に別途行う。
