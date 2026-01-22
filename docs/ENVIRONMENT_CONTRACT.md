# Environment Contract（環境契約）

## 📋 概要

このドキュメントは、本番環境（Vercel）とローカル環境の差分を定義し、すべての実装・修正がこの契約に準拠することを保証します。

**重要**: すべてのコード変更前に、このドキュメントの差分チェックリストを確認してください。

---

## 🌍 環境定義

### 本番環境（Production）
- **プラットフォーム**: Vercel（サーバーレス関数）
- **フロントエンドURL**: `https://property-site-frontend-kappa.vercel.app`
- **バックエンドURL**: `https://baikyaku-property-site3.vercel.app`
- **Node.js環境**: `NODE_ENV=production`
- **デプロイ方式**: Git push または `vercel --prod`

### ローカル環境（Development）
- **プラットフォーム**: Windows（PowerShell）
- **フロントエンドURL**: `http://localhost:5173`
- **バックエンドURL**: `http://localhost:3000`
- **Node.js環境**: `NODE_ENV=development`
- **実行方式**: `npm run dev` または `npx tsx`

---

## 🔧 環境変数の差分

### 本番環境（Vercel）
```bash
# Google Service Account（推奨：Base64エンコード）
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...  # ✅ 推奨

# Google Service Account（代替：JSON文字列）
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}  # ⚠️ private_keyの改行復元必須

# 環境識別
NODE_ENV=production

# ベースURL（必須）
FRONTEND_URL=https://property-site-frontend-kappa.vercel.app
BACKEND_URL=https://baikyaku-property-site3.vercel.app
```

### ローカル環境
```bash
# Google Service Account（ファイルパス）
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json  # ✅ ファイルパス

# 環境識別
NODE_ENV=development

# ベースURL（必須）
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

---

## 📁 ファイルパスの差分

### Google Service Account認証

#### 本番環境（Vercel耐性）

**推奨方法1: Base64エンコード（最も安全）**
```typescript
// ✅ 推奨：Base64エンコードされたJSON
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
  console.log('📝 Loading service account from GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
  const jsonString = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
    'base64'
  ).toString('utf8');
  keyFile = JSON.parse(jsonString);
}
```

**推奨方法2: JSON文字列（private_keyの改行復元必須）**
```typescript
// ⚠️ 注意：private_keyの改行を復元する必要がある
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  console.log('📝 Loading service account from GOOGLE_SERVICE_ACCOUNT_JSON');
  const jsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  keyFile = JSON.parse(jsonString);
  
  // private_keyの改行を復元（Vercel環境で必須）
  if (keyFile.private_key) {
    keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
  }
}
```

#### ローカル環境
```typescript
// ✅ 正解：ファイルパスから読み込み
const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
```

#### 両環境対応コード（推奨）
```typescript
let keyFile: any;

// 1. Base64エンコードされたJSON（最優先）
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
  console.log('📝 Loading service account from GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
  const jsonString = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
    'base64'
  ).toString('utf8');
  keyFile = JSON.parse(jsonString);
}
// 2. JSON文字列（private_key改行復元）
else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  console.log('📝 Loading service account from GOOGLE_SERVICE_ACCOUNT_JSON');
  keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  
  // private_keyの改行を復元
  if (keyFile.private_key) {
    keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
  }
} 
// 3. ファイルから読み込み（ローカル環境用）
else {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const absolutePath = path.resolve(__dirname, '../../', keyPath);
  
  if (!fs.existsSync(absolutePath)) {
    console.warn('⚠️ Service account key file not found:', absolutePath);
    throw new Error('Google Service Account credentials not found');
  }
  
  console.log('📝 Loading service account from file:', absolutePath);
  keyFile = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

this.serviceAccountAuth = new google.auth.GoogleAuth({
  credentials: keyFile,
  scopes: ['https://www.googleapis.com/auth/drive'],
});
```

### Vercel環境変数の設定方法

#### Base64エンコード（推奨）
```bash
# ローカルでBase64エンコード
cat google-service-account.json | base64 -w 0

# Vercelに設定
vercel env add GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
# → 上記のBase64文字列を貼り付け
```

#### JSON文字列（代替）
```bash
# JSONを1行に圧縮してVercelに設定
vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
# → {"type":"service_account",...} を貼り付け
# ⚠️ private_keyの\nは自動的にエスケープされる
```

---

## 🖼️ URLルール（最重要条文）

### ⚠️ 絶対禁止事項

**❌ NODE_ENVによる分岐は禁止**
```typescript
// ❌ 絶対に禁止
const baseUrl = process.env.NODE_ENV === 'production'
  ? 'https://baikyaku-property-site3.vercel.app'
  : '';
```

**理由**: 
- ローカル環境でもフロントエンド（5173）とバックエンド（3000）は**別オリジン**
- 相対URL前提は**CORS問題**を引き起こす
- 環境判定ロジックは**保守性が低い**

### ✅ 正しいURL生成ルール

**常に`BACKEND_URL`環境変数を使用し、未設定時のみローカルにフォールバック**

```typescript
// ✅ 正解：環境変数ベースのURL生成
private convertToPropertyImages(driveFiles: DriveFile[]): PropertyImage[] {
  // BACKEND_URLを優先、未設定時はローカルのバックエンドURL
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  
  return driveFiles.map(file => ({
    id: file.id,
    name: file.name,
    thumbnailUrl: `${baseUrl}/api/public/images/${file.id}/thumbnail`,
    fullImageUrl: `${baseUrl}/api/public/images/${file.id}`,
    mimeType: file.mimeType,
    size: file.size,
    modifiedTime: file.modifiedTime,
  }));
}
```

### 環境変数設定

#### 本番環境（Vercel）
```bash
BACKEND_URL=https://baikyaku-property-site3.vercel.app
FRONTEND_URL=https://property-site-frontend-kappa.vercel.app
```

#### ローカル環境
```bash
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### URL生成の原則

1. **常に絶対URLを生成**（相対URL禁止）
2. **環境変数`BACKEND_URL`を使用**（NODE_ENV判定禁止）
3. **フォールバック値は`http://localhost:3000`**
4. **フロントエンドとバックエンドは常に別オリジン**

---

## � 起動時禁止事項（Vercel耐性）

### ⚠️ モジュールロード時の禁止事項

**Vercelのサーバーレス関数では、モジュールロード時（import時）に以下を実行すると`FUNCTION_INVOCATION_FAILED`エラーが発生します。**

#### ❌ 絶対に禁止

```typescript
// ❌ モジュールロード時にサービスを初期化
import { InquirySyncService } from '../services/InquirySyncService';
const inquirySyncService = new InquirySyncService(); // ← 禁止

// ❌ モジュールロード時に外部通信
import { supabase } from '../lib/supabase';
const { data } = await supabase.from('properties').select('*'); // ← 禁止

// ❌ モジュールロード時にファイル読み込み
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8')); // ← 禁止

// ❌ モジュールロード時にAPI呼び出し
import axios from 'axios';
const response = await axios.get('https://api.example.com/data'); // ← 禁止
```

#### ✅ 正しい実装

**リクエストハンドラ内で初期化し、必要に応じてキャッシュする**

```typescript
// ✅ リクエストハンドラ内で動的インポート
app.get('/api/endpoint', async (req, res) => {
  try {
    // 動的インポートでサービスを遅延ロード
    const { InquirySyncService } = await import('../services/InquirySyncService');
    const inquirySyncService = new InquirySyncService();
    
    const result = await inquirySyncService.sync();
    
    res.json(result);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**キャッシュを使用する場合**

```typescript
// ✅ キャッシュを使用して初期化コストを削減
let cachedService: InquirySyncService | null = null;

app.get('/api/endpoint', async (req, res) => {
  try {
    if (!cachedService) {
      const { InquirySyncService } = await import('../services/InquirySyncService');
      cachedService = new InquirySyncService();
    }
    
    const result = await cachedService.sync();
    
    res.json(result);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 禁止事項の理由

1. **Vercelのコールドスタート**: モジュールロード時の処理は毎回実行される
2. **タイムアウト**: 初期化に時間がかかるとタイムアウトする
3. **エラーハンドリング**: モジュールロード時のエラーは捕捉できない
4. **デバッグ困難**: エラーログが不明瞭になる

### 許可される初期化

```typescript
// ✅ 環境変数の読み込み（同期処理）
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

// ✅ 定数の定義
const CACHE_TTL = 60 * 60 * 1000; // 1時間

// ✅ クライアントの作成（接続は行わない）
const supabase = createClient(supabaseUrl, supabaseKey);

// ❌ 実際の通信（禁止）
// const { data } = await supabase.from('properties').select('*');
```

---

## 🔍 Google Sheets APIの差分

### シート名の空白対応

#### 問題
スプレッドシートのシート名に**末尾空白**が含まれる場合がある：
- `"athome "` （末尾にスペース1つ）
- `"athome  "` （末尾にスペース2つ）
- `"SUUMO  "` （末尾にスペース2つ）

#### 解決策（両環境共通）
```typescript
// ✅ 複数のシート名パターンを試す
const sheetNamePatterns = [
  'athome ',    // 末尾スペース1つ
  'athome  ',   // 末尾スペース2つ
  'athome',     // スペースなし
  'Athome ',
  'Athome  ',
  'Athome',
  'ATHOME ',
  'ATHOME  ',
  'ATHOME',
  'at home ',
  'At Home ',
];

for (const sheetName of sheetNamePatterns) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!N1`,
    });
    
    const value = response.data.values?.[0]?.[0];
    
    if (value && typeof value === 'string' && value.trim()) {
      console.log(`[Service] Found data in sheet "${sheetName}"`);
      return value.trim();
    }
  } catch (error: any) {
    // このシート名では見つからなかったので次を試す
    continue;
  }
}
```

---

## ✅ デプロイ完了条件（Deploy-ready）

### 必須チェック項目

デプロイ前に以下をすべて確認してください：

#### 1. ビルド成功
```bash
# バックエンド
cd backend
npm run build

# ✅ 成功条件
# - エラーなしでビルド完了
# - dist/フォルダが生成される
# - TypeScriptコンパイルエラーなし
```

#### 2. Lint成功
```bash
# バックエンド
cd backend
npm run lint

# ✅ 成功条件
# - ESLintエラーなし
# - 警告は許容（要確認）
```

#### 3. 型チェック成功（存在する場合）
```bash
# バックエンド
cd backend
npm run typecheck

# ✅ 成功条件
# - TypeScriptエラーなし
# - 型定義の不整合なし
```

#### 4. 環境変数確認
```bash
# Vercel環境変数を確認
vercel env ls

# ✅ 必須環境変数
# - GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 または GOOGLE_SERVICE_ACCOUNT_JSON
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - BACKEND_URL
# - FRONTEND_URL
```

#### 5. ローカルテスト
```bash
# バックエンドを起動
cd backend
npm run dev

# ✅ 確認項目
# - サーバーが起動する
# - /api/health が200を返す
# - /api/check-env が環境変数を表示する
```

### デプロイ手順

```bash
# 1. すべてのチェックを実行
cd backend
npm run build && npm run lint

# 2. Gitにコミット
git add .
git commit -m "feat: implement feature"
git push

# 3. Vercelにデプロイ
vercel --prod

# 4. 本番環境で動作確認
# - 画像表示
# - パノラマURL
# - API応答
```

### デプロイ後の確認

```bash
# 本番環境のヘルスチェック
curl https://baikyaku-property-site3.vercel.app/api/health

# 環境変数チェック
curl https://baikyaku-property-site3.vercel.app/api/check-env

# 画像API確認
curl https://baikyaku-property-site3.vercel.app/api/public/properties/AA9743/images

# 完全データAPI確認
curl https://baikyaku-property-site3.vercel.app/api/public/properties/AA9743/complete
```

### ロールバック手順

デプロイ後に問題が発生した場合：

```bash
# 1. Vercelダッシュボードで前のデプロイに戻す
# https://vercel.com/kunihiro1200s-projects/baikyaku-property-site3

# 2. または、前のコミットにロールバック
git revert HEAD
git push
vercel --prod
```

---

## 🚀 デプロイ前チェックリスト

### ✅ 必須確認項目

#### 1. 環境変数の確認
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON`が設定されている（本番環境）
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`が設定されている（ローカル環境）
- [ ] `NODE_ENV`が正しく設定されている

#### 2. 画像URLの確認
- [ ] 本番環境で絶対URLを使用している
- [ ] ローカル環境で相対URLを使用している
- [ ] `process.env.NODE_ENV`で環境判定している

#### 3. Google Service Account認証の確認
- [ ] 環境変数からJSON読み込みを優先している
- [ ] ファイルパスからの読み込みをフォールバックとしている
- [ ] エラーハンドリングが適切に実装されている

#### 4. Google Sheets APIの確認
- [ ] シート名の末尾空白に対応している
- [ ] 複数のシート名パターンを試している
- [ ] エラーハンドリングが適切に実装されている

#### 5. CORS設定の確認
- [ ] 本番環境で適切なCORSヘッダーが設定されている
- [ ] 画像プロキシエンドポイントでCORSヘッダーが設定されている

---

## 🔧 実装パターン

### パターン1: URL生成（環境変数ベース）

```typescript
// ✅ 推奨パターン：BACKEND_URLを使用
const getBaseUrl = (): string => {
  return process.env.BACKEND_URL || 'http://localhost:3000';
};

// 使用例
const imageUrl = `${getBaseUrl()}/api/public/images/${fileId}`;
```

### パターン2: 環境変数の優先順位（Service Account）

```typescript
// ✅ 推奨パターン（Base64 > JSON > ファイルパス）
const loadServiceAccount = (): any => {
  // 1. Base64エンコード（最優先）
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    const jsonString = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
      'base64'
    ).toString('utf8');
    return JSON.parse(jsonString);
  }
  
  // 2. JSON文字列（private_key改行復元）
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (keyFile.private_key) {
      keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
    }
    return keyFile;
  }
  
  // 3. ファイルパス（ローカル環境）
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
};
```

### パターン3: 動的インポート（Vercel対応）

```typescript
// ✅ 推奨パターン（モジュールロード時エラー回避）
app.get('/api/public/properties/:id/complete', async (req, res) => {
  try {
    // 動的インポートでサービスを遅延ロード
    const { PropertyDetailsService } = await import('../src/services/PropertyDetailsService');
    const propertyDetailsService = new PropertyDetailsService();
    
    const details = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    res.json(details);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### パターン4: キャッシュ付き初期化

```typescript
// ✅ 推奨パターン（初期化コスト削減）
let cachedService: PropertyDetailsService | null = null;

app.get('/api/endpoint', async (req, res) => {
  try {
    if (!cachedService) {
      const { PropertyDetailsService } = await import('../src/services/PropertyDetailsService');
      cachedService = new PropertyDetailsService();
    }
    
    const result = await cachedService.getDetails(req.params.id);
    
    res.json(result);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🐛 よくある問題と解決策

### 問題1: 本番環境で画像が表示されない

**原因**: 相対URLを使用している、またはNODE_ENVで分岐している

**解決策**:
```typescript
// ❌ 間違い
const imageUrl = `/api/public/images/${fileId}`;

// ❌ 間違い
const baseUrl = process.env.NODE_ENV === 'production'
  ? 'https://baikyaku-property-site3.vercel.app'
  : '';

// ✅ 正解
const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
const imageUrl = `${baseUrl}/api/public/images/${fileId}`;
```

### 問題2: 本番環境でGoogle Service Account認証エラー

**原因**: private_keyの改行が復元されていない

**解決策**:
```typescript
// ❌ 間違い
const keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

// ✅ 正解
const keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
if (keyFile.private_key) {
  keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
}

// ✅ より良い解決策：Base64エンコードを使用
const jsonString = Buffer.from(
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
  'base64'
).toString('utf8');
const keyFile = JSON.parse(jsonString);
```

### 問題3: シート名が見つからない

**原因**: 末尾空白を考慮していない

**解決策**:
```typescript
// ❌ 間違い
const range = 'athome!N1';

// ✅ 正解
const sheetNamePatterns = ['athome ', 'athome  ', 'athome'];
for (const sheetName of sheetNamePatterns) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!N1`,
    });
    // ...
  } catch (error) {
    continue;
  }
}
```

### 問題4: Vercelで`FUNCTION_INVOCATION_FAILED`エラー

**原因**: モジュールロード時にサービスを初期化している、または外部通信を行っている

**解決策**:
```typescript
// ❌ 間違い（モジュールロード時に初期化）
import { InquirySyncService } from '../services/InquirySyncService';
const inquirySyncService = new InquirySyncService();

// ✅ 正解（動的インポート + リクエストハンドラ内で初期化）
app.get('/api/endpoint', async (req, res) => {
  const { InquirySyncService } = await import('../services/InquirySyncService');
  const inquirySyncService = new InquirySyncService();
  // ...
});

// ✅ より良い解決策（キャッシュ付き）
let cachedService: InquirySyncService | null = null;

app.get('/api/endpoint', async (req, res) => {
  if (!cachedService) {
    const { InquirySyncService } = await import('../services/InquirySyncService');
    cachedService = new InquirySyncService();
  }
  // ...
});
```

### 問題5: ローカル環境でCORSエラー

**原因**: 相対URLを使用している（フロントエンド5173とバックエンド3000は別オリジン）

**解決策**:
```typescript
// ❌ 間違い
const imageUrl = `/api/public/images/${fileId}`;

// ✅ 正解
const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
const imageUrl = `${baseUrl}/api/public/images/${fileId}`;
```

---

## 📝 コードレビューチェックリスト

新しいコードをレビューする際は、以下を確認してください：

### URL生成
- [ ] `BACKEND_URL`環境変数を使用している
- [ ] NODE_ENVによる分岐を使用していない
- [ ] 相対URLを使用していない
- [ ] フォールバック値が`http://localhost:3000`

### 認証関連
- [ ] Google Service Account認証が両環境対応している
- [ ] Base64エンコードを優先している
- [ ] private_keyの改行復元を実装している（JSON文字列の場合）
- [ ] エラーハンドリングが適切

### モジュールロード時
- [ ] モジュールロード時に外部通信を行っていない
- [ ] モジュールロード時にファイル読み込みを行っていない
- [ ] モジュールロード時にサービス初期化を行っていない
- [ ] 動的インポートを使用している（必要な場合）

### Google Sheets API
- [ ] シート名の末尾空白に対応している
- [ ] 複数のシート名パターンを試している
- [ ] エラーハンドリングが適切

### Vercel対応
- [ ] 動的インポートを使用している（必要な場合）
- [ ] キャッシュを使用している（必要な場合）
- [ ] サーバーレス関数の制約を考慮している
- [ ] タイムアウトを考慮している

### デプロイ前
- [ ] `npm run build`が成功する
- [ ] `npm run lint`が成功する
- [ ] `npm run typecheck`が成功する（存在する場合）
- [ ] 環境変数が正しく設定されている

---

## 🎯 まとめ

### 最重要原則（必須遵守）

1. **URL生成は`BACKEND_URL`環境変数を使用**（NODE_ENV分岐禁止）
2. **相対URL禁止**（ローカルでもフロントとバックは別オリジン）
3. **Google Service AccountはBase64エンコード推奨**
4. **private_keyの改行復元必須**（JSON文字列の場合）
5. **モジュールロード時の外部通信・ファイル読み込み禁止**
6. **動的インポートでVercelエラー回避**
7. **デプロイ前に`npm run build`と`npm run lint`必須**

### 実装前の必須確認

すべてのコード変更前に：
1. ✅ このドキュメントの差分チェックリストを確認
2. ✅ URLルール（最重要条文）を確認
3. ✅ 起動時禁止事項を確認
4. ✅ 両環境で動作することを確認
5. ✅ デプロイ完了条件を確認

### デプロイ手順（必須）

```bash
# 1. ビルドとLintを実行
cd backend
npm run build
npm run lint

# 2. ローカルでテスト
npm run dev
# → http://localhost:3000/api/health を確認

# 3. 本番環境にデプロイ
cd ..
vercel --prod

# 4. 本番環境で動作確認
# → https://baikyaku-property-site3.vercel.app/api/health を確認
# → 画像表示を確認
# → パノラマURLを確認
```

### 環境変数設定（必須）

#### 本番環境（Vercel）
```bash
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<Base64エンコードされたJSON>
BACKEND_URL=https://baikyaku-property-site3.vercel.app
FRONTEND_URL=https://property-site-frontend-kappa.vercel.app
SUPABASE_URL=<SupabaseプロジェクトURL>
SUPABASE_SERVICE_KEY=<Supabaseサービスキー>
NODE_ENV=production
```

#### ローカル環境
```bash
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=<SupabaseプロジェクトURL>
SUPABASE_SERVICE_KEY=<Supabaseサービスキー>
NODE_ENV=development
```

---

**このEnvironment Contractは、本プロジェクトの前提仕様として固定されます。**
**すべての実装・修正は、この契約に準拠して提案してください。**
**必ず最初に差分チェックリストを提示してから作業を開始してください。**
