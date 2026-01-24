# 🚨 画像表示が壊れた時のクイック修正ガイド

## 症状
- 公開物件サイトの画像が表示されない
- ブラウザコンソールに500エラー
- Vercelログに`error:1E08010C:DECODER routines::unsupported`

---

## ⚡ クイック修正（1分で実行）

### ステップ1: 動作確認済みコードに戻す

```bash
# GoogleDriveService.tsを復元（最重要！）
git show 65f56ae:backend/src/services/GoogleDriveService.ts > backend/src/services/GoogleDriveService.ts

# PropertyImageService.tsを復元
git show b902c4f:backend/src/services/PropertyImageService.ts > backend/src/services/PropertyImageService.ts

# コミット＆プッシュ
git add backend/src/services/GoogleDriveService.ts backend/src/services/PropertyImageService.ts
git commit -m "Fix: Restore working image display code"
git push
```

### ステップ2: 2-3分待つ

Vercelが自動デプロイします。

### ステップ3: 確認

ブラウザをリロード（Ctrl + F5）して画像が表示されるか確認。

---

## 🔍 詳細な修正内容

### 修正1: GoogleDriveService.ts（最重要！）

**ファイル**: `backend/src/services/GoogleDriveService.ts`

**修正箇所**: `initializeServiceAccount()`メソッド

**追加するコード**:
```typescript
// ⚠️ 重要：private_keyの\\nを実際の改行に変換
if (keyFile.private_key) {
  keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
  console.log('✅ Converted \\\\n to actual newlines in private_key');
}
```

**理由**: Google認証ライブラリは実際の改行`\n`を期待しているが、環境変数は`\\n`でエスケープされているため。

---

### 修正2: PropertyImageService.ts

**ファイル**: `backend/src/services/PropertyImageService.ts`

**修正箇所**: 3箇所（行340, 443, 480）

**修正内容**:
```typescript
// ❌ 修正前
const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000';

// ✅ 修正後
const apiUrl = 'https://property-site-frontend-kappa.vercel.app';
```

---

### 修正3: データベースのURL（必要な場合のみ）

```bash
cd backend
npx ts-node fix-localhost-image-urls.ts
```

---

## 📋 環境変数の確認

### Vercel Dashboard

https://vercel.com/kunihiro1200s-projects/property-site-frontend/settings/environment-variables

### GOOGLE_SERVICE_ACCOUNT_JSON

**正しい形式**: `backend/google-service-account-for-vercel.txt`の内容

**重要**: `private_key`に`\\n`（バックスラッシュ2つ + n）が含まれている必要があります。

---

## 🎯 最重要ポイント

**GoogleDriveService.tsの`private_key`変換コードが絶対に必要です！**

このコードがないと、Google認証が失敗し、画像が表示されません。

---

## 📚 詳細ドキュメント

`.kiro/steering/public-property-image-display-working-configuration.md`

---

**動作確認済みコミット**: `65f56ae`  
**日時**: 2026年1月24日 10:00 JST
