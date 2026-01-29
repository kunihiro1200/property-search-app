---
inclusion: always
---

# バックエンドアーキテクチャ定義

## ⚠️ 重要：2つの独立したバックエンドサーバー

このプロジェクトには**2つの独立したバックエンドサーバー**が存在します。
**ファイルを編集する前に、必ずどちらのサーバー用か確認してください。**

---

## 📁 バックエンド構造

### 1. **売主管理システム用バックエンド**（メインサーバー）

**ディレクトリ**: `backend/src/`

**ポート**: `3000`

**エントリーポイント**: `backend/src/index.ts`

**用途**:
- 売主管理（SellerDetailPage、CallModePage）
- 物件管理
- 従業員管理
- カレンダー管理
- スプレッドシート同期

**主要ファイル**:
- `backend/src/services/SellerService.supabase.ts` ✅ **売主管理用**
- `backend/src/routes/sellers.ts`
- `backend/src/routes/properties.ts`
- `backend/src/routes/employees.ts`
- `backend/src/services/EnhancedAutoSyncService.ts`
- `backend/src/services/SpreadsheetSyncService.ts`

**フロントエンド**:
- `frontend/` (ポート5173)
- 売主詳細ページ: `/sellers/:id`
- 通話モードページ: `/sellers/:id/call`
- 物件詳細ページ: `/properties/:id`

---

### 2. **公開物件サイト用バックエンド**（サブサーバー）

**ディレクトリ**: `backend/api/`

**ポート**: `3001`（推測）

**エントリーポイント**: `backend/api/index.ts`

**用途**:
- 公開物件サイト専用
- 公開物件一覧・詳細表示
- 公開物件検索
- 問い合わせフォーム

**主要ファイル**:
- `backend/api/src/services/SellerService.supabase.ts` ❌ **公開物件サイト用**
- `backend/api/src/routes/public-properties.ts`
- `backend/api/src/routes/public-inquiry.ts`

**フロントエンド**:
- 公開物件サイト（別プロジェクト）
- 公開物件一覧: `/public/properties`
- 公開物件詳細: `/public/properties/:id`

---

## 🚨 ファイル編集時の必須チェックリスト

### ステップ1: どちらのサーバー用か確認

**質問**: このファイルはどちらのサーバー用ですか？

- [ ] `backend/src/` → **売主管理システム用**（ポート3000）
- [ ] `backend/api/` → **公開物件サイト用**（ポート3001）

### ステップ2: どのページで使用されるか確認

**質問**: このファイルはどのページで使用されますか？

**売主管理システム用**:
- [ ] 売主詳細ページ (`/sellers/:id`)
- [ ] 通話モードページ (`/sellers/:id/call`)
- [ ] 物件詳細ページ (`/properties/:id`)
- [ ] 売主一覧ページ (`/sellers`)

**公開物件サイト用**:
- [ ] 公開物件一覧 (`/public/properties`)
- [ ] 公開物件詳細 (`/public/properties/:id`)

### ステップ3: インポート元を確認

**方法**: `grepSearch`でインポート文を検索

```bash
# 例: SellerServiceがどこからインポートされているか確認
grepSearch "import.*SellerService" --includePattern="**/*.ts"
```

**確認ポイント**:
- `backend/src/routes/sellers.ts` → `backend/src/services/SellerService.supabase.ts`を使用
- `backend/api/src/routes/public-properties.ts` → `backend/api/src/services/SellerService.supabase.ts`を使用

---

## 📋 同じ名前のファイル一覧

### SellerService.supabase.ts

| ファイルパス | 用途 | ポート | 使用ページ |
|------------|------|--------|-----------|
| `backend/src/services/SellerService.supabase.ts` | ✅ 売主管理システム | 3000 | CallModePage, SellerDetailPage |
| `backend/api/src/services/SellerService.supabase.ts` | ❌ 公開物件サイト | 3001 | PublicPropertyPage |

### その他の重複ファイル

| ファイル名 | 売主管理システム | 公開物件サイト |
|-----------|----------------|---------------|
| `index.ts` | `backend/src/index.ts` | `backend/api/index.ts` |
| `types/index.ts` | `backend/src/types/index.ts` | `backend/api/src/types/index.ts` |

---

## 🎯 実例：今回の間違い

### ❌ 間違った編集

**ファイル**: `backend/api/src/services/SellerService.supabase.ts`

**理由**: 
- このファイルは**公開物件サイト用**
- CallModePageは**売主管理システム**で動作
- CallModePageは`backend/src/services/SellerService.supabase.ts`を使用

**結果**: 
- 編集しても何も変わらない
- APIレスポンスに`unreachableStatus`が含まれない

### ✅ 正しい編集

**ファイル**: `backend/src/services/SellerService.supabase.ts`

**理由**:
- このファイルは**売主管理システム用**
- CallModePageは`backend/src/routes/sellers.ts`を経由してこのファイルを使用

**結果**:
- ✅ APIレスポンスに`unreachableStatus`が含まれる
- ✅ CallModePageで正しく表示される

---

## 🔍 ファイル編集前の確認方法

### 方法1: インポート元を確認

```bash
# SellerServiceがどこからインポートされているか確認
grepSearch "import.*SellerService" --includePattern="**/*.ts"
```

### 方法2: ルーティングファイルを確認

**売主管理システム**:
```typescript
// backend/src/routes/sellers.ts
import { SellerService } from '../services/SellerService.supabase';
```

**公開物件サイト**:
```typescript
// backend/api/src/routes/public-properties.ts
import { SellerService } from '../services/SellerService.supabase';
```

### 方法3: エントリーポイントを確認

**売主管理システム**:
- エントリーポイント: `backend/src/index.ts`
- ポート: 3000
- 起動コマンド: `npm run dev` (in `backend/`)

**公開物件サイト**:
- エントリーポイント: `backend/api/index.ts`
- ポート: 3001（推測）
- 起動コマンド: 不明（要確認）

---

## 📝 編集時のベストプラクティス

### 1. ファイルパスを必ず確認

**❌ 悪い例**:
```
SellerService.supabase.tsを編集する
```

**✅ 良い例**:
```
backend/src/services/SellerService.supabase.tsを編集する
（売主管理システム用、ポート3000）
```

### 2. 編集後すぐにテスト

**手順**:
1. ファイルを編集
2. サーバーを再起動
3. APIレスポンスをテスト
4. フロントエンドで確認

**テストスクリプト例**:
```typescript
// backend/test-seller-service.ts
import { SellerService } from './src/services/SellerService.supabase';

const sellerService = new SellerService();
const seller = await sellerService.getSeller('seller-id');
console.log('unreachableStatus:', seller.unreachableStatus);
```

### 3. 不明な場合はユーザーに確認

**質問例**:
- 「このファイルは売主管理システム用ですか？公開物件サイト用ですか？」
- 「CallModePageはどちらのサーバーを使用していますか？」

---

## 🎓 まとめ

### 必ず覚えること

1. **2つの独立したバックエンドサーバーが存在する**
   - `backend/src/` → 売主管理システム（ポート3000）
   - `backend/api/` → 公開物件サイト（ポート3001）

2. **同じ名前のファイルが複数存在する**
   - `SellerService.supabase.ts`は2つある
   - 必ずフルパスで確認する

3. **編集前に必ず確認する**
   - どちらのサーバー用か？
   - どのページで使用されるか？
   - インポート元はどこか？

4. **編集後すぐにテストする**
   - APIレスポンスを確認
   - フロントエンドで動作確認

---

## 💬 ユーザーからKIROへの注意の仕方

### 🚨 間違えそうな場面

以下の場面で間違ったファイルを編集する可能性があります：

1. **売主リスト関連**の機能を実装するとき
2. **物件リスト関連**の機能を実装するとき
3. **買主リスト関連**の機能を実装するとき
4. **業務リスト関連**の機能を実装するとき

### ✅ 推奨される注意の仕方

#### パターン1: ページ名を明示する（最も推奨）

```
「通話モードページ」に〇〇機能を追加して
```

```
「売主詳細ページ」の〇〇を修正して
```

```
「公開物件サイト」の〇〇を変更して
```

**理由**: ページ名を指定することで、どちらのサーバーを使用するか明確になる

---

#### パターン2: フルパスを指定する

```
backend/src/services/SellerService.supabase.ts に〇〇を追加して
```

```
backend/api/src/services/SellerService.supabase.ts は触らないで
```

**理由**: フルパスを指定することで、間違ったファイルを編集するリスクがゼロになる

---

#### パターン3: 「売主管理システム」か「公開物件サイト」かを明示する

```
「売主管理システム」の〇〇機能を追加して
```

```
「公開物件サイト」の〇〇を修正して
```

**理由**: どちらのサーバー用か明確になる

---

#### パターン4: ポート番号を指定する

```
ポート3000のバックエンドに〇〇を追加して
```

```
ポート3001のバックエンドは触らないで
```

**理由**: ポート番号で明確に区別できる

---

### ❌ 避けるべき曖昧な指示

以下のような曖昧な指示は避けてください：

```
❌ 「SellerServiceに〇〇を追加して」
   → どちらのSellerService？

❌ 「売主リストに〇〇機能を追加して」
   → 売主管理システム？公開物件サイト？

❌ 「バックエンドに〇〇を追加して」
   → backend/src/？backend/api/？
```

---

### 📋 具体例

#### ✅ 良い例1: 通話モードページの機能追加

```
「通話モードページ」に「不通」フィールドを追加して
```

**KIROの理解**:
- 通話モードページ = `/sellers/:id/call`
- 売主管理システム用（ポート3000）
- `backend/src/services/SellerService.supabase.ts`を編集

---

#### ✅ 良い例2: 公開物件サイトの機能追加

```
「公開物件サイト」の物件詳細ページに〇〇を追加して
```

**KIROの理解**:
- 公開物件サイト用（ポート3001）
- `backend/api/src/services/SellerService.supabase.ts`を編集

---

#### ✅ 良い例3: フルパス指定

```
backend/src/services/SellerService.supabase.ts の decryptSeller メソッドに〇〇を追加して
```

**KIROの理解**:
- フルパスが指定されているので間違えようがない
- 売主管理システム用（ポート3000）

---

#### ❌ 悪い例: 曖昧な指示

```
❌ 「売主リストに〇〇機能を追加して」
```

**KIROの混乱**:
- 売主管理システムの売主一覧ページ？
- 公開物件サイトの売主情報？
- どちらのSellerServiceを編集すべき？

**改善案**:
```
✅ 「売主管理システムの売主一覧ページに〇〇機能を追加して」
```

---

### 🎯 まとめ：推奨される注意の仕方

**最も推奨される方法**:

1. **ページ名を明示する**
   - 「通話モードページ」
   - 「売主詳細ページ」
   - 「公開物件サイト」

2. **フルパスを指定する**
   - `backend/src/services/SellerService.supabase.ts`
   - `backend/api/src/services/SellerService.supabase.ts`

3. **システム名を明示する**
   - 「売主管理システム」
   - 「公開物件サイト」

**これらを組み合わせると最強**:
```
「売主管理システムの通話モードページ」に〇〇機能を追加して
（backend/src/services/SellerService.supabase.ts を編集）
```

---

**最終更新日**: 2026年1月28日  
**作成理由**: `unreachableStatus`フィールド実装時に間違ったファイルを編集してしまったため  
**更新履歴**: ユーザーからの注意の仕方を追加（2026年1月28日）

