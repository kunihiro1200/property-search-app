# 公開物件サイト パフォーマンス重要ルール

## ⚠️ 絶対に守るべきルール

このファイルは、公開物件サイトのパフォーマンス最適化に関する**絶対に変更してはいけないルール**を定義します。

---

## 🚫 禁止事項

### 禁止1: `fetchProperties()`に`skipImages`を追加しない

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**❌ 絶対に禁止**:
```typescript
const params = new URLSearchParams({
  limit: '20',
  offset: offset.toString(),
  skipImages: 'true',  // ❌ 絶対に追加しない
});
```

**理由**: 一覧画面で画像が表示されなくなる

**正しいコード**:
```typescript
const params = new URLSearchParams({
  limit: '20',
  offset: offset.toString(),
  // skipImagesは含めない（一覧画面では画像を表示する）
});
```

**参考**: `.kiro/steering/list-view-images-must-always-show.md`

---

### 禁止2: 詳細画面から戻る時の`viewMode`強制設定を削除しない

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**✅ 必須のコード**:
```typescript
// ⚠️ 重要: 詳細画面から戻った時は、viewModeを強制的に'list'に設定
// これにより、地図用データの取得useEffectが実行されない
console.log('🔄 Restoring state from detail page, forcing viewMode to list');
setViewMode('list');
```

**場所**: 状態復元処理の中（約200行目）

**理由**: 削除すると、詳細画面から戻る時に30秒～1分かかる

**コミット**: `a2a4569`, `3a209e9`

---

### 禁止3: `showPublicOnly`のデフォルト値を`true`に変更しない

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**✅ 正しいコード**:
```typescript
// 公開中のみ表示フィルター状態（デフォルトで全物件を表示）
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
```

**❌ 間違ったコード**:
```typescript
// 公開中のみ表示フィルター状態（デフォルトで公開物件のみ表示）
const [showPublicOnly, setShowPublicOnly] = useState<boolean>(true);
```

**理由**: デフォルトで全物件を表示する必要がある

**参考**: `.kiro/steering/show-public-only-default-fix.md`

---

## ✅ 必須の最適化

### 最適化1: 地図表示用データ取得に`skipImages=true`を使用

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**✅ 正しいコード**:
```typescript
// fetchAllProperties()メソッド内
const params = new URLSearchParams({
  limit: limit.toString(),
  offset: offset.toString(),
  withCoordinates: 'true',
  skipImages: 'true',  // ✅ 地図表示では画像不要
});
```

**理由**: 地図表示では画像が不要なため、高速化できる

---

### 最適化2: 地図用データをキャッシュ

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**✅ 正しいコード**:
```typescript
useEffect(() => {
  if (viewMode === 'map' && allProperties.length === 0) {
    console.log('🗺️ Map view activated, fetching all properties...');
    fetchAllProperties();
  }
}, [viewMode]);
```

**理由**: 既に取得済みの場合は再取得しない（`allProperties.length === 0`のチェック）

**コミット**: `d3dcbc6`

---

## 🔍 修正前の確認事項

`PublicPropertiesPage.tsx`を修正する前に、**必ず以下を確認**してください：

### チェックリスト

- [ ] `fetchProperties()`に`skipImages`が含まれていないか？
- [ ] 詳細画面から戻る時の`viewMode`強制設定が含まれているか？
- [ ] `showPublicOnly`のデフォルト値が`false`になっているか？
- [ ] `fetchAllProperties()`に`skipImages=true`が含まれているか？
- [ ] 地図用データのキャッシュチェックが含まれているか？

### 確認コマンド

```bash
# skipImagesの使用箇所を確認
Get-Content frontend/src/pages/PublicPropertiesPage.tsx | Select-String -Pattern "skipImages" -Context 2

# viewMode強制設定を確認
Get-Content frontend/src/pages/PublicPropertiesPage.tsx | Select-String -Pattern "setViewMode\('list'\)" -Context 2

# showPublicOnlyのデフォルト値を確認
Get-Content frontend/src/pages/PublicPropertiesPage.tsx | Select-String -Pattern "showPublicOnly.*useState" -Context 1
```

---

## 📝 修正時の注意事項

### 注意1: 古いバージョンのファイルを上書きしない

**間違った方法**:
```bash
# ❌ 古いコミットから直接復元（最新の修正が失われる）
git checkout <old-commit> -- frontend/src/pages/PublicPropertiesPage.tsx
```

**正しい方法**:
```bash
# ✅ 最新のコミットを確認してから修正
git log --oneline -10 -- frontend/src/pages/PublicPropertiesPage.tsx
git diff HEAD~1 frontend/src/pages/PublicPropertiesPage.tsx
```

---

### 注意2: 複数の修正を同時に行わない

**間違った方法**:
- 画像表示の修正と初回ロード速度の修正を同時に行う

**正しい方法**:
1. 画像表示の修正をコミット
2. 動作確認
3. 初回ロード速度の修正をコミット
4. 動作確認

---

### 注意3: Git履歴を必ず確認する

**修正前に必ず実行**:
```bash
# 最近の変更を確認
git log --oneline -20 -- frontend/src/pages/PublicPropertiesPage.tsx

# 特定のコミットとの差分を確認
git diff <commit> frontend/src/pages/PublicPropertiesPage.tsx
```

---

## 🚀 復元方法

問題が再発した場合は、以下のコミットから復元してください：

### 動作確認済みコミット

**コミットハッシュ**: `3a209e9`

**コミットメッセージ**: "Fix: Force viewMode to 'list' when returning from detail page to prevent map data fetch delay (restore performance optimization)"

**復元コマンド**:
```bash
git checkout 3a209e9 -- frontend/src/pages/PublicPropertiesPage.tsx
git add frontend/src/pages/PublicPropertiesPage.tsx
git commit -m "Restore: Performance optimizations (commit 3a209e9)"
git push
```

---

## 📚 関連ドキュメント

- [一覧画面の画像表示ルール](.kiro/steering/list-view-images-must-always-show.md)
- [地図表示最適化](.kiro/steering/archive/session-2026-01-25-map-view-optimization-deployment.md)
- [公開中のみ表示デフォルト設定](.kiro/steering/show-public-only-default-fix.md)

---

## 🎯 まとめ

### 絶対に守るべき3つのルール

1. **`fetchProperties()`に`skipImages`を追加しない**
2. **詳細画面から戻る時の`viewMode`強制設定を削除しない**
3. **`showPublicOnly`のデフォルト値を`true`に変更しない**

### 修正前の3つの確認

1. **Git履歴を確認する**
2. **最新のコミットとの差分を確認する**
3. **チェックリストを実行する**

**このルールを守ることで、パフォーマンス問題の再発を防止できます。**

---

**最終更新日**: 2026年1月26日  
**動作確認済みコミット**: `3a209e9`  
**ステータス**: ✅ 全ての最適化が正常に動作中
