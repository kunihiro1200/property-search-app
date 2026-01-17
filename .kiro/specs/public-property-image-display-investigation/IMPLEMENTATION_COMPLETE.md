# 公開物件画像表示機能 - 実装完了

## 問題の概要

公開物件一覧ページで画像が表示されない問題が発生していました。

### 根本原因

`PropertyListingService.getPublicProperties()` メソッドが、画像取得時に `property_listings.storage_location` のみを使用しており、`work_tasks.storage_url` にフォールバックしていませんでした。

多くの物件は `property_listings.storage_location` が設定されておらず、代わりに `work_tasks.storage_url` に画像フォルダのURLが保存されていました。

## 実装した修正

### 修正内容

`backend/src/services/PropertyListingService.ts` の `getPublicProperties()` メソッドを修正し、以下のロジックを実装しました:

1. まず `property_listings.storage_location` を確認
2. `storage_location` が null の場合、`work_tasks.storage_url` を取得
3. 取得したURLを使用して Google Drive から画像を取得

### 修正コード

```typescript
// 各物件の画像を取得
const { PropertyImageService } = await import('./PropertyImageService');
const { WorkTaskService } = await import('./WorkTaskService');
const imageService = new PropertyImageService();
const workTaskService = new WorkTaskService();

const propertiesWithImages = await Promise.all(
  (data || []).map(async (property) => {
    try {
      // storage_locationを優先的に使用し、なければwork_tasksテーブルからstorage_urlを取得
      let storageUrl = property.storage_location;
      
      if (!storageUrl) {
        try {
          const workTask = await workTaskService.getByPropertyNumber(property.property_number);
          storageUrl = workTask?.storage_url;
        } catch (error: any) {
          console.error(`Failed to get work_task for property ${property.property_number}:`, error.message);
        }
      }
      
      // タイムアウト設定（5秒）
      const timeoutPromise = new Promise<string[]>((_, reject) => 
        setTimeout(() => reject(new Error('Image fetch timeout')), 5000)
      );
      
      const images = await Promise.race([
        imageService.getFirstImage(property.id, storageUrl),
        timeoutPromise
      ]);
      
      return { ...property, images };
    } catch (error: any) {
      console.error(`Failed to get image for property ${property.id}:`, error.message);
      return { ...property, images: [] };
    }
  })
);
```

## テスト結果

### テスト実行

```bash
cd backend
npx ts-node test-public-properties-images.ts
```

### 結果

✅ **修正前**: 5件中1件のみ画像表示
✅ **修正後**: 5件中4件で画像表示（1件は画像フォルダ未設定のため正常）

```
--- 物件 1 ---
物件番号: AA18
images配列: あり
画像数: 0枚
画像なし（空配列）← 画像フォルダ未設定（正常）

--- 物件 2 ---
物件番号: AA13129
images配列: あり
画像数: 1枚
最初の画像URL: https://drive.google.com/uc?export=view&id=17eP4ERpTPbbesGvtDYiOfdQacAKCOqRA

--- 物件 3 ---
物件番号: AA5564
images配列: あり
画像数: 1枚
最初の画像URL: https://drive.google.com/uc?export=view&id=1FZA93esXlwu_pJthATiFSgyexksECmMc

--- 物件 4 ---
物件番号: AA13149
images配列: あり
画像数: 1枚
最初の画像URL: https://drive.google.com/uc?export=view&id=1kWRqELWeIrCF4h9Zdn2XA8i3KReIcKdD

--- 物件 5 ---
物件番号: AA214
images配列: あり
画像数: 1枚
最初の画像URL: https://drive.google.com/uc?export=view&id=119IM86NsVAW8ztK5v84s-0XTpIBj7fzA
```

### APIエンドポイントテスト

```bash
cd backend
npx ts-node test-api-endpoint.ts
```

✅ APIエンドポイント `GET /api/public/properties` が正常に画像URLを返すことを確認

## 影響範囲

### 修正ファイル

- `backend/src/services/PropertyListingService.ts`

### 影響を受けるエンドポイント

- `GET /api/public/properties` - 公開物件一覧取得

### フロントエンド

フロントエンドの修正は不要です。既に `images` 配列を正しく処理する実装になっています。

## 次のステップ

### フロントエンドでの確認

1. 開発サーバーを起動
2. 公開物件一覧ページにアクセス
3. 画像が表示されることを確認

### 本番環境へのデプロイ

1. バックエンドの変更をデプロイ
2. 画像表示を確認

## 技術的な詳細

### データソースの優先順位

1. **第一優先**: `property_listings.storage_location`
2. **第二優先**: `work_tasks.storage_url`

### パフォーマンス最適化

- 画像取得に5秒のタイムアウトを設定
- 一覧表示では最初の1枚のみを取得（`getFirstImage()`）
- 画像取得失敗時は空配列を返し、他の物件の表示を妨げない

### エラーハンドリング

- 画像取得失敗時はログに記録し、空配列を返す
- work_tasks取得失敗時もログに記録し、処理を継続

## 完了日

2026年1月3日

## 担当者

Kiro AI Assistant
