# CC100同期問題とGoogle Sheets APIクォータ対策の完了報告書

## 📋 概要

CC100が公開物件サイトでパノラマとおすすめポイントが表示されない問題を調査し、根本原因であるGoogle Sheets APIクォータ超過問題の解決策を実装しました。

---

## ✅ 完了した作業

### 1. CC100のパノラマとおすすめポイントの同期（完了）

**問題**: CC100が`property_listings`には存在するが、`property_details`にパノラマURL（`athome_data`）とおすすめポイント（`recommended_comments`）が欠けていた

**実装内容**:
- `backend/get-cc100-panorama-and-recommended.ts`: データ取得スクリプト作成
- `backend/sync-cc100-panorama-and-recommended.ts`: データベース同期スクリプト作成・実行
- CC100のパノラマURL: `https://vrpanorama.athome.jp/panoramas/_NRVz-g2jZ/embed?from=at&user_id=80401786`
- おすすめポイント: 13件取得・保存完了

**結果**: ✅ CC100のパノラマとおすすめポイントが正常に表示されるようになりました

---

### 2. スプレッドシートキャッシュの実装（完了）

**問題**: Google Sheets APIのクォータ超過により、自動同期が頻繁に失敗していた

**実装内容**:
- `EnhancedAutoSyncService.ts`にスプレッドシートキャッシュを実装
- キャッシュTTL: 15分間
- 全ての`readAll()`呼び出しを`getSpreadsheetData()`に置き換え
- キャッシュが有効な場合は再取得をスキップ

**効果**:
- Google Sheets APIリクエスト数: **大幅に削減**（15分間で1回のみ）
- 自動同期間隔: 15分（既に設定済み）
- クォータ超過の可能性: **大幅に削減**

**コミット**: `4263e58` - "Optimize: Add 15-minute spreadsheet cache to EnhancedAutoSyncService to reduce Google Sheets API quota usage"

---

## 📊 実装の詳細

### データ取得元の定義

**詳細なマッピング**: `backend/PROPERTY_DATA_SOURCE_MAPPING.md`を参照してください。

このドキュメントには、以下の情報が含まれています：
- 各データ項目をどのスプレッドシートのどのセルから取得するか
- 物件種別ごとのおすすめポイント取得範囲
- 完全な実装例とコードサンプル
- よくある質問とトラブルシューティング

### スプレッドシートキャッシュの仕組み

```typescript
// キャッシュ関連のプロパティ
private spreadsheetCache: any[] | null = null;
private spreadsheetCacheExpiry: number = 0;
private readonly SPREADSHEET_CACHE_TTL = 15 * 60 * 1000; // 15分間キャッシュ

// スプレッドシートデータを取得（キャッシュ対応）
private async getSpreadsheetData(): Promise<any[]> {
  const now = Date.now();

  // キャッシュが有効な場合は使用
  if (this.spreadsheetCache && now < this.spreadsheetCacheExpiry) {
    console.log('📦 Using cached spreadsheet data');
    return this.spreadsheetCache;
  }

  // キャッシュが無効な場合は再取得
  console.log('🔄 Fetching fresh spreadsheet data...');
  const allRows = await this.sheetsClient!.readAll();
  this.spreadsheetCache = allRows;
  this.spreadsheetCacheExpiry = now + this.SPREADSHEET_CACHE_TTL;
  
  console.log(`✅ Spreadsheet data cached (${allRows.length} rows, valid for 15 minutes)`);
  return allRows;
}
```

### 修正されたメソッド

以下のメソッドで`readAll()`を`getSpreadsheetData()`に置き換えました：

1. `detectMissingSellers()` - 不足している売主を検出
2. `detectDeletedSellers()` - 削除された売主を検出
3. `syncMissingSellers()` - 不足している売主を同期
4. `syncUpdatedSellers()` - 既存売主のデータを更新
5. `detectUpdatedSellers()` - 更新が必要な売主を検出

---

## 🎯 効果の測定

### 実装前（キャッシュなし）

- **自動同期間隔**: 15分ごと
- **Google Sheets APIリクエスト数**: 15分ごとに5回（`detectMissingSellers`, `detectDeletedSellers`, `syncMissingSellers`, `syncUpdatedSellers`, `detectUpdatedSellers`）
- **1時間あたりのリクエスト数**: 約20回
- **クォータ超過**: 頻繁に発生（1分あたり60リクエスト制限）

### 実装後（キャッシュあり）

- **自動同期間隔**: 15分ごと
- **Google Sheets APIリクエスト数**: 15分ごとに1回（キャッシュから取得）
- **1時間あたりのリクエスト数**: 約4回（**80%削減**）
- **クォータ超過**: **大幅に削減**

---

## 🚀 次のステップ（長期的対応）

### 差分検出による増分同期の実装（未実装）

**目的**: 変更された行のみを同期することで、さらにAPIリクエスト数を削減

**実装手順**:

#### ステップ1: データベースに`last_synced_at`カラムを追加

**現在の状況**:
- ✅ `buyers`テーブル: `last_synced_at`カラムが存在（migration 054で追加済み）
- ❌ `property_listings`テーブル: `last_synced_at`カラムが**存在しない**
- ❌ `sellers`テーブル: `last_synced_at`カラムが**存在しない**

**必要な作業**:
```sql
-- property_listingsテーブルにlast_synced_atカラムを追加
ALTER TABLE property_listings ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;

-- sellersテーブルにlast_synced_atカラムを追加
ALTER TABLE sellers ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
```

#### ステップ2: スプレッドシートに「最終更新日時」カラムを追加

**実装方法**: Google Apps Scriptで自動更新

```javascript
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();
  
  // ヘッダー行は除外
  if (row === 1) return;
  
  // 最終更新日時カラム（例: Z列）に現在時刻を設定
  const lastUpdatedColumn = 26; // Z列
  sheet.getRange(row, lastUpdatedColumn).setValue(new Date());
}
```

#### ステップ3: `EnhancedAutoSyncService.ts`に差分検出ロジックを実装

```typescript
/**
 * 差分検出による増分同期
 * last_synced_atを使用して変更された行のみを取得
 */
async detectChangedSellers(): Promise<string[]> {
  // 最後の同期時刻を取得
  const lastSyncTime = await this.getLastSyncTime();
  
  // スプレッドシートから変更された行のみを取得
  const allRows = await this.getSpreadsheetData();
  const changedSellers: string[] = [];
  
  for (const row of allRows) {
    const sellerNumber = row['売主番号'];
    const lastUpdated = row['最終更新日時'];
    
    if (sellerNumber && lastUpdated && new Date(lastUpdated) > lastSyncTime) {
      changedSellers.push(sellerNumber);
    }
  }
  
  return changedSellers;
}
```

**効果**:
- 変更された行のみを同期（全件比較不要）
- APIリクエスト数: **さらに削減**
- 同期時間: **大幅に短縮**

---

## 📝 まとめ

### 完了した作業

1. ✅ CC100のパノラマとおすすめポイントの同期
2. ✅ スプレッドシートキャッシュの実装（15分間）
3. ✅ 自動同期間隔の延長（5分→15分、既に設定済み）

### 効果

- Google Sheets APIリクエスト数: **80%削減**
- クォータ超過の可能性: **大幅に削減**
- CC100のパノラマとおすすめポイント: **正常に表示**

### 今後の改善（オプション）

- 差分検出による増分同期の実装（長期的対応）
- `property_listings`と`sellers`テーブルに`last_synced_at`カラムを追加
- スプレッドシートに「最終更新日時」カラムを追加（Google Apps Script）

---

**最終更新日**: 2026年1月26日  
**コミット**: `4263e58`  
**ステータス**: ✅ スプレッドシートキャッシュ実装完了
