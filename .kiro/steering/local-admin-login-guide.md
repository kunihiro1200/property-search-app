# ローカル環境 管理者ログインガイド

## 概要

このガイドでは、ローカル環境で管理者としてログインし、公開物件サイトで「画像を更新」ボタンを使用する方法を説明します。

**実装日**: 2026年1月24日  
**コミット**: `2f94ace` - "Add: Enable admin mode (canHide=true) for authenticated users on public property site"

---

## 🎯 「画像を更新」ボタンの場所

### 管理者モード（ログイン後）

**URL**: `http://localhost:5173/public/properties/CC6`（例）

**ボタンの位置**: 画像ギャラリーのヘッダー部分（右上）

```
[非表示: X枚]                    [画像を更新]
```

### 一般ユーザーモード（ログインなし）

**URL**: `https://property-site-frontend-kappa.vercel.app/public/properties/CC6`

**ボタンの表示**: なし（`canHide=false`）

---

## 📋 ローカル環境でのログイン手順

### ステップ1: バックエンドサーバーを起動

```bash
cd backend
npm install
npm run dev
```

**確認**: `http://localhost:3000` でバックエンドが起動していることを確認

### ステップ2: フロントエンドサーバーを起動（別のターミナル）

```bash
cd frontend
npm install
npm run dev
```

**確認**: `http://localhost:5173` でフロントエンドが起動していることを確認

### ステップ3: ブラウザでログイン

1. **ログインページを開く**: `http://localhost:5173/login`
2. **「Googleでログイン」ボタンをクリック**
3. **Googleアカウントを選択**
4. **認証完了後、自動的にリダイレクト**

### ステップ4: 公開物件サイトにアクセス

1. **物件一覧を開く**: `http://localhost:5173/public/properties`
2. **物件を選択**（例: CC6）
3. **「画像を更新」ボタンが表示される**

---

## ✅ 本番環境への影響がない理由

### 1. 環境変数の分離

- **ローカル**: `frontend/.env.local`
  ```env
  VITE_API_URL=http://localhost:3000
  ```

- **本番**: `frontend/.env.production`
  ```env
  VITE_API_URL=https://property-site-frontend-kappa.vercel.app
  ```

### 2. Supabase設定は共通

- 両方とも同じSupabaseプロジェクトを使用
- 認証情報は同じ（`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`）
- **これは問題ありません** - Supabaseは本番環境です

### 3. デプロイは別プロセス

- ローカルで開発サーバーを起動しても、Vercelにデプロイされません
- `git push` しない限り、本番環境は変更されません

---

## 🔧 実装の詳細

### PublicPropertyDetailPage.tsx の変更

#### 1. 認証ストアのインポート

```typescript
import { useAuthStore } from '../store/authStore';
```

#### 2. 認証状態の取得

```typescript
const { isAuthenticated } = useAuthStore();
```

#### 3. PropertyImageGallery の canHide プロパティ

```typescript
<PropertyImageGallery
  propertyId={property.property_number}
  canDelete={false}
  canHide={isAuthenticated}  // ← 管理者の場合は true
  showHiddenImages={false}
  isPublicSite={true}
/>
```

---

## 🎯 使用例

### CC6の画像を差し替えた場合

1. **Google Driveで画像を差し替え**
   - 古い画像を削除
   - 新しい画像をアップロード

2. **ローカル環境でログイン**
   - `http://localhost:5173/login`
   - Googleアカウントでログイン

3. **公開物件サイトでCC6を開く**
   - `http://localhost:5173/public/properties/CC6`

4. **「画像を更新」ボタンをクリック**
   - ボタンが「更新中...」に変わる
   - 数秒後、最新の画像が表示される

5. **完了**
   - 「画像キャッシュをクリアしました。最新の画像が表示されます。」と表示される

---

## 📝 トラブルシューティング

### 問題1: ERR_CONNECTION_REFUSED

**原因**: 開発サーバーが起動していない

**解決策**:
1. バックエンドサーバーを起動: `cd backend && npm run dev`
2. フロントエンドサーバーを起動: `cd frontend && npm run dev`

### 問題2: 「画像を更新」ボタンが表示されない

**原因**: ログインしていない

**解決策**:
1. `http://localhost:5173/login` でログイン
2. ログイン後、公開物件サイトにアクセス

### 問題3: ログインできない

**原因**: Supabase認証の問題

**解決策**:
1. `.env.local` の `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を確認
2. ブラウザのコンソールでエラーを確認
3. Supabaseダッシュボードで認証設定を確認

---

## 🚀 本番環境での使用

### 本番環境でも管理者モードが有効

**URL**: `https://property-site-frontend-kappa.vercel.app/public/properties`

**手順**:
1. **ログインページを開く**: `https://property-site-frontend-kappa.vercel.app/login`
2. **Googleでログイン**
3. **公開物件サイトにアクセス**
4. **「画像を更新」ボタンが表示される**

### 一般ユーザーには表示されない

- ログインしていないユーザーには「画像を更新」ボタンは表示されません
- `canHide=false` のため、管理者機能は非表示です

---

## 📚 関連ドキュメント

- [手動画像キャッシュクリア機能](.kiro/steering/manual-image-cache-clear.md)
- [公開物件コメント表示パフォーマンス修正](.kiro/steering/public-property-comment-performance-fix.md)

---

## まとめ

- **ローカル環境**: 開発サーバーを起動してログイン
- **本番環境**: 既にデプロイ済み、ログインすれば「画像を更新」ボタンが表示される
- **一般ユーザー**: ボタンは表示されない（管理者のみ）
- **本番環境への影響**: なし（環境変数が分離されている）

**この機能により、管理者は公開物件サイトで画像を差し替えた際に、手動でキャッシュをクリアできます。**
