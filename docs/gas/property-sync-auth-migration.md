# 物件定期同期：認証移行と本番切替の確認手順（未実施）

> 本文は **PR #18 のレビュー用**です。GitHub にあるサンプルを更新しても、Google Apps Script の実際のプロジェクトやトリガー設定は変わりません。
> **GAS の実稼働コードとトリガーを確認するまで PR #18 を main に統合しないこと。**

## 1. これまでにコードから確認できた事項

- `backend/api/index.ts` の `POST /api/sync/trigger` は、PR #18 より前はエンドポイント自体に認証ミドルウェアがありません。POST 後、物件同期を開始します。
- 同じファイルには既存の `requireStaffOrMachine` 認証があり、`CRON_SECRET` によるサーバー間認証または社員認証を利用できます。PR #18 はそれを同期トリガーに適用します。
- `.github/workflows/scheduled-property-sync.yml` は `Authorization: Bearer ${{ secrets.CRON_SECRET }}` を付与して API を呼ぶ作りです。
- `docs/gas/property-listing-trigger-batch.gs` の旧サンプルには認証ヘッダーがなく、1回のボタン操作で最大50回同期をリクエストする実装でした。
- `PropertyListingSyncService.runScheduledSync()` は、1回の実行で Google Sheets の全行を読み込み、物件情報をまとめて upsert します。旧サンプルの50回ループには重複実行のリスクがあります。
- `POST /api/sync/trigger` は HTTP 200 を先に返し、その後で Promise により同期を開始しています。Vercel 上でレスポンス後の処理完了はこのコードだけでは保証されません。

## 2. 実際の稼働GAS（要確認）

Google Drive のスプレッドシート一覧や関連ドキュメントからは、紐づく Apps Script の最新コード・トリガーの実稼働状態を確認できませんでした。サンプルと本番コードは同一とみなさないこと。

Apps Script エディターで次を **読取のみ** で確認します。

1. 物件・売主リスト・買主リスト・業務依頼の各スプレッドシートで、`拡張機能 > Apps Script` を開く。
2. 各プロジェクトのコード全体から `/api/sync/trigger`、`/api/cron/sync-property-listings`、`triggerFullSync`、`UrlFetchApp.fetch`、`BACKEND_URL` を検索する。
3. 左側の時計マーク（トリガー）で、時刻起動の関数名、頻度、最終実行の記録を確認する。
4. 該当する呼び出し元について、`Authorization` ヘッダーが設定されているか、`CRON_SECRET` を Script Properties から取得しているかを確認する。
5. 本番と無関係なバックアップ・テスト用コードは区別する。確認中は既存のトリガーを削除・無効化しない。

**秘密値はGitHub、チャット、スクリーンショット、実行ログ、GASコードに貼り付けないこと。**

## 3. 各GAS呼び出し元の移行案

実際に `/api/sync/trigger` を呼んでいるGASについて、原則次の方法で対応します。

- GAS の `プロジェクトの設定 > スクリプト プロパティ` に `CRON_SECRET` を登録する。値は稼働環境と整合するよう管理するが、コード・ログには残さない。
- `PropertiesService.getScriptProperties().getProperty('CRON_SECRET')` で取得する。
- 値が未設定なら通信せずにエラーとする（fail closed）。
- `UrlFetchApp.fetch` の `headers` に `Authorization: Bearer <secret>` を追加する。
- `docs/gas/property-listing-trigger-batch.gs` のように、同じ全件同期リクエストを50回連続で送らない。
- `HTTP 200` は受付成功であり、同期成功とは判定しない。

**切替前に、稼働中GASのすべての呼び出し元と認証の対応状況を一覧化してください。**

## 4. 本番リリースの判定条件

- [ ] 稼働中の全ての `/api/sync/trigger` 呼び出し元を特定した。
- [ ] GAS 呼び出し元の認証ヘッダー対応と Script Properties 登録を確認した。
- [ ] 認証のないPOSTが401になることを、**本番で同期を起動しない方法（モック・プレビュー等）**で検証した。
- [ ] 正しい認証のPOSTが受付されることを、同じく隔離テスト環境で検証した。
- [ ] 定期同期ワークフローが GitHub Actions 側で有効か確認した（cron 設定が正しいだけでは不十分）。
- [ ] `runScheduledSync()` の完了を追跡できるよう、Vercel の `waitUntil` または耐久キュー等を別の変更で検討した。
- [ ] いふう・くじら公開サイトが変更前後に正常表示されることを確認する手順を用意した。

すべて満たした後に PR #18 の本番統合を判断します。問題があればロールバックし、GAS との接続を再点検してください。
