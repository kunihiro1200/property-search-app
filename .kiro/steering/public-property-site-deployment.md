---
inclusion: manual
---

# 公開物件サイトのデプロイ定義（絶対に間違えないルール）

## ⚠️ 重要：公開物件サイトのVercelプロジェクト

**公開物件サイトは`property-site-frontend`という1つのVercelプロジェクトで、フロントエンドとバックエンドの両方がデプロイされています。**

---

## 📋 プロジェクト構成

### Vercelプロジェクト名

**`property-site-frontend`**

### 本番URL

- **フロントエンド**: `https://property-site-frontend-kappa.vercel.app/public/properties`
- **バックエンドAPI**: `https://property-site-frontend-kappa.vercel.app/api/public/properties`

### ソースコード

| 種類 | ローカルパス | 説明 |
|------|------------|------|
| **フロントエンド** | `frontend/src/pages/PublicPropertiesPage.tsx` | 公開物件一覧ページ |
| **フロントエンド** | `frontend/src/pages/PublicPropertyDetailPage.tsx` | 公開物件詳細ページ |
| **フロントエンド** | `frontend/src/components/PublicPropertyCard.tsx` | 公開物件カード |
| **バックエンドAPI** | `backend/api/index.ts` | APIエントリーポイント |
| **バックエンドサービス** | `backend/api/src/services/PropertyListingService.ts` | 物件リストサービス |
| **バックエンドサービス** | `backend/api/src/services/PropertyImageService.ts` | 画像取得サービス |

---

## 🚨 絶対に守るべきルール

### ルール1: 公開物件サイトの問題は`property-site-frontend`プロジェクトを確認

**❌ 間違い**:
- `backend`プロジェクトを確認する
- `frontend`プロジェクトを確認する

**✅ 正しい**:
- `property-site-frontend`プロジェクトを確認する
- Vercelダッシュボードで`property-site-frontend`のログを確認する

### ルール2: デプロイは`frontend`フォルダからプッシュ

公開物件サイトのコードは`frontend`フォルダにあり、Vercelは`frontend`フォルダをルートとしてデプロイします。

**デプロイ手順**:
```bash
cd frontend
git add -A
git commit -m "Fix: ..."
git push
```

### ルール3: バックエンドAPIは`backend/api/`フォルダ

公開物件サイトのバックエンドAPIは`backend/api/`フォルダにあります。

**注意**: `backend/src/`は**売主管理システム用**であり、公開物件サイトとは**別**です。

---

## 📊 Vercelログの確認方法

### 方法1: Vercelダッシュボード

1. https://vercel.com にアクセス
2. `property-site-frontend`プロジェクトを選択
3. 「Logs」タブをクリック
4. エラーログを確認

### 方法2: Vercel CLI

```bash
vercel logs property-site-frontend --follow
```

---

## 🔍 問題が発生した場合のチェックリスト

### 画像が表示されない場合

1. [ ] Vercelログで`[PropertyImageService]`のエラーを確認
2. [ ] `GOOGLE_SERVICE_ACCOUNT_JSON`環境変数が設定されているか確認
3. [ ] `BACKEND_URL`環境変数が正しく設定されているか確認
4. [ ] Google Drive APIへのアクセスが成功しているか確認

### APIエラーの場合

1. [ ] Vercelログでエラーメッセージを確認
2. [ ] `SUPABASE_URL`と`SUPABASE_SERVICE_KEY`が設定されているか確認
3. [ ] データベース接続が成功しているか確認

---

## 📝 環境変数一覧

### 必須環境変数

| 環境変数 | 説明 |
|---------|------|
| `SUPABASE_URL` | SupabaseのURL |
| `SUPABASE_SERVICE_KEY` | Supabaseのサービスキー |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google サービスアカウントのJSON |
| `BACKEND_URL` | バックエンドのURL（例: `https://property-site-frontend-kappa.vercel.app`） |

### オプション環境変数

| 環境変数 | デフォルト | 説明 |
|---------|----------|------|
| `FOLDER_ID_CACHE_TTL_MINUTES` | `60` | フォルダIDキャッシュのTTL（分） |
| `SUBFOLDER_SEARCH_TIMEOUT_SECONDS` | `2` | サブフォルダ検索のタイムアウト（秒） |
| `MAX_SUBFOLDERS_TO_SEARCH` | `3` | 検索するサブフォルダの最大数 |

---

## 🎯 まとめ

- **公開物件サイト = `property-site-frontend`プロジェクト**
- **フロントエンドとバックエンドが同じプロジェクト**
- **Vercelログは`property-site-frontend`で確認**
- **バックエンドAPIは`backend/api/`フォルダ**（`backend/src/`ではない）

**このルールを絶対に守ってください。**

---

**最終更新日**: 2026年1月31日  
**作成理由**: 公開物件サイトのデプロイ構成を明確化し、間違ったプロジェクトを確認するミスを防ぐため
