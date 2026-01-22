# Design Document

## Overview

公開物件サイトの画像表示パフォーマンスを改善するため、`PropertyImageService`のサブフォルダ検索処理を最適化する。既存の機能（athome公開/atbb公開フォルダの優先表示）は完全に維持しながら、キャッシュ時間の延長、並列処理、タイムアウト設定により、初回アクセス時の表示時間を5秒から2秒以下に短縮する。

## Architecture

### Current Architecture

```
PropertyImageGallery (Frontend)
  ↓
usePropertyImages hook
  ↓
GET /api/public/properties/:id/images
  ↓
PropertyImageService.getImagesFromStorageUrl()
  ↓
PropertyImageService.getPublicFolderIdIfExists()
  ↓ (5分キャッシュ)
  ├─ findFolderByName("athome公開") [直下]
  ├─ findFolderByName("atbb公開") [直下]
  └─ searchPublicFolderInSubfolders() [2階層目]
      ├─ listSubfolders()
      └─ for each subfolder:
          ├─ findFolderByName("athome公開")
          └─ findFolderByName("atbb公開")
```

**問題点:**
- 2階層目の検索で複数のサブフォルダを順次検索（直列処理）
- キャッシュが5分間のみ
- タイムアウトなし

### Improved Architecture

```
PropertyImageGallery (Frontend)
  ↓
usePropertyImages hook
  ↓
GET /api/public/properties/:id/images
  ↓
PropertyImageService.getImagesFromStorageUrl()
  ↓
PropertyImageService.getPublicFolderIdIfExists()
  ↓ (1時間キャッシュ + 環境変数設定可能)
  ├─ findFolderByName("athome公開") [直下]
  │   └─ 見つかったら即座にreturn（早期終了）
  ├─ findFolderByName("atbb公開") [直下]
  │   └─ 見つかったら即座にreturn（早期終了）
  └─ searchPublicFolderInSubfolders() [2階層目、最適化版]
      ├─ listSubfolders() (最大3つまで)
      └─ Promise.race() で並列検索 + 2秒タイムアウト
          ├─ Promise.all([
          │     findFolderByName("athome公開"),
          │     findFolderByName("atbb公開")
          │   ])
          └─ timeout(2000ms)
```

**改善点:**
- 並列処理による高速化
- 1時間キャッシュ
- 2秒タイムアウト
- サブフォルダ数制限（最大3つ）

## Components and Interfaces

### PropertyImageService (Modified)

```typescript
export class PropertyImageService {
  private driveService: GoogleDriveService;
  private cache: Map<string, CacheEntry> = new Map();
  private folderIdCache: Map<string, FolderIdCacheEntry> = new Map();
  private cacheTTL: number; // milliseconds
  private folderIdCacheTTL: number; // milliseconds (NEW)
  private searchTimeout: number; // milliseconds (NEW)
  private maxSubfoldersToSearch: number; // (NEW)

  constructor(
    cacheTTLMinutes: number = 60,
    folderIdCacheTTLMinutes: number = 60, // NEW: デフォルト1時間
    searchTimeoutSeconds: number = 2, // NEW: デフォルト2秒
    maxSubfoldersToSearch: number = 3 // NEW: デフォルト3つ
  ) {
    this.driveService = new GoogleDriveService();
    this.cacheTTL = cacheTTLMinutes * 60 * 1000;
    this.folderIdCacheTTL = folderIdCacheTTLMinutes * 60 * 1000; // NEW
    this.searchTimeout = searchTimeoutSeconds * 1000; // NEW
    this.maxSubfoldersToSearch = maxSubfoldersToSearch; // NEW
  }

  // 既存メソッド（変更なし）
  extractFolderIdFromUrl(url: string): string | null;
  getImagesFromStorageUrl(storageUrl: string | null | undefined): Promise<PropertyImagesResult>;
  convertToPropertyImages(driveFiles: DriveFile[]): PropertyImage[];
  getFromCache(folderId: string): CacheEntry | null;
  saveToCache(folderId: string, images: PropertyImage[]): void;
  clearCache(folderId?: string): void;

  // 変更されるメソッド
  private async getPublicFolderIdIfExists(parentFolderId: string): Promise<string>;
  private cacheFolderId(cacheKey: string, targetFolderId: string): void;
  private async searchPublicFolderInSubfolders(parentFolderId: string): Promise<string | null>;
}
```

### 環境変数の追加

```typescript
// .env
FOLDER_ID_CACHE_TTL_MINUTES=60  // デフォルト: 60分
SUBFOLDER_SEARCH_TIMEOUT_SECONDS=2  // デフォルト: 2秒
MAX_SUBFOLDERS_TO_SEARCH=3  // デフォルト: 3つ
```

## Data Models

既存のデータモデルは変更なし。

```typescript
interface CacheEntry {
  images: PropertyImage[];
  folderId: string;
  cachedAt: number;
  expiresAt: number;
}

interface FolderIdCacheEntry {
  targetFolderId: string;
  cachedAt: number;
  expiresAt: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: キャッシュの一貫性

*For any* フォルダID、キャッシュに保存された検索結果は、有効期限内であれば常に同じ結果を返す

**Validates: Requirements 1.1, 1.2**

### Property 2: 検索順序の維持

*For any* 親フォルダID、サブフォルダ検索は常に以下の順序で実行される：
1. 直下の「athome公開」
2. 直下の「atbb公開」
3. 2階層目のサブフォルダ内の「athome公開」「atbb公開」

**Validates: Requirements 0.1, 0.2, 0.3**

### Property 3: タイムアウトの保証

*For any* サブフォルダ検索、設定されたタイムアウト時間を超えた場合、親フォルダIDを返す

**Validates: Requirements 3.4**

### Property 4: 早期終了の保証

*For any* サブフォルダ検索、「athome公開」が見つかった場合、「atbb公開」の検索はスキップされる

**Validates: Requirements 3.2**

### Property 5: サブフォルダ数制限の保証

*For any* 2階層目の検索、検索対象のサブフォルダ数は設定された最大値を超えない

**Validates: Requirements 3.5**

### Property 6: キャッシュ有効期限の保証

*For any* キャッシュエントリ、有効期限が切れた場合、次回アクセス時に再検索が実行される

**Validates: Requirements 1.4**

## Error Handling

### タイムアウト処理

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}
```

### エラーログ

```typescript
// タイムアウト発生時
console.warn(`[PropertyImageService] Subfolder search timeout after ${this.searchTimeout}ms for parent: ${parentFolderId}`);

// サブフォルダ数制限時
console.log(`[PropertyImageService] Limiting subfolder search to ${this.maxSubfoldersToSearch} folders`);

// 並列検索エラー時
console.error(`[PropertyImageService] Error in parallel subfolder search:`, error.message);
```

## Testing Strategy

### Unit Tests

1. **キャッシュ機能のテスト**
   - キャッシュヒット時に再検索しないことを確認
   - キャッシュ有効期限切れ時に再検索することを確認
   - キャッシュクリア機能の動作確認

2. **検索順序のテスト**
   - 「athome公開」が優先されることを確認
   - 「atbb公開」が次に検索されることを確認
   - 親フォルダがフォールバックとして使用されることを確認

3. **タイムアウトのテスト**
   - タイムアウト時に親フォルダを返すことを確認
   - タイムアウト前に結果が返ることを確認

4. **並列処理のテスト**
   - 複数のサブフォルダが並列で検索されることを確認
   - 最初に見つかった結果が返されることを確認

### Property-Based Tests

1. **Property 1: キャッシュの一貫性**
   ```typescript
   // Feature: public-property-image-performance-optimization, Property 1: キャッシュの一貫性
   // Validates: Requirements 1.1, 1.2
   test('cached folder ID returns same result within TTL', async () => {
     // ランダムなフォルダIDを生成
     // キャッシュに保存
     // 有効期限内に複数回取得
     // 全て同じ結果であることを確認
   });
   ```

2. **Property 2: 検索順序の維持**
   ```typescript
   // Feature: public-property-image-performance-optimization, Property 2: 検索順序の維持
   // Validates: Requirements 0.1, 0.2, 0.3
   test('search order is always maintained', async () => {
     // ランダムなフォルダ構造を生成
     // 検索を実行
     // 検索順序が正しいことを確認
   });
   ```

3. **Property 3: タイムアウトの保証**
   ```typescript
   // Feature: public-property-image-performance-optimization, Property 3: タイムアウトの保証
   // Validates: Requirements 3.4
   test('timeout returns parent folder ID', async () => {
     // タイムアウトを短く設定
     // 遅いレスポンスをシミュレート
     // 親フォルダIDが返されることを確認
   });
   ```

4. **Property 4: 早期終了の保証**
   ```typescript
   // Feature: public-property-image-performance-optimization, Property 4: 早期終了の保証
   // Validates: Requirements 3.2
   test('athome folder found skips atbb search', async () => {
     // 「athome公開」フォルダを含むフォルダ構造を生成
     // 検索を実行
     // 「atbb公開」の検索がスキップされたことを確認
   });
   ```

5. **Property 5: サブフォルダ数制限の保証**
   ```typescript
   // Feature: public-property-image-performance-optimization, Property 5: サブフォルダ数制限の保証
   // Validates: Requirements 3.5
   test('subfolder search respects max limit', async () => {
     // 多数のサブフォルダを含むフォルダ構造を生成
     // 検索を実行
     // 検索されたサブフォルダ数が制限内であることを確認
   });
   ```

6. **Property 6: キャッシュ有効期限の保証**
   ```typescript
   // Feature: public-property-image-performance-optimization, Property 6: キャッシュ有効期限の保証
   // Validates: Requirements 1.4
   test('expired cache triggers re-search', async () => {
     // キャッシュに保存
     // 有効期限を過ぎるまで待機
     // 再検索が実行されることを確認
   });
   ```

### Integration Tests

1. **エンドツーエンドテスト**
   - 実際の物件IDで画像取得をテスト
   - 初回アクセスと2回目アクセスの時間を計測
   - 目標時間内に表示されることを確認

2. **パフォーマンステスト**
   - 100件の物件で画像取得時間を計測
   - 平均時間が目標値以下であることを確認

## Implementation Notes

### 並列処理の実装

```typescript
private async searchPublicFolderInSubfolders(parentFolderId: string): Promise<string | null> {
  try {
    // サブフォルダ一覧を取得
    const subfolders = await this.driveService.listSubfolders(parentFolderId);
    
    if (subfolders.length === 0) {
      return null;
    }
    
    // サブフォルダ数を制限
    const limitedSubfolders = subfolders.slice(0, this.maxSubfoldersToSearch);
    console.log(`[PropertyImageService] Searching ${limitedSubfolders.length} subfolders (limited from ${subfolders.length})`);
    
    // 並列検索 + タイムアウト
    const searchPromises = limitedSubfolders.map(async (subfolder) => {
      // athome公開を優先
      const athomeFolderId = await this.driveService.findFolderByName(subfolder.id, 'athome公開');
      if (athomeFolderId) {
        return { type: 'athome', folderId: athomeFolderId, subfolderName: subfolder.name };
      }
      
      // atbb公開を次に検索
      const atbbFolderId = await this.driveService.findFolderByName(subfolder.id, 'atbb公開');
      if (atbbFolderId) {
        return { type: 'atbb', folderId: atbbFolderId, subfolderName: subfolder.name };
      }
      
      return null;
    });
    
    // タイムアウト付きで並列実行
    const result = await withTimeout(
      Promise.race(
        searchPromises.map(p => p.then(r => r ? r : Promise.reject()))
      ),
      this.searchTimeout,
      null
    );
    
    if (result) {
      console.log(`[PropertyImageService] Found "${result.type}公開" in subfolder: ${result.subfolderName}`);
      return result.folderId;
    }
    
    return null;
  } catch (error: any) {
    console.error(`[PropertyImageService] Error in parallel subfolder search:`, error.message);
    return null;
  }
}
```

### キャッシュTTLの変更

```typescript
private cacheFolderId(cacheKey: string, targetFolderId: string): void {
  const now = Date.now();
  this.folderIdCache.set(cacheKey, {
    targetFolderId,
    cachedAt: now,
    expiresAt: now + this.folderIdCacheTTL, // 5分 → 1時間（環境変数で設定可能）
  });
}
```

### 環境変数の読み込み

```typescript
// サービスの初期化時
const folderIdCacheTTL = parseInt(process.env.FOLDER_ID_CACHE_TTL_MINUTES || '60', 10);
const searchTimeout = parseInt(process.env.SUBFOLDER_SEARCH_TIMEOUT_SECONDS || '2', 10);
const maxSubfolders = parseInt(process.env.MAX_SUBFOLDERS_TO_SEARCH || '3', 10);

const propertyImageService = new PropertyImageService(
  60, // 画像キャッシュTTL（既存）
  folderIdCacheTTL, // フォルダIDキャッシュTTL（新規）
  searchTimeout, // 検索タイムアウト（新規）
  maxSubfolders // 最大サブフォルダ数（新規）
);
```

## Performance Considerations

### Before Optimization

- **初回アクセス**: 5秒
  - サブフォルダ検索: 4秒（直列処理）
  - 画像取得: 1秒
- **2回目アクセス**: 1秒（キャッシュヒット率: 低）

### After Optimization

- **初回アクセス**: 2秒以下
  - サブフォルダ検索: 1秒以下（並列処理 + タイムアウト）
  - 画像取得: 1秒
- **2回目アクセス**: 200ms以内（キャッシュヒット率: 高）

### Memory Usage

- キャッシュサイズ: 約100KB/物件（画像メタデータ）
- 1000物件で約100MB（許容範囲内）

## Deployment Strategy

### Phase 1: 環境変数の追加
1. `.env.example`に新しい環境変数を追加
2. 本番環境に環境変数を設定

### Phase 2: コード変更
1. `PropertyImageService`の修正
2. ユニットテストの追加
3. プロパティテストの追加

### Phase 3: デプロイとモニタリング
1. ステージング環境でテスト
2. 本番環境にデプロイ
3. パフォーマンスメトリクスを監視

### Rollback Plan

問題が発生した場合:
1. 環境変数を元の値に戻す（キャッシュTTL: 5分）
2. コードを前のバージョンにロールバック
3. キャッシュをクリア

## Monitoring and Metrics

### ログ出力

```typescript
// 検索開始時
console.log(`[PropertyImageService] Starting subfolder search for parent: ${parentFolderId}`);

// 検索完了時
console.log(`[PropertyImageService] Subfolder search completed in ${duration}ms`);

// キャッシュヒット時
console.log(`[PropertyImageService] Cache hit for folder: ${folderId}`);

// タイムアウト時
console.warn(`[PropertyImageService] Search timeout after ${this.searchTimeout}ms`);
```

### メトリクス

- 平均検索時間
- キャッシュヒット率
- タイムアウト発生率
- API呼び出し回数
