# 実装計画：GitHub Actionsによる定期同期

## 概要

Vercel CronsをGitHub Actionsに切り替える。
変更対象は`.github/workflows/sync.yml`の新規作成と`vercel.json`の`crons`セクション削除のみ。
バックエンドのコードは変更しない。

## タスク

- [x] 1. GitHub Secretsの設定（手動作業）
  - GitHubリポジトリの Settings > Secrets and variables > Actions を開く
  - `CRON_SECRET` を追加：Vercelの環境変数`CRON_SECRET`の値をコピーして設定
  - `BACKEND_URL` を追加：`https://baikyaku-property-site3.vercel.app` を設定
  - _要件: 3.1, 3.2_

- [x] 2. `.github/workflows/sync.yml` を作成する
  - [x] 2.1 ワークフローファイルを作成する
    - `.github/workflows/` ディレクトリを作成し、`sync.yml` を新規作成する
    - `schedule: cron: '*/5 * * * *'` で5分ごとの定期実行を設定する
    - `workflow_dispatch` を追加して手動実行も可能にする
    - `curl` で `POST ${{ secrets.BACKEND_URL }}/api/sync/manual` を呼び出す
    - `Authorization: Bearer ${{ secrets.CRON_SECRET }}` ヘッダーを付与する
    - HTTPステータスが200以外の場合は `exit 1` でワークフローを失敗させる
    - _要件: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3_

- [x] 3. `vercel.json` の `crons` セクションを削除する
  - [x] 3.1 `vercel.json` から `crons` セクションのみを削除する
    - `builds` セクションは絶対に変更しない
    - `routes` セクションは絶対に変更しない
    - `crons` セクションのみを削除してVercel Cronsを無効化する
    - _要件: 4.1, 4.2_

- [x] 4. チェックポイント - 動作確認
  - GitHubのActionsタブから `workflow_dispatch` で手動実行する
  - ログに `✅ Sync completed successfully` が表示されることを確認する
  - ログに `CRON_SECRET` の値が表示されない（マスクされている）ことを確認する
  - Vercelダッシュボードで `crons` が無効化されていることを確認する
  - 問題があればユーザーに確認する

## 注意事項

- タスク `*` マークなし = 必ず実装する
- `vercel.json` の `builds`・`routes` は絶対に変更しない（公開物件サイトが壊れる）
- バックエンドのコード（`backend/src/`）は変更しない
