# Vercel デプロイメント 動作確認済み設定（2026年1月23日）

## ⚠️ 重要：この設定は動作確認済みです。絶対に変更しないでください！

**動作確認日時**: 2026年1月23日
**コミット**: `cf30e24` - "Fix routes in vercel.json to match actual deployment paths"
**本番URL**: https://property-site-frontend-kappa.vercel.app/public/properties

---

## 1. Vercelプロジェクト設定

### プロジェクト名
- **`property-site-frontend`** ← これだけを使用

### Git連携
- ✅ **`property-site-frontend`のみGitHubに接続**
- ❌ **以下のプロジェクトは全てGit連携を切断済み**:
  - `baikyaku-property-site`
  - `baikyaku-property-site3`
  - `property-search-app-gxsf`
  - `baikyaku-property-site2`
  - `property-search-app-7bbq`
  - `property-search-backend`

### Vercel Dashboard → Settings → General

#### Framework Preset
```
Vite
```

#### Root Directory
```
（空）
```

#### Build Command
```
npm run vercel-build
```
**Override**: ON

#### Output Directory
```
dist
```
**Override**: ON

#### Install Command
```
npm install
```
**Override**: ON

#### Include files outside the root directory
```
Enabled
```

---

## 2. vercel.json（動作確認済み）

**ファイルパス**: `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "backend/api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/api/index.ts"
    },
    {
      "src": "/assets/(.*)",
      "dest": "/frontend/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/index.html"
    }
  ],
  "outputDirectory": "frontend/dist"
}
```

### 重要なポイント

1. **`distDir: "dist"`**
   - `frontend`ディレクトリからの相対パス
   - `frontend/dist`ではない

2. **`routes`のパス**
   - `/frontend/assets/$1` ← `/frontend/dist/assets/$1`ではない
   - `/frontend/index.html` ← `/frontend/dist/index.html`ではない
   - Vercelは`frontend/dist`の内容を`/frontend/`にデプロイするため

3. **`outputDirectory: "frontend/dist"`**
   - プロジェクトルートからの相対パス
   - これがないと404エラーが発生する

---

## 3. backend/api/index.ts（動作確認済み）

**ファイルパス**: `backend/api/index.ts`

### インポートパス（重要！）

```typescript
import { PropertyListingService } from '../src/services/PropertyListingService';
import { PropertyImageService } from '../src/services/PropertyImageService';
import { GoogleDriveService } from '../src/services/GoogleDriveService';
import { PropertyDetailsService } from '../src/services/PropertyDetailsService';
import { PropertyService } from '../src/services/PropertyService';
import { PanoramaUrlService } from '../src/services/PanoramaUrlService';
```

**重要**: `../src/services/*`（`./src/services/*`ではない）

### ディレクトリ構造

```
backend/
├── api/
│   └── index.ts  ← エントリーポイント
└── src/
    └── services/
        ├── PropertyListingService.ts
        ├── PropertyImageService.ts
        ├── GoogleDriveService.ts
        ├── PropertyDetailsService.ts
        ├── PropertyService.ts
        └── PanoramaUrlService.ts
```

`backend/api/index.ts`から見て、`backend/src/services/*`は`../src/services/*`

---

## 4. frontend/package.json（動作確認済み）

**ファイルパス**: `frontend/package.json`

### ビルドスクリプト

```json
{
  "scripts": {
    "vercel-build": "vite build --mode production --logLevel info"
  }
}
```

---

## 5. 環境変数（Vercel Dashboard）

### Vercel Dashboard → Settings → Environment Variables

以下の環境変数が設定されています：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `VITE_API_URL` = `https://property-site-frontend-kappa.vercel.app`

---

## 6. デプロイメントフロー

### 正常なデプロイメント

1. **Git push**
   ```bash
   git add .
   git commit -m "メッセージ"
   git push
   ```

2. **Vercelが自動デプロイ**（2-3分）
   - フロントエンドビルド: `npm run vercel-build`
   - バックエンドビルド: `@vercel/node`

3. **デプロイ完了**
   - Static Assets: `/frontend/assets/*`, `/frontend/index.html`
   - Functions: `/backend/api/index.ts`

### デプロイメント確認

- Vercel Dashboard → `property-site-frontend` → Deployments
- Status: Ready
- Duration: 約1分

---

## 7. トラブルシューティング

### 404エラーが出る場合

#### チェック1: vercel.jsonのroutesを確認

```json
{
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/frontend/assets/$1"  // ← /frontend/dist/assets/$1 ではない
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/index.html"  // ← /frontend/dist/index.html ではない
    }
  ]
}
```

#### チェック2: backend/api/index.tsのインポートパスを確認

```typescript
import { PropertyListingService } from '../src/services/PropertyListingService';
// ← ./src/services/PropertyListingService ではない
```

#### チェック3: 他のVercelプロジェクトのGit連携を確認

- `property-site-frontend`以外のプロジェクトが全てGit連携を切断されているか確認

#### チェック4: Vercel Dashboard → Settings → General

- Root Directory: 空
- Framework Preset: Vite
- Build Command: `npm run vercel-build` (Override: ON)
- Output Directory: `dist` (Override: ON)

---

## 8. 絶対に変更してはいけない設定

### ❌ 変更禁止

1. **vercel.jsonのroutesパス**
   - `/frontend/assets/$1` → `/frontend/dist/assets/$1` に変更しない
   - `/frontend/index.html` → `/frontend/dist/index.html` に変更しない

2. **backend/api/index.tsのインポートパス**
   - `../src/services/*` → `./src/services/*` に変更しない

3. **vercel.jsonのoutputDirectory**
   - `"outputDirectory": "frontend/dist"` を削除しない

4. **Vercel Dashboard → Settings → General**
   - Root Directory を `frontend` に変更しない
   - Framework Preset を変更しない

---

## 9. 成功の証拠

### コミット履歴

- `cf30e24` - "Fix routes in vercel.json to match actual deployment paths" ← **動作確認済み**
- `607fb3a` - "Fix import paths in backend/api/index.ts to match working version (commit 83a3640)"
- `8df706b` - "Revert vercel.json to working version (commit 83a3640) with outputDirectory"

### デプロイメント結果

- ✅ フロントエンドが表示される
- ✅ 物件一覧が表示される
- ✅ ログインができる
- ✅ CC24の画像が表示される（予定）

---

## 10. 今後の注意事項

### 問題が発生したら

1. **まずこのファイルを確認する**
2. **Git履歴を確認する**
   ```bash
   git log --oneline -20
   ```
3. **動作していたコミット（cf30e24）に戻す**
   ```bash
   git show cf30e24:vercel.json > vercel.json
   git show cf30e24:backend/api/index.ts > backend/api/index.ts
   git add vercel.json backend/api/index.ts
   git commit -m "Revert to working configuration (commit cf30e24)"
   git push
   ```

### 新しい機能を追加する場合

1. **このファイルの設定を変更しない**
2. **vercel.jsonを変更しない**
3. **backend/api/index.tsのインポートパスを変更しない**
4. **新しいファイルを追加する場合は、既存の構造を維持する**

---

## まとめ

**この設定は動作確認済みです。絶対に変更しないでください！**

- Vercelプロジェクト: `property-site-frontend`のみ
- Git連携: `property-site-frontend`のみ
- vercel.json: `routes`のパスは`/frontend/assets/$1`と`/frontend/index.html`
- backend/api/index.ts: インポートパスは`../src/services/*`
- Vercel Dashboard: Root Directory は空、Framework Preset は Vite

**問題が発生したら、まずこのファイルを確認してください！**
