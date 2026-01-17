# Tasks: Buyer Inquiry-Based Distribution

## Overview

買主への物件配信ロジックを拡張し、問い合わせ履歴ベースの配信を実装する。

## Task List

### Task 1: Database Schema Verification ✓

**Status**: COMPLETE (schema already exists in migration 037)

**Description**: buyer_inquiriesテーブルのスキーマを確認

**Verification**:
- ✓ buyer_inquiries table exists
- ✓ buyer_id foreign key to buyers table
- ✓ property_number foreign key to property_listings table
- ✓ Indexes on buyer_id and property_number

---

### Task 2: Refactor Existing Geography Filter

**Status**: TODO

**Description**: 既存の`filterByGeography()`を`checkAreaBasedMatch()`にリファクタリング

**Files to Modify**:
- `backend/src/services/EnhancedBuyerDistributionService.ts`

**Changes**:
1. `filterByGeography()`を`checkAreaBasedMatch()`にリネーム
2. 戻り値の型を更新:
   ```typescript
   {
     matched: boolean;
     matchedAreas: string[];
   }
   ```
3. 既存のロジックを維持（エリア番号の比較）

**Acceptance Criteria**:
- [ ] メソッド名が`checkAreaBasedMatch()`に変更されている
- [ ] 既存のエリアベースマッチングロジックが動作する
- [ ] 戻り値の型が正しい

---

### Task 3: Implement Inquiry History Retrieval

**Status**: TODO

**Description**: 全買主の問い合わせ履歴を一括取得するメソッドを実装

**Files to Modify**:
- `backend/src/services/EnhancedBuyerDistributionService.ts`

**Implementation**:
```typescript
interface InquiryProperty {
  propertyNumber: string;
  address: string | null;
  googleMapUrl: string | null;
}

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

  if (error) {
    console.error('[fetchAllBuyerInquiries] Error:', error);
    return new Map();
  }

  const inquiryMap = new Map<string, InquiryProperty[]>();
  
  data?.forEach(row => {
    if (!inquiryMap.has(row.buyer_id)) {
      inquiryMap.set(row.buyer_id, []);
    }
    inquiryMap.get(row.buyer_id)!.push({
      propertyNumber: row.property_number,
      address: row.property_listings?.address || null,
      googleMapUrl: row.property_listings?.google_map_url || null
    });
  });

  console.log(`[fetchAllBuyerInquiries] Retrieved inquiries for ${inquiryMap.size} buyers`);
  return inquiryMap;
}
```

**Acceptance Criteria**:
- [ ] メソッドが実装されている
- [ ] JOINを使用して1回のクエリで取得
- [ ] Map<buyer_id, InquiryProperty[]>を返す
- [ ] エラーハンドリングが適切

---

### Task 4: Implement Inquiry-Based Matching

**Status**: TODO

**Description**: 問い合わせ履歴ベースのマッチングロジックを実装

**Files to Modify**:
- `backend/src/services/EnhancedBuyerDistributionService.ts`

**Implementation**:
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
      console.log(`[Inquiry Match] No coordinates for ${inquiry.propertyNumber}`);
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

**Acceptance Criteria**:
- [ ] メソッドが実装されている
- [ ] 各問い合わせ物件との距離を計算
- [ ] 3km以内の物件をマッチとして記録
- [ ] 座標がない物件はスキップ
- [ ] 最小距離を記録

---

### Task 5: Implement Unified Geography Filter

**Status**: TODO

**Description**: 問い合わせベースとエリアベースを統合した地理的フィルターを実装

**Files to Modify**:
- `backend/src/services/EnhancedBuyerDistributionService.ts`

**Implementation**:
```typescript
interface GeographicMatchResult {
  matched: boolean;
  matchType: 'inquiry' | 'area' | 'both' | 'none';
  matchedAreas?: string[];
  matchedInquiries?: {
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
  
  // 1. 問い合わせベースマッチング
  const inquiryMatch = await this.checkInquiryBasedMatch(
    propertyCoordinates,
    buyerInquiries
  );

  // 2. エリアベースマッチング
  const areaMatch = await this.checkAreaBasedMatch(
    propertyDistributionAreas,
    buyer.desired_area
  );

  // 3. 結果を統合（OR条件）
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

**Acceptance Criteria**:
- [ ] 問い合わせベースとエリアベースの両方をチェック
- [ ] OR条件で統合（どちらかがマッチすればOK）
- [ ] マッチタイプを記録（inquiry/area/both/none）
- [ ] 詳細情報を返す

---

### Task 6: Update Main Filter Method

**Status**: TODO

**Description**: `getQualifiedBuyersWithAllCriteria()`を更新して問い合わせ履歴を使用

**Files to Modify**:
- `backend/src/services/EnhancedBuyerDistributionService.ts`

**Changes**:
1. 物件の座標を取得
2. 全買主の問い合わせ履歴を一括取得
3. 各買主のフィルタリング時に問い合わせ履歴を渡す

**Implementation**:
```typescript
async getQualifiedBuyersWithAllCriteria(
  criteria: EnhancedFilterCriteria
): Promise<EnhancedBuyerFilterResult> {
  try {
    console.log(`[EnhancedBuyerDistributionService] Starting buyer filtering for property ${criteria.propertyNumber}`);

    // 1. 物件情報を取得
    const property = await this.fetchProperty(criteria.propertyNumber);

    // 2. 物件の座標を取得
    const propertyCoords = await this.geolocationService.getCoordinates(
      property.google_map_url,
      property.address
    );

    if (!propertyCoords) {
      console.warn(`[EnhancedBuyerDistributionService] No coordinates for property ${criteria.propertyNumber}`);
      return this.emptyResult();
    }

    // 3. すべての買主を取得
    const allBuyers = await this.fetchAllBuyers();
    console.log(`[EnhancedBuyerDistributionService] Total buyers: ${allBuyers.length}`);

    // 4. 全買主の問い合わせ履歴を一括取得
    const inquiryMap = await this.fetchAllBuyerInquiries();
    console.log(`[EnhancedBuyerDistributionService] Inquiry history for ${inquiryMap.size} buyers`);

    // 5. 各買主にフィルターを適用
    const filteredBuyers: FilteredBuyer[] = [];

    for (const buyer of allBuyers) {
      const buyerInquiries = inquiryMap.get(buyer.id) || [];
      
      // 地理的フィルター（問い合わせ + エリア）
      const geoMatch = await this.filterByGeography(
        propertyCoords,
        property.distribution_areas,
        buyer,
        buyerInquiries
      );

      // ログ出力
      this.logGeographicMatch(buyer.buyer_number, geoMatch);

      // 他のフィルター
      const distMatch = this.filterByDistributionFlag(buyer);
      const statusMatch = this.filterByLatestStatus(buyer);
      const priceMatch = this.filterByPriceRange(
        property.price,
        property.property_type,
        buyer
      );

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

    // 6. 合格した買主を抽出
    const qualifiedBuyers = filteredBuyers.filter(b => 
      b.filterResults.geography &&
      b.filterResults.distribution &&
      b.filterResults.status &&
      b.filterResults.priceRange
    );

    const emails = Array.from(new Set(
      qualifiedBuyers
        .map(b => b.email)
        .filter(e => e && e.trim() !== '')
    )) as string[];

    console.log(`[EnhancedBuyerDistributionService] Filtering complete:`, {
      totalBuyers: allBuyers.length,
      qualifiedBuyers: qualifiedBuyers.length,
      uniqueEmails: emails.length
    });

    return {
      emails,
      count: emails.length,
      totalBuyers: allBuyers.length,
      filteredBuyers,
      appliedFilters: {
        geographyFilter: true,
        distributionFilter: true,
        statusFilter: true,
        priceRangeFilter: true
      }
    };
  } catch (error) {
    console.error('[EnhancedBuyerDistributionService] Error:', error);
    throw error;
  }
}
```

**Acceptance Criteria**:
- [ ] 物件座標を取得
- [ ] 問い合わせ履歴を一括取得
- [ ] 各買主のフィルタリングで問い合わせ履歴を使用
- [ ] ログ出力が適切

---

### Task 7: Add Logging Helper

**Status**: TODO

**Description**: 地理的マッチングの詳細ログを出力するヘルパーメソッドを追加

**Files to Modify**:
- `backend/src/services/EnhancedBuyerDistributionService.ts`

**Implementation**:
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
    if (geoMatch.minDistance !== undefined) {
      console.log(`  Min Distance: ${geoMatch.minDistance.toFixed(2)}km`);
    }
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

**Acceptance Criteria**:
- [ ] メソッドが実装されている
- [ ] マッチタイプに応じた詳細ログを出力
- [ ] 問い合わせマッチの場合は距離を表示
- [ ] エリアマッチの場合はエリア番号を表示

---

### Task 8: Update Type Definitions

**Status**: TODO

**Description**: 型定義を更新

**Files to Modify**:
- `backend/src/services/EnhancedBuyerDistributionService.ts`

**Changes**:
1. `InquiryProperty`インターフェースを追加
2. `GeographicMatchResult`インターフェースを更新
3. `FilteredBuyer`インターフェースを更新（geographicMatchフィールド）

**Acceptance Criteria**:
- [ ] 型定義が追加されている
- [ ] 既存の型定義と互換性がある
- [ ] TypeScriptコンパイルエラーがない

---

### Task 9: Create Test Script

**Status**: TODO

**Description**: 実装をテストするスクリプトを作成

**Files to Create**:
- `backend/test-inquiry-based-distribution.ts`

**Implementation**:
```typescript
import { EnhancedBuyerDistributionService } from './src/services/EnhancedBuyerDistributionService';
import dotenv from 'dotenv';

dotenv.config();

async function testInquiryBasedDistribution() {
  const service = new EnhancedBuyerDistributionService();

  // テスト対象物件
  const propertyNumber = 'AA12345'; // 実際の物件番号に置き換え

  console.log(`\n=== Testing Inquiry-Based Distribution ===`);
  console.log(`Property: ${propertyNumber}\n`);

  try {
    const result = await service.getQualifiedBuyersWithAllCriteria({
      propertyNumber
    });

    console.log(`\n=== Results ===`);
    console.log(`Total Buyers: ${result.totalBuyers}`);
    console.log(`Qualified Buyers: ${result.count}`);
    console.log(`Unique Emails: ${result.emails.length}`);

    // マッチタイプ別の統計
    const matchTypes = {
      inquiry: 0,
      area: 0,
      both: 0,
      none: 0
    };

    result.filteredBuyers.forEach(buyer => {
      if (buyer.geographicMatch) {
        matchTypes[buyer.geographicMatch.matchType]++;
      }
    });

    console.log(`\n=== Match Type Statistics ===`);
    console.log(`Inquiry-Based Only: ${matchTypes.inquiry}`);
    console.log(`Area-Based Only: ${matchTypes.area}`);
    console.log(`Both: ${matchTypes.both}`);
    console.log(`None: ${matchTypes.none}`);

    // 合格した買主の詳細
    const qualified = result.filteredBuyers.filter(b => 
      b.filterResults.geography &&
      b.filterResults.distribution &&
      b.filterResults.status &&
      b.filterResults.priceRange
    );

    console.log(`\n=== Qualified Buyers Details ===`);
    qualified.forEach(buyer => {
      console.log(`\nBuyer ${buyer.buyer_number}:`);
      console.log(`  Match Type: ${buyer.geographicMatch?.matchType}`);
      if (buyer.geographicMatch?.matchType === 'inquiry' || buyer.geographicMatch?.matchType === 'both') {
        console.log(`  Matched Inquiries:`);
        buyer.geographicMatch.matchedInquiries?.forEach(inq => {
          console.log(`    - ${inq.propertyNumber}: ${inq.distance.toFixed(2)}km`);
        });
      }
      if (buyer.geographicMatch?.matchType === 'area' || buyer.geographicMatch?.matchType === 'both') {
        console.log(`  Matched Areas: ${buyer.geographicMatch.matchedAreas?.join(', ')}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testInquiryBasedDistribution();
```

**Acceptance Criteria**:
- [ ] スクリプトが作成されている
- [ ] 実際の物件で配信対象買主を取得
- [ ] マッチタイプ別の統計を表示
- [ ] 詳細ログを出力

---

### Task 10: Manual Testing

**Status**: TODO

**Description**: 実データでテストを実行

**Test Cases**:
1. 問い合わせ履歴がある買主が正しくマッチする
2. エリア番号のみでマッチする買主が正しくマッチする
3. 両方の条件でマッチする買主が正しくマッチする
4. どちらの条件も満たさない買主が除外される
5. 問い合わせ履歴がない買主がエリアベースでマッチする

**Test Command**:
```bash
npx ts-node backend/test-inquiry-based-distribution.ts
```

**Acceptance Criteria**:
- [ ] すべてのテストケースが成功
- [ ] ログ出力が適切
- [ ] パフォーマンスが許容範囲内（< 10秒）

---

### Task 11: Update Frontend (Optional)

**Status**: TODO

**Description**: フロントエンドで問い合わせベースマッチを表示（オプション）

**Files to Modify**:
- `frontend/src/components/BuyerFilterSummaryModal.tsx`

**Changes**:
- マッチタイプを表示（inquiry/area/both）
- 問い合わせマッチの場合は距離を表示

**Acceptance Criteria**:
- [ ] マッチタイプが表示される
- [ ] 問い合わせマッチの詳細が表示される

---

## Implementation Order

1. Task 2: Refactor existing geography filter
2. Task 8: Update type definitions
3. Task 3: Implement inquiry history retrieval
4. Task 4: Implement inquiry-based matching
5. Task 5: Implement unified geography filter
6. Task 7: Add logging helper
7. Task 6: Update main filter method
8. Task 9: Create test script
9. Task 10: Manual testing
10. Task 11: Update frontend (optional)

## Success Criteria

- [ ] 問い合わせ履歴ベースの配信が動作する
- [ ] エリアベースの配信が引き続き動作する
- [ ] OR条件で統合されている
- [ ] 詳細ログが出力される
- [ ] パフォーマンスが許容範囲内
- [ ] 既存機能に影響がない

## Notes

- 既存のエリアベースマッチングは維持する（後方互換性）
- 問い合わせ履歴がない買主はエリアベースのみ使用
- 座標が取得できない物件はスキップ
- ログ出力を充実させてデバッグしやすくする
