# 一覧画面の画像表示ルール（絶対厳守）

## ⚠️ 絶対に守るべきルール

**一覧画面（リスト表示）では、画像を必ず表示すること**

このルールは**絶対に破ってはいけません**。

---

## 🚫 禁止事項

### 禁止1: `fetchProperties()`に`skipImages`パラメータを追加しない

**❌ 絶対に禁止**:
```typescript
// fetchProperties()メソッド
const params = new URLSearchParams({
  limit: '20',
  offset: offset.toString(),
  skipImages: 'true',  // ❌ 絶対に追加しない
});
```

**理由**: 一覧画面で画像が表示されなくなる

---

### 禁止2: 初回ロード速度改善のために画像取得をスキップしない

**❌ 間違った考え方**:
- 「初回ロードを速くするために、画像取得をスキップしよう」
- 「画像は後で読み込めばいい」

**✅ 正しい考え方**:
- **一覧画面では画像が必須**
- 初回ロード速度よりも、画像表示が優先

---

## ✅ 正しい実装

### `fetchProperties()`メソッド（一覧画面用）

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**正しいコード**:
```typescript
const fetchProperties = async () => {
  try {
    // ... 省略 ...
    
    // クエリパラメータを構築
    const params = new URLSearchParams({
      limit: '20',
      offset: offset.toString(),
      // ⚠️ 重要: 一覧画面では画像を表示する（skipImagesは使用しない）
      // 地図表示のみskipImages=trueを使用
    });
    
    // ... 省略 ...
  }
};
```

**重要なポイント**:
- `skipImages`パラメータは**含めない**
- コメントで「一覧画面では画像を表示する」と明記

---

### `fetchAllProperties()`メソッド（地図表示用）

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**正しいコード**:
```typescript
const fetchAllProperties = async () => {
  try {
    // ... 省略 ...
    
    // クエリパラメータを構築
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      // 座標がある物件のみを取得するフラグを追加
      withCoordinates: 'true',
      // 画像取得をスキップして高速化（地図表示用）
      skipImages: 'true',  // ✅ 地図表示のみOK
    });
    
    // ... 省略 ...
  }
};
```

**重要なポイント**:
- 地図表示では`skipImages=true`を使用してOK
- 一覧画面とは別のメソッド

---

## 📋 チェックリスト

コードを変更する前に、以下を確認してください：

- [ ] `fetchProperties()`メソッドに`skipImages`パラメータを追加していないか？
- [ ] 一覧画面で画像が表示されるか？
- [ ] 初回ロード速度改善のために画像取得をスキップしていないか？

**全てのチェックがOKの場合のみ、コードを変更してください。**

---

## 🔍 問題が発生した場合の対処法

### 症状: 一覧画面に画像が表示されない

**原因**: `fetchProperties()`に`skipImages=true`が追加されている

**解決策**:
1. `frontend/src/pages/PublicPropertiesPage.tsx`を開く
2. `fetchProperties()`メソッドを探す
3. `skipImages: 'true'`を削除
4. コミット・プッシュ

**復元コマンド**:
```bash
# 動作確認済みコミットに戻す
git checkout 38413e1 -- frontend/src/pages/PublicPropertiesPage.tsx
git add frontend/src/pages/PublicPropertiesPage.tsx
git commit -m "Restore: List view images (commit 38413e1)"
git push
```

---

## 🎯 初回ロード速度の改善方法

一覧画面の初回ロード速度を改善したい場合は、以下の方法を使用してください：

### 方法1: 並列処理の最適化（既に実装済み）

**ファイル**: `backend/src/services/PropertyListingService.ts`

**現在の設定**:
```typescript
const concurrencyLimit = 20; // 並列処理数
```

**効果**: 20件を並列で取得（既に最適化済み）

---

### 方法2: データベースの`image_url`カラムをバックフィル

**手順**:
1. 全物件の`image_url`をGoogle Driveから取得
2. データベースに保存
3. 以降は`image_url`から直接取得（高速）

**効果**: 業務リストスプレッドシートへのアクセスが不要になる

---

### 方法3: 遅延ロード（推奨しない）

**理由**: ユーザー体験が悪い（画像が後から表示される）

---

## 📚 関連ドキュメント

- [地図表示最適化](.kiro/steering/public-property-map-view-optimization.md)
- [セッション記録](.kiro/steering/archive/session-2026-01-25-map-view-optimization-deployment.md)

---

## まとめ

- **一覧画面では画像を必ず表示する**
- **`fetchProperties()`に`skipImages`を追加しない**
- **地図表示のみ`skipImages=true`を使用**
- **初回ロード速度改善は別の方法で行う**

**このルールを絶対に守ってください。**

---

**最終更新日**: 2026年1月25日  
**コミット**: `38413e1` - "Fix: Remove skipImages from fetchProperties() to ALWAYS show images in list view"  
**ステータス**: ✅ 一覧画面の画像表示が正常に動作中
