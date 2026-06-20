# 要件ドキュメント

## はじめに

現在、売主管理システムの定期同期（スプレッドシート → データベース）はVercel Cronsで実行されている。
これをGitHub Actionsに切り替える。GitHub Actionsが5分ごとにバックエンドの同期エンドポイント（`POST /api/sync/manual`）を呼び出すシンプルな仕組みとする。

切り替えの目的：
- Vercel Cronsの制約（無料プランでは10分間隔が最短）からの解放
- GitHub Actionsによる実行ログの可視化
- 同期失敗時の通知・再実行の柔軟な制御

## 用語集

- **GitHub_Actions**: GitHubが提供するCI/CDプラットフォーム。スケジュール実行（cron）が可能
- **Sync_Endpoint**: バックエンドの同期APIエンドポイント（`POST /api/sync/manual`）
- **SYNC_SECRET**: GitHub ActionsがSync_Endpointを呼び出す際に使用する認証トークン
- **Workflow_File**: GitHub Actionsの定義ファイル（`.github/workflows/*.yml`）
- **Backend_Server**: 売主管理システム用バックエンド（`backend/src/`、ポート3000）

---

## 要件

### 要件1：GitHub Actionsによる定期実行

**ユーザーストーリー：** 開発者として、GitHub Actionsが5分ごとに自動的に同期を実行してほしい。そうすることで、Vercel Cronsに依存せず安定した定期同期が実現できる。

#### 受け入れ基準

1. THE GitHub_Actions SHALL 5分ごと（`*/5 * * * *`）にSync_Endpointを呼び出すWorkflow_Fileを持つ
2. WHEN GitHub_ActionsがSync_Endpointを呼び出すとき、THE GitHub_Actions SHALL `Authorization: Bearer {SYNC_SECRET}` ヘッダーを付与してPOSTリクエストを送信する
3. WHEN Sync_Endpointが200レスポンスを返すとき、THE GitHub_Actions SHALL ワークフローを成功として終了する
4. IF Sync_Endpointが200以外のレスポンスを返すとき、THEN THE GitHub_Actions SHALL ワークフローを失敗として終了し、ログにエラー内容を出力する

---

### 要件2：Sync_Endpointの認証

**ユーザーストーリー：** 開発者として、Sync_Endpointが認証されたリクエストのみを受け付けてほしい。そうすることで、不正なリクエストによる意図しない同期実行を防止できる。

#### 受け入れ基準

1. WHEN Sync_Endpointがリクエストを受信するとき、THE Backend_Server SHALL `Authorization` ヘッダーの値を検証する
2. IF `Authorization` ヘッダーが `Bearer {SYNC_SECRET}` と一致しないとき、THEN THE Backend_Server SHALL HTTPステータス401を返す
3. THE Backend_Server SHALL SYNC_SECRETを環境変数（`SYNC_SECRET`）から読み込む
4. WHERE SYNC_SECRETが未設定の場合、THE Backend_Server SHALL 起動時にエラーログを出力する

---

### 要件3：GitHub Secretsによるトークン管理

**ユーザーストーリー：** 開発者として、SYNC_SECRETをGitHub Secretsで安全に管理したい。そうすることで、認証トークンがコードやログに露出しない。

#### 受け入れ基準

1. THE Workflow_File SHALL SYNC_SECRETを`${{ secrets.SYNC_SECRET }}`として参照し、ハードコードしない
2. THE Workflow_File SHALL バックエンドのURLを`${{ secrets.BACKEND_URL }}`として参照し、ハードコードしない
3. WHEN GitHub ActionsのログにSYNC_SECRETが含まれるとき、THE GitHub_Actions SHALL 自動的にマスクして表示する

---

### 要件4：Vercel Cronsの無効化

**ユーザーストーリー：** 開発者として、GitHub Actionsへの切り替え後にVercel Cronsを無効化したい。そうすることで、二重実行による競合を防止できる。

#### 受け入れ基準

1. WHEN GitHub Actionsへの切り替えが完了するとき、THE System SHALL `vercel.json`の`crons`設定を削除または無効化する
2. THE System SHALL Vercel Cronsと GitHub Actionsが同時に同期を実行しない状態を保つ
