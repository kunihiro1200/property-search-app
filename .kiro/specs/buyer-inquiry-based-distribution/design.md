# Design Document: Buyer Inquiry-Based Distribution

## Overview

買主への物件配信ロジックを拡張し、買主が過去に問い合わせた物件の位置情報を活用した配信を実現する。現在のエリア番号ベースの配信（★エリア中心座標から3km圏内）に加えて、買主の実際の興味エリア（問い合わせ履歴の物件住所から3km圏内）に基づいた配信を可能にする。

## Architecture

### Current System

```
EnhancedBuyerDistributionService
  ├─ filterByGeography() - エリア番号ベースのマッチング
  ├─ filterByDistributionFlag() - 配信フラグチェック
  ├─ filterByLatestStatus() - ステータスチェック
  └─ filterByPriceRange() - 価格帯チェック
```

### New System

```
EnhancedBuyerDistributionService
  ├─ filterByGeography() - 統合マッチングロジック
  │   ├─ checkInquiryBasedMatch() - 問い合わせ履歴ベースマッチング（新規）
  │   └─ checkAreaBasedMatch() - エリア番号ベースマッチング（既存）
  ├─ filterByDistributionFlag()
  ├─ filterByLatestStatus()
  └─ filterByPriceRange()
```

## Data Model

### Existing Tables

#### buyers テーブル
```sql
CREATE TABLE buyers (
    id UUID PRIMARY KEY,
    buyer_number VARCHAR(10),
    email TEXT,
    desired_area TEXT,  -- ★エリア番号（例: "①②③"）
    distribution_type VARCHAR(10),
    latest_status TEXT,
    ...
);
```

#### buyer_inquiries テーブル
```sql
CREATE TABLE buyer_inquiries (
    id UUID PRIMARY KEY,
    buyer_id UUID REFERENCES buyers(buyer_id),
    property_number VARCHAR(10) REFERENCES listed_properties(property_number),
    inquiry_date TIMESTAMP,
    inquiry_content TEXT,
    inquiry_source VARCHAR(50),
    created_at TIMESTAMP
);
```

#### property_listings テーブル
```sql
CREATE TABLE property_listings (
    property_number VARCHAR(10) PRIMARY KEY,
    address TEXT,
    google_map_url TEXT,
    distribution_areas TEXT,  -- 事前計算された配信エリア（例: "①②③㊵"）
    ...
);
```

### Data Flow

```
配信対象物件
  ↓
物件の座標を取得（google_map_url or address）
  ↓
各買主について:
  ├─ 問い合わせ履歴を取得（buyer_inquiries）
  │   ├─ 各問い合わせ物件の座標を取得
  │   └─ 配信物件との距離を計算
  │       └─ 3km以内なら MATCH
  │
  └─ エリア番号マッチング（既存ロジック）
      ├─ 買主の★エリア番号を抽出
      ├─ 物件のdistribution_areasと比較
      └─ 共通エリアがあれば MATCH
  
  ↓
問い合わせベース OR エリアベース = 配信対象
```

## Implementation Details

### 1. Database Query Optimization

#### 問い合わせ履歴の取得（効率的なJOIN）

```typescript
// 全買主の問い合わせ履歴を一括取得
async fetchAllBuyerInquiries(): Promise<Map<string, InquiryProperty[]>> {
  const { data, error } = await this.supabase
    .from('buyer_inquiries')
    .select(`
      buyer_id,
      property_number,
      property_listings!inner(
        property_number,
        address,
        google_map_url
      )
    `)
    .order('inquiry_date', { ascending: false });

  // Map<buyer_id, InquiryProperty[]>に変換
  const inquiryMap = new Map();
  data?.forEach(row => {
    if (!inquiryMap.has(row.buyer_id)) {
      inquiryMap.set(row.buyer_id, []);
    }
    inquiryMap.get(row.buyer_id).push({
      propertyNumber: row.property_number,
      address: row.property_listings.address,
      googleMapUrl: row.property_listings.google_map_url
    });
  });

  return inquiryMap;
}
```

### 2. Geographic Matching Logic

#### 統合マッチングロジック

```typescript
interface GeographicMatchResult {
  matched: boolean;
  matchType: 'inquiry' | 'area' | 'both' | 'none';
  matchedAreas?: string[];  // エリアマッチの場合
  matchedInquiries?: {      // 問い合わせマッチの場合
    propertyNumber: string;
    distance: number;
  }[];
  minDistance?: number;
}

async filterByGeography(
  propertyCoordinates: Coordinates,
  propertyDistributionAreas: string,
  buyer: any,
  buyerInquiries: InquiryProperty[]
): Promise<GeographicMatchResult> {
  
  // 1. 問い合わせベースマッチングを試行
  const inquiryMatch = await this.checkInquiryBasedMatch(
    propertyCoordinates,
    buyerInquiries
  );

  // 2. エリアベースマッチングを試行
  const areaMatch = await this.checkAreaBasedMatch(
    propertyDistributionAreas,
    buyer.desired_area
  );

  // 3. 結果を統合
  if (inquiryMatch.matched && areaMatch.matched) {
    return {
      matched: true,
      matchType: 'both',
      matchedAreas: areaMatch.matchedAreas,
      matchedInquiries: inquiryMatch.matchedInquiries,
      minDistance: inquiryMatch.minDistance
    };
  } else if (inquiryMatch.matched) {
    return {
      matched: true,
      matchType: 'inquiry',
      matchedInquiries: inquiryMatch.matchedInquiries,
      minDistance: inquiryMatch.minDistance
    };
  } else if (areaMatch.matched) {
    return {
      matched: true,
      matchType: 'area',
      matchedAreas: areaMatch.matchedAreas
    };
  } else {
    return {
      matched: false,
      matchType: 'none'
    };
  }
}
```

#### 問い合わせベースマッチング

```typescript
async checkInquiryBasedMatch(
  propertyCoordinates: Coordinates,
  buyerInquiries: InquiryProperty[]
): Promise<{
  matched: boolean;
  matchedInquiries: { propertyNumber: string; distance: number }[];
  minDistance?: number;
}> {
  
  if (!buyerInquiries || buyerInquiries.length === 0) {
    return { matched: false, matchedInquiries: [] };
  }

  const matchedInquiries: { propertyNumber: string; distance: number }[] = [];
  let minDistance = Infinity;

  for (const inquiry of buyerInquiries) {
    // 問い合わせ物件の座標を取得
    const inquiryCoords = await this.geolocationService.getCoordinates(
      inquiry.googleMapUrl,
      inquiry.address
    );

    if (!inquiryCoords) {
      console.log(`[Inquiry Match] No coordinates for inquiry property ${inquiry.propertyNumber}`);
      continue;
    }

    // 距離を計算
    const distance = this.geolocationService.calculateDistance(
      propertyCoordinates,
      inquiryCoords
    );

    console.log(`[Inquiry Match] Distance from ${inquiry.propertyNumber}: ${distance.toFixed(2)}km`);

    // 3km以内ならマッチ
    if (distance <= 3.0) {
      matchedInquiries.push({
        propertyNumber: inquiry.propertyNumber,
        distance
      });
      minDistance = Math.min(minDistance, distance);
    }
  }

  return {
    matched: matchedInquiries.length > 0,
    matchedInquiries,
    minDistance: matchedInquiries.length > 0 ? minDistance : undefined
  };
}
```

#### エリアベースマッチング（既存ロジック）

```typescript
async checkAreaBasedMatch(
  propertyDistributionAreas: string,
  buyerDesiredArea: string
): Promise<{
  matched: boolean;
  matchedAreas: string[];
}> {
  // 既存のロジックを使用
  const buyerAreas = this.geolocationService.extractAreaNumbers(buyerDesiredArea);
  const propertyAreas = this.geolocationService.extractAreaNumbers(propertyDistributionAreas);

  const matchedAreas = buyerAreas.filter(area => 
    propertyAreas.includes(area)
  );

  return {
    matched: matchedAreas.length > 0,
    matchedAreas
  };
}
```

### 3. Performance Optimization

#### キャッシング戦略

```typescript
class InquiryCoordinateCache {
  private cache: Map<string, Coordinates | null> = new Map();

  async getCoordinates(
    propertyNumber: string,
    googleMapUrl: string | null,
    address: string | null
  ): Promise<Coordinates | null> {
    
    // キャッシュチェック
    if (this.cache.has(propertyNumber)) {
      return this.cache.get(propertyNumber)!;
    }

    // 座標を取得
    const coords = await this.geolocationService.getCoordinates(
      googleMapUrl,
      address
    );

    // キャッシュに保存
    this.cache.set(propertyNumber, coords);
    
    return coords;
  }

  clear() {
    this.cache.clear();
  }
}
```

#### バッチ処理

```typescript
async getQualifiedBuyersWithAllCriteria(
  criteria: EnhancedFilterCriteria
): Promise<EnhancedBuyerFilterResult> {
  
  // 1. 物件情報を取得
  const property = await this.fetchProperty(criteria.propertyNumber);
  const propertyCoords = await this.geolocationService.getCoordinates(
    property.google_map_url,
    property.address
  );

  // 2. 全買主を取得
  const allBuyers = await this.fetchAllBuyers();

  // 3. 全買主の問い合わせ履歴を一括取得（1回のクエリ）
  const inquiryMap = await this.fetchAllBuyerInquiries();

  // 4. 座標キャッシュを初期化
  const coordCache = new InquiryCoordinateCache();

  // 5. 各買主をフィルタリング
  const filteredBuyers: FilteredBuyer[] = [];

  for (const buyer of allBuyers) {
    const buyerInquiries = inquiryMap.get(buyer.id) || [];
    
    // 地理的マッチング（問い合わせ + エリア）
    const geoMatch = await this.filterByGeography(
      propertyCoords,
      property.distribution_areas,
      buyer,
      buyerInquiries
    );

    // 他のフィルター
    const distMatch = this.filterByDistributionFlag(buyer);
    const statusMatch = this.filterByLatestStatus(buyer);
    const priceMatch = this.filterByPriceRange(property.price, property.property_type, buyer);

    filteredBuyers.push({
      ...buyer,
      filterResults: {
        geography: geoMatch.matched,
        distribution: distMatch,
        status: statusMatch,
        priceRange: priceMatch
      },
      geographicMatch: geoMatch
    });
  }

  // キャッシュをクリア
  coordCache.clear();

  return this.buildResult(filteredBuyers, allBuyers.length);
}
```

### 4. Logging Strategy

#### 詳細ログ出力

```typescript
private logGeographicMatch(
  buyerNumber: string,
  geoMatch: GeographicMatchResult
) {
  console.log(`[Geographic Match] Buyer ${buyerNumber}:`);
  console.log(`  Match Type: ${geoMatch.matchType}`);
  
  if (geoMatch.matchType === 'inquiry' || geoMatch.matchType === 'both') {
    console.log(`  Inquiry-Based Match:`);
    geoMatch.matchedInquiries?.forEach(inquiry => {
      console.log(`    - Property ${inquiry.propertyNumber}: ${inquiry.distance.toFixed(2)}km`);
    });
    console.log(`  Min Distance: ${geoMatch.minDistance?.toFixed(2)}km`);
  }
  
  if (geoMatch.matchType === 'area' || geoMatch.matchType === 'both') {
    console.log(`  Area-Based Match:`);
    console.log(`    - Matched Areas: ${geoMatch.matchedAreas?.join(', ')}`);
  }
  
  if (geoMatch.matchType === 'none') {
    console.log(`  No match (neither inquiry nor area)`);
  }
}
```

## Error Handling

### 座標取得失敗時の処理

```typescript
async getCoordinatesWithFallback(
  googleMapUrl: string | null,
  address: string | null
): Promise<Coordinates | null> {
  try {
    // Google Map URLから座標を取得
    if (googleMapUrl) {
      const coords = await this.geolocationService.extractCoordinatesFromUrl(googleMapUrl);
      if (coords) return coords;
    }

    // 住所からジオコーディング
    if (address) {
      const coords = await this.geolocationService.geocodeAddress(address);
      if (coords) return coords;
    }

    console.warn(`[Coordinates] No valid coordinates for URL: ${googleMapUrl}, Address: ${address}`);
    return null;
  } catch (error) {
    console.error(`[Coordinates] Error getting coordinates:`, error);
    return null;
  }
}
```

### 問い合わせ履歴なしの処理

```typescript
// 問い合わせ履歴がない買主は、エリアベースマッチングのみ使用
if (!buyerInquiries || buyerInquiries.length === 0) {
  console.log(`[Buyer ${buyer.buyer_number}] No inquiry history, using area-based matching only`);
  return await this.checkAreaBasedMatch(
    propertyDistributionAreas,
    buyer.desired_area
  );
}
```

## Testing Strategy

### Unit Tests

```typescript
describe('EnhancedBuyerDistributionService', () => {
  describe('checkInquiryBasedMatch', () => {
    it('should match when inquiry property is within 3km', async () => {
      // Test implementation
    });

    it('should not match when all inquiry properties are beyond 3km', async () => {
      // Test implementation
    });

    it('should handle multiple inquiry properties', async () => {
      // Test implementation
    });

    it('should skip inquiry properties without coordinates', async () => {
      // Test implementation
    });
  });

  describe('filterByGeography', () => {
    it('should match with inquiry-based criteria only', async () => {
      // Test implementation
    });

    it('should match with area-based criteria only', async () => {
      // Test implementation
    });

    it('should match with both criteria', async () => {
      // Test implementation
    });

    it('should not match when neither criteria is met', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

```typescript
describe('Buyer Distribution Integration', () => {
  it('should distribute to buyers with inquiry history within 3km', async () => {
    // Create test property
    // Create test buyer with inquiry history
    // Run distribution
    // Verify buyer is included
  });

  it('should distribute to buyers with matching area numbers', async () => {
    // Create test property with distribution_areas
    // Create test buyer with desired_area
    // Run distribution
    // Verify buyer is included
  });

  it('should handle buyers with both inquiry and area matches', async () => {
    // Test implementation
  });
});
```

## Migration Plan

### Phase 1: Add Inquiry-Based Logic (Non-Breaking)

1. 既存の`filterByGeography()`を`checkAreaBasedMatch()`にリファクタリング
2. 新しい`checkInquiryBasedMatch()`を実装
3. 統合ロジックを実装（OR条件）
4. ログ出力を追加

### Phase 2: Testing

1. ユニットテストを実装
2. 統合テストを実装
3. 実データでテスト実行

### Phase 3: Deployment

1. ステージング環境でテスト
2. 本番環境にデプロイ
3. モニタリング

## Performance Targets

- **問い合わせ履歴取得**: 1回のクエリで全買主分を取得（< 500ms）
- **座標取得**: キャッシュ活用により重複取得を回避
- **距離計算**: 買主あたり平均 < 10ms
- **全体処理時間**: 100買主で < 10秒

## Monitoring

### メトリクス

- 問い合わせベースマッチ率
- エリアベースマッチ率
- 両方マッチ率
- 処理時間（買主数別）
- エラー率

### ログ出力例

```
[EnhancedBuyerDistributionService] Starting buyer filtering for property AA12345
[Property] AA12345: 大分市田尻北3-14, Price: 25000000, Type: 戸建
[Inquiry History] Retrieved 150 inquiries for 50 buyers
[Buyer 6432] Inquiry-based match: AA12903 (2.3km), AA13129 (1.8km)
[Buyer 6432] Area-based match: ①②③
[Buyer 6432] ✓ Qualified (both criteria)
[Buyer 6433] No inquiry history, area-based only
[Buyer 6433] Area-based match: ⑥
[Buyer 6433] ✓ Qualified (area criteria)
[Summary] 50 buyers processed, 23 qualified (15 inquiry, 5 area, 3 both)
```

## Security Considerations

- 買主の個人情報（問い合わせ履歴）は適切にアクセス制御
- 座標情報のキャッシュは処理完了後にクリア
- ログ出力に個人情報を含めない

## Future Enhancements

1. **重み付けマッチング**: 問い合わせベースマッチを優先度高く扱う
2. **時間的重み付け**: 最近の問い合わせを重視
3. **問い合わせ頻度**: 複数回問い合わせたエリアを重視
4. **機械学習**: 買主の興味パターンを学習
