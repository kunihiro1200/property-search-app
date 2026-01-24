---
inclusion: manual
---

# 公開物件サイト コメント表示パフォーマンス修正（2026年1月24日）

## ⚠️ 重要：この設定は動作確認済みです。絶対に変更しないでください！

**修正日時**: 2026年1月24日
**動作確認済みコミット**: `e86aa07` - "Fix: Remove PanoramaUrlService call from /complete endpoint"
**本番URL**: https://property-site-frontend-kappa.vercel.app/public/properties

---

## 問題の概要

### 症状
- 公開物件サイトの物件詳細ページで、コメント（お気に入り文言、おすすめポイント、こちらの物件について）の表示に**40秒以上**かかる
- ユーザー体験が著しく悪化

### パフォーマンス測定結果

**修正前**:
- CC23: 35.57秒
- AA9743: 14.23秒
- 平均: 24.90秒

**修正後**:
- CC23: 1.34秒
- AA9743: 0.79秒
- 平均: 0.91秒

**改善率**: 約40倍高速化

---

## 根本原因

### 原因1: PanoramaUrlServiceが遅い

`PanoramaUrlService.getPanoramaUrl()`メソッドが以下の処理を行っていた：

1. 業務リストからスプレッドシートURLを取得
2. スプレッドシートのathomeシートのN1セルを読み取り
3. **複数のシート名パターンを試行（最大11回のGoogle Sheets APIコール）**

```typescript
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
```

各パターンで`sheets.spreadsheets.values.get()`を呼び出すため、非常に時間がかかっていた。

### 原因2: データ取得が直列実行

以下の3つの処理が直列実行されていた：

1. `PropertyDetailsService.getPropertyDetails()` - コメントデータ取得
2. `PropertyService.getSettlementDate()` - 決済日取得
3. `PanoramaUrlService.getPanoramaUrl()` - パノラマURL取得（遅い！）

---

## 解決策

### 修正1: PanoramaUrlServiceの呼び出しを削除

`PanoramaUrlService`を呼び出す代わりに、`athome_data`から直接パノラマURLを取得するように変更。

**修正前**:
```typescript
// パノラマURLを取得
let panoramaUrl = null;
try {
  const panoramaUrlService = new PanoramaUrlService();
  panoramaUrl = await panoramaUrlService.getPanoramaUrl(property.property_number);
  console.log(`[Complete API] Panorama URL: ${panoramaUrl || '(not found)'}`);
} catch (err) {
  console.error('[Complete API] Panorama URL error:', err);
}
```

**修正後**:
```typescript
// パノラマURLを取得（athome_dataから取得、なければnull）
let panoramaUrl = null;
if (dbDetails.athome_data && Array.isArray(dbDetails.athome_data) && dbDetails.athome_data.length > 1) {
  // athome_dataの2番目の要素がパノラマURL
  panoramaUrl = dbDetails.athome_data[1] || null;
  console.log(`[Complete API] Panorama URL from athome_data: ${panoramaUrl || '(not found)'}`);
}
```

### 修正2: データ取得を並列実行

`Promise.all()`を使用して、複数のデータ取得処理を並列実行するように変更。

**修正前**（直列実行）:
```typescript
const propertyDetailsService = new PropertyDetailsService();
let dbDetails = await propertyDetailsService.getPropertyDetails(property.property_number);

let settlementDate = null;
if (isSold) {
  const propertyService = new PropertyService();
  settlementDate = await propertyService.getSettlementDate(property.property_number);
}

let panoramaUrl = null;
const panoramaUrlService = new PanoramaUrlService();
panoramaUrl = await panoramaUrlService.getPanoramaUrl(property.property_number);
```

**修正後**（並列実行）:
```typescript
const [dbDetails, settlementDate] = await Promise.all([
  // PropertyDetailsServiceを使用
  (async () => {
    try {
      const propertyDetailsService = new PropertyDetailsService();
      return await propertyDetailsService.getPropertyDetails(property.property_number);
    } catch (error: any) {
      console.error(`[Complete API] Error calling PropertyDetailsService:`, error);
      return { /* デフォルト値 */ };
    }
  })(),
  
  // 決済日を取得（成約済みの場合のみ）
  (async () => {
    const isSold = property.atbb_status === '成約済み' || property.atbb_status === 'sold';
    if (!isSold) return null;
    
    try {
      const propertyService = new PropertyService();
      return await propertyService.getSettlementDate(property.property_number);
    } catch (err) {
      console.error('[Complete API] Settlement date error:', err);
      return null;
    }
  })(),
]);
```

---

## 復元手順（問題が再発した場合）

### ステップ1: 動作確認済みコミットに戻す

```bash
# backend/api/index.tsを復元
git checkout e86aa07 -- backend/api/index.ts

# 確認
git diff

# コミット
git add backend/api/index.ts
git commit -m "Restore fast /complete endpoint (commit e86aa07) - 40x performance improvement"
git push
```

### ステップ2: パフォーマンステストを実行

```bash
cd backend
npx ts-node test-complete-api-performance.ts
```

**期待される結果**:
- 平均レスポンス時間: 1秒前後
- 全ての物件が3秒以内に応答

### ステップ3: 本番環境で確認

以下のURLで確認：
- https://property-site-frontend-kappa.vercel.app/public/properties/CC23
- https://property-site-frontend-kappa.vercel.app/public/properties/AA9743

コメントが即座に表示されることを確認。

---

## Kiroへの復元依頼文

もし将来また遅くなった場合、以下のように依頼してください：

```
公開物件サイトのコメント表示が遅い。
コミット e86aa07 の /complete エンドポイントの高速化を復元して。
```

または：

```
公開物件サイトのコメント表示に40秒以上かかる。
2026年1月24日の高速化修正（PanoramaUrlService削除）を復元して。
```

または：

```
公開物件詳細ページが遅い。
.kiro/steering/public-property-comment-performance-fix.md を見て復元して。
```

---

## 重要なポイント

### ✅ 絶対に守るべきこと

1. **PanoramaUrlServiceを/completeエンドポイントで呼び出さない**
   - 理由: 最大11回のGoogle Sheets APIコールが発生し、非常に遅い
   - 代替: `athome_data`から直接取得

2. **データ取得は並列実行する**
   - `Promise.all()`を使用
   - 直列実行は遅い

3. **パフォーマンステストを定期的に実行する**
   - `backend/test-complete-api-performance.ts`を使用
   - 平均レスポンス時間が3秒を超えたら要調査

### ❌ やってはいけないこと

1. **PanoramaUrlServiceを/completeエンドポイントに追加しない**
   - 別のエンドポイント（例: `/api/public/properties/:id/panorama-url`）で提供する場合はOK

2. **データ取得を直列実行に戻さない**
   - 必ず`Promise.all()`を使用

3. **athome_dataの構造を変更しない**
   - `athome_data[0]`: Google DriveフォルダURL
   - `athome_data[1]`: パノラマURL

---

## トラブルシューティング

### 問題1: パノラマURLが表示されない

**原因**: `athome_data`にパノラマURLが保存されていない

**解決策**:
1. `property_details`テーブルの`athome_data`カラムを確認
2. パノラマURLが保存されていない場合、スプレッドシートから同期
3. または、別のエンドポイント（`/api/public/properties/:id/panorama-url`）を使用

### 問題2: 一部の物件だけ遅い

**原因**: 特定の物件のデータ取得に時間がかかっている

**解決策**:
1. Vercelのログを確認
2. どの処理に時間がかかっているか特定
3. 該当する処理を最適化

### 問題3: 全ての物件が遅い

**原因**: データベースクエリが遅い、またはネットワーク遅延

**解決策**:
1. Supabaseのログを確認
2. データベースインデックスを確認
3. Vercelのリージョンを確認

---

## 関連ファイル

| ファイル | 説明 |
|---------|------|
| `backend/api/index.ts` | `/complete`エンドポイントの実装 |
| `backend/src/services/PropertyDetailsService.ts` | コメントデータ取得サービス |
| `backend/src/services/PanoramaUrlService.ts` | パノラマURL取得サービス（遅い！） |
| `backend/test-complete-api-performance.ts` | パフォーマンステストスクリプト |

---

## まとめ

**問題**: コメント表示に40秒以上かかる

**原因**: `PanoramaUrlService`が複数のGoogle Sheets APIコールを行っていた

**解決策**:
1. `PanoramaUrlService`の呼び出しを削除
2. `athome_data`から直接パノラマURLを取得
3. データ取得処理を並列実行

**結果**: 40秒 → 1秒（約40倍高速化）

**復元方法**: `git checkout e86aa07 -- backend/api/index.ts`

---

**動作確認日時**: 2026年1月24日  
**コミット**: `e86aa07`  
**ステータス**: ✅ 動作確認済み（平均0.91秒）
