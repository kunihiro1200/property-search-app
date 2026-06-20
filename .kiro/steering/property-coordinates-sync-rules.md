---
inclusion: manual
---

# 物件座標同期ルール（絶対に間違えないルール）

## ⚠️ 重要：地図検索には座標が必須

公開物件サイトの地図検索機能では、**`latitude`と`longitude`が必須**です。
`google_map_url`だけでは地図検索に表示されません。

---

## 🚨 最重要：座標の必須性

### 詳細画面 vs 地図検索

| 機能 | 必要なデータ | 説明 |
|------|------------|------|
| **詳細画面の地図表示** | `google_map_url` | URLから直接地図を表示 |
| **地図検索（マップビュー）** | `latitude` + `longitude` | 座標がないと表示されない |

**重要**: `google_map_url`があっても、`latitude`と`longitude`がないと地図検索には表示されません。

---

## ✅ 正しい同期フロー

### ステップ1: 物件リストスプレッドシートから同期

`PropertyListingSyncService`が物件データを同期する際、以下のフィールドを取得：

- `property_number` - 物件番号
- `address` - 住所
- `google_map_url` - Google Map URL
- **`latitude`** - 緯度（重要）
- **`longitude`** - 経度（重要）

### ステップ2: 座標が未設定の場合、自動取得

**優先順位**:

1. **Google Map URLから座標を抽出**（最優先）
   - 短縮URL（`maps.app.goo.gl`）をリダイレクトして実際のURLを取得
   - URLから座標を抽出（パターンマッチング）

2. **住所から座標を取得**（フォールバック）
   - Google Geocoding APIを使用
   - 住所をジオコーディング

3. **手動設定**（最終手段）
   - スクリプトを実行して座標を設定

---

## 📋 座標抽出のパターン

### Google Map URLのパターン

| パターン | 例 | 正規表現 |
|---------|-----|---------|
| `/search/lat,lng` | `https://www.google.com/maps/search/33.231233,+131.576897` | `/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/` |
| `@lat,lng,zoom` | `https://www.google.com/maps/@33.2382,131.6126,15z` | `/@(-?\d+\.\d+),(-?\d+\.\d+),/` |
| `/place/.../@lat,lng` | `https://www.google.com/maps/place/.../@33.2382,131.6126` | `/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/` |

### 短縮URLの処理

短縮URL（`https://maps.app.goo.gl/xxxxx`）の場合：

1. HTTPリダイレクトを追跡して実際のURLを取得
2. 実際のURLから座標を抽出

**実装例**:
```typescript
const response = await axios.get(shortUrl, {
  maxRedirects: 5,
  validateStatus: () => true,
});
const finalUrl = response.request.res.responseUrl || shortUrl;
```

---

## 🔧 座標取得の実装

### PropertyListingSyncServiceでの実装

```typescript
// backend/api/src/services/PropertyListingSyncService.ts

async runFullSync(): Promise<PropertyListingSyncResult> {
  const rows = await this.propertyListSheetsClient.readAll();
  
  for (const row of rows) {
    const propertyNumber = row['物件番号'];
    const googleMapUrl = row['GoogleMap'];
    
    // 座標を取得（優先順位: URL → 住所 → null）
    let latitude: number | null = null;
    let longitude: number | null = null;
    
    // 1. Google Map URLから座標を抽出
    if (googleMapUrl) {
      const coords = await this.extractCoordinatesFromGoogleMapUrl(googleMapUrl);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
        console.log(`✅ Extracted coordinates from URL for ${propertyNumber}:`, coords);
      }
    }
    
    // 2. 座標が取得できなかった場合、住所からジオコーディング
    if (!latitude || !longitude) {
      const address = row['所在地'];
      if (address) {
        const coords = await this.geocodeAddress(address);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
          console.log(`✅ Geocoded address for ${propertyNumber}:`, coords);
        }
      }
    }
    
    // 3. データベースに保存
    const propertyData = {
      property_number: propertyNumber,
      google_map_url: googleMapUrl,
      latitude,
      longitude,
      // ... 他のフィールド
    };
    
    await this.upsertProperty(propertyData);
  }
}
```

---

## 🚨 絶対にやってはいけないこと

### ❌ 間違い1: 座標を同期しない

```typescript
// ❌ 間違い（座標を同期していない）
const propertyData = {
  property_number: propertyNumber,
  google_map_url: googleMapUrl,
  // latitude と longitude が抜けている
};
```

**結果**: 地図検索に表示されない

### ❌ 間違い2: Google Map URLだけで十分だと思う

```typescript
// ❌ 間違い（URLだけでは地図検索に表示されない）
if (googleMapUrl) {
  // 座標を抽出せずにURLだけを保存
  await this.upsertProperty({ google_map_url: googleMapUrl });
}
```

**結果**: 詳細画面では地図が表示されるが、地図検索には表示されない

### ❌ 間違い3: 座標抽出を手動で行う

```typescript
// ❌ 間違い（毎回手動で座標を設定するのは非効率）
// 手動スクリプトを実行して座標を設定
```

**結果**: 新しい物件が追加されるたびに手動で座標を設定する必要がある

---

## ✅ 正しい実装

### 座標抽出ユーティリティ

```typescript
// backend/api/src/utils/coordinateExtractor.ts

export async function extractCoordinatesFromGoogleMapUrl(
  url: string
): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;
  
  try {
    // 短縮URLの場合、リダイレクト先を取得
    let finalUrl = url;
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      const response = await axios.get(url, {
        maxRedirects: 5,
        validateStatus: () => true,
      });
      finalUrl = response.request.res.responseUrl || url;
    }
    
    // パターン1: /search/lat,lng
    const pattern1 = /\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/;
    const match1 = finalUrl.match(pattern1);
    if (match1) {
      return {
        lat: parseFloat(match1[1]),
        lng: parseFloat(match1[2]),
      };
    }
    
    // パターン2: @lat,lng,zoom
    const pattern2 = /@(-?\d+\.\d+),(-?\d+\.\d+),/;
    const match2 = finalUrl.match(pattern2);
    if (match2) {
      return {
        lat: parseFloat(match2[1]),
        lng: parseFloat(match2[2]),
      };
    }
    
    // パターン3: /place/.../@lat,lng
    const pattern3 = /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match3 = finalUrl.match(pattern3);
    if (match3) {
      return {
        lat: parseFloat(match3[1]),
        lng: parseFloat(match3[2]),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}
```

---

## 📊 チェックリスト

新しい物件を同期する前に、以下を確認してください：

- [ ] `PropertyListingSyncService`が`latitude`と`longitude`を同期しているか？
- [ ] Google Map URLから座標を抽出する機能が実装されているか？
- [ ] 座標が取得できない場合、住所からジオコーディングしているか？
- [ ] 座標が`null`の物件がないか確認したか？

---

## 🔍 座標が未設定の物件を確認する方法

### 方法1: データベースクエリ

```sql
-- 座標が未設定の物件を確認
SELECT property_number, address, google_map_url, latitude, longitude
FROM property_listings
WHERE latitude IS NULL OR longitude IS NULL
ORDER BY property_number;
```

### 方法2: TypeScriptスクリプト

```typescript
// backend/check-missing-coordinates.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkMissingCoordinates() {
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, address, google_map_url, latitude, longitude')
    .or('latitude.is.null,longitude.is.null')
    .order('property_number');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`⚠️ ${data.length} properties missing coordinates:`);
  data.forEach(property => {
    console.log(`  ${property.property_number}: ${property.address}`);
  });
}

checkMissingCoordinates();
```

---

## 🛠️ 座標を一括設定する方法

### 全物件の座標を一括取得

```typescript
// backend/backfill-all-property-coordinates.ts
import { createClient } from '@supabase/supabase-js';
import { extractCoordinatesFromGoogleMapUrl } from './api/src/utils/coordinateExtractor';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function backfillAllCoordinates() {
  // 座標が未設定の物件を取得
  const { data: properties } = await supabase
    .from('property_listings')
    .select('id, property_number, google_map_url, address')
    .or('latitude.is.null,longitude.is.null');
  
  console.log(`🔧 Backfilling coordinates for ${properties.length} properties...`);
  
  for (const property of properties) {
    let coords = null;
    
    // 1. Google Map URLから座標を抽出
    if (property.google_map_url) {
      coords = await extractCoordinatesFromGoogleMapUrl(property.google_map_url);
    }
    
    // 2. 座標が取得できた場合、データベースを更新
    if (coords) {
      await supabase
        .from('property_listings')
        .update({
          latitude: coords.lat,
          longitude: coords.lng,
        })
        .eq('id', property.id);
      
      console.log(`✅ ${property.property_number}: (${coords.lat}, ${coords.lng})`);
    } else {
      console.log(`⚠️ ${property.property_number}: Could not extract coordinates`);
    }
  }
  
  console.log('✅ Backfill complete!');
}

backfillAllCoordinates();
```

---

## 💡 トラブルシューティング

### 問題1: 地図検索に物件が表示されない

**確認事項**:
1. `latitude`と`longitude`が設定されているか？
2. Google Map URLから座標を抽出できているか？
3. 座標が正しい範囲内か？（大分市: 緯度33.2前後、経度131.6前後）

**解決策**:
```bash
# 座標を確認
npx ts-node backend/check-missing-coordinates.ts

# 座標を一括設定
npx ts-node backend/backfill-all-property-coordinates.ts
```

### 問題2: 詳細画面では地図が表示されるのに、地図検索では表示されない

**原因**: `google_map_url`はあるが、`latitude`と`longitude`が未設定

**解決策**: 座標を設定する
```bash
npx ts-node backend/fix-<property-number>-coordinates.ts
```

### 問題3: Google Map URLから座標を抽出できない

**原因**: URLのフォーマットが認識されていない

**解決策**:
1. URLのパターンを確認
2. 新しいパターンを`coordinateExtractor.ts`に追加
3. 住所からジオコーディング

---

## まとめ

**絶対に守るべきルール**:

1. **地図検索には`latitude`と`longitude`が必須**
2. **`google_map_url`だけでは地図検索に表示されない**
3. **`PropertyListingSyncService`で座標を自動取得する**
4. **座標が未設定の物件がないか定期的に確認する**

**このルールを徹底することで、座標取得の問題を完全に防止できます。**

---

**最終更新日**: 2026年1月29日  
**作成理由**: CC105の地図検索問題を防ぐため

