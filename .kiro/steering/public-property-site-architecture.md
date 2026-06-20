---
inclusion: always
---

# 公開物件サイトのアーキテクチャ定義

## ⚠️ 最重要：フロントエンドとバックエンドは同じVercelプロジェクト

公開物件サイトは、**フロントエンドとバックエンドが1つのVercelプロジェクトに統一**されています。

**絶対に間違えないでください。**

---

## 📁 公開物件サイトの構造

### **Vercelプロジェクト**

**プロジェクト名**: `property-site-frontend`
**カスタムドメイン**: `https://property-site-frontend-kappa.vercel.app`
**ローカルディレクトリ**: `c:\Users\kunih\sateituikyaku`

---

### **構成**

#### 1. **フロントエンド**

**ディレクトリ**: `frontend/`

**ビルド設定**:
- ビルドツール: Vite
- ビルドコマンド: `vite build`
- 出力ディレクトリ: `frontend/dist`

**ルート**:
- 公開物件一覧: `/public/properties`
- 公開物件詳細: `/public/properties/:id`

**主要ファイル**:
- `frontend/src/pages/PublicPropertiesPage.tsx` - 公開物件一覧ページ
- `frontend/src/pages/PublicPropertyDetailPage.tsx` - 公開物件詳細ページ
- `frontend/src/App.tsx` - ルーティング設定

---

#### 2. **バックエンドAPI**

**ディレクトリ**: `backend/api/`

**エントリーポイント**: `backend/api/index.ts`

**APIルート**: `/api/*`

**主要エンドポイント**:
- `GET /api/public/properties` - 公開物件一覧取得
- `GET /api/public/properties/:id` - 公開物件詳細取得
- `GET /api/public/properties/:id/images` - 物件画像取得
- `POST /api/public/properties/:id/estimate-pdf` - 概算書PDF生成
- `POST /api/inquiry` - 問い合わせフォーム送信

**主要ファイル**:
- `backend/api/index.ts` - エントリーポイント
- `backend/api/src/services/PropertyListingService.ts` - 物件データ取得
- `backend/api/src/services/PropertyImageService.ts` - 画像取得
- `backend/api/src/services/GoogleDriveService.ts` - Google Drive連携
- `backend/api/src/services/PropertyDetailsService.ts` - 物件詳細データ取得

---

### **Vercelデプロイ設定**

**設定ファイル**: `vercel.json`

```json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build"
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
      "src": "/(.*)",
      "dest": "/frontend/index.html"
    }
  ]
}
```

**重要**: フロントエンドとバックエンドの両方が**同時にビルド**され、**同じドメイン**にデプロイされます。

---

## 🚨 絶対に守るべきルール

### ルール1: フロントエンドとバックエンドは同じプロジェクト

❌ **間違い**: 「フロントエンドとバックエンドは別プロジェクト」
✅ **正解**: 「フロントエンドとバックエンドは同じVercelプロジェクト（`property-site-frontend`）」

### ルール2: 公開物件サイトの修正は`backend/api/`を編集

公開物件サイトのバックエンド機能を修正する場合：

✅ **正しい**: `backend/api/index.ts`や`backend/api/src/services/*.ts`を編集
❌ **間違い**: `backend/src/`を編集（これは売主管理システム用）

### ルール3: デプロイは自動

- `main`ブランチにプッシュすると、Vercelが自動的にデプロイ
- フロントエンドとバックエンドの両方が同時にデプロイされる

---

## 📋 ファイル編集時のチェックリスト

公開物件サイトの機能を修正する前に、以下を確認してください：

- [ ] 修正するファイルは`frontend/`または`backend/api/`にあるか？
- [ ] `backend/src/`を編集していないか？（これは売主管理システム用）
- [ ] 公開物件サイトのページ（`/public/properties`）で動作確認するか？

---

## 🎯 実例：今回のAA12649画像表示問題

### 問題

AA12649の画像が表示されない（Vercel本番環境）

### 原因

`backend/api/index.ts`で`PropertyImageService`のコンストラクタ呼び出しが間違っていた

### 修正箇所

✅ **正しい修正**: `backend/api/index.ts`（公開物件サイトのバックエンド）

```typescript
// ❌ 間違い
new PropertyImageService(60, ...)

// ✅ 正しい
new PropertyImageService(new GoogleDriveService(), 60, ...)
```

### 影響範囲

- ✅ 公開物件サイトの画像表示が修正される
- ❌ 売主管理システムには影響しない（別のバックエンド`backend/src/`を使用）

---

## 🔍 ローカル開発

### フロントエンド

```bash
cd frontend
npm run dev
```

**URL**: `http://localhost:5173/public/properties`

### バックエンドAPI

公開物件サイトのバックエンドAPIは、Vercel環境でのみ動作します。
ローカル開発では、Vercelの本番APIを使用します。

**環境変数**（`frontend/.env.local`）:
```bash
VITE_API_URL=https://property-site-frontend-kappa.vercel.app
```

---

## 💡 よくある間違い

### ❌ 間違い1: 「フロントエンドとバックエンドは別プロジェクト」

```
間違った理解: 公開物件サイトのフロントエンドとバックエンドは別々のVercelプロジェクト
```

**正解**: 同じVercelプロジェクト（`property-site-frontend`）にデプロイされる

---

### ❌ 間違い2: 「`backend/src/`を編集すれば公開物件サイトが修正される」

```
間違った修正: backend/src/services/PropertyImageService.tsを編集
```

**正解**: `backend/api/src/services/PropertyImageService.ts`を編集

---

### ❌ 間違い3: 「公開物件サイトのバックエンドはローカルで起動できる」

```
間違った理解: npm run devでバックエンドAPIを起動
```

**正解**: 公開物件サイトのバックエンドAPIは、Vercel環境でのみ動作（サーバーレス関数）

---

## 📝 まとめ

### 公開物件サイトの構造

| 項目 | 値 |
|------|-----|
| **Vercelプロジェクト名** | `property-site-frontend` |
| **カスタムドメイン** | `https://property-site-frontend-kappa.vercel.app` |
| **フロントエンド** | `frontend/` |
| **バックエンドAPI** | `backend/api/` |
| **デプロイ** | フロントエンドとバックエンドが同時にデプロイ |

### 絶対に守るべきルール

1. ✅ **フロントエンドとバックエンドは同じVercelプロジェクト**
2. ✅ **公開物件サイトの修正は`backend/api/`を編集**
3. ✅ **`backend/src/`は売主管理システム用（公開物件サイトとは無関係）**

---

## 🚫 絶対に触ってはいけないプロジェクト

以下のプロジェクトは、公開物件サイトとは**完全に独立**しています。
**絶対に編集しないでください。**

- ❌ **`c:\Users\kunih\property-search-app`** - 間違ったプロジェクト
- ❌ **`c:\Users\kunih\chuukaigyosha`** - 本番稼働中の別プロジェクト

---

**最終更新日**: 2026年2月20日  
**作成理由**: 公開物件サイトのフロントエンドとバックエンドが同じVercelプロジェクトであることを明確化し、今後の混乱を防ぐため
