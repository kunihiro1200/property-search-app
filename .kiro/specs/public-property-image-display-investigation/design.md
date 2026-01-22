# 公開物件一覧の画像表示問題 - 設計書

## 概要

公開物件一覧ページで物件カードに画像が表示されない問題を解決するため、バックエンドのAPIレスポンスに画像URLを含めるように修正します。

## アーキテクチャ

### 現状の問題

```
フロントエンド (PublicPropertyCard)
  ↓ 期待: property.images[0]
PropertyListingService.getPublicProperties()
  ↓ 実際: image_urlのみ返却、images配列なし
  ✗ 画像が表示されない
```

### 修正後の設計

```
フロントエンド (PublicPropertyCard)
  ↓ property.images[0]を使用
PropertyListingService.getPublicProperties()
  ↓ 各物件の画像を取得
PropertyImageService
  ↓ Google Driveから画像一覧を取得
  ↓ 最初の1枚のみを返却（パフォーマンス最適化）
Google Drive API
```

## コンポーネント設計

### 1. PropertyListingService の修正

**メソッド:** `getPublicProperties()`

**変更内容:**
- 物件データ取得後、各物件の画像を取得
- `PropertyImageService`を使用して最初の1枚の画像URLを取得
- レスポンスに`images`配列を追加

**疑似コード:**
```typescript
async getPublicProperties(filters, limit, offset) {
  // 1. 物件データを取得
  const { data: properties, count } = await this.supabase
    .from('property_listings')
    .select('...')
    .eq('atbb_status', '専任・公開中');

  // 2. 各物件の画像を取得
  const propertiesWithImages = await Promise.all(
    properties.map(async (property) => {
      try {
        // PropertyImageServiceを使用して最初の1枚を取得
        const images = await this.propertyImageService.getFirstImage(
          property.id,
          property.storage_location
        );
        return { ...property, images };
      } catch (error) {
        // エラー時は空配列を返す
        return { ...property, images: [] };
      }
    })
  );

  return {
    properties: propertiesWithImages,
    total: count,
    limit,
    offset
  };
}
```

### 2. PropertyImageService の拡張

**新規メソッド:** `getFirstImage(propertyId, storageLocation)`

**目的:**
- 一覧表示用に最初の1枚の画像URLのみを取得
- パフォーマンスを最適化

**実装:**
```typescript
async getFirstImage(propertyId: string, storageLocation: string): Promise<string[]> {
  // キャッシュをチェック
  const cacheKey = `first_image_${propertyId}`;
  const cached = this.cache.get(cacheKey);
  if (cached) return cached;

  // Google Driveから画像を取得
  const folderId = this.extractFolderId(storageLocation);
  if (!folderId) return [];

  const images = await this.googleDriveService.listImages(folderId);
  
  // 非表示画像をフィルタリング
  const visibleImages = await this.filterHiddenImages(propertyId, images);
  
  // 最初の1枚のみを返す
  const firstImage = visibleImages.length > 0 
    ? [this.buildImageUrl(visibleImages[0].id)]
    : [];

  // キャッシュに保存（5分間）
  this.cache.set(cacheKey, firstImage, 300);

  return firstImage;
}
```

## データモデル

### レスポンス形式

```typescript
interface PublicPropertiesResponse {
  properties: PublicProperty[];
  total: number;
  limit: number;
  offset: number;
}

interface PublicProperty {
  id: string;
  property_number: string;
  property_type: string;
  address: string;
  price: number;
  land_area: number;
  building_area: number;
  construction_year_month: string;
  image_url: string;  // 既存フィールド（後方互換性のため残す）
  images: string[];   // 新規追加
  distribution_areas: number[];
  atbb_status: string;
  created_at: string;
}
```

## エラーハンドリング

### 画像取得エラー

**シナリオ:**
- `storage_location`が空
- Google Drive APIエラー
- フォルダIDが無効

**対応:**
```typescript
try {
  const images = await this.propertyImageService.getFirstImage(...);
  return { ...property, images };
} catch (error) {
  console.error(`Failed to get image for property ${property.id}:`, error);
  return { ...property, images: [] };
}
```

**結果:**
- エラーが発生しても物件データは返却される
- フロントエンドはプレースホルダー画像を表示

### タイムアウト対策

**問題:** 大量の物件がある場合、全ての画像取得に時間がかかる

**対策:**
1. 並列処理（`Promise.all`）
2. タイムアウト設定（5秒）
3. キャッシュの活用

```typescript
const propertiesWithImages = await Promise.all(
  properties.map(async (property) => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    try {
      const images = await Promise.race([
        this.propertyImageService.getFirstImage(...),
        timeoutPromise
      ]);
      return { ...property, images };
    } catch (error) {
      return { ...property, images: [] };
    }
  })
);
```

## パフォーマンス最適化

### 1. キャッシュ戦略

**キャッシュキー:** `first_image_${propertyId}`
**有効期限:** 5分間
**理由:** 画像は頻繁に変更されないため、短期間のキャッシュで十分

### 2. 画像数の制限

**一覧表示:** 最初の1枚のみ
**詳細表示:** 全ての画像

### 3. 並列処理

`Promise.all`を使用して、複数の物件の画像を並列で取得

### 4. レスポンスサイズの最適化

- 画像URLのみを返す（画像データそのものは返さない）
- プロキシURL（`/api/public/images/:fileId`）を使用

## テスト戦略

### 単体テスト

1. `PropertyImageService.getFirstImage()`
   - 正常系: 画像が取得できる
   - 異常系: `storage_location`が空
   - 異常系: Google Drive APIエラー

2. `PropertyListingService.getPublicProperties()`
   - 画像が正しく追加される
   - 画像取得エラー時も物件データは返される

### 統合テスト

1. APIエンドポイント `/api/public/properties`
   - レスポンスに`images`配列が含まれる
   - 画像URLが正しい形式

### E2Eテスト

1. 公開物件一覧ページ
   - 物件カードに画像が表示される
   - 画像がない場合はプレースホルダーが表示される

## セキュリティ考慮事項

### 1. 画像アクセス制御

- 公開物件の画像のみアクセス可能
- `atbb_status`が「専任・公開中」の物件のみ

### 2. 非表示画像のフィルタリング

- `hidden_images`カラムを確認
- 非表示に設定された画像は返さない

### 3. レート制限

- Google Drive APIの呼び出し回数を制限
- キャッシュを活用してAPI呼び出しを削減

## デプロイメント

### 1. バックエンドのデプロイ

```bash
# マイグレーションは不要（既存のテーブル構造を使用）
npm run build
npm run deploy
```

### 2. 動作確認

```bash
# APIレスポンスを確認
curl http://localhost:3000/api/public/properties?limit=5

# imagesフィールドが含まれていることを確認
```

### 3. フロントエンドの確認

- 公開物件一覧ページにアクセス
- 物件カードに画像が表示されることを確認

## ロールバック計画

**問題が発生した場合:**

1. バックエンドのコードを元に戻す
2. フロントエンドは変更していないため、影響なし
3. `images`配列が空の場合、プレースホルダーが表示される

## 今後の改善案

### 1. 画像のプリロード

- 一覧表示時に次のページの画像を先読み
- ユーザー体験の向上

### 2. CDNの活用

- Google Driveの画像をCDNにキャッシュ
- レスポンス速度の向上

### 3. 画像の最適化

- サムネイル画像を生成
- ファイルサイズの削減

### 4. WebP形式のサポート

- 次世代画像フォーマットの採用
- 帯域幅の削減
