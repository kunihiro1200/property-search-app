# データベーススキーマ リファレンス

このドキュメントは、データベースのテーブル名とカラム名の正式な一覧です。

## Supabase接続情報

- **プロジェクトURL**: `https://fzcuexscuwhoywcicdqq.supabase.co`
- **環境変数**: `SUPABASE_URL`

---

## テーブル一覧

### 1. property_listings（物件リスト）

**日本語名**: 物件リスト  
**英語名**: `property_listings`  
**説明**: 物件の基本情報を管理するメインテーブル

#### 主要カラム

| 日本語名 | 英語名（カラム名） | 型 | 説明 |
|---------|------------------|-----|------|
| 物件番号 | `property_number` | text | 物件の一意識別子（例: AA10424） |
| Google Map URL | `google_map_url` | text | Google Mapの短縮URL |
| 住所 | `address` | text | 物件の住所 |
| 住居表示 | `display_address` | text | 表示用住所 |
| 緯度 | `latitude` | numeric | 地図表示用の緯度 |
| 経度 | `longitude` | numeric | 地図表示用の経度 |
| 価格 | `price` | numeric | 売買価格 |
| 物件タイプ | `property_type` | text | 戸建/マンション/土地など |
| 土地面積 | `land_area` | numeric | 土地の面積（㎡） |
| 建物面積 | `building_area` | numeric | 建物の面積（㎡） |
| 新築年月 | `construction_year_month` | text | 建築年月（YYYY-MM形式） |
| 間取り | `floor_plan` | text | 間取り情報 |
| 保存場所 | `storage_location` | text | Google DriveのフォルダURL |
| 画像URL | `image_url` | text | 代表画像のURL |
| ATBB状態 | `atbb_status` | text | 公開状態（公開中/非公開など） |
| 配信エリア | `distribution_areas` | text | 配信対象エリア |
| 特記事項 | `special_notes` | text | 特記事項 |
| 作成日時 | `created_at` | timestamptz | レコード作成日時 |
| 更新日時 | `updated_at` | timestamptz | レコード更新日時 |

#### よく使うSQLクエリ

```sql
-- 物件番号で検索
SELECT 
  property_number,
  google_map_url,
  address,
  latitude,
  longitude,
  atbb_status,
  updated_at
FROM property_listings
WHERE property_number = 'AA10424';

-- 全物件数を確認
SELECT COUNT(*) as total_properties
FROM property_listings;

-- 最近更新された物件を表示
SELECT 
  property_number,
  address,
  updated_at
FROM property_listings
ORDER BY updated_at DESC
LIMIT 10;

-- Google Map URLが設定されている物件を検索
SELECT 
  property_number,
  google_map_url,
  address
FROM property_listings
WHERE google_map_url IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

---

### 2. sellers（売主リスト）

**日本語名**: 売主リスト  
**英語名**: `sellers`  
**説明**: 売主情報を管理するテーブル

#### 主要カラム

| 日本語名 | 英語名（カラム名） | 型 | 説明 |
|---------|------------------|-----|------|
| 物件番号 | `property_number` | text | 物件の一意識別子 |
| 売主番号 | `seller_number` | text | 売主の番号 |
| 名前 | `name` | text | 売主の名前 |
| 住所 | `address` | text | 売主の住所 |
| Google Map URL | `google_map_url` | text | Google Mapの短縮URL |
| 保存場所 | `site` | text | Google DriveのフォルダURL（旧） |
| 保存場所URL | `site_url` | text | Google DriveのフォルダURL（新） |

---

### 3. business_listings（業務リスト）

**日本語名**: 業務リスト  
**英語名**: `business_listings`  
**説明**: 業務依頼情報を管理するテーブル

#### 主要カラム

| 日本語名 | 英語名（カラム名） | 型 | 説明 |
|---------|------------------|-----|------|
| 物件番号 | `property_number` | text | 物件の一意識別子 |
| Google Map URL | `google_map_url` | text | Google Mapの短縮URL |
| 住所 | `address` | text | 物件の住所 |

**注意**: すべての物件が`business_listings`に存在するわけではありません。

---

### 4. work_tasks（作業タスク）

**日本語名**: 作業タスク  
**英語名**: `work_tasks`  
**説明**: 作業タスクを管理するテーブル

#### 主要カラム

| 日本語名 | 英語名（カラム名） | 型 | 説明 |
|---------|------------------|-----|------|
| 物件番号 | `property_number` | text | 物件の一意識別子 |
| 保存URL | `storage_url` | text | Google DriveのフォルダURL |

---

### 5. property_inquiries（物件問い合わせ）

**日本語名**: 物件問い合わせ  
**英語名**: `property_inquiries`  
**説明**: 公開物件サイトからの問い合わせを管理するテーブル

---

## スプレッドシート情報

### 物件リストシート

- **スプレッドシートID**: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- **シート名**: `物件`
- **説明**: 物件リストのマスターデータ

#### 主要カラム（日本語 → 英語マッピング）

| スプレッドシート列名（日本語） | データベースカラム名（英語） |
|---------------------------|------------------------|
| 物件番号 | `property_number` |
| GoogleMap | `google_map_url` |
| 所在地 | `address` |
| 住居表示（ATBB登録住所） | `display_address` |
| 価格 | `price` |
| 種別 | `property_type` |
| 土地面積 | `land_area` |
| 建物面積 | `building_area` |
| 新築年月 | `construction_year_month` |
| 間取り | `floor_plan` |
| 保存場所 | `storage_location` |
| 画像 | `image_url` |
| atbb成約済み/非公開 | `atbb_status` |
| ●特記 | `special_notes` |

**完全なマッピング**: `backend/src/config/property-listing-column-mapping.json`

---

### 売主リストシート

- **スプレッドシートID**: `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I`
- **シート名**: `売主リスト`（環境変数: `GOOGLE_SHEETS_SHEET_NAME`）

---

## よく使うコマンド

### データベース接続確認

```bash
# バックエンドディレクトリで実行
cd backend
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
supabase.from('property_listings').select('count').single().then(r => console.log('✅ Connected:', r));
"
```

### スプレッドシート同期

```bash
# Google Map URLを同期
cd backend
npx ts-node scripts/sync-google-map-url.ts
```

---

## トラブルシューティング

### AA10424が見つからない場合

1. **正しいSupabaseプロジェクトを使用しているか確認**
   ```sql
   -- プロジェクトURLを確認
   SELECT current_database();
   ```

2. **テーブル名を確認**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%property%';
   ```

3. **物件番号の形式を確認**
   ```sql
   -- 部分一致で検索
   SELECT property_number, address
   FROM property_listings
   WHERE property_number LIKE '%10424%';
   ```

---

## 更新履歴

- **2026-01-12**: 初版作成
  - `property_listings`テーブルの詳細を追加
  - スプレッドシートマッピングを追加
  - よく使うSQLクエリを追加
