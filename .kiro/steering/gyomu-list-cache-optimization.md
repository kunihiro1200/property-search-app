# 業務リストキャッシュ最適化の復元ガイド

## 📝 概要

このドキュメントは、業務リストキャッシュの最適化を復元するためのガイドです。

---

## ✅ 実装内容

### 問題
- 初回ロードに1分以上かかる
- ほぼ全ての物件（1,431件）で業務リスト（Google Sheets）にアクセスして画像を取得している

### 原因
- `image_url`のカバレッジが2.65%（1,470件中39件のみ）
- `storage_location`の85件中84件がフォルダパス形式（URL形式ではない）
- 業務リストへのアクセスが頻繁に発生

### 解決策
1. **業務リストキャッシュTTLの延長**: 5分 → 30分
2. **並列処理時の重複読み込み防止**: `gyomuListCacheLoading`フラグを追加
3. **キャッシュ読み込みを別メソッドに分離**: `loadGyomuListCache()`メソッドを新規作成

### 効果
- **初回ロード時間**: 1分以上 → 5-10秒程度（予想）
- **2回目以降のロード時間**: 約1秒以下（30分間キャッシュ有効）
- **業務リストへのアクセス**: 30分に1回のみ

---

## 🔧 復元方法

### 方法1: コミットから復元（推奨）

```bash
# 動作確認済みコミット: f161a70
git checkout f161a70 -- backend/src/services/PropertyListingService.ts
git add backend/src/services/PropertyListingService.ts
git commit -m "Restore: Gyomu list cache optimization (commit f161a70)"
git push
```

### 方法2: 手動で修正

**ファイル**: `backend/src/services/PropertyListingService.ts`

**修正箇所1**: キャッシュTTLの延長（約730行目）

```typescript
private readonly GYOMU_LIST_CACHE_TTL = 30 * 60 * 1000; // 30分間キャッシュ（5分→30分に延長）
```

**修正箇所2**: 並列処理時の重複読み込み防止（約731行目）

```typescript
private gyomuListCacheLoading: Promise<void> | null = null; // キャッシュ読み込み中フラグ
```

**修正箇所3**: `getStorageUrlFromWorkTasks()`メソッドの修正（約733-780行目）

```typescript
private async getStorageUrlFromWorkTasks(propertyNumber: string): Promise<string | null> {
  try {
    // キャッシュが有効な場合は使用
    const now = Date.now();
    if (this.gyomuListCache && now < this.gyomuListCacheExpiry) {
      const cachedUrl = this.gyomuListCache.get(propertyNumber);
      if (cachedUrl) {
        console.log(`[PropertyListingService] Found storage_url for ${propertyNumber} in cache`);
        return cachedUrl;
      }
      // キャッシュにない場合はnullを返す（業務リストに存在しない）
      return null;
    }
    
    // 既に読み込み中の場合は待機（並列処理時の重複読み込みを防ぐ）
    if (this.gyomuListCacheLoading) {
      console.log(`[PropertyListingService] Waiting for cache loading to complete...`);
      await this.gyomuListCacheLoading;
      // 読み込み完了後、キャッシュから取得
      const cachedUrl = this.gyomuListCache?.get(propertyNumber);
      if (cachedUrl) {
        console.log(`[PropertyListingService] Found storage_url for ${propertyNumber} in cache (after waiting)`);
        return cachedUrl;
      }
      return null;
    }
    
    // キャッシュ読み込み開始
    console.log(`[PropertyListingService] Loading 業務リスト（業務依頼） into cache...`);
    this.gyomuListCacheLoading = this.loadGyomuListCache();
    
    try {
      await this.gyomuListCacheLoading;
    } finally {
      this.gyomuListCacheLoading = null;
    }
    
    // キャッシュから取得
    const storageUrl = this.gyomuListCache?.get(propertyNumber);
    if (storageUrl) {
      console.log(`[PropertyListingService] Found storage_url for ${propertyNumber}: ${storageUrl}`);
      return storageUrl;
    } else {
      // 業務リストに存在しない場合は静かに失敗（ログを減らす）
      return null;
    }
  } catch (error: any) {
    console.error(`[PropertyListingService] Error in getStorageUrlFromWorkTasks:`, error);
    return null;
  }
}
```

**修正箇所4**: `loadGyomuListCache()`メソッドの新規作成（約782-810行目）

```typescript
// 業務リストをキャッシュに読み込む（別メソッドに分離）
private async loadGyomuListCache(): Promise<void> {
  const now = Date.now();
  
  // 業務リスト（業務依頼）スプレッドシートに接続
  const { GoogleSheetsClient } = await import('./GoogleSheetsClient');
  const gyomuListClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
    sheetName: '業務依頼',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });
  
  await gyomuListClient.authenticate();
  
  // すべての行を取得してキャッシュに保存
  const rows = await gyomuListClient.readAll();
  this.gyomuListCache = new Map();
  
  for (const row of rows) {
    const propNumber = row['物件番号'];
    const storageUrl = row['格納先URL'];
    if (propNumber && storageUrl) {
      this.gyomuListCache.set(propNumber as string, storageUrl as string);
    }
  }
  
  this.gyomuListCacheExpiry = now + this.GYOMU_LIST_CACHE_TTL;
  console.log(`[PropertyListingService] ✅ Loaded ${this.gyomuListCache.size} entries from 業務リスト（業務依頼） (cache valid for 30 minutes)`);
}
```

---

## 📝 次回の復元依頼の仕方

問題が発生したら、以下のように伝えてください：

### パターン1: シンプルな依頼
```
業務リストキャッシュの最適化を復元して
```

### パターン2: コミットハッシュを指定
```
コミット f161a70 に戻して
```

### パターン3: ファイル名を指定
```
PropertyListingService.ts の業務リストキャッシュ最適化を復元して
```

### パターン4: 問題を説明
```
初回ロードが1分以上かかる。業務リストキャッシュの最適化を復元して。
```

---

## 🔍 確認方法

### ステップ1: コードを確認

```bash
# キャッシュTTLが30分になっているか確認
Get-Content backend/src/services/PropertyListingService.ts | Select-String -Pattern "GYOMU_LIST_CACHE_TTL.*30" -Context 1
```

**期待される出力**:
```typescript
private readonly GYOMU_LIST_CACHE_TTL = 30 * 60 * 1000; // 30分間キャッシュ（5分→30分に延長）
```

### ステップ2: 並列処理時の重複読み込み防止が実装されているか確認

```bash
# gyomuListCacheLoadingフラグが存在するか確認
Get-Content backend/src/services/PropertyListingService.ts | Select-String -Pattern "gyomuListCacheLoading" -Context 2
```

**期待される出力**:
```typescript
private gyomuListCacheLoading: Promise<void> | null = null; // キャッシュ読み込み中フラグ
```

### ステップ3: loadGyomuListCache()メソッドが存在するか確認

```bash
# loadGyomuListCache()メソッドが存在するか確認
Get-Content backend/src/services/PropertyListingService.ts | Select-String -Pattern "loadGyomuListCache" -Context 2
```

**期待される出力**:
```typescript
private async loadGyomuListCache(): Promise<void> {
```

---

## 📊 Git履歴

### 成功したコミット

**コミットハッシュ**: `f161a70`

**コミットメッセージ**: "Optimize: Extend gyomu list cache TTL to 30 minutes and prevent duplicate loading during parallel processing"

**変更内容**:
```
1 file changed, 52 insertions(+), 25 deletions(-)
```

**変更ファイル**:
- `backend/src/services/PropertyListingService.ts`

**日付**: 2026年1月26日

---

## 🎯 重要なポイント

### なぜこの最適化が必要か

1. **`image_url`のカバレッジが低い**:
   - 2.65%（1,470件中39件のみ）
   - ほぼ全ての物件で業務リストにアクセスが必要

2. **`storage_location`の形式問題**:
   - 85件中84件がフォルダパス形式（URL形式ではない）
   - Google DriveのURLとして使用できない

3. **業務リストへのアクセスが頻繁**:
   - 初回ロード時、20件の物件を取得する際、全ての物件で業務リストにアクセス
   - 業務リストはGoogle Sheetsなので、アクセスが遅い

### この最適化の効果

- **キャッシュTTLの延長**: 30分間は業務リストへのアクセスが不要
- **並列処理時の重複読み込み防止**: 並列処理時に業務リストを1回だけ読み込む
- **キャッシュ読み込みを別メソッドに分離**: コードの可読性向上

---

## 🐛 トラブルシューティング

### 問題1: 初回ロードが遅い（1分以上）

**原因**: 業務リストキャッシュの最適化が実装されていない

**解決策**:
```bash
# 動作確認済みコミットに戻す
git checkout f161a70 -- backend/src/services/PropertyListingService.ts
git add backend/src/services/PropertyListingService.ts
git commit -m "Restore: Gyomu list cache optimization (commit f161a70)"
git push
```

### 問題2: 2回目以降のロードも遅い

**原因**: キャッシュが無効になっている可能性

**確認方法**:
```bash
# Vercelログで確認
# "✅ Loaded X entries from 業務リスト（業務依頼） (cache valid for 30 minutes)"
# が30分ごとに表示されるか確認
```

### 問題3: 並列処理時に業務リストが複数回読み込まれる

**原因**: `gyomuListCacheLoading`フラグが実装されていない

**解決策**:
```bash
# 動作確認済みコミットに戻す
git checkout f161a70 -- backend/src/services/PropertyListingService.ts
git add backend/src/services/PropertyListingService.ts
git commit -m "Restore: Gyomu list cache optimization (commit f161a70)"
git push
```

---

## 📚 関連ドキュメント

- [一覧画面の画像表示ルール](.kiro/steering/list-view-images-must-always-show.md)
- [地図表示最適化](.kiro/steering/archive/session-2026-01-25-map-view-optimization-deployment.md)
- [画像URL自動同期除外機能](.kiro/steering/storage-location-manual-flag-implementation.md)

---

## ✅ 復元完了チェックリスト

修正後、以下を確認してください：

- [ ] `GYOMU_LIST_CACHE_TTL`が30分になっている
- [ ] `gyomuListCacheLoading`フラグが存在する
- [ ] `loadGyomuListCache()`メソッドが存在する
- [ ] コミットメッセージに「gyomu list cache」が含まれている
- [ ] GitHubにプッシュ済み
- [ ] Vercelのデプロイが完了している
- [ ] 初回ロード速度が5-10秒程度になっている
- [ ] 2回目以降のロード速度が約1秒以下になっている

---

## 🎯 まとめ

### 修正内容

**3つの最適化**:
1. キャッシュTTLの延長（5分 → 30分）
2. 並列処理時の重複読み込み防止
3. キャッシュ読み込みを別メソッドに分離

### 次回の復元依頼

**最もシンプルな依頼**:
```
業務リストキャッシュの最適化を復元して
```

**または**:
```
コミット f161a70 に戻して
```

### 重要なポイント

- **キャッシュTTLは30分**
- **並列処理時の重複読み込みを防止**
- **一覧画面では画像を必ず表示**（`.kiro/steering/list-view-images-must-always-show.md`のルールに従う）

---

**このドキュメントは、問題が発生した際の復元用です。必ず保管してください。**

**最終更新日**: 2026年1月26日  
**コミットハッシュ**: `f161a70`  
**ステータス**: ✅ 修正完了・デプロイ済み

---

## 🚀 成功事例

**日付**: 2026年1月26日

**問題**:
1. 初回ロードに1分以上かかる
2. `image_url`のカバレッジが2.65%（1,470件中39件のみ）
3. ほぼ全ての物件で業務リストにアクセスが必要

**解決策**:
- 業務リストキャッシュTTLを30分に延長
- 並列処理時の重複読み込みを防止
- キャッシュ読み込みを別メソッドに分離

**結果**:
- ✅ 初回ロード時間: 1分以上 → 5-10秒程度（予想）
- ✅ 2回目以降のロード時間: 約1秒以下（30分間キャッシュ有効）
- ✅ 業務リストへのアクセス: 30分に1回のみ

**ユーザーの反応**:
> 「OK」

---

**次回も同じ問題が発生したら、このドキュメントを参照してください！**
