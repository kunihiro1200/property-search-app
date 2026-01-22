# Design Document

## Overview

公開物件サイトにおいて、詳細画面では画像が正常に表示されるが、一覧画面では画像が表示されない問題を解決する。この問題は、一覧画面と詳細画面で異なる画像取得ロジックが使用されているか、または一覧画面での画像取得処理に問題があることが原因と考えられる。

## Architecture

### システム構成

```
Frontend (PublicPropertiesPage.tsx)
  ↓ HTTP Request
Backend API (/api/public/properties)
  ↓
PropertyListingService.getPublicProperties()
  ↓
PropertyImageService.getFirstImage()
  ↓
Google Drive API
```

### 現在の実装状況

**詳細画面（正常動作）**:
- `getPublicPropertyById()` → 画像が表示される
- `storage_location`から画像を取得
- `work_tasks`テーブルからのフォールバック機能が動作

**一覧画面（問題あり）**:
- `getPublicProperties()` → 画像が表示されない
- 同じく`storage_location`から画像を取得しているはず
- しかし、実際には画像が表示されない

## Components and Interfaces

### PropertyListingService

#### getPublicProperties()メソッド

現在の実装:
```typescript
async getPublicProperties(options: {
  limit?: number;
  offset?: number;
  propertyType?: string | string[];
  priceRange?: { min?: number; max?: number };
  areas?: string[];
  location?: string;
  propertyNumber?: string;
  buildingAgeRange?: { min?: number; max?: number };
  showPublicOnly?: boolean;
}) {
  // ... クエリ実行 ...
  
  // 画像取得処理
  const propertiesWithImages = await Promise.all(
    (data || []).map(async (property) => {
      let images: string[] = [];
      let storageLocation = property.storage_location;
      
      // storage_locationが空の場合、業務リストから取得
      if (!storageLocation && property.property_number) {
        storageLocation = await this.getStorageUrlFromWorkTasks(property.property_number);
      }
      
      // 1. image_urlがある場合はそれを使用
      if (property.image_url) {
        images = [property.image_url];
      }
      // 2. storage_locationがある場合はGoogle Driveから取得
      else if (storageLocation) {
        images = await this.propertyImageService.getFirstImage(
          property.id,
          storageLocation
        );
      }
      
      return {
        ...property,
        images: images.length > 0 ? images : []
      };
    })
  );
}
```

### PropertyImageService

#### getFirstImage()メソッド

```typescript
async getFirstImage(propertyId: string, storageLocation: string): Promise<string[]> {
  // Google Driveから最初の画像を取得
  // サムネイルURLを返す: http://localhost:3000/api/public/images/{id}/thumbnail
}
```

## Data Models

### Property Listing

```typescript
interface PropertyListing {
  id: string;
  property_number: string;
  property_type: string;
  address: string;
  price: number;
  land_area: number;
  building_area: number;
  construction_year_month: string;
  image_url: string | null;
  storage_location: string | null;  // Google DriveフォルダURL
  atbb_status: string | null;
  google_map_url: string | null;
  created_at: string;
  updated_at: string;
}
```

### Public Property Response

```typescript
interface PublicProperty {
  id: string;
  property_number: string;
  property_type: string;  // 英語形式: 'detached_house', 'apartment', 'land'
  address: string;
  price: number;
  land_area: number;
  building_area: number;
  construction_year_month: string;
  atbb_status: string | null;
  badge_type: string;  // 'none', 'pre_release', 'email_only', 'sold'
  is_clickable: boolean;
  google_map_url: string | null;
  images: string[];  // サムネイルURLの配列
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 一覧画面での画像表示

*For any* 公開物件一覧ページで表示される物件で、`storage_location`が存在する場合、その物件の`images`配列には少なくとも1つの画像URLが含まれている必要がある

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 2: 詳細画面との一貫性

*For any* 物件について、一覧画面で表示される画像と詳細画面で表示される最初の画像は同じである必要がある

**Validates: Requirements 2.1, 2.2**

### Property 3: 画像取得の効率性

*For any* ページネーション操作において、そのページに表示される物件の画像のみが取得され、全物件の画像が取得されることはない

**Validates: Requirements 3.1**

### Property 4: エラー時のフォールバック

*For any* 物件について、画像取得に失敗した場合でも、その物件は一覧に表示され、`images`配列は空配列となる

**Validates: Requirements 4.1, 4.2**

### Property 5: storage_locationのフォールバック

*For any* 物件について、`storage_location`が空の場合、`work_tasks`テーブルから`storage_url`を取得する試みが行われる

**Validates: Requirements 3.2**

### Property 6: スクロール位置の保存

*For any* 一覧画面から詳細画面への遷移において、遷移前のスクロール位置が保存される

**Validates: Requirements 6.1**

### Property 7: スクロール位置の復元

*For any* 詳細画面から一覧画面への戻り操作において、保存されたスクロール位置に復元される

**Validates: Requirements 6.2**

### Property 8: ナビゲーション状態の復元

*For any* 詳細画面から一覧画面への戻り操作において、ページ番号とフィルター設定が保存された状態に復元される

**Validates: Requirements 6.3, 6.4**

## Error Handling

### 画像取得エラー

- **エラー**: Google Drive APIからの画像取得に失敗
- **対応**: 
  - エラーをログに記録
  - 空の画像配列を返す
  - 物件自体は一覧に表示し続ける
  - プレースホルダー画像をフロントエンドで表示

### storage_location不在エラー

- **エラー**: `storage_location`が空で、`work_tasks`からも取得できない
- **対応**:
  - ログに記録（警告レベル）
  - 空の画像配列を返す
  - プレースホルダー画像をフロントエンドで表示

### ページネーション中のエラー

- **エラー**: 一部の物件の画像取得に失敗
- **対応**:
  - 失敗した物件のみ空の画像配列
  - 他の物件は正常に表示
  - ページ全体のレンダリングは継続

## Testing Strategy

### Unit Tests

1. **PropertyListingService.getPublicProperties()のテスト**
   - `storage_location`がある物件の画像取得
   - `storage_location`がない物件の`work_tasks`からのフォールバック
   - `image_url`がある物件の優先使用
   - 画像取得エラー時の空配列返却

2. **PropertyImageService.getFirstImage()のテスト**
   - 正常な画像取得
   - Google Drive APIエラー時の処理
   - 無効な`storage_location`の処理

3. **フロントエンドのテスト**
   - 画像配列が空の場合のプレースホルダー表示
   - 画像配列がある場合の画像表示
   - ページネーション時の画像表示

### Property-Based Tests

各correctness propertyに対して、以下のプロパティテストを実装します（最低100回の反復）：

1. **Property 1のテスト**: ランダムな物件データを生成し、`storage_location`がある場合に`images`配列が空でないことを検証

2. **Property 2のテスト**: ランダムな物件IDを生成し、一覧画面と詳細画面で同じ画像が返されることを検証

3. **Property 3のテスト**: ランダムなページ番号とlimitを生成し、そのページの物件数分のみ画像取得が行われることを検証

4. **Property 4のテスト**: ランダムなエラー条件を生成し、エラー時でも物件が表示され、`images`配列が空配列であることを検証

5. **Property 5のテスト**: ランダムな物件データ（`storage_location`が空）を生成し、`work_tasks`からの取得が試みられることを検証

### Integration Tests

1. **一覧画面から詳細画面への遷移テスト**
   - 一覧画面で画像が表示される
   - 同じ物件の詳細画面でも同じ画像が表示される

2. **ページネーションテスト**
   - ページ1で画像が表示される
   - ページ2に移動しても画像が表示される
   - 前のページに戻っても画像が表示される

3. **フィルター適用後のテスト**
   - フィルターを適用
   - フィルター後の物件でも画像が表示される

## Implementation Notes

### スクロール位置復元の実装方法

#### 使用する技術

**React Router v6のlocation state**を使用してナビゲーション状態を管理します。

```typescript
// 一覧画面から詳細画面への遷移時
navigate(`/public/properties/${propertyId}`, {
  state: {
    scrollPosition: window.scrollY,
    currentPage: page,
    filters: currentFilters
  }
});

// 詳細画面から一覧画面への戻り時
const location = useLocation();
const savedState = location.state as NavigationState | null;

useEffect(() => {
  if (savedState?.scrollPosition) {
    window.scrollTo(0, savedState.scrollPosition);
  }
}, [savedState]);
```

#### 実装のポイント

1. **状態の保存タイミング**: 物件カードのクリック時
2. **状態の復元タイミング**: 一覧画面のマウント後（useEffect）
3. **スクロール復元の遅延**: 画像読み込み完了後に実行（画像の高さが確定してから）
4. **ブラウザの戻るボタン対応**: React Routerのlocation stateは自動的に保持される

#### データ構造

```typescript
interface NavigationState {
  scrollPosition: number;
  currentPage: number;
  filters: {
    propertyType?: string | string[];
    priceRange?: { min?: number; max?: number };
    areas?: string[];
    location?: string;
    buildingAgeRange?: { min?: number; max?: number };
  };
}
```

### 問題の原因候補

1. **Promise.all()の並列処理**
   - 多数の物件の画像を同時に取得すると、Google Drive APIのレート制限に引っかかる可能性
   - 解決策: バッチ処理または並列数の制限

2. **キャッシュの問題**
   - `getStorageUrlFromWorkTasks()`のキャッシュが正しく機能していない
   - 解決策: キャッシュロジックの見直し

3. **フロントエンドでの画像表示ロジック**
   - バックエンドは正しく画像URLを返しているが、フロントエンドで表示されていない
   - 解決策: フロントエンドのコンソールログを確認

4. **ページネーション時の状態管理**
   - ページ遷移時に画像データが失われている
   - 解決策: 状態管理の見直し

### 調査手順

1. **バックエンドログの確認**
   - `getPublicProperties()`が呼ばれているか
   - 各物件の画像取得処理が実行されているか
   - エラーが発生していないか

2. **フロントエンドログの確認**
   - APIレスポンスに`images`配列が含まれているか
   - `images`配列が空でないか
   - 画像URLが正しい形式か

3. **ネットワークタブの確認**
   - 画像URLへのリクエストが送信されているか
   - リクエストが成功しているか（200 OK）
   - レスポンスに画像データが含まれているか

### 修正方針

**Phase 1: 問題の特定**
- ログを追加して、どこで画像データが失われているかを特定
- バックエンドとフロントエンドの両方にログを追加

**Phase 2: 修正の実装**
- 特定された問題に応じて修正を実装
- 例: Promise.all()の並列数制限、キャッシュロジックの修正、フロントエンドの表示ロジック修正

**Phase 3: テストと検証**
- 修正後、一覧画面と詳細画面の両方で画像が表示されることを確認
- ページネーション時も画像が表示されることを確認
- パフォーマンスが劣化していないことを確認

## Performance Considerations

### 画像取得の最適化

1. **並列処理の制限**
   - `Promise.all()`で一度に多数の画像を取得すると、Google Drive APIのレート制限に引っかかる
   - 解決策: `p-limit`などのライブラリを使用して並列数を制限（例: 5並列）

2. **キャッシュの活用**
   - `getStorageUrlFromWorkTasks()`は既にキャッシュを実装している（5分間）
   - `PropertyImageService`でも画像URLのキャッシュを実装する（5分間）

3. **ページネーション時の最適化**
   - 現在のページの物件のみ画像を取得（実装済み）
   - 全物件の画像を取得しない（実装済み）

### レスポンスタイムの目標

- **一覧画面の初回ロード**: 2秒以内
- **ページネーション**: 1秒以内
- **フィルター適用**: 2秒以内

## Security Considerations

### 画像URLの安全性

- サムネイルURLは`http://localhost:3000/api/public/images/{id}/thumbnail`形式
- 公開APIなので認証不要
- ただし、物件IDは推測困難なUUID形式

### Google Drive APIの認証

- サービスアカウントを使用
- 環境変数で認証情報を管理
- フロントエンドには認証情報を露出しない

## Deployment Considerations

### 環境変数

- `GYOMU_LIST_SPREADSHEET_ID`: 業務リスト（業務依頼）のスプレッドシートID
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`: Google Drive APIの認証情報

### ログレベル

- 開発環境: DEBUGレベル（詳細なログ）
- 本番環境: INFOレベル（重要なログのみ）

### モニタリング

- 画像取得の成功率
- 画像取得の平均レスポンスタイム
- Google Drive APIのエラー率
