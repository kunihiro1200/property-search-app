# 公開物件サイト「公開中のみ表示」フィルター 動作確認済み設定（2026年1月25日）

## ⚠️ 重要：この設定は動作確認済みです。絶対に変更しないでください！

**動作確認日時**: 2026年1月25日
**最新コミット**: `292a02b` - "Fix: Apply correct atbb_status whitelist filter (専任・公開中, 一般・公開中, 非公開（配信メールのみ）)"
**本番URL**: https://property-site-frontend-kappa.vercel.app/public/properties

---

## 📋 動作確認済みの機能

✅ **「公開中のみ表示」フィルター** → 正常動作（101件表示）
✅ **デフォルト値** → OFF（全物件表示）
✅ **地図ビューとの連携** → 正常動作
✅ **ホワイトリスト方式** → 実装済み

---

## 🎯 atbb_status分類定義

### 公開物件（フィルターONで表示）

以下の3つの値のみ：

1. **専任・公開中** (57件)
2. **一般・公開中** (42件)
3. **非公開（配信メールのみ）** (2件)

**合計: 101件**

### 非公開物件（フィルターONで除外）

1. **E外し非公開** (323件)
2. **ステータスなし** (2件)
3. **他社物件** (7件)
4. **非公開（一般）** (56件)
5. **非公開（専任）** (509件)
6. **非公開** (1件)
7. **公開中** (1件 - レアケース)

**合計: 899件**

### null値

- `atbb_status`が`null`または空文字列: **除外** (118件)

**総計: 1,118件**

---

## 🔧 実装コード（動作確認済み）

### backend/src/services/PropertyListingService.ts

**ファイルパス**: `backend/src/services/PropertyListingService.ts`

**行番号**: 345-360付近

```typescript
// 公開中のみ表示フィルター（ホワイトリスト方式）
if (showPublicOnly) {
  console.log('[PropertyListingService] Applying showPublicOnly filter (whitelist)');
  // 公開物件のみを表示（ホワイトリスト）
  // 参照: .kiro/steering/atbb-status-classification.md
  query = query.in('atbb_status', [
    '専任・公開中',
    '一般・公開中',
    '非公開（配信メールのみ）'
  ]);
}
```

### frontend/src/pages/PublicPropertiesPage.tsx

**ファイルパス**: `frontend/src/pages/PublicPropertiesPage.tsx`

**行番号**: 69

```typescript
// 「公開中のみ表示」フィルターのデフォルト値をfalseに設定（全物件を表示）
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
```

---

## 🔄 復元手順（問題が発生した場合）

### ステップ1: 動作確認済みコミットに戻す

```bash
# バックエンドのフィルター実装を復元
git checkout 292a02b -- backend/src/services/PropertyListingService.ts

# フロントエンドのデフォルト値を復元
git checkout f444fc9 -- frontend/src/pages/PublicPropertiesPage.tsx
```

### ステップ2: 復元内容を確認

```bash
# バックエンドの確認（ホワイトリスト方式が実装されているか）
Get-Content backend/src/services/PropertyListingService.ts | Select-String -Pattern "専任・公開中" -Context 5

# フロントエンドの確認（デフォルト値がfalseか）
Get-Content frontend/src/pages/PublicPropertiesPage.tsx | Select-String -Pattern "useState<boolean>" -Context 2
```

**期待される出力（バックエンド）**:
```typescript
query = query.in('atbb_status', [
  '専任・公開中',
  '一般・公開中',
  '非公開（配信メールのみ）'
]);
```

**期待される出力（フロントエンド）**:
```typescript
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
```

### ステップ3: コミットしてプッシュ

```bash
# 両方のファイルをステージング
git add backend/src/services/PropertyListingService.ts frontend/src/pages/PublicPropertiesPage.tsx

# コミット
git commit -m "Restore working showPublicOnly filter configuration (commits 292a02b, f444fc9)"

# プッシュ
git push
```

### ステップ4: Vercelデプロイを待つ

- デプロイが完了するまで2-3分待つ
- https://vercel.com/kunihiro1200s-projects/property-site-frontend/deployments

---

## 📝 トラブルシューティング

### 問題1: フィルターONで101件以外が表示される

**原因**: ホワイトリストの値が間違っている

**解決策**:
```bash
# 動作確認済みコミットに戻す
git checkout 292a02b -- backend/src/services/PropertyListingService.ts
git add backend/src/services/PropertyListingService.ts
git commit -m "Fix: Restore correct atbb_status whitelist"
git push
```

### 問題2: デフォルトで「公開中のみ表示」がONになっている

**原因**: `useState<boolean>(true)`になっている

**解決策**:
```bash
# 動作確認済みコミットに戻す
git checkout f444fc9 -- frontend/src/pages/PublicPropertiesPage.tsx
git add frontend/src/pages/PublicPropertiesPage.tsx
git commit -m "Fix: Restore showPublicOnly default to false"
git push
```

### 問題3: 地図ビューでフィルターが効かない

**原因**: `useEffect`の依存配列に`searchParams`が含まれていない

**解決策**:
```bash
# 動作確認済みコミットに戻す
git checkout f87e810 -- frontend/src/pages/PublicPropertiesPage.tsx
git add frontend/src/pages/PublicPropertiesPage.tsx
git commit -m "Fix: Restore map view filter synchronization"
git push
```

---

## 🎯 絶対に変更してはいけないこと

### ❌ 変更禁止1: ホワイトリストの値

```typescript
// ❌ これを変更しない
query = query.in('atbb_status', [
  '専任・公開中',
  '一般・公開中',
  '非公開（配信メールのみ）'
]);
```

**理由**: この3つの値のみが公開物件です。他の値を追加すると、成約済み物件が表示されます。

### ❌ 変更禁止2: ブラックリスト方式への変更

```typescript
// ❌ これに変更しない
query = query.not('atbb_status', 'in', [
  'E外し非公開',
  'ステータスなし',
  // ...
]);
```

**理由**: 新しい値が追加された時に対応できません。ホワイトリスト方式を維持してください。

### ❌ 変更禁止3: デフォルト値をtrueに変更

```typescript
// ❌ これに変更しない
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(true);
```

**理由**: ユーザーの要望により、デフォルトは全物件表示（false）です。

---

## 📚 関連ドキュメント

- [atbb_status分類定義](.kiro/steering/atbb-status-classification.md) - **必ず参照**
- [公開物件サイト デフォルト値変更仕様](.kiro/specs/public-property-show-all-by-default/)

---

## 🔍 動作確認方法

### ローカル環境

1. **バックエンドを起動**:
   ```bash
   cd backend
   npm run dev
   ```

2. **フロントエンドを起動**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **ブラウザで確認**:
   ```
   http://localhost:5173/public/properties
   ```

4. **フィルターOFF（デフォルト）**: 約1,118件表示
5. **フィルターON**: 101件表示

### 本番環境

1. **Vercelのデプロイが完了していることを確認**

2. **ブラウザで確認**:
   ```
   https://property-site-frontend-kappa.vercel.app/public/properties
   ```

3. **フィルターOFF（デフォルト）**: 約1,118件表示
4. **フィルターON**: 101件表示

---

## ✅ 実装完了チェックリスト

- [x] バックエンド: ホワイトリスト方式でフィルター実装
- [x] フロントエンド: デフォルト値をfalseに設定
- [x] 地図ビュー: フィルター連携を修正
- [x] atbb_status分類定義を記録（`.kiro/steering/atbb-status-classification.md`）
- [x] 復元手順を作成
- [x] テスト: ローカル環境で動作確認
- [x] テスト: 本番環境で動作確認

---

## 🎯 まとめ

### 実装された機能

1. **「公開中のみ表示」フィルター** - ホワイトリスト方式（3つの値のみ）
2. **デフォルト値** - OFF（全物件表示）
3. **地図ビューとの連携** - 正常動作

### 重要なポイント

- **ホワイトリスト方式を維持する** - 新しい値が追加されても安全
- **3つの値のみを公開物件とする** - `専任・公開中`, `一般・公開中`, `非公開（配信メールのみ）`
- **デフォルトはOFF** - ユーザーの要望

### 今後の注意事項

- 新しい`atbb_status`値が追加された場合、ユーザーに確認してから`.kiro/steering/atbb-status-classification.md`を更新
- フィルターの実装を変更する場合は、必ずこのドキュメントを参照
- 問題が発生した場合は、このドキュメントの「復元手順」を実行

---

**このドキュメントは、問題が発生した際の復元用です。必ず保管してください。**

**最終更新日**: 2026年1月25日
**動作確認済みコミット**: `292a02b` (バックエンド), `f444fc9` (フロントエンド), `f87e810` (地図ビュー)
