---
inclusion: auto
---

# Vercelプロジェクト構成（絶対に守るべきルール）

## ⚠️ 最重要：システム構成を正確に理解する

このドキュメントは、Vercelプロジェクトの構成を明確にし、誤った変更を防ぐためのものです。

---

## 📊 Vercelプロジェクト構成

### 🔴 物件公開サイト（お客様向け・本番稼働中）

**フロントエンド**:
- **Vercelプロジェクト**: `property-site-frontend`
- **URL**: `https://property-site-frontend-kappa.vercel.app`
- **ディレクトリ**: `property-site-frontend/`
- **Root Directory**: `property-site-frontend`
- **変更可否**: ❌ 絶対に触らない（本番稼働中）

**バックエンド**:
- **Vercelプロジェクト**: `baikyaku-property-site3`
- **エントリーポイント**: `backend/api/index.ts`
- **ディレクトリ**: `backend/`
- **Root Directory**: 空欄（`backend`ディレクトリ）
- **変更可否**: ❌ 絶対に触らない（本番稼働中）

---

### 🟢 業務管理システム（社内専用・売主/買主/物件/業務）

**フロントエンド**:
- **Vercelプロジェクト**: `new-admin-management-system`
- **URL**: `https://baikyaku-property-site3.vercel.app`（フロントエンド）
- **ディレクトリ**: `frontend/`
- **Root Directory**: `frontend`
- **変更可否**: ✅ 変更可能（社内専用）

**含まれるシステム**:
1. 売主リスト（`frontend/src/pages/SellerListPage.tsx`）
2. 買主リスト（`frontend/src/pages/BuyerListPage.tsx`）
3. 物件リスト（`frontend/src/pages/PropertyListPage.tsx`）
4. 業務リスト（`frontend/src/pages/WorkTaskListPage.tsx`）

**バックエンド（現在）**:
- **Vercelプロジェクト**: `baikyaku-property-site3`（物件公開サイトと共有）
- **エントリーポイント**: `backend/api/main.ts`
- **ディレクトリ**: `backend/src/`
- **Root Directory**: 空欄（`backend`ディレクトリ）
- **変更可否**: ⚠️ 注意が必要（物件公開サイトと共有）

**バックエンド（移行後・予定）**:
- **Vercelプロジェクト**: `admin-backend`（新規作成予定）
- **エントリーポイント**: `admin-backend/api/index.ts`
- **ディレクトリ**: `admin-backend/`
- **Root Directory**: `admin-backend`
- **変更可否**: ✅ 変更可能（完全に独立）

---

## 🚨 現在の問題点

**`baikyaku-property-site3`プロジェクトは2つの役割を持っています**:

1. **物件公開サイトのバックエンド**（`backend/api/index.ts`）
   - 本番稼働中
   - お客様が使用している
   - 絶対に触ってはいけない

2. **業務管理システムのバックエンド**（`backend/api/main.ts`）
   - 社内専用
   - 本番環境に移行したい
   - 現在はローカル環境で動作

**問題**: `baikyaku-property-site3`の設定（Root Directory、Build Command等）を変更すると、物件公開サイトに影響が出る。

---

## ✅ 解決策

**新しいVercelプロジェクト`admin-backend`を作成**して、業務管理システムのバックエンドを完全に分離する。

### 移行手順

1. **`admin-backend`ディレクトリを作成**（✅ 完了）
   - `backend/src/`の全ファイルを`admin-backend/src/`にコピー
   - `admin-backend/api/index.ts`を作成
   - `admin-backend/vercel.json`を作成
   - `admin-backend/package.json`を作成

2. **GitHubにプッシュ**（✅ 完了）
   - コミット: `ded11b5`

3. **新しいVercelプロジェクトを作成**（⏳ 次のステップ）
   - プロジェクト名: `admin-backend`
   - Root Directory: `admin-backend`
   - 環境変数を設定

4. **フロントエンドのAPIエンドポイントを変更**
   - `new-admin-management-system`の環境変数を新しいバックエンドURLに変更

5. **動作確認**
   - `/api/health`エンドポイントが正常に動作するか確認
   - データが正しく表示されるか確認

---

## 🔒 絶対に守るべきルール

1. **`baikyaku-property-site3`プロジェクトの設定は絶対に変更しない**
   - Root Directoryを変更しない
   - Build Commandを変更しない
   - 物件公開サイトに影響を与える

2. **`backend/api/index.ts`は絶対に変更しない**
   - 物件公開サイト専用のエントリーポイント

3. **`backend/vercel.json`は絶対に変更しない**
   - 物件公開サイトのルーティング設定

4. **新しいVercelプロジェクト`admin-backend`を作成する**
   - 既存のプロジェクトを変更しない
   - 完全に独立したプロジェクトとして作成

---

## 📋 Vercelプロジェクト一覧

| プロジェクト名 | 用途 | Root Directory | 変更可否 |
|--------------|------|---------------|---------|
| `property-site-frontend` | 物件公開サイト（フロントエンド） | `property-site-frontend` | ❌ 不可 |
| `baikyaku-property-site3` | 物件公開サイト（バックエンド） + 業務管理システム（バックエンド） | 空欄（`backend`） | ❌ 不可 |
| `new-admin-management-system` | 業務管理システム（フロントエンド） | `frontend` | ✅ 可 |
| `admin-backend`（新規） | 業務管理システム（バックエンド） | `admin-backend` | ✅ 可 |

---

## 🎯 次のステップ

1. **新しいVercelプロジェクト`admin-backend`を作成**
   - Vercelダッシュボードで "Add New..." → "Project"
   - GitHubリポジトリ `property-search-app` を選択
   - プロジェクト名: `admin-backend`
   - Root Directory: `admin-backend`
   - 環境変数を設定

2. **環境変数を設定**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - その他必要な環境変数

3. **デプロイ**
   - "Deploy" ボタンをクリック

4. **動作確認**
   - `https://admin-backend-xxx.vercel.app/api/health` にアクセス

---

## まとめ

**絶対に守るべきルール**:

1. **`baikyaku-property-site3`プロジェクトは物件公開サイトと業務管理システムの両方で使われている**
2. **`baikyaku-property-site3`の設定を変更すると、物件公開サイトに影響が出る**
3. **新しいVercelプロジェクト`admin-backend`を作成して、業務管理システムのバックエンドを分離する**
4. **既存のプロジェクトの設定は絶対に変更しない**

**このルールを徹底することで、物件公開サイトに影響を与えることなく、業務管理システムを本番環境に移行できます。**

---

**最終更新日**: 2026年2月18日  
**作成理由**: Vercelプロジェクト構成を明確にし、誤った変更を防ぐため  
**関連ドキュメント**: 
- `production-site-protection-rule.md`
- `system-isolation-rule.md`
- `.kiro/specs/production-environment-migration/current-status.md`
