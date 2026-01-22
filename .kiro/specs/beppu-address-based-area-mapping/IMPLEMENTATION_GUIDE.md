# 別府市住所ベースエリアマッピング - 実装ガイド

## 概要

別府市内の物件に対して、住所から学校区や地域情報に基づいた詳細な配信エリア番号を自動的に振り分けるシステムです。

## システム構成

### データベース

**テーブル:** `beppu_area_mapping`

```sql
CREATE TABLE beppu_area_mapping (
  id SERIAL PRIMARY KEY,
  school_district TEXT NOT NULL,      -- 学校区名
  region_name TEXT NOT NULL,          -- 地域名
  distribution_areas TEXT NOT NULL,   -- 配信エリア番号
  other_region TEXT,                  -- その他地域情報
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### サービス

1. **BeppuAreaMappingService** (`backend/src/services/BeppuAreaMappingService.ts`)
   - 別府市の住所から配信エリア番号を取得
   - 地域名の抽出とデータベース検索

2. **PropertyDistributionAreaCalculator** (`backend/src/services/PropertyDistributionAreaCalculator.ts`)
   - 配信エリアの計算ロジック
   - 別府市の場合はBeppuAreaMappingServiceを使用

3. **PropertyListingService** (`backend/src/services/PropertyListingService.ts`)
   - 物件の住所更新時に配信エリアを再計算

## 使用方法

### 1. データベースセットアップ

Supabase SQL Editorで以下のSQLを実行:

```bash
# ファイルの内容をコピー
cat backend/migrations/048_add_beppu_area_mapping.sql
```

### 2. マッピングデータの投入

```bash
cd backend
npx ts-node populate-beppu-area-mapping.ts
```

**出力例:**
```
=== Beppu Area Mapping Data Population ===

Checking if beppu_area_mapping table exists...
✓ Table exists
Clearing existing data...
✓ Existing data cleared
Inserting 60 records...
  Inserted 50/60 records
  Inserted 60/60 records
✓ All data inserted successfully
Verifying inserted data...

Data summary by school district:
  青山中学校: 6 regions
  中部中学校: 30 regions
  北部中学校: 4 regions
  朝日中学校: 5 regions
  東山中学校: 3 regions
  鶴見台中学校: 2 regions
  別府西中学校: 2 regions
  別府駅周辺: 3 regions

Total: 60 regions
✓ Data verification complete

✅ Beppu area mapping data population completed successfully!
```

### 3. データの確認

```bash
npx ts-node verify-beppu-area-mapping.ts
```

### 4. 既存物件の一括更新

**Dry runモード（変更なし）:**
```bash
npx ts-node backfill-beppu-distribution-areas.ts --dry-run
```

**実際に更新:**
```bash
npx ts-node backfill-beppu-distribution-areas.ts --force
```

## 地域名抽出ロジック

### 優先順位

1. **丁目付き** (最優先)
   - 例: "東荘園4丁目", "石垣東１丁目"
   - パターン: `/([^\s]+?\d+丁目)/`

2. **区付き**
   - 例: "南立石一区", "亀川四の湯町１区"
   - パターン: `/([^\s]+?[一二三四五六七八九十１２３４５６７８９０]+区)/`

3. **町付き**
   - 例: "荘園北町", "亀川中央町"
   - パターン: `/([^\s]+?町)/`

4. **その他**
   - 例: "荘園", "鶴見", "観海寺"
   - パターン: `/^([^\s\d]+)/`

### 抽出例

| 住所 | 抽出される地域名 | 配信エリア |
|------|----------------|-----------|
| 別府市南立石一区1-2-3 | 南立石一区 | ⑨㊷ |
| 別府市東荘園4丁目5-10 | 東荘園4丁目 | ⑩㊸ |
| 別府市荘園北町3-15 | 荘園北町 | ⑩㊸ |
| 別府市中央町5-20 | 中央町 | ㊷ |
| 別府市未知の地域1-1 | (マッチなし) | ㊶ (フォールバック) |

## マッピングデータの管理

### 新しい地域を追加

```bash
npx ts-node manage-beppu-area-mapping.ts add "青山中学校" "新地域" "⑨㊷" "別府駅周辺"
```

### 既存の地域を更新

```bash
npx ts-node manage-beppu-area-mapping.ts update "南立石一区" distribution_areas "⑨㊷㊸"
```

### 地域を削除

```bash
npx ts-node manage-beppu-area-mapping.ts delete "旧地域"
```

### 地域を検索

```bash
npx ts-node manage-beppu-area-mapping.ts search "荘園"
```

### 全マッピングを表示

```bash
npx ts-node manage-beppu-area-mapping.ts list
```

### 学校区でフィルタ

```bash
npx ts-node manage-beppu-area-mapping.ts list "青山中学校"
```

## マッピング変更後の再計算

マッピングデータを変更した後、影響を受ける物件の配信エリアを再計算:

```bash
# Dry run
npx ts-node recalculate-beppu-areas-after-mapping-change.ts "南立石一区" --dry-run

# 実際に更新
npx ts-node recalculate-beppu-areas-after-mapping-change.ts "南立石一区" --force
```

## 自動適用

### 新規物件作成時

物件が作成されると、`PropertyDistributionAreaCalculator`が自動的に呼び出され、別府市の住所の場合は詳細なエリア番号が設定されます。

### 住所更新時

`PropertyListingService.update()`で住所が更新されると、配信エリアが自動的に再計算されます。

```typescript
// 例: 住所を更新
await propertyListingService.update('AA12345', {
  address: '別府市南立石一区1-2-3'
});
// → distribution_areas が自動的に "⑨㊷" に更新される
```

## トラブルシューティング

### テーブルが存在しない

**エラー:**
```
❌ Table does not exist or is not accessible
```

**解決方法:**
1. Supabase SQL Editorを開く
2. `backend/migrations/048_add_beppu_area_mapping.sql`の内容を実行

### 地域名が抽出できない

**症状:** 配信エリアが㊶になる

**確認方法:**
```bash
# ログを確認
[BeppuAreaMapping] No region name found in address: 別府市...
```

**解決方法:**
1. 住所フォーマットを確認
2. 必要に応じて新しい地域パターンを追加
3. `BeppuAreaMappingService.extractRegionName()`を更新

### マッピングが見つからない

**症状:** 配信エリアが㊶になる

**確認方法:**
```bash
[BeppuAreaMapping] No mapping found for region: 新地域
```

**解決方法:**
```bash
# 新しいマッピングを追加
npx ts-node manage-beppu-area-mapping.ts add "学校区" "新地域" "⑨㊷"
```

### バックフィルが失敗する

**確認事項:**
1. 環境変数が正しく設定されているか
2. Supabaseへの接続が可能か
3. テーブルとデータが存在するか

```bash
# データを確認
npx ts-node verify-beppu-area-mapping.ts
```

## ログの見方

### 正常な処理

```
[BeppuAreaMapping] Extracted region: 南立石一区 from 別府市南立石一区1-2-3
[BeppuAreaMapping] Found areas: ⑩㊸ for region: 南立石一区
[DistributionArea] Beppu detailed areas: ⑩㊸
```

### 警告

```
[BeppuAreaMapping] No region name found in address: 別府市1-2-3
[BeppuAreaMapping] No mapping found for region: 未知の地域
[DistributionArea] No detailed mapping found, falling back to ㊶
```

### エラー

```
[BeppuAreaMapping] Database error: { code: 'PGRST301', message: '...' }
[PropertyListingService] Failed to recalculate distribution areas: Error: ...
```

## パフォーマンス

### 現在の実装

- データベース検索: 完全一致クエリ（高速）
- インデックス: `region_name`と`school_district`
- キャッシュ: なし

### 最適化が必要な場合

マッピングデータをメモリにキャッシュ:

```typescript
// BeppuAreaMappingService.ts
private mappingCache: Map<string, string> = new Map();

async loadMappingsIntoCache() {
  const mappings = await this.getAllMappings();
  mappings.forEach(m => {
    this.mappingCache.set(m.region_name, m.distribution_areas);
  });
}

// lookupDistributionAreas()でキャッシュを使用
private async lookupDistributionAreas(regionName: string): Promise<string | null> {
  if (this.mappingCache.size > 0) {
    return this.mappingCache.get(regionName) || null;
  }
  // フォールバック: データベース検索
  // ...
}
```

## データ整合性

### マッピングデータの検証

```bash
# 全マッピングを確認
npx ts-node manage-beppu-area-mapping.ts list

# 重複チェック
# 同じregion_nameが複数存在しないか確認
```

### 配信エリアフォーマットの検証

有効なフォーマット:
- 単一エリア: "⑨", "⑩", "㊷", "㊸"
- 複合エリア: "⑨㊷", "⑩㊸", "⑪㊸"

無効なフォーマット:
- "⑨⑩" (異なる学校区の組み合わせ)

## 今後の拡張

### Phase 2 機能候補

1. **他の市区町村への拡張**
   - 大分市内の詳細エリア分け
   - 他の市区町村のマッピング

2. **UI での管理機能**
   - マッピングデータの追加・編集・削除
   - 配信エリアの手動調整

3. **統計とレポート**
   - エリアごとの物件数
   - マッピングの使用頻度
   - フォールバック率

4. **部分一致検索**
   - より柔軟な地域名マッチング
   - 類似地域名の提案
