# Google Maps マーカー表示修正ガイド

## ⚠️ 問題の症状

以下の症状が発生した場合、このガイドを使用してください：

1. **Google Mapは表示されるが、ピン（マーカー）が表示されない**
2. **地図の中心は正しい位置だが、赤いピンがない**
3. **ブラウザのコンソールにエラーは表示されない**

---

## ✅ 正しい動作

- **Google Mapが表示される**
- **物件の位置に赤いピンが表示される**
- **ピンをクリックすると物件の住所が表示される**

---

## 🔧 復元方法

### 方法1: コミットから復元（推奨）

**フロントエンド**:
```bash
# 動作確認済みコミット: 7445465
git checkout 7445465 -- frontend/src/pages/PublicPropertyDetailPage.tsx
git add frontend/src/pages/PublicPropertyDetailPage.tsx
git commit -m "Restore: Fix Google Maps marker display (commit 7445465)"
```

**バックエンド**:
```bash
# 動作確認済みコミット: 3d6088d
git checkout 3d6088d -- backend/api/index.ts
git add backend/api/index.ts
git commit -m "Restore: Add url-redirect endpoint (commit 3d6088d)"
```

**プッシュ**:
```bash
git push
```

### 方法2: 手動で修正

**ファイル**: `frontend/src/pages/PublicPropertyDetailPage.tsx`

**修正箇所**: Markerコンポーネント（約716行目）

**重要なポイント**:
```typescript
<Marker
  position={{
    lat: mapCoordinates.lat,
    lng: mapCoordinates.lng,
  }}
  title={property.address}
  onLoad={(marker) => {
    console.log('🗺️ [Marker Loaded] Marker instance created:', marker);
  }}
  onClick={() => {
    console.log('🗺️ [Marker Clicked] Marker was clicked');
  }}
/>
```

**重要**:
- ❌ `key`プロパティは使用しない（動的なkeyは問題を引き起こす）
- ✅ `onLoad`コールバックを追加（マーカー作成を確認）
- ✅ `onClick`コールバックを追加（マーカーがクリック可能か確認）

---

## 📝 次回の復元依頼の仕方

問題が発生したら、以下のように伝えてください：

### パターン1: シンプルな依頼
```
地図のピンが表示されない。
コミット b67e7fd に戻して。
```

### パターン2: 詳細な依頼
```
Google Mapは表示されるが、ピン（マーカー）が表示されない。
PublicPropertyDetailPage.tsxのMarkerコンポーネントを修正して。
```

### パターン3: ファイル名を指定
```
PublicPropertyDetailPage.tsxの地図マーカー表示を修正して。
```

---

## 🔍 確認方法

### ステップ1: ブラウザをハードリロード

```
Ctrl + Shift + R
```

### ステップ2: ブラウザのコンソールでログを確認

**期待されるログ**:
```
🗺️ [Map Coordinates] Successfully extracted: {lat: 33.2955434, lng: 131.4928871}
🗺️ [Rendering Map] mapCoordinates: ... isMapLoaded: true
🗺️ [Map Loaded] Map instance created
🗺️ [Rendering Marker] position: {lat: 33.2955434, lng: 131.4928871}
🗺️ [Marker Loaded] Marker instance created: ...
```

**最も重要なログ**: `🗺️ [Marker Loaded] Marker instance created: ...`

このログが表示されない場合は、マーカーコンポーネントが作成されていません。

### ステップ3: 地図を確認

1. 物件詳細ページを開く（例: CC100）
2. 「Google Mapで見る」ボタンの下に地図が表示される
3. 地図の中心に赤いピンが表示される
4. ピンをクリックすると物件の住所が表示される

---

## 📊 Git履歴

### 成功したコミット

**コミットハッシュ**: `b67e7fd` → `7445465` → `3d6088d`

**コミットメッセージ**: 
- `b67e7fd`: "Debug: Add onLoad callbacks to GoogleMap and Marker to verify component creation"
- `7445465`: "Fix: Use direct Google Maps API to create marker instead of Marker component"
- `3d6088d`: "Fix: Add /api/url-redirect/resolve endpoint for shortened URL resolution in production"

**変更内容**:
```
1 file changed, 40 insertions(+), 26 deletions(-)
```

**変更ファイル**:
- `frontend/src/pages/PublicPropertyDetailPage.tsx`

**日付**: 2026年1月27日

---

## 🎯 重要なポイント

### 実装の要点

1. **Google Map URLから座標を抽出**:
   - `extractCoordinatesFromGoogleMapUrl()`関数を使用
   - 複数のURL形式に対応（`?q=`, `/search/`, `/place/`, `/@`）
   - 短縮URL（goo.gl）はバックエンド経由で解決

2. **Markerコンポーネントの設定**:
   - `position`プロパティで座標を指定
   - `title`プロパティで物件の住所を指定
   - `onLoad`コールバックでマーカー作成を確認
   - `onClick`コールバックでクリック可能か確認
   - **`key`プロパティは使用しない**

3. **座標の優先順位**:
   - 1. データベースの座標（`property.latitude`, `property.longitude`）
   - 2. Google Map URLから抽出した座標
   - 3. 住所から取得（未実装）

---

## 🐛 トラブルシューティング

### 問題1: 修正したのにピンが表示されない

**原因**: ブラウザのキャッシュ

**解決策**:
1. `Ctrl + Shift + R`でハードリロード
2. シークレットモードで確認
3. ブラウザのキャッシュをクリア

### 問題2: 「Marker Loaded」ログが表示されない

**原因**: Markerコンポーネントが作成されていない

**解決策**:
```bash
# 動作確認済みコミットに戻す
git checkout b67e7fd -- frontend/src/pages/PublicPropertyDetailPage.tsx
git add frontend/src/pages/PublicPropertyDetailPage.tsx
git commit -m "Restore: Fix Google Maps marker display (commit b67e7fd)"
git push
```

### 問題3: 地図自体が表示されない

**原因**: Google Maps APIキーの問題

**確認方法**:
```bash
# .env.localファイルを確認
Get-Content frontend/.env.local | Select-String -Pattern "VITE_GOOGLE_MAPS_API_KEY"
```

**解決策**:
- Google Maps APIキーが正しく設定されているか確認
- APIキーが有効か確認
- APIキーの制限設定を確認（`localhost:5173`が許可されているか）

---

## 📚 関連ファイル

- `frontend/src/pages/PublicPropertyDetailPage.tsx` - メイン実装
- `backend/src/routes/urlRedirect.ts` - 短縮URL解決エンドポイント
- `backend/api/index.ts` - 本番環境用エンドポイント

---

## ✅ 復元完了チェックリスト

修正後、以下を確認してください：

- [ ] `Marker`コンポーネントに`onLoad`コールバックがある
- [ ] `Marker`コンポーネントに`onClick`コールバックがある
- [ ] `Marker`コンポーネントに`key`プロパティがない
- [ ] コミットメッセージに「marker display」が含まれている
- [ ] GitHubにプッシュ済み
- [ ] Vercelのデプロイが完了している
- [ ] ブラウザでハードリロード済み
- [ ] 地図にピンが表示される
- [ ] ピンをクリックすると住所が表示される

---

## 🎯 まとめ

### 修正内容

**3つの変更**:
1. `key`プロパティを削除
2. `onLoad`コールバックを追加
3. `onClick`コールバックを追加

### 次回の復元依頼

**最もシンプルな依頼**:
```
地図のピンが表示されない。
フロントエンド: コミット 7445465
バックエンド: コミット 3d6088d
に戻して。
```

### 重要なポイント

- **`key`プロパティは使用しない**
- **`onLoad`コールバックでマーカー作成を確認**
- **ブラウザのコンソールでログを確認**

---

**このドキュメントは、問題が発生した際の復元用です。必ず保管してください。**

**最終更新日**: 2026年1月27日  
**コミットハッシュ**: `b67e7fd`  
**ステータス**: ✅ 修正完了・動作確認済み
