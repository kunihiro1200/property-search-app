# デザインドキュメント：GitHub Actionsによる定期同期

## 概要

現在、売主管理システムの定期同期（スプレッドシート → データベース）はVercel Cronsで実行されている。
本機能では、これをGitHub Actionsに切り替える。

GitHub Actionsが5分ごとに`POST /api/sync/manual`を呼び出すだけのシンプルな構成とする。
バックエンドのコードは変更しない。

### 切り替えの目的

- Vercel Cronsの制約（無料プランでは10分間隔が最短）からの解放
- GitHub Actionsによる実行ログの可視化
- 同期失敗時の通知・再実行の柔軟な制御

---

## アーキテクチャ

### 現在の構成

```
Vercel Crons (10分ごと)
  → POST /api/cron-property-sync (vercel.json で定義)
  → バックエンド処理
```

### 切り替え後の構成

```
GitHub Actions (5分ごと, cron: */5 * * * *)
  → POST https://{BACKEND_URL}/api/sync/manual
  → Authorization: Bearer {CRON_SECRET}
  → バックエンド処理（変更なし）
```

### コンポーネント図

```
┌─────────────────────────────────────────────────────────┐
│ GitHub Actions                                          │
│                                                         │
│  schedule: */5 * * * *                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ sync.yml                                        │   │
│  │  - curl POST /api/sync/manual                   │   │
│  │  - Authorization: Bearer ${{ secrets.CRON_SECRET }} │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS POST
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Backend Server (Vercel / baikyaku-property-site3)       │
│                                                         │
│  POST /api/sync/manual                                  │
│  (backend/src/routes/sync.ts)                           │
│                                                         │
│  → スプレッドシート → データベース同期                    │
└─────────────────────────────────────────────────────────┘
```

---

## コンポーネントとインターフェース

### 1. GitHub Actions Workflow（新規作成）

**ファイルパス**: `.github/workflows/sync.yml`

**役割**: 5分ごとにSync_Endpointを呼び出す

**使用するGitHub Secrets**:
- `CRON_SECRET`: 認証トークン（Vercelで使用している`CRON_SECRET`の値をコピー）
- `BACKEND_URL`: バックエンドのベースURL（例: `https://baikyaku-property-site3.vercel.app`）

**ワークフロー定義**:
```yaml
name: Periodic Sync

on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:  # 手動実行も可能

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call sync endpoint
        run: |
          response=$(curl -s -o /tmp/response.json -w "%{http_code}" \
            -X POST "${{ secrets.BACKEND_URL }}/api/sync/manual" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json")
          
          echo "HTTP Status: $response"
          echo "Response body:"
          cat /tmp/response.json
          
          if [ "$response" != "200" ]; then
            echo "❌ Sync failed with status $response"
            exit 1
          fi
          
          echo "✅ Sync completed successfully"
```

### 2. 既存のSync_Endpoint（変更なし）

**ファイルパス**: `backend/src/routes/sync.ts`

**エンドポイント**: `POST /api/sync/manual`

**現状**: 認証チェックなし（GitHub Actionsからのリクエストはそのまま受け付ける）

**注意**: 要件では「バックエンド変更なし」のため、認証チェックの追加は行わない。
`CRON_SECRET`ヘッダーはGitHub Actions側で付与するが、バックエンドでの検証は既存の`/api/cron/sync-inquiries`エンドポイントのみ。

### 3. vercel.json（cronsセクションのみ削除）

**ファイルパス**: `vercel.json`（ルートディレクトリ）

**変更内容**: `crons`セクションを削除してVercel Cronsを無効化する

**注意**: このファイルは公開物件サイト（`property-site-frontend`）の設定ファイルであるため、
`builds`・`routes`セクションは絶対に変更しない。`crons`セクションのみ削除する。

**変更前**:
```json
{
  "version": 2,
  "builds": [...],
  "routes": [...],
  "crons": [
    {
      "path": "/api/cron-property-sync",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

**変更後**:
```json
{
  "version": 2,
  "builds": [...],
  "routes": [...]
}
```

---

## データモデル

本機能はGitHub Actionsのワークフローファイルと`vercel.json`の設定変更のみで構成される。
新規のデータモデルは不要。

### GitHub Secrets（設定が必要）

| Secret名 | 値 | 説明 |
|---------|-----|------|
| `CRON_SECRET` | Vercelの`CRON_SECRET`環境変数の値をコピー | 認証トークン |
| `BACKEND_URL` | `https://baikyaku-property-site3.vercel.app` | バックエンドのベースURL |

### ワークフロー実行結果

GitHub Actionsの実行ログに以下が記録される：

| 項目 | 内容 |
|------|------|
| 実行時刻 | UTC基準（日本時間 - 9時間） |
| HTTPステータス | 200（成功）/ それ以外（失敗） |
| レスポンスボディ | `{ success, recordsAdded, recordsUpdated, recordsDeleted }` |

---

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において成立すべき特性や振る舞いのことです。形式的に「システムが何をすべきか」を述べたものであり、人間が読める仕様と機械で検証可能な正確性保証の橋渡しをします。*

本機能はGitHub ActionsのYAMLファイルと`vercel.json`の設定変更のみで構成される。
全ての受け入れ基準はファイルの内容を確認するexampleテストとして検証可能であり、
普遍的な入力範囲に対するプロパティベーステストは適用しない。

### プロパティ1: ワークフローファイルの正確性

*全ての* ワークフロー実行において、`.github/workflows/sync.yml`は以下を満たす：
- cron式が`*/5 * * * *`である
- `Authorization: Bearer ${{ secrets.CRON_SECRET }}`ヘッダーを付与してPOSTリクエストを送信する
- バックエンドURLを`${{ secrets.BACKEND_URL }}`として参照し、ハードコードしない

**検証: 要件1.1, 1.2, 3.1, 3.2**

### プロパティ2: HTTPステータスによる終了コード制御

*全ての* Sync_Endpointのレスポンスにおいて、HTTPステータスが200の場合はexit 0（成功）、200以外の場合はexit 1（失敗）でワークフローを終了する

**検証: 要件1.3, 1.4**

### プロパティ3: Vercel Cronsの無効化

*全ての* デプロイ状態において、`vercel.json`に`crons`セクションが存在しない（Vercel CronsとGitHub Actionsの二重実行が発生しない）

**検証: 要件4.1, 4.2**

---

## エラーハンドリング

### GitHub Actions側のエラー

| エラー種別 | 対応 |
|-----------|------|
| ネットワークエラー（接続失敗） | `curl`がnon-zero exit codeを返す → ワークフロー失敗 |
| HTTPステータス 4xx/5xx | スクリプトが`exit 1`を実行 → ワークフロー失敗 |
| タイムアウト | `curl`のデフォルトタイムアウト（または`--max-time`で設定） |

### 失敗時の通知

GitHub Actionsのワークフロー失敗時は、GitHubのデフォルト通知機能によりリポジトリの設定に応じてメール通知が届く。

### バックエンド側のエラー

`POST /api/sync/manual`は既存の実装通り。エラー時は`{ success: false, error: "..." }`を返す。
GitHub Actionsはステータスコードが200以外の場合にワークフローを失敗として終了する。

---

## テスト戦略

### ユニットテスト

本機能はYAMLファイルと設定変更のみで構成されるため、従来のユニットテストは不適用。

### 手動テスト（実装後に実施）

1. **workflow_dispatchによる手動実行テスト**
   - GitHubのActionsタブから手動でワークフローを実行
   - ログに`✅ Sync completed successfully`が表示されることを確認
   - HTTPステータス200が返ることを確認

2. **失敗ケースのテスト**
   - `BACKEND_URL`を意図的に間違えてワークフローが失敗することを確認
   - ログにエラー内容が出力されることを確認

3. **Secretsマスクのテスト**
   - ワークフローのログに`CRON_SECRET`の値が表示されないことを確認

4. **二重実行防止のテスト**
   - `vercel.json`から`crons`セクションを削除後、Vercelダッシュボードでcronsが無効化されていることを確認

### プロパティベーステスト

本機能はインフラ設定（YAML・JSON）のみで構成されるため、プロパティベーステストは不適用。
上記の手動テストで各プロパティを検証する。

---

## 実装手順

1. GitHub Secretsに`CRON_SECRET`と`BACKEND_URL`を設定
2. `.github/workflows/sync.yml`を作成
3. `vercel.json`の`crons`セクションを削除
4. `workflow_dispatch`で手動実行してテスト
5. 5分後に自動実行されることを確認
