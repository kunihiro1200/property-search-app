# 売主リスト管理システム

不動産売買専門の仲介業者向けの売主リスト管理システムです。

## 機能

- 売主・物件情報の登録と管理（1万件以上対応）
- 自動査定額計算エンジン
- Gmail経由の査定メール送信
- 追客活動管理（電話、メール、SMS）
- 訪問査定予約とGoogleカレンダー連携
- 社員認証と活動ログ管理

## 技術スタック

### バックエンド
- Node.js 20
- Express 4
- TypeScript
- PostgreSQL 15
- Redis 7
- Google OAuth 2.0
- Gmail API / Calendar API

### フロントエンド
- React 18
- TypeScript
- Material-UI
- Vite

## セットアップ

### 前提条件

- Node.js 20以上
- Supabaseアカウント（無料プランで開始可能）
- Google Cloud Platform アカウント（OAuth、Gmail、Calendar API用）

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下を取得：
   - Project URL
   - Anon (public) key
   - Service role key

### 2. Supabaseでデータベースをセットアップ

Supabaseダッシュボードの「SQL Editor」で以下を実行：

```bash
# backend/migrations/001_initial_schema.sql の内容をコピー＆実行
```

または、Supabase CLIを使用：

```bash
npm install -g supabase
supabase login
supabase init
supabase db push
```

### 3. Supabase Authの設定

1. Supabaseダッシュボードで「Authentication」→「Providers」
2. Googleプロバイダーを有効化
3. Google Cloud ConsoleでOAuth認証情報を作成
4. Redirect URLに以下を追加：
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:5173/auth/callback`（開発用）

### 4. バックエンドのセットアップ

```bash
cd backend
npm install
cp .env.example .env
# .envファイルを編集してSupabase情報を設定
npm run dev
```

### 5. フロントエンドのセットアップ

```bash
cd frontend
npm install
cp .env.example .env
# .envファイルを編集してSupabase情報を設定
npm run dev
```

## 開発

### バックエンド開発サーバー起動

```bash
cd backend
npm run dev
```

サーバーは http://localhost:3000 で起動します。

### フロントエンド開発サーバー起動

```bash
cd frontend
npm run dev
```

フロントエンドは http://localhost:5173 で起動します。

### データ同期

#### 売主リストの同期

スプレッドシートから売主データを同期します：

```bash
cd backend
npx ts-node sync-all-sellers-from-sheet.ts
```

#### 既存売主への物件情報の一括作成

物件情報がない既存売主に対して、物件レコードを一括作成します：

```bash
cd backend
npx ts-node create-properties-for-existing-sellers.ts
```

このスクリプトは以下を実行します：
- 物件情報がない売主を検出
- スプレッドシートから物件データを取得
- 各売主に対して物件レコードを作成
- 進捗状況と結果を表示

#### エラーログの確認

物件作成エラーは`sync_logs`テーブルに記録されます：

```sql
SELECT * FROM sync_logs 
WHERE entity_type = 'property' 
  AND status = 'failed' 
ORDER BY timestamp DESC;
```

### テスト実行

```bash
# バックエンドテスト
cd backend
npm test

# フロントエンドテスト
cd frontend
npm test
```

### コードフォーマット

```bash
# バックエンド
cd backend
npm run format
npm run lint

# フロントエンド
cd frontend
npm run format
npm run lint
```

## プロジェクト構造

```
.
├── backend/                 # バックエンドアプリケーション
│   ├── src/
│   │   ├── config/         # 設定ファイル
│   │   ├── services/       # ビジネスロジック
│   │   ├── routes/         # APIルート
│   │   ├── middleware/     # ミドルウェア
│   │   ├── types/          # TypeScript型定義
│   │   └── index.ts        # エントリーポイント
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # フロントエンドアプリケーション
│   ├── src/
│   │   ├── components/    # Reactコンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── services/      # API通信
│   │   ├── store/         # 状態管理
│   │   └── main.tsx       # エントリーポイント
│   ├── package.json
│   └── tsconfig.json
└── .kiro/                 # 仕様書
    └── specs/
        └── seller-list-management/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

## 環境変数

### バックエンド（backend/.env）

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
ENCRYPTION_KEY=your-32-character-encryption-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5173
```

### フロントエンド（frontend/.env）

```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## GitHub Pagesデプロイ

このプロジェクトは GitHub Pages でホスティングされています。

### 重要な注意事項

**⚠️ `.nojekyll`ファイルを削除しないでください**

`docs/.nojekyll`ファイルは、GitHub PagesでJekyllの処理を無効化するために必要です。
このファイルがないと、Markdownファイル内のJavaScriptコード（`{{ }}`）がJekyllのLiquidテンプレートとして誤認識され、デプロイが失敗します。

### デプロイ確認

デプロイ後は必ず以下を確認してください：

1. **GitHub Actions**: https://github.com/kunihiro1200/property-search-app/actions
   - 最新のワークフローが成功（✓）しているか確認
   - 失敗（×）している場合は、エラーログを確認

2. **本番サイト**: https://kunihiro1200.github.io/property-search-app/
   - サイトが正常に表示されるか確認

### トラブルシューティング

#### 404エラーが発生した場合

1. `docs`フォルダのファイルがコミットされているか確認：
   ```bash
   git status
   git add docs/
   git commit -m "Update docs folder"
   git push
   ```

2. `.nojekyll`ファイルが存在するか確認：
   ```bash
   ls docs/.nojekyll
   # なければ作成
   touch docs/.nojekyll
   git add docs/.nojekyll
   git commit -m "Add .nojekyll"
   git push
   ```

3. GitHub Settings → Pages で設定を確認：
   - Branch: `main`
   - Folder: `/docs`

## ライセンス

MIT
