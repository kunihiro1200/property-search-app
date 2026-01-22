# リストビュー検索ボタン修正レポート

## 問題の概要

リストビューの黄色い「🔍 検索」ボタンを押しても、検索が実行されない問題が発生していました。

## 問題の詳細

### 症状
- 緑色の「📍 地図で検索」ボタンは正常に動作
- 黄色の「🔍 検索」ボタン（UnifiedSearchBar内）を押しても検索が実行されない
- 検索クエリを入力してEnterキーを押しても同様に動作しない

### 根本原因

`PublicPropertiesPage.tsx`の`useEffect`の依存配列に問題がありました：

```typescript
// ❌ 修正前（問題のあるコード）
const propertyNumberParam = searchParams.get('propertyNumber');
const locationParam = searchParams.get('location');
const typesParam = searchParams.get('types');

useEffect(() => {
  if (!isStateRestored) {
    return;
  }
  
  fetchProperties();
}, [currentPage, propertyNumberParam, locationParam, typesParam, minPrice, maxPrice, minAge, maxAge, showPublicOnly, isStateRestored]);
```

**問題点**:
1. `propertyNumberParam`、`locationParam`、`typesParam`は`searchParams`から取得されている
2. しかし、`searchParams`自体が依存配列に含まれていない
3. そのため、`searchParams`が変更されても、これらの変数が再計算されない
4. 結果として、検索ボタンを押してURLパラメータが変更されても、`useEffect`がトリガーされない

### 検索フローの説明

1. ユーザーが検索ボタンをクリック
2. `UnifiedSearchBar`の`onSubmit`イベントが発火
3. `handleSearch()`が呼ばれる（`PublicPropertiesPage.tsx` 行210）
4. `originalHandleSearch()`が呼ばれる（`useUnifiedSearch`フック）
5. `useUnifiedSearch`が`searchParams`を更新（URLパラメータを変更）
6. **ここで`useEffect`がトリガーされるべきだが、されなかった**
7. 結果として、`fetchProperties()`が呼ばれず、検索が実行されない

## 修正内容

### 修正1: `useEffect`の依存配列を簡素化

```typescript
// ✅ 修正後
useEffect(() => {
  // 状態復元が完了するまで待つ
  if (!isStateRestored) {
    return;
  }
  
  fetchProperties();
}, [currentPage, searchParams, isStateRestored]);
```

**変更点**:
- 依存配列から個別のパラメータ（`propertyNumberParam`、`locationParam`など）を削除
- 代わりに`searchParams`自体を依存配列に追加
- これにより、`searchParams`が変更されると自動的に`useEffect`がトリガーされる

### 修正2: 全件取得の`useEffect`も同様に修正

```typescript
// ✅ 修正後
useEffect(() => {
  // 状態復元が完了するまで待つ
  if (!isStateRestored) {
    return;
  }
  
  fetchAllProperties();
}, [searchParams, isStateRestored]);
```

## テスト結果

### テストケース1: 所在地検索
1. 検索バーに「大分市」と入力
2. 黄色の「🔍 検索」ボタンをクリック
3. **結果**: ✅ 検索が実行され、大分市の物件が表示される

### テストケース2: 物件番号検索
1. 検索バーに「AA13129」と入力
2. Enterキーを押す
3. **結果**: ✅ 検索が実行され、該当物件が表示される

### テストケース3: 地図ビューとの連携
1. 検索バーに「別府市」と入力
2. 黄色の「🔍 検索」ボタンをクリック
3. 緑色の「📍 地図で検索」ボタンをクリック
4. **結果**: ✅ 地図ビューに別府市の物件が表示される

## デプロイ情報

- **デプロイ日時**: 2025-01-21
- **デプロイID**: `3bi7XuxbkyqCnan5HK9Rkd9Tatg`
- **本番URL**: https://property-site-frontend-kappa.vercel.app

## 修正ファイル

- `frontend/src/pages/PublicPropertiesPage.tsx`
  - 行289-293: `fetchProperties()`の`useEffect`の依存配列を修正
  - 行296-303: `fetchAllProperties()`の`useEffect`の依存配列を修正

## 今後の改善提案

### 1. 依存配列の管理を簡素化

現在の実装では、`searchParams`から個別のパラメータを取得していますが、これは不要です。`fetchProperties()`内で直接`searchParams.get()`を呼び出すことで、依存配列を簡素化できます。

### 2. デバウンス処理の見直し

`useUnifiedSearch`フックでは500msのデバウンス処理がありますが、検索ボタンをクリックした場合は即座に検索を実行すべきです。現在の実装では、`handleSearch()`でデバウンスタイマーをクリアしていますが、これが正しく動作しているか確認が必要です。

### 3. ローディング状態の改善

検索実行中は、検索ボタンにローディングインジケーターを表示すると、ユーザーエクスペリエンスが向上します。

## まとめ

リストビューの検索ボタンが動作しない問題は、`useEffect`の依存配列に`searchParams`が含まれていなかったことが原因でした。依存配列を修正することで、検索ボタンをクリックしたときに正しく`fetchProperties()`が呼ばれるようになりました。

この修正により、以下の機能が正常に動作するようになりました：
- ✅ 黄色の「🔍 検索」ボタンでの検索
- ✅ Enterキーでの検索
- ✅ 所在地検索と物件番号検索の自動判定
- ✅ 地図ビューとの連携
