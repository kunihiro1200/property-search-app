# 買主リスト - 近隣物件検索の拡張 - 設計書

## 📋 概要

買主詳細ページの近隣物件検索機能を拡張し、3つの検索方法（所在地ベース、距離ベース、配信エリアベース）を統合する。

## 🏗️ アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    BuyerDetailPage.tsx                       │
│  - 近隣物件ボタン                                              │
│  - 近隣物件数の表示                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              GET /api/buyers/:id/nearby-properties          │
│                   (buyers.ts - Router)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           BuyerService.getNearbyProperties()                 │
│  - 3つの検索方法を実行                                         │
│  - 結果を統合                                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
    ┌───────────────┐ ┌──────────────┐ ┌─────────────────┐
    │ 所在地ベース   │ │ 距離ベース    │ │ 配信エリアベース │
    │ (既存)        │ │ (新規)       │ │ (新規)          │
    └───────────────┘ └──────────────┘ └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ property_listings │
                    │ テーブル          │
                    └──────────────────┘
```

## 📊 データモデル

### property_listings テーブル

既存のテーブルを使用。以下のカラムを利用：

| カラム名 | 型 | 説明 | 使用する検索方法 |
|---------|---|------|----------------|
| `property_number` | TEXT | 物件番号（主キー） | 全て |
| `address` | TEXT | 所在地 | 所在地ベース |
| `latitude` | NUMERIC | 緯度 | 距離ベース |
| `longitude` | NUMERIC | 経度 | 距離ベース |
| `distribution_areas` | TEXT | 配信エリア番号（例："①,②,③"） | 配信エリアベース |
| `price` | NUMERIC | 価格 | 全て |
| `property_type` | TEXT | 種別 | 全て |
| `atbb_status` | TEXT | ステータス | 全て |

## 🔧 実装詳細

### 1. BuyerService.getNearbyProperties() の拡張

#### 1.1 メソッドシグネチャ

```typescript
async getNearbyProperties(propertyNumber: string): Promise<{
  baseProperty: any;
  nearbyProperties: any[];
  searchMethods: {
    location: number;
    distance: number;
    distribution_area: number;
    total: number;
  };
}>
```

#### 1.2 処理フロー

```typescript
async getNearbyProperties(propertyNumber: string) {
  // 1. 基準物件を取得
  const baseProperty = await this.getBaseProperty(propertyNumber);
  
  // 2. 共通の検索条件を準備
  const commonFilters = {
    minPrice: calculateMinPrice(baseProperty.price),
    maxPrice: calculateMaxPrice(baseProperty.price),
    propertyType: baseProperty.property_type,
    excludePropertyNumber: propertyNumber
  };
  
  // 3. 所在地ベース検索
  const locationResults = await this.searchByLocation(baseProperty, commonFilters);
  
  // 4. 距離ベース検索
  const distanceResults = await this.searchByDistance(baseProperty, commonFilters);
  
  // 5. 配信エリアベース検索
  const distributionAreaResults = await this.searchByDistributionArea(baseProperty, commonFilters);
  
  // 6. 結果を統合
  const mergedResults = this.mergeResults(
    locationResults,
    distanceResults,
    distributionAreaResults
  );
  
  // 7. ソート（配信日降順、物件番号降順）
  const sortedResults = this.sortResults(mergedResults);
  
  return {
    baseProperty,
    nearbyProperties: sortedResults,
    searchMethods: {
      location: locationResults.length,
      distance: distanceResults.length,
      distribution_area: distributionAreaResults.length,
      total: sortedResults.length
    }
  };
}
```

### 2. 所在地ベース検索（既存）

#### 2.1 検索ロジック

```typescript
private async searchByLocation(
  baseProperty: any,
  commonFilters: CommonFilters
): Promise<PropertyWithMatchInfo[]> {
  // 住所から市区町村と町名を抽出
  const { city, town } = this.extractCityAndTown(baseProperty.address);
  
  let query = this.supabase
    .from('property_listings')
    .select('*')
    .neq('property_number', commonFilters.excludePropertyNumber)
    .gte('price', commonFilters.minPrice)
    .lte('price', commonFilters.maxPrice);
  
  // 種別条件
  if (commonFilters.propertyType) {
    query = query.eq('property_type', commonFilters.propertyType);
  }
  
  // 町名条件
  if (city && town) {
    query = query.ilike('address', `%${city}${town}%`);
  } else if (city) {
    query = query.ilike('address', `%${city}%`);
  }
  
  // ステータス条件
  query = query.or('atbb_status.ilike.%公開中%,atbb_status.ilike.%公開前%,atbb_status.ilike.%非公開（配信メールのみ）%');
  
  const { data } = await query;
  
  // マッチ情報を追加
  return (data || []).map(property => ({
    ...property,
    matched_by: ['location']
  }));
}
```

#### 2.2 市区町村と町名の抽出

```typescript
private extractCityAndTown(address: string): { city: string; town: string } {
  let city = '';
  let town = '';
  
  // 市区町村を抽出
  const cityMatch = address.match(/(大分市|別府市|由布市|日出町|杵築市|国東市|豊後高田市|宇佐市|中津市|日田市|竹田市|豊後大野市|臼杵市|津久見市|佐伯市)/);
  if (cityMatch) {
    city = cityMatch[1];
    
    // 市区町村の後の町名を抽出
    let afterCity = address.substring(address.indexOf(city) + city.length);
    
    // 「大字」を除外
    afterCity = afterCity.replace(/^大字/, '');
    
    // 町名を抽出（最初の漢字部分、「字」以降は除外）
    const townMatch = afterCity.match(/^([^\d\-\s]+)/);
    if (townMatch) {
      let extractedTown = townMatch[1];
      // 「字」以降を除外
      const aざIndex = extractedTown.indexOf('字');
      if (aざIndex !== -1) {
        extractedTown = extractedTown.substring(0, aざIndex);
      }
      town = extractedTown;
    }
  }
  
  return { city, town };
}
```

### 3. 距離ベース検索（新規）

#### 3.1 検索ロジック

```typescript
private async searchByDistance(
  baseProperty: any,
  commonFilters: CommonFilters
): Promise<PropertyWithMatchInfo[]> {
  // 基準物件に座標データがない場合は空配列を返す
  if (!baseProperty.latitude || !baseProperty.longitude) {
    console.log('[searchByDistance] Base property has no coordinates');
    return [];
  }
  
  // 座標データがある物件を全て取得（共通フィルタ適用）
  let query = this.supabase
    .from('property_listings')
    .select('*')
    .neq('property_number', commonFilters.excludePropertyNumber)
    .gte('price', commonFilters.minPrice)
    .lte('price', commonFilters.maxPrice)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  
  // 種別条件
  if (commonFilters.propertyType) {
    query = query.eq('property_type', commonFilters.propertyType);
  }
  
  // ステータス条件
  query = query.or('atbb_status.ilike.%公開中%,atbb_status.ilike.%公開前%,atbb_status.ilike.%非公開（配信メールのみ）%');
  
  const { data } = await query;
  
  // 距離を計算してフィルタリング
  const RADIUS_KM = 3;
  const baseLat = parseFloat(baseProperty.latitude);
  const baseLng = parseFloat(baseProperty.longitude);
  
  const propertiesWithDistance = (data || [])
    .map(property => {
      const distance = this.calculateDistance(
        baseLat,
        baseLng,
        parseFloat(property.latitude),
        parseFloat(property.longitude)
      );
      return {
        ...property,
        distance_km: distance,
        matched_by: ['distance']
      };
    })
    .filter(property => property.distance_km <= RADIUS_KM);
  
  return propertiesWithDistance;
}
```

#### 3.2 Haversine公式による距離計算

```typescript
private calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球の半径（km）
  
  const dLat = this.toRadians(lat2 - lat1);
  const dLng = this.toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRadians(lat1)) *
    Math.cos(this.toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // 小数点第1位まで
}

private toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

### 4. 配信エリアベース検索（新規）

#### 4.1 検索ロジック

```typescript
private async searchByDistributionArea(
  baseProperty: any,
  commonFilters: CommonFilters
): Promise<PropertyWithMatchInfo[]> {
  // 基準物件に配信エリアがない場合は空配列を返す
  if (!baseProperty.distribution_areas || baseProperty.distribution_areas.trim() === '') {
    console.log('[searchByDistributionArea] Base property has no distribution areas');
    return [];
  }
  
  // 基準物件の配信エリア番号を配列に変換
  const baseAreas = this.parseDistributionAreas(baseProperty.distribution_areas);
  
  if (baseAreas.length === 0) {
    return [];
  }
  
  // 配信エリアがある物件を全て取得（共通フィルタ適用）
  let query = this.supabase
    .from('property_listings')
    .select('*')
    .neq('property_number', commonFilters.excludePropertyNumber)
    .gte('price', commonFilters.minPrice)
    .lte('price', commonFilters.maxPrice)
    .not('distribution_areas', 'is', null);
  
  // 種別条件
  if (commonFilters.propertyType) {
    query = query.eq('property_type', commonFilters.propertyType);
  }
  
  // ステータス条件
  query = query.or('atbb_status.ilike.%公開中%,atbb_status.ilike.%公開前%,atbb_status.ilike.%非公開（配信メールのみ）%');
  
  const { data } = await query;
  
  // 共通エリアがある物件をフィルタリング
  const propertiesWithCommonAreas = (data || [])
    .map(property => {
      const propertyAreas = this.parseDistributionAreas(property.distribution_areas);
      const commonAreas = this.findCommonAreas(baseAreas, propertyAreas);
      
      return {
        ...property,
        common_areas: commonAreas,
        matched_by: ['distribution_area']
      };
    })
    .filter(property => property.common_areas.length > 0);
  
  return propertiesWithCommonAreas;
}
```

#### 4.2 配信エリア番号のパース

```typescript
private parseDistributionAreas(distributionAreas: string): string[] {
  if (!distributionAreas || distributionAreas.trim() === '') {
    return [];
  }
  
  return distributionAreas
    .split(',')
    .map(area => area.trim())
    .filter(area => area.length > 0);
}
```

#### 4.3 共通エリアの検出

```typescript
private findCommonAreas(areas1: string[], areas2: string[]): string[] {
  return areas1.filter(area => areas2.includes(area));
}
```

### 5. 結果の統合

#### 5.1 統合ロジック

```typescript
private mergeResults(
  locationResults: PropertyWithMatchInfo[],
  distanceResults: PropertyWithMatchInfo[],
  distributionAreaResults: PropertyWithMatchInfo[]
): PropertyWithMatchInfo[] {
  // 物件番号をキーとしたMapを作成
  const propertyMap = new Map<string, PropertyWithMatchInfo>();
  
  // 所在地ベースの結果を追加
  locationResults.forEach(property => {
    propertyMap.set(property.property_number, property);
  });
  
  // 距離ベースの結果を追加（既存の場合はmatched_byとdistance_kmを追加）
  distanceResults.forEach(property => {
    const existing = propertyMap.get(property.property_number);
    if (existing) {
      existing.matched_by.push('distance');
      existing.distance_km = property.distance_km;
    } else {
      propertyMap.set(property.property_number, property);
    }
  });
  
  // 配信エリアベースの結果を追加（既存の場合はmatched_byとcommon_areasを追加）
  distributionAreaResults.forEach(property => {
    const existing = propertyMap.get(property.property_number);
    if (existing) {
      existing.matched_by.push('distribution_area');
      existing.common_areas = property.common_areas;
    } else {
      propertyMap.set(property.property_number, property);
    }
  });
  
  return Array.from(propertyMap.values());
}
```

#### 5.2 ソート

```typescript
private sortResults(properties: PropertyWithMatchInfo[]): PropertyWithMatchInfo[] {
  return properties.sort((a, b) => {
    // 配信日で降順ソート
    if (a.distribution_date && b.distribution_date) {
      const dateCompare = new Date(b.distribution_date).getTime() - new Date(a.distribution_date).getTime();
      if (dateCompare !== 0) {
        return dateCompare;
      }
    }
    
    // 配信日が同じ場合は物件番号で降順ソート
    return b.property_number.localeCompare(a.property_number);
  });
}
```

### 6. 型定義

```typescript
interface CommonFilters {
  minPrice: number;
  maxPrice: number;
  propertyType: string;
  excludePropertyNumber: string;
}

interface PropertyWithMatchInfo {
  property_number: string;
  address: string;
  price: number;
  property_type: string;
  atbb_status: string;
  distribution_date?: string;
  latitude?: number;
  longitude?: number;
  distribution_areas?: string;
  matched_by: ('location' | 'distance' | 'distribution_area')[];
  distance_km?: number;
  common_areas?: string[];
}
```

### 7. 価格帯の計算

```typescript
private calculatePriceRange(price: number): { minPrice: number; maxPrice: number } {
  if (price < 10000000) {
    // 1000万円未満
    return { minPrice: 0, maxPrice: 9999999 };
  } else if (price < 30000000) {
    // 1000万～2999万円
    return { minPrice: 10000000, maxPrice: 29999999 };
  } else if (price < 50000000) {
    // 3000万～4999万円
    return { minPrice: 30000000, maxPrice: 49999999 };
  } else {
    // 5000万円以上
    return { minPrice: 50000000, maxPrice: 999999999 };
  }
}
```

## 🔌 APIエンドポイント

### GET /api/buyers/:id/nearby-properties

#### リクエスト

```
GET /api/buyers/:id/nearby-properties?propertyNumber=AA13501
```

**パラメータ**:
- `id`: 買主番号（パスパラメータ）
- `propertyNumber`: 基準物件番号（クエリパラメータ）

#### レスポンス

```json
{
  "baseProperty": {
    "property_number": "AA13501",
    "address": "大分市明野東1-1-1",
    "latitude": 33.2381,
    "longitude": 131.6125,
    "distribution_areas": "①,②,③",
    "price": 25000000,
    "property_type": "戸建て",
    "atbb_status": "公開中"
  },
  "nearbyProperties": [
    {
      "property_number": "AA13502",
      "address": "大分市大在1-1-1",
      "price": 23000000,
      "property_type": "戸建て",
      "atbb_status": "公開中",
      "distribution_date": "2026-02-10",
      "matched_by": ["distance", "distribution_area"],
      "distance_km": 2.5,
      "common_areas": ["①", "②"]
    },
    {
      "property_number": "AA13503",
      "address": "大分市明野北1-1-1",
      "price": 24000000,
      "property_type": "戸建て",
      "atbb_status": "公開前",
      "distribution_date": "2026-02-09",
      "matched_by": ["location", "distance"],
      "distance_km": 1.2
    }
  ],
  "searchMethods": {
    "location": 5,
    "distance": 12,
    "distribution_area": 8,
    "total": 18
  }
}
```

## 🎨 フロントエンド

### 変更なし

既存のフロントエンド（BuyerDetailPage.tsx、BuyerNearbyPropertiesPage.tsx）は変更不要。

APIレスポンスに追加された情報（matched_by、distance_km、common_areas、searchMethods）は、将来的に表示する場合に利用可能。

## 🧪 テスト戦略

### 1. ユニットテスト

#### 1.1 距離計算のテスト

```typescript
describe('calculateDistance', () => {
  it('should calculate correct distance between two points', () => {
    const service = new BuyerService();
    const distance = service['calculateDistance'](
      33.2381, 131.6125, // 大分市明野
      33.2500, 131.6300  // 大分市大在
    );
    expect(distance).toBeCloseTo(2.0, 1); // 約2km
  });
});
```

#### 1.2 配信エリアのパース

```typescript
describe('parseDistributionAreas', () => {
  it('should parse comma-separated areas', () => {
    const service = new BuyerService();
    const areas = service['parseDistributionAreas']('①,②,③');
    expect(areas).toEqual(['①', '②', '③']);
  });
  
  it('should handle empty string', () => {
    const service = new BuyerService();
    const areas = service['parseDistributionAreas']('');
    expect(areas).toEqual([]);
  });
});
```

#### 1.3 共通エリアの検出

```typescript
describe('findCommonAreas', () => {
  it('should find common areas', () => {
    const service = new BuyerService();
    const common = service['findCommonAreas'](
      ['①', '②', '③'],
      ['②', '④', '⑤']
    );
    expect(common).toEqual(['②']);
  });
  
  it('should return empty array when no common areas', () => {
    const service = new BuyerService();
    const common = service['findCommonAreas'](
      ['①', '②', '③'],
      ['④', '⑤', '⑥']
    );
    expect(common).toEqual([]);
  });
});
```

### 2. 統合テスト

#### 2.1 近隣物件検索の統合テスト

```typescript
describe('getNearbyProperties', () => {
  it('should return nearby properties from all search methods', async () => {
    const service = new BuyerService();
    const result = await service.getNearbyProperties('AA13501');
    
    expect(result.baseProperty).toBeDefined();
    expect(result.nearbyProperties).toBeInstanceOf(Array);
    expect(result.searchMethods).toBeDefined();
    expect(result.searchMethods.total).toBeGreaterThan(0);
  });
});
```

## 📊 パフォーマンス最適化

### 1. データベースクエリの最適化

#### 1.1 インデックスの確認

以下のカラムにインデックスが存在することを確認：
- `property_number`（主キー）
- `price`
- `property_type`
- `latitude`, `longitude`
- `atbb_status`

#### 1.2 クエリの並列実行

3つの検索方法を並列実行することで、処理時間を短縮：

```typescript
const [locationResults, distanceResults, distributionAreaResults] = await Promise.all([
  this.searchByLocation(baseProperty, commonFilters),
  this.searchByDistance(baseProperty, commonFilters),
  this.searchByDistributionArea(baseProperty, commonFilters)
]);
```

### 2. キャッシュ戦略（将来的な拡張）

頻繁にアクセスされる物件の近隣物件検索結果をキャッシュする：

```typescript
// Redis等を使用したキャッシュ
const cacheKey = `nearby_properties:${propertyNumber}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// キャッシュがない場合は検索を実行
const result = await this.getNearbyProperties(propertyNumber);
await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // 1時間キャッシュ
```

## 🔒 セキュリティ

### 1. 入力検証

- `propertyNumber`パラメータの検証（英数字とハイフンのみ）
- SQLインジェクション対策（Supabaseクライアントが自動的に対応）

### 2. 認証・認可

- 既存の認証ミドルウェアを使用
- 買主詳細ページへのアクセス権限チェック

## 📝 ログ出力

### 1. デバッグログ

```typescript
console.log('[getNearbyProperties] Starting search for property:', propertyNumber);
console.log('[searchByLocation] Found properties:', locationResults.length);
console.log('[searchByDistance] Found properties:', distanceResults.length);
console.log('[searchByDistributionArea] Found properties:', distributionAreaResults.length);
console.log('[mergeResults] Total unique properties:', mergedResults.length);
```

### 2. エラーログ

```typescript
console.error('[getNearbyProperties] Error:', error);
console.error('[searchByDistance] Base property has no coordinates');
console.error('[searchByDistributionArea] Base property has no distribution areas');
```

## 🚀 デプロイ

### 1. 環境変数

不要（既存の環境変数を使用）

### 2. データベースマイグレーション

不要（既存のテーブルを使用）

### 3. デプロイ手順

1. バックエンドのコードをデプロイ
2. 動作確認
3. 問題がなければ完了

## 📚 関連ドキュメント

- `.kiro/specs/buyer-nearby-properties-distance-based/requirements.md` - 要件定義
- `.kiro/steering/buyer-table-column-definition.md` - 買主テーブルのカラム定義
- `backend/src/services/BuyerService.ts` - 買主サービス

---

**作成日**: 2026年2月11日  
**作成者**: Kiro AI
