# 公開物件サイト 画像表示 動作確認済み設定（2026年1月24日）

## ⚠️ 重要：この設定は動作確認済みです。絶対に変更しないでください！

**動作確認日時**: 2026年1月24日 10:00 JST
**最新コミット**: `65f56ae` - "Fix: Convert \\n to actual newlines in private_key for Google auth"
**本番URL**: https://property-site-frontend-kappa.vercel.app/public/properties

---

## 🎯 問題の概要

### 症状
- 公開物件サイトの画像が一覧画面も詳細画面も表示されない
- ブラウザコンソールに500エラー
- Vercelログに`error:1E08010C:DECODER routines::unsupported`エラー

### 根本原因
1. **コード問題**: `PropertyImageService.ts`に`localhost:3000`のハードコードが3箇所あった
2. **データベース問題**: `property_listings.image_url`に`localhost:3000`のURLが保存されていた
3. **認証問題**: Google Service AccountのJSONの`private_key`フィールドの改行エスケープが正しく処理されていなかった

---

## ✅ 解決策（3つの修正）

### 修正1: PropertyImageService.tsのlocalhost:3000を削除

**ファイル**: `backend/src/services/PropertyImageService.ts`

**修正箇所**: 3箇所（行340, 443, 480）

**修正内容**: `localhost:3000`を本番URL `https://property-site-frontend-kappa.vercel.app`にハードコード

```typescript
// ❌ 修正前（3箇所）
const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000';

// ✅ 修正後（3箇所）
const apiUrl = 'https://property-site-frontend-kappa.vercel.app';
```

**コミット**: `7cc7841`, `b902c4f`

---

### 修正2: データベースのlocalhost:3000 URLを修正

**ファイル**: `backend/fix-localhost-image-urls.ts`

**実行コマンド**:
```bash
cd backend
npx ts-node fix-localhost-image-urls.ts
```

**修正内容**: `property_listings.image_url`の`localhost:3000`を本番URLに更新

**対象物件**: CC24など

---

### 修正3: GoogleDriveServiceの認証処理を修正（最重要！）

**ファイル**: `backend/src/services/GoogleDriveService.ts`

**修正箇所**: `initializeServiceAccount()`メソッド

**修正内容**: `private_key`の`\\n`を実際の改行`\n`に変換

```typescript
// ✅ 追加したコード
if (keyFile.private_key) {
  keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
  console.log('✅ Converted \\\\n to actual newlines in private_key');
}
```

**理由**: 
- Vercelの環境変数`GOOGLE_SERVICE_ACCOUNT_JSON`の`private_key`は`\\n`（エスケープされた改行）で保存されている
- Google認証ライブラリは実際の改行`\n`を期待している
- `JSON.parse()`は`\\n`をそのまま文字列として扱うため、手動で変換が必要

**コミット**: `65f56ae`

---

## 📋 環境変数（Vercel Dashboard）

### Vercel Dashboard → Settings → Environment Variables

| 環境変数 | 値 | 必須 |
|---------|---|------|
| `SUPABASE_URL` | SupabaseプロジェクトのURL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabaseサービスキー | ✅ |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Sheets認証用JSON（**`\\n`エスケープシーケンス形式**） | ✅ |
| `VITE_API_URL` | `https://property-site-frontend-kappa.vercel.app` | ✅ |

### ⚠️ GOOGLE_SERVICE_ACCOUNT_JSON の正しい形式

**重要**: `private_key`フィールドに**`\\n`エスケープシーケンス**が含まれている必要があります。

**正しい形式**: `backend/google-service-account-for-vercel.txt`の内容を参照してください。

**重要**: JSONの`private_key`フィールドに`\\n`（バックスラッシュ2つ + n）が含まれている必要があります。

**間違った形式**:
- ❌ `\n`（バックスラッシュ1つ + n）
- ❌ 実際の改行が入っている

---

## 🔧 復元手順（画像が表示されなくなった場合）

### ステップ1: 動作確認済みコミットに戻す

```bash
# GoogleDriveService.tsを復元
git show 65f56ae:backend/src/services/GoogleDriveService.ts > backend/src/services/GoogleDriveService.ts

# PropertyImageService.tsを復元
git show b902c4f:backend/src/services/PropertyImageService.ts > backend/src/services/PropertyImageService.ts

# コミット
git add backend/src/services/GoogleDriveService.ts backend/src/services/PropertyImageService.ts
git commit -m "Restore working image display code (commits 65f56ae, b902c4f)"
git push
```

### ステップ2: 環境変数を確認

1. https://vercel.com/kunihiro1200s-projects/property-site-frontend/settings/environment-variables
2. `GOOGLE_SERVICE_ACCOUNT_JSON`が正しい形式か確認
3. 必要なら削除して再追加（`backend/google-service-account-for-vercel.txt`の内容を使用）

### ステップ3: データベースのURLを確認

```bash
cd backend
npx ts-node check-image-urls-in-db.ts
```

`localhost:3000`が含まれている場合：

```bash
npx ts-node fix-localhost-image-urls.ts
```

### ステップ4: 再デプロイ

```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

---

## 📝 トラブルシューティング

### 問題1: 画像が表示されない

**確認項目**:
1. ブラウザのコンソールでエラーを確認
2. Vercelログで`error:1E08010C:DECODER routines::unsupported`エラーがないか確認
3. `GOOGLE_SERVICE_ACCOUNT_JSON`の`private_key`が正しい形式か確認

**解決策**:
- 上記の「復元手順」を実行

### 問題2: localhost:3000エラーが再発

**確認項目**:
1. `PropertyImageService.ts`の3箇所（行340, 443, 480）を確認
2. データベースの`property_listings.image_url`を確認

**解決策**:
```bash
# コードを復元
git show b902c4f:backend/src/services/PropertyImageService.ts > backend/src/services/PropertyImageService.ts
git add backend/src/services/PropertyImageService.ts
git commit -m "Fix: Restore hardcoded production URL"
git push

# データベースを修正
cd backend
npx ts-node fix-localhost-image-urls.ts
```

### 問題3: Google認証エラー

**エラーメッセージ**: `error:1E08010C:DECODER routines::unsupported`

**原因**: `private_key`の改行エスケープが正しく処理されていない

**解決策**:
```bash
# GoogleDriveService.tsを復元
git show 65f56ae:backend/src/services/GoogleDriveService.ts > backend/src/services/GoogleDriveService.ts
git add backend/src/services/GoogleDriveService.ts
git commit -m "Fix: Restore private_key newline conversion"
git push
```

---

## 🎯 重要なポイント

### 1. private_keyの改行変換が最重要

`GoogleDriveService.ts`の以下のコードが**絶対に必要**です：

```typescript
if (keyFile.private_key) {
  keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
  console.log('✅ Converted \\\\n to actual newlines in private_key');
}
```

このコードがないと、Google認証が失敗します。

### 2. localhost:3000を絶対に使わない

`PropertyImageService.ts`の3箇所で本番URLをハードコードする必要があります。

### 3. 環境変数の形式が重要

`GOOGLE_SERVICE_ACCOUNT_JSON`の`private_key`は`\\n`（バックスラッシュ2つ + n）でエスケープする必要があります。

---

## 📚 関連ファイル

| ファイル | 説明 |
|---------|------|
| `backend/src/services/GoogleDriveService.ts` | Google Drive認証処理（private_key変換） |
| `backend/src/services/PropertyImageService.ts` | 画像URL生成（localhost:3000削除） |
| `backend/fix-localhost-image-urls.ts` | データベースURL修正スクリプト |
| `backend/check-image-urls-in-db.ts` | データベースURL確認スクリプト |
| `backend/google-service-account-for-vercel.txt` | 正しい環境変数形式の参照 |

---

## まとめ

**画像表示の問題は3つの修正で解決しました**:

1. ✅ `PropertyImageService.ts`の`localhost:3000`を削除
2. ✅ データベースの`localhost:3000` URLを修正
3. ✅ `GoogleDriveService.ts`で`private_key`の改行を変換

**最も重要な修正は3番目**です。この修正がないと、Google認証が失敗し、画像が表示されません。

**問題が再発したら、このファイルを参照して復元手順を実行してください。**

---

**動作確認日時**: 2026年1月24日 10:00 JST  
**コミット**: `65f56ae`  
**ステータス**: ✅ 動作確認済み
