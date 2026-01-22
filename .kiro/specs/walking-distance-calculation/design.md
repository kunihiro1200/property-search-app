# 歩行距離計算機能 - 設計書

## アーキテクチャ概要

```
PropertyDistributionAreaCalculator
  ↓
  ├─ GeolocationService (既存)
  │   ├─ calculateDistance() - 直線距離計算
  │   └─ calculateWalkingDistance() - 歩行距離計算（新規）
  │       ↓
  │       GoogleMapsDistanceService (新規)
  │           ↓
  │           DistanceCache (新規)
  │               ↓
  │               Redis
  └─ AreaMapConfigService (既存)
```

## コンポーネント設計

### 1. GoogleMapsDistanceService

**責務**: Google Maps Distance Matrix APIとの通信

```typescript
export interface DistanceMatrixRequest {
  origins: Coordinates[];
  destinations: Coordinates[];
  mode: 'walking' | 'driving' | 'bicycling' | 'transit';
}

export interface DistanceMatrixResponse {
  rows: Array<{
    elements: Array<{
      distance: { value: number; text: string };
      duration: { value: number; text: string };
      status: string;
    }>;
  }>;
  status: string;
}

export interface WalkingDistanceResult {
  distanceKm: number;
  durationMinutes: number;
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'ERROR';
}

export class GoogleMapsDistanceService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  
  constructor(apiKey: string);
  
  /**
   * 複数の目的地への歩行距離を一括取得
   * @param origin 出発地点
   * @param destinations 目的地リスト（最大25件）
   * @returns 各目的地への距離情報
   */
  async getWalkingDistances(
    origin: Coordinates,
    destinations: Coordinates[]
  ): Promise<WalkingDistanceResult[]>;
  
  /**
   * 単一の目的地への歩行距離を取得
   * @param origin 出発地点
   * @param destination 目的地
   * @returns 距離情報
   */
  async getWalkingDistance(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<WalkingDistanceResult>;
}
```

### 2. DistanceCache

**責務**: 距離計算結果のキャッシュ管理

```typescript
export interface CachedDistance {
  distanceKm: number;
  durationMinutes: number;
  calculatedAt: Date;
  source: 'api';
}

export class DistanceCache {
  private redis: Redis;
  private ttlDays: number;
  
  constructor(redis: Redis, ttlDays?: number);
  
  /**
   * キャッシュキーを生成
   * @param origin 出発地点
   * @param destination 目的地
   * @returns キャッシュキー
   */
  private generateKey(origin: Coordinates, destination: Coordinates): string;
  
  /**
   * キャッシュから距離を取得
   * @param origin 出発地点
   * @param destination 目的地
   * @returns キャッシュされた距離、なければnull
   */
  async get(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<CachedDistance | null>;
  
  /**
   * 距離をキャッシュに保存
   * @param origin 出発地点
   * @param destination 目的地
   * @param distance 距離情報
   */
  async set(
    origin: Coordinates,
    destination: Coordinates,
    distance: WalkingDistanceResult
  ): Promise<void>;
  
  /**
   * 複数の距離を一括取得
   * @param origin 出発地点
   * @param destinations 目的地リスト
   * @returns キャッシュされた距離のマップ
   */
  async getMultiple(
    origin: Coordinates,
    destinations: Coordinates[]
  ): Promise<Map<string, CachedDistance>>;
}
```

### 3. GeolocationService（拡張）

**既存メソッド**:
- `extractCoordinatesFromUrl()` - URL解析
- `calculateDistance()` - 直線距離計算
- `expandShortenedUrl()` - 短縮URL展開

**新規メソッド**:

```typescript
export interface DistanceCalculationOptions {
  useWalkingDistance?: boolean;  // デフォルト: true
  fallbackToStraightLine?: boolean;  // デフォルト: true
  timeout?: number;  // デフォルト: 5000ms
}

export interface DistanceResult {
  distance: number;  // km
  duration?: number;  // 分（歩行距離の場合のみ）
  method: 'straight-line' | 'walking' | 'cached-walking';
  calculatedAt: Date;
}

export class GeolocationService {
  private googleMapsService: GoogleMapsDistanceService;
  private distanceCache: DistanceCache;
  private config: DistanceCalculationConfig;
  
  // ... 既存メソッド ...
  
  /**
   * 2点間の距離を計算（歩行距離または直線距離）
   * @param point1 地点1
   * @param point2 地点2
   * @param options 計算オプション
   * @returns 距離情報
   */
  async calculateDistanceWithOptions(
    point1: Coordinates,
    point2: Coordinates,
    options?: DistanceCalculationOptions
  ): Promise<DistanceResult>;
  
  /**
   * 複数地点への距離を一括計算
   * @param origin 出発地点
   * @param destinations 目的地リスト
   * @param options 計算オプション
   * @returns 距離情報の配列
   */
  async calculateDistancesToMultiple(
    origin: Coordinates,
    destinations: Coordinates[],
    options?: DistanceCalculationOptions
  ): Promise<DistanceResult[]>;
}
```

### 4. PropertyDistributionAreaCalculator（修正）

**修正内容**: ハイブリッド計算ロジックの実装

```typescript
export interface DistributionAreaCalculationOptions {
  useWalkingDistance?: boolean;  // デフォルト: true
  initialFilterRadiusKm?: number;  // デフォルト: 3
  finalRadiusKm?: number;  // デフォルト: 10
}

export class PropertyDistributionAreaCalculator {
  private geolocationService: EnhancedGeolocationService;
  private areaMapConfigService: AreaMapConfigService;
  private config: DistanceCalculationConfig;
  
  /**
   * 物件の配信エリアを計算（ハイブリッドアプローチ）
   * @param googleMapUrl Google Map URL
   * @param city 市名
   * @param options 計算オプション
   * @returns 計算結果
   */
  async calculateDistributionAreas(
    googleMapUrl: string | null | undefined,
    city?: string | null,
    options?: DistributionAreaCalculationOptions
  ): Promise<DistributionAreaCalculationResult>;
  
  /**
   * ハイブリッド距離計算の内部実装
   * 1. 直線距離で初期フィルタリング
   * 2. 歩行距離で精密計算
   */
  private async calculateAreasWithHybridApproach(
    propertyCoords: Coordinates,
    areaConfigs: AreaMapConfig[],
    options: DistributionAreaCalculationOptions
  ): Promise<string[]>;
}
```

### 5. DistanceCalculationConfig

**責務**: 距離計算の設定管理

```typescript
export interface DistanceCalculationConfig {
  walkingDistanceEnabled: boolean;
  initialFilterRadiusKm: number;
  finalRadiusKm: number;
  googleMapsApiKey: string;
  cacheTtlDays: number;
  apiTimeout: number;
  maxParallelRequests: number;
  fallbackToStraightLine: boolean;
}

export class DistanceCalculationConfigLoader {
  static load(): DistanceCalculationConfig {
    return {
      walkingDistanceEnabled: process.env.WALKING_DISTANCE_ENABLED === 'true',
      initialFilterRadiusKm: parseFloat(process.env.INITIAL_FILTER_RADIUS_KM || '3'),
      finalRadiusKm: parseFloat(process.env.FINAL_RADIUS_KM || '10'),
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      cacheTtlDays: parseInt(process.env.DISTANCE_CACHE_TTL_DAYS || '30'),
      apiTimeout: parseInt(process.env.DISTANCE_API_TIMEOUT || '5000'),
      maxParallelRequests: parseInt(process.env.MAX_PARALLEL_DISTANCE_REQUESTS || '5'),
      fallbackToStraightLine: process.env.FALLBACK_TO_STRAIGHT_LINE !== 'false'
    };
  }
}
```

## データフロー

### ハイブリッド計算フロー

```
1. 物件座標の取得
   ↓
2. 全エリア設定の読み込み
   ↓
3. 直線距離で初期フィルタリング（3km以内）
   ├─ エリア①: 2.5km → 通過
   ├─ エリア②: 2.8km → 通過
   ├─ エリア③: 4.2km → 除外
   └─ ...
   ↓
4. フィルタ通過エリアの歩行距離計算
   ├─ キャッシュチェック
   │   ├─ ヒット → キャッシュ値使用
   │   └─ ミス → API呼び出し
   ↓
5. 歩行距離による最終判定
   ├─ エリア①: 3.2km（歩行） → 採用
   ├─ エリア②: 3.8km（歩行） → 採用
   └─ ...
   ↓
6. 市全域エリアと結合
   ↓
7. ソート・フォーマット
   ↓
8. 結果返却
```

### エラーハンドリングフロー

```
API呼び出し
  ↓
  ├─ 成功 → 結果を返却 & キャッシュ
  ├─ タイムアウト → 直線距離にフォールバック
  ├─ レート制限 → リトライ（最大3回）
  ├─ ネットワークエラー → 直線距離にフォールバック
  └─ その他エラー → ログ記録 & 直線距離にフォールバック
```

## API使用量の最適化

### バッチ処理
Distance Matrix APIは1リクエストで最大25の目的地を処理可能:

```typescript
// 悪い例: 個別リクエスト（8回のAPI呼び出し）
for (const area of filteredAreas) {
  const distance = await getWalkingDistance(property, area);
}

// 良い例: バッチリクエスト（1回のAPI呼び出し）
const distances = await getWalkingDistances(property, filteredAreas);
```

### キャッシュ戦略
1. **メモリキャッシュ**: プロセス内で高速アクセス
2. **Redisキャッシュ**: 永続化・共有
3. **TTL**: 30日（座標は変わらないため長期キャッシュ可能）

### 並列処理制限
```typescript
// 最大5並列でAPI呼び出し
const chunks = chunkArray(destinations, 25); // Distance Matrix APIの制限
const results = await Promise.all(
  chunks.slice(0, 5).map(chunk => 
    getWalkingDistances(origin, chunk)
  )
);
```

## データベース設計

### キャッシュテーブル（Redis）

```
Key: distance:walking:{lat1},{lng1}:{lat2},{lng2}
Value: {
  "distanceKm": 9.2,
  "durationMinutes": 115,
  "calculatedAt": "2025-12-16T10:30:00Z"
}
TTL: 30日
```

### 使用量記録テーブル（PostgreSQL）

```sql
CREATE TABLE distance_api_usage (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  cache_hit_count INTEGER NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

CREATE INDEX idx_distance_api_usage_date ON distance_api_usage(date);
```

## セキュリティ考慮事項

### APIキーの保護
- 環境変数で管理
- リポジトリにコミットしない
- 本番環境では制限付きキーを使用

### レート制限
- Google Maps API: 1秒あたり100リクエスト
- アプリケーション側で制限: 1秒あたり10リクエスト

### コスト制限
- 月間上限: $50
- 日次上限: $2
- 上限到達時は自動的に直線距離にフォールバック

## 監視とロギング

### メトリクス
- API呼び出し回数（成功/失敗）
- キャッシュヒット率
- 平均処理時間
- エラー率
- 日次/月次コスト

### ログ
```typescript
logger.info('Walking distance calculated', {
  propertyId: 'AA13129',
  origin: { lat: 33.183482, lng: 131.5873062 },
  destination: { lat: 33.2382, lng: 131.6126 },
  distance: 9.2,
  duration: 115,
  source: 'api',
  processingTime: 234
});

logger.error('Walking distance API failed', {
  propertyId: 'AA13129',
  error: 'TIMEOUT',
  fallbackUsed: true
});
```

## テスト戦略

### 単体テスト
- GoogleMapsDistanceService（モック使用）
- DistanceCache（Redis モック）
- ハイブリッド計算ロジック

### 統合テスト
- 実際のGoogle Maps APIを使用
- キャッシュの動作確認
- エラーハンドリング

### E2Eテスト
- AA13129での検証
- 複数物件での一括処理テスト

## パフォーマンス目標

| 指標 | 目標値 |
|------|--------|
| 1物件あたりの処理時間 | < 3秒 |
| API呼び出し回数 | < 8回/物件 |
| キャッシュヒット率 | > 80% |
| エラー率 | < 1% |
| 月間コスト | < $50 |

## ロールバック計画

環境変数で簡単に切り替え可能:

```bash
# 歩行距離を無効化（直線距離に戻す）
WALKING_DISTANCE_ENABLED=false
```

設定変更のみでロールバック可能なため、コードの変更は不要。
