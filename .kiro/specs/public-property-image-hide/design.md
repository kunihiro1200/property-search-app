# Design Document

## Overview

公開物件サイトの画像非表示機能を実装する。Google Driveから実際に削除せず、DBのフラグで管理することで、権限問題を回避し、データの安全性を確保する。

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Frontend       │────▶│  Backend API         │────▶│  PostgreSQL     │
│  ImageGallery   │     │  PropertyListings    │     │  property_      │
│                 │◀────│  Routes              │◀────│  listings       │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

## Components and Interfaces

### 1. Database Schema Change

```sql
ALTER TABLE property_listings 
ADD COLUMN hidden_images TEXT[] DEFAULT '{}';
```

### 2. Backend API Endpoints

#### POST /api/property-listings/:id/hide-image
```typescript
interface HideImageRequest {
  fileId: string;
}
interface HideImageResponse {
  success: boolean;
  hiddenImages: string[];
}
```


#### POST /api/property-listings/:id/restore-image
```typescript
interface RestoreImageRequest {
  fileId: string;
}
interface RestoreImageResponse {
  success: boolean;
  hiddenImages: string[];
}
```

#### GET /api/property-listings/:id (既存エンドポイント拡張)
- レスポンスに`hiddenImages`フィールドを追加
- 公開APIでは非表示画像をフィルタリング

### 3. PropertyListingService拡張

```typescript
class PropertyListingService {
  async hideImage(propertyId: string, fileId: string): Promise<string[]>;
  async restoreImage(propertyId: string, fileId: string): Promise<string[]>;
  async getHiddenImages(propertyId: string): Promise<string[]>;
  filterVisibleImages(images: DriveImage[], hiddenIds: string[]): DriveImage[];
}
```

### 4. Frontend Components

#### PropertyImageGallery拡張
- 非表示ボタンの追加（管理者モード）
- 非表示画像の視覚的表示（グレーアウト + バッジ）
- 復元ボタンの追加

## Data Models

### property_listings テーブル拡張
| Column | Type | Description |
|--------|------|-------------|
| hidden_images | TEXT[] | 非表示画像のファイルID配列 |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: 非表示画像の重複防止
*For any* property listing and file ID, hiding the same image multiple times SHALL result in only one entry in hidden_images array
**Validates: Requirements 2.3**

### Property 2: フィルタリングの一貫性
*For any* set of images and hidden_images array, filtering SHALL always exclude exactly the images whose IDs are in hidden_images
**Validates: Requirements 3.1, 3.2**

### Property 3: 復元の完全性
*For any* hidden image, restoring it SHALL remove exactly that file ID from hidden_images and make the image visible again
**Validates: Requirements 4.1, 4.2**

## Error Handling

1. 存在しない物件IDの場合: 404 Not Found
2. 無効なファイルIDの場合: 400 Bad Request
3. データベースエラーの場合: 500 Internal Server Error

## Testing Strategy

### Unit Tests
- PropertyListingService.hideImage()のテスト
- PropertyListingService.restoreImage()のテスト
- filterVisibleImages()のテスト

### Property-Based Tests
- 重複防止のプロパティテスト
- フィルタリングの一貫性テスト

### Integration Tests
- API エンドポイントのE2Eテスト
- フロントエンドとバックエンドの連携テスト
