# Design Document

## Overview

別府市内の物件に対して、住所から学校区や地域情報に基づいた詳細な配信エリア番号を自動的に振り分けるシステムを設計する。データベースに別府市のエリアマッピングテーブルを作成し、住所解析サービスを実装して、既存の配信エリア計算ロジックに統合する。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│              Property Creation/Update                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│       PropertyDistributionAreaCalculator                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  calculateDistributionAreas()                         │  │
│  │  - Extract city from address                          │  │
│  │  - If 別府市 → BeppuAreaMappingService               │  │
│  │  - If 大分市 → ㊵                                     │  │
│  │  - Else → Coordinate-based (①-⑮)                    │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           BeppuAreaMappingService                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  getDistributionAreasForAddress()                     │  │
│  │  1. Extract region name from address                  │  │
│  │  2. Query beppu_area_mapping table                    │  │
│  │  3. Return distribution areas or fallback to ㊶      │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database: beppu_area_mapping                    │
│  - school_district                                           │
│  - region_name                                               │
│  - distribution_areas                                        │
│  - other_region                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### beppu_area_mapping Table

```sql
CREATE TABLE beppu_area_mapping (
  id SERIAL PRIMARY KEY,
  school_district TEXT NOT NULL,           -- 学校名
  region_name TEXT NOT NULL,               -- 地域名
  distribution_areas TEXT NOT NULL,        -- 配信エリア番号
  other_region TEXT,                       -- その他地域情報
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_beppu_region_name ON beppu_area_mapping(region_name);
CREATE INDEX idx_beppu_school_district ON beppu_area_mapping(school_district);
```

**Columns:**
- `id`: Primary key
- `school_district`: 学校区名 (例: "青山中学校", "中部中学校")
- `region_name`: 地域名 (例: "南立石一区", "荘園北町", "東荘園4丁目")
- `distribution_areas`: 配信エリア番号 (例: "⑨㊷", "⑩㊸")
- `other_region`: その他地域情報 (例: "別府駅周辺", "鉄輪線より下")

**Indexes:**
- `idx_beppu_region_name`: 地域名での高速検索
- `idx_beppu_school_district`: 学校区での検索

## Component Design

### 1. BeppuAreaMappingService

新しいサービスクラスを作成し、別府市の住所から配信エリア番号を取得する。

```typescript
export class BeppuAreaMappingService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * 別府市の住所から配信エリア番号を取得
   * @param address 物件の住所
   * @returns 配信エリア番号 (例: "⑨㊷") または null
   */
  async getDistributionAreasForAddress(
    address: string
  ): Promise<string | null> {
    // 1. 住所から地域名を抽出
    const regionName = this.extractRegionName(address);
    
    if (!regionName) {
      console.warn(`[BeppuAreaMapping] No region name found in address: ${address}`);
      return null;
    }

    console.log(`[BeppuAreaMapping] Extracted region: ${regionName} from ${address}`);

    // 2. データベースから配信エリアを検索
    const areas = await this.lookupDistributionAreas(regionName);
    
    if (areas) {
      console.log(`[BeppuAreaMapping] Found areas: ${areas} for region: ${regionName}`);
      return areas;
    }

    console.warn(`[BeppuAreaMapping] No mapping found for region: ${regionName}`);
    return null;
  }

  /**
   * 住所から地域名を抽出
   * @param address 住所
   * @returns 地域名 または null
   */
  private extractRegionName(address: string): string | null {
    // 別府市を除去
    let cleanAddress = address.replace(/別府市/g, '');

    // 地域名のパターン
    // 優先順位: より具体的なパターンから試す
    const patterns = [
      // 丁目付き (例: 東荘園4丁目, 石垣東１丁目)
      /([^\s]+?\d+丁目)/,
      // 区付き (例: 南立石一区, 亀川四の湯町１区)
      /([^\s]+?[一二三四五六七八九十１２３４５６７８９０]+区)/,
      // 町付き (例: 荘園北町, 亀川中央町)
      /([^\s]+?町)/,
      // その他の地域名 (例: 荘園, 鶴見, 観海寺)
      /^([^\s\d]+)/
    ];

    for (const pattern of patterns) {
      const match = cleanAddress.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * データベースから配信エリアを検索
   * @param regionName 地域名
   * @returns 配信エリア番号 または null
   */
  private async lookupDistributionAreas(
    regionName: string
  ): Promise<string | null> {
    // 完全一致検索
    const { data, error } = await this.supabase
      .from('beppu_area_mapping')
      .select('distribution_areas')
      .eq('region_name', regionName)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found error
        console.error('[BeppuAreaMapping] Database error:', error);
      }
      return null;
    }

    return data?.distribution_areas || null;
  }

  /**
   * 全てのマッピングデータを取得 (デバッグ用)
   */
  async getAllMappings(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('beppu_area_mapping')
      .select('*')
      .order('school_district', { ascending: true })
      .order('region_name', { ascending: true });

    if (error) {
      console.error('[BeppuAreaMapping] Error fetching all mappings:', error);
      return [];
    }

    return data || [];
  }
}
```

### 2. PropertyDistributionAreaCalculator の拡張

既存の `PropertyDistributionAreaCalculator` を拡張して、別府市の住所を処理する。

```typescript
import { BeppuAreaMappingService } from './BeppuAreaMappingService';

export class PropertyDistributionAreaCalculator {
  private beppuService: BeppuAreaMappingService;

  constructor() {
    this.beppuService = new BeppuAreaMappingService();
  }

  async calculateDistributionAreas(
    address: string,
    googleMapUrl?: string
  ): Promise<string> {
    // 市区町村を抽出
    const city = this.extractCity(address);

    // 大分市の場合
    if (city === '大分市') {
      return '㊵';
    }

    // 別府市の場合 - 新しいロジック
    if (city === '別府市') {
      const beppuAreas = await this.beppuService.getDistributionAreasForAddress(address);
      
      if (beppuAreas) {
        console.log(`[DistributionArea] Beppu detailed areas: ${beppuAreas}`);
        return beppuAreas;
      }
      
      // マッピングが見つからない場合は別府市全体にフォールバック
      console.warn(`[DistributionArea] No detailed mapping found, falling back to ㊶`);
      return '㊶';
    }

    // その他の市区町村 - 座標ベースの計算
    if (googleMapUrl) {
      const coords = await this.extractCoordinates(googleMapUrl);
      if (coords) {
        return await this.calculateCoordinateBasedAreas(coords);
      }
    }

    return '';
  }

  // ... 既存のメソッド
}
```

## Data Flow

### 新規物件作成時のフロー

```
1. ユーザーが物件を作成
   ↓
2. PropertyService が PropertyDistributionAreaCalculator を呼び出し
   ↓
3. 住所から市区町村を抽出
   ↓
4. 別府市の場合:
   ├─ BeppuAreaMappingService.getDistributionAreasForAddress() を呼び出し
   ├─ 住所から地域名を抽出 (例: "南立石一区")
   ├─ beppu_area_mapping テーブルを検索
   ├─ マッチした場合: 配信エリア番号を返す (例: "⑨㊷")
   └─ マッチしない場合: null を返す → ㊶ にフォールバック
   ↓
5. distribution_areas フィールドに保存
```

### 既存物件の一括更新フロー

```
1. バックフィルスクリプトを実行
   ↓
2. 別府市の住所を持つ全物件を取得
   ↓
3. 各物件に対して:
   ├─ BeppuAreaMappingService.getDistributionAreasForAddress() を呼び出し
   ├─ 配信エリア番号を取得
   ├─ distribution_areas フィールドを更新
   └─ ログに記録
   ↓
4. 更新件数をレポート
```

## Address Extraction Logic

### 地域名抽出の優先順位

1. **丁目付き地域名** (最優先)
   - パターン: `[地域名]X丁目`
   - 例: "東荘園4丁目", "石垣東１丁目", "朝見1丁目"
   - 理由: 最も具体的な地域指定

2. **区付き地域名**
   - パターン: `[地域名][数字]区`
   - 例: "南立石一区", "亀川四の湯町１区"
   - 理由: 区分けされた地域

3. **町付き地域名**
   - パターン: `[地域名]町`
   - 例: "荘園北町", "亀川中央町", "上人本町"
   - 理由: 一般的な地域名

4. **その他の地域名**
   - パターン: 最初の連続した文字列
   - 例: "荘園", "鶴見", "観海寺"
   - 理由: 大まかな地域

### 抽出例

| 住所 | 抽出される地域名 | マッチング |
|------|----------------|-----------|
| 別府市南立石一区1-2-3 | 南立石一区 | ⑨㊷ |
| 別府市東荘園4丁目5-10 | 東荘園4丁目 | ⑩㊸ |
| 別府市荘園北町3-15 | 荘園北町 | ⑩㊸ |
| 別府市亀川四の湯町１区2-5 | 亀川四の湯町１区 | ⑪㊸ |
| 別府市石垣東１丁目8-3 | 石垣東１丁目 | ⑩㊸ |
| 別府市中央町5-20 | 中央町 | ㊷ |

## Migration Strategy

### Phase 1: Database Setup

1. マイグレーションファイルを作成
2. `beppu_area_mapping` テーブルを作成
3. インデックスを作成

### Phase 2: Data Population

1. 提供されたデータを解析
2. INSERT文を生成
3. データをテーブルに投入
4. データの整合性を確認

### Phase 3: Service Implementation

1. `BeppuAreaMappingService` を実装
2. 単体テストを作成
3. 地域名抽出ロジックをテスト

### Phase 4: Integration

1. `PropertyDistributionAreaCalculator` を拡張
2. 統合テストを実行
3. 既存機能への影響を確認

### Phase 5: Backfill

1. バックフィルスクリプトを作成
2. テスト環境で実行
3. 本番環境で実行
4. 結果を検証

## Error Handling

### 地域名が抽出できない場合

```typescript
if (!regionName) {
  console.warn(`No region name extracted from address: ${address}`);
  return '㊶'; // 別府市全体にフォールバック
}
```

### データベース検索でエラーが発生した場合

```typescript
if (error) {
  console.error(`Database error while looking up region: ${regionName}`, error);
  return '㊶'; // 別府市全体にフォールバック
}
```

### マッピングが見つからない場合

```typescript
if (!areas) {
  console.warn(`No mapping found for region: ${regionName}`);
  return '㊶'; // 別府市全体にフォールバック
}
```

## Performance Considerations

### Database Indexing

- `region_name` にインデックスを作成して検索を高速化
- `school_district` にもインデックスを作成して管理を容易に

### Caching Strategy

初期実装ではキャッシュなしで進める。パフォーマンス問題が発生した場合:

1. メモリキャッシュを実装
2. マッピングデータを起動時にロード
3. Map<regionName, distributionAreas> で高速検索

```typescript
private mappingCache: Map<string, string> = new Map();

async loadMappingsIntoCache() {
  const mappings = await this.getAllMappings();
  mappings.forEach(m => {
    this.mappingCache.set(m.region_name, m.distribution_areas);
  });
}
```

### Query Optimization

- 完全一致検索を使用 (LIKE検索は避ける)
- 必要なカラムのみを SELECT
- Single row lookup を使用

## Testing Strategy

### Unit Tests

1. **BeppuAreaMappingService**
   - `extractRegionName()` のテスト
     - 丁目付き地域名
     - 区付き地域名
     - 町付き地域名
     - 抽出できない住所
   - `lookupDistributionAreas()` のテスト
     - 正常なマッチング
     - マッチしない場合
     - データベースエラー

2. **PropertyDistributionAreaCalculator**
   - 別府市の住所処理
   - フォールバックロジック
   - 既存機能への影響なし

### Integration Tests

1. 新規物件作成時の配信エリア自動設定
2. 物件住所更新時の再計算
3. バックフィルスクリプトの動作確認

### Test Data

```typescript
const testCases = [
  { address: '別府市南立石一区1-2-3', expected: '⑨㊷' },
  { address: '別府市東荘園4丁目5-10', expected: '⑩㊸' },
  { address: '別府市荘園北町3-15', expected: '⑩㊸' },
  { address: '別府市亀川四の湯町１区2-5', expected: '⑪㊸' },
  { address: '別府市中央町5-20', expected: '㊷' },
  { address: '別府市未知の地域1-1', expected: '㊶' }, // フォールバック
];
```

## Logging Strategy

### 情報ログ

- 地域名の抽出成功
- データベース検索の成功
- 配信エリアの設定

### 警告ログ

- 地域名が抽出できない
- マッピングが見つからない
- フォールバックの使用

### エラーログ

- データベースエラー
- 予期しない例外

### ログ例

```
[BeppuAreaMapping] Extracted region: 南立石一区 from 別府市南立石一区1-2-3
[BeppuAreaMapping] Found areas: ⑨㊷ for region: 南立石一区
[DistributionArea] Beppu detailed areas: ⑨㊷
```

## Rollback Plan

問題が発生した場合:

1. `PropertyDistributionAreaCalculator` の変更を元に戻す
2. 別府市の住所は㊶にフォールバック
3. `beppu_area_mapping` テーブルは残す (将来の再試行のため)
4. バックフィルで更新した配信エリアは手動で確認

## Future Enhancements

### Phase 2 機能

1. **他の市区町村への拡張**
   - 大分市内の詳細エリア分け
   - 他の市区町村のマッピング

2. **UI での管理機能**
   - マッピングデータの追加・編集・削除
   - 配信エリアの手動調整

3. **マッピングの検証**
   - 住所と配信エリアの整合性チェック
   - 重複や矛盾の検出

4. **統計とレポート**
   - エリアごとの物件数
   - マッピングの使用頻度
   - フォールバック率


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, the following properties were identified. Some redundant properties were consolidated:

- Properties 2.3 and 2.4 both test prioritization logic → Combined into Property 2
- Properties 3.3 and 5.4 both test area combination → Combined into Property 3
- Property 4.2 is redundant with 2.1 and 3.1 → Removed

### Property 1: Region Name Extraction

*For any* Beppu City address containing a valid region name, extracting the region name should return a non-null value that matches a known region pattern (丁目付き, 区付き, 町付き, or base region name).

**Validates: Requirements 2.1, 2.2**

### Property 2: Extraction Prioritization

*For any* address that could match multiple region patterns, the extraction should return the most specific match (丁目 > 区 > 町 > base name).

**Validates: Requirements 2.3, 2.4**

### Property 3: Area Lookup and Combination

*For any* valid region name in the beppu_area_mapping table, looking up the distribution areas should return a non-empty string containing valid area numbers, and when multiple areas apply, they should be combined in the result.

**Validates: Requirements 3.1, 3.2, 3.3, 5.4**

### Property 4: Manual Edit Preservation

*For any* property with a manually edited distribution_areas value, running the backfill or recalculation should not overwrite the manual value.

**Validates: Requirements 4.3**

### Property 5: Beppu Address Routing

*For any* property with an address containing "別府市", the PropertyDistributionAreaCalculator should invoke the BeppuAreaMappingService and return either the mapped areas or ㊶ as fallback.

**Validates: Requirements 5.1, 5.3**

### Property 6: Address Update Triggers Recalculation

*For any* property, when the address field is updated to a different Beppu City address, the distribution_areas field should be recalculated and updated accordingly.

**Validates: Requirements 5.2, 5.5**

### Edge Cases

The following edge cases will be handled by the property test generators:

- **Empty or null addresses** (Requirement 2.5): Should return null
- **Addresses with no matching region** (Requirement 3.4): Should fallback to ㊶
- **Database errors during lookup**: Should fallback to ㊶

## Data Integrity

### Mapping Data Validation

The beppu_area_mapping table should maintain:

1. **Uniqueness**: Each region_name should map to exactly one set of distribution_areas
2. **Completeness**: All regions mentioned in the provided data should be present
3. **Format Consistency**: distribution_areas should only contain valid area numbers (⑨-⑮, ㊷, ㊸)

### Distribution Areas Format

Valid distribution area formats:
- Single area: "⑨", "⑩", "㊷", "㊸"
- Combined areas: "⑨㊷", "⑩㊸", "⑪㊸"
- Invalid: "⑨⑩" (different school districts should not be combined)
