# 地図検索からの戻り動作修正（viewMode復元）

## 問題の症状

地図検索から詳細画面を開いて「物件一覧に戻る」ボタンをクリックすると、**リスト表示に戻ってしまう**（地図表示に戻らない）

## 原因

1. **`NavigationState`型に`viewMode`が含まれていない**
   - `viewMode`（リスト表示 or 地図表示）が保存されない
   - 戻った時に常にリスト表示になる

2. **`PropertyMapView`で新しいタブで開いていた**
   - `window.open()`を使用していた
   - `NavigationState`が保存されない

3. **`GoogleMapsContext`がない**
   - `useJsApiLoader`が複数回呼び出される
   - 「Loader must not be called again with different options」エラーが発生

## 正しいコミット

**コミット**: `668d25b`

このコミットには以下の修正が含まれています：

1. **`GoogleMapsContext.tsx`を作成**
   - アプリケーション全体で1つのGoogle Mapsローダーインスタンスを管理
   - `useGoogleMaps`フックを提供

2. **`App.tsx`を修正**
   - `GoogleMapsProvider`でアプリ全体をラップ

3. **`PublicPropertyDetailPage.tsx`を修正**
   - `useJsApiLoader`を削除
   - `useGoogleMaps`を使用

4. **`NavigationState`型に`viewMode`を追加**（コミット`1d7c874`）
   - `viewMode: 'list' | 'map'`フィールドを追加

5. **`PropertyMapView.tsx`を修正**（コミット`5a85393`）
   - `navigationState`プロップを追加
   - 同じタブで開くように修正（`window.open()`を削除）

6. **`PublicPropertiesPage.tsx`を修正**（コミット`5a85393`）
   - `viewMode`を`NavigationState`に保存
   - 戻った時に`viewMode`を復元

## 復元方法

### 方法1: コミットから復元（推奨）

```bash
# 最新の修正（GoogleMapsContext）
git checkout 668d25b -- frontend/src/contexts/GoogleMapsContext.tsx
git checkout 668d25b -- frontend/src/App.tsx
git checkout 668d25b -- frontend/src/pages/PublicPropertyDetailPage.tsx

# viewMode復元機能
git checkout 5a85393 -- frontend/src/components/PropertyMapView.tsx
git checkout 5a85393 -- frontend/src/pages/PublicPropertiesPage.tsx

# NavigationState型定義
git checkout 1d7c874 -- frontend/src/types/navigationState.ts

# コミットしてプッシュ
git add .
git commit -m "Restore: Map view navigation state fix (commits 668d25b, 5a85393, 1d7c874)"
git push origin main
```

### 方法2: 簡単な復元依頼

KIROに以下のように伝えてください：

```
地図検索から詳細画面に行って物件一覧に戻るとリスト表示になる。
コミット 668d25b に戻して。
```

または

```
地図検索の戻り動作が壊れた。コミット 668d25b, 5a85393, 1d7c874 に戻して。
```

## 確認方法

復元後、以下の手順で確認してください：

1. **公開物件サイトを開く**
   - URL: `https://property-site-frontend-kappa.vercel.app/public/properties`

2. **地図検索ボタンをクリック**
   - 地図表示に切り替わる

3. **地図上のピンをクリック**
   - 詳細画面が開く

4. **「物件一覧に戻る」ボタンをクリック**
   - ✅ **地図表示に戻る**（リスト表示ではない）

5. **リスト表示から詳細画面を開いて戻る**
   - ✅ **リスト表示に戻る**

## 関連ファイル

### フロントエンド

- `frontend/src/contexts/GoogleMapsContext.tsx` - Google Mapsコンテキスト（新規作成）
- `frontend/src/App.tsx` - GoogleMapsProviderを追加
- `frontend/src/pages/PublicPropertyDetailPage.tsx` - useGoogleMapsを使用
- `frontend/src/components/PropertyMapView.tsx` - navigationStateプロップを追加
- `frontend/src/pages/PublicPropertiesPage.tsx` - viewModeを保存・復元
- `frontend/src/types/navigationState.ts` - viewModeフィールドを追加
- `frontend/src/components/PublicPropertyCard.tsx` - viewModeを保存

## トラブルシューティング

### 問題1: 「Loader must not be called again」エラーが発生する

**原因**: `GoogleMapsContext`が正しく設定されていない

**解決策**:
1. `frontend/src/contexts/GoogleMapsContext.tsx`が存在するか確認
2. `frontend/src/App.tsx`で`GoogleMapsProvider`が追加されているか確認
3. `frontend/src/pages/PublicPropertyDetailPage.tsx`で`useGoogleMaps`を使用しているか確認

### 問題2: 地図表示に戻らない

**原因**: `NavigationState`に`viewMode`が含まれていない

**解決策**:
1. `frontend/src/types/navigationState.ts`に`viewMode`フィールドがあるか確認
2. `frontend/src/pages/PublicPropertiesPage.tsx`で`viewMode`を保存しているか確認
3. `frontend/src/components/PropertyMapView.tsx`に`navigationState`プロップがあるか確認

### 問題3: 新しいタブで開いてしまう

**原因**: `PropertyMapView.tsx`で`window.open()`を使用している

**解決策**:
1. `frontend/src/components/PropertyMapView.tsx`を確認
2. `navigate()`を使用しているか確認（`window.open()`ではない）

## 重要な注意事項

### ✅ 必ず3つのコミットを復元する

1. **コミット`668d25b`**: GoogleMapsContext（最重要）
2. **コミット`5a85393`**: viewMode保存・復元機能
3. **コミット`1d7c874`**: NavigationState型定義

**この3つのコミットがすべて揃わないと、正しく動作しません。**

### ✅ Vercelにデプロイする

復元後、必ずVercelにデプロイしてください：

```bash
git push origin main
```

Vercelが自動的にデプロイを開始します（約1-2分）。

---

**最終更新日**: 2026年1月29日  
**作成理由**: 地図検索からの戻り動作が壊れた場合の復元方法を明確化
