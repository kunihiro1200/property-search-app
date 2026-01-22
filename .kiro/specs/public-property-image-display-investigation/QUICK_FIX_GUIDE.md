# 画像表示問題 - クイック修正ガイド

## 問題

公開物件サイトで画像が表示されない。

## 根本原因

バックエンドが毎回Google Drive APIを呼び出しているため、遅くてタイムアウトしている。
データベースに既に保存されている `image_url` フィールドを使用していない。

## 修正手順（5分で完了）

### ステップ1: バックエンドを修正

`backend/src/services/PropertyListingService.ts` を開いて、`getPublicProperties()` メソッドの画像取得部分を修正します。

#### 修正前（約290行目〜330行目）

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

#### 修正後

```typescript
// image_urlフィールドを使用（Google Drive API呼び出しなし）
const propertiesWithImages = (data || []).map((property) => {
  // image_urlが設定されている場合は、それを配列に変換
  const images = property.image_url ? [property.image_url] : [];
  
  return { ...property, images };
});
```

### ステップ2: バックエンドを再起動

```bash
# バックエンドを停止（Ctrl+C）
# 再起動
cd backend
npm run dev
```

### ステップ3: フロントエンドで確認

```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173/public/properties` を開いて、画像が表示されることを確認します。

## 期待される結果

### 修正前
- ⏱️ 読み込みに20〜100秒かかる
- ❌ 多くの物件で画像が表示されない
- ⚠️ タイムアウトエラーが頻発

### 修正後
- ⚡ 読み込みが1秒以内に完了
- ✅ 79件の物件で画像が表示される（52%）
- ✅ タイムアウトエラーなし

## さらに画像表示率を上げる（オプション）

現在、152件の公開物件のうち79件（52%）で画像が表示されます。
さらに表示率を上げるには、以下のスクリプトを実行します。

### 残りの物件の画像URLを取得

```bash
cd backend
npx tsx populate-property-image-urls.ts
```

これにより、`storage_location` が設定されている残りの物件の `image_url` を取得できます。

### storage_locationが未設定の物件を修正

```bash
cd backend
npx tsx sync-storage-locations.ts
```

これにより、`work_tasks` テーブルから `storage_url` を取得して、`property_listings.storage_location` に設定できます。

## トラブルシューティング

### 画像がまだ表示されない

1. **ブラウザのキャッシュをクリア**
   - Ctrl+Shift+R（Windows）または Cmd+Shift+R（Mac）

2. **バックエンドのログを確認**
   - エラーメッセージがないか確認

3. **データベースを確認**
   ```bash
   cd backend
   npx tsx check-image-urls-status.ts
   ```

### 一部の物件だけ画像が表示されない

これは正常です。`image_url` が設定されていない物件は画像が表示されません。
上記の「さらに画像表示率を上げる」セクションを参照してください。

## 技術的な詳細

### なぜこの修正で速くなるのか？

**修正前**:
- 各物件について Google Drive API を呼び出す
- 20件の物件 × 5秒タイムアウト = 最大100秒

**修正後**:
- データベースから `image_url` を取得するだけ
- 配列に変換するだけ（ミリ秒単位）

### フロントエンドの変更は必要？

**不要です。** フロントエンドは既に `images` 配列を期待しているため、バックエンドが配列を返せば動作します。

### `image_url` はどこから来るのか？

`populate-property-image-urls.ts` スクリプトが、Google Drive から画像URLを取得して、データベースに保存しています。
このスクリプトは一度実行すれば、その後は高速にアクセスできます。

## 関連ドキュメント

- [根本原因分析](./ROOT_CAUSE_ANALYSIS.md) - 詳細な技術分析
- [一括取得結果](./BATCH_POPULATION_COMPLETE.md) - 画像URL一括取得の結果
- [要件定義](./requirements-recurring-issue.md) - 元の要件

## 作成日

2026年1月3日
