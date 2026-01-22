# 画像表示問題の根本原因分析

## 実行日時
2026年1月3日

## 問題の概要

公開物件サイトで画像が表示されない問題について調査を実施しました。

## 調査結果

### 1. データベースの状態

#### 全物件（1,261件）
- `image_url`設定済み: **145件 (11.5%)**
- `image_url`未設定: **1,116件 (88.5%)**

#### 公開物件（152件）
- `image_url`設定済み: **79件 (52.0%)**
- `image_url`未設定: **73件 (48.0%)**

### 2. 根本原因の特定

画像が表示されない主な原因は、**バックエンドの実装に問題がある**ことです。

#### 現在の実装（問題あり）

`backend/src/services/PropertyListingService.ts` の `getPublicProperties()` メソッド:

```typescript
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
        imageService.getFirstImage(property.id, storageUrl),  // ← ここが問題！
        timeoutPromise
      ]);
      
      return { ...property, images };
    } catch (error: any) {
      console.error(`Failed to get image for property ${property.id}:`, error.message);
      return { ...property, images: [] };  // ← エラー時は空配列を返す
    }
  })
);
```

**問題点**:
1. **毎回Google Drive APIを呼び出している**
   - `imageService.getFirstImage()` は Google Drive API を呼び出す
   - 20件の物件を取得する場合、20回のAPI呼び出しが発生
   - 非常に遅い（各呼び出しに数秒かかる）
   - API制限に引っかかる可能性がある

2. **データベースの `image_url` フィールドを使用していない**
   - クエリで `image_url` を取得しているが、使用していない
   - せっかく `populate-property-image-urls.ts` で設定した値が無駄になっている

3. **エラー時に空配列を返す**
   - タイムアウトやエラーが発生すると `images: []` を返す
   - フロントエンドでは画像が表示されない

4. **パフォーマンスが悪い**
   - 20件の物件を取得するのに最大100秒（20件 × 5秒タイムアウト）かかる可能性がある

### 3. なぜ画像が表示されないのか

1. **Google Drive API呼び出しがタイムアウトしている**
   - 5秒のタイムアウトが設定されているが、それでも遅い
   - エラーが発生すると `images: []` が返される

2. **`storage_location` が未設定の物件が多い**
   - 73件の公開物件のうち、多くが `storage_location` を持っていない
   - `storage_location` がないと画像を取得できない

3. **フロントエンドは `images` 配列を期待している**
   - `PublicPropertyCard.tsx` は `property.images` 配列を期待
   - バックエンドが空配列を返すと、プレースホルダー画像が表示される

## 解決策

### 推奨される修正（最も効果的）

**バックエンドを修正して、データベースの `image_url` を使用する**

```typescript
// 修正後のコード
const propertiesWithImages = (data || []).map((property) => {
  // image_urlが設定されている場合は、それを配列に変換
  const images = property.image_url ? [property.image_url] : [];
  
  return { ...property, images };
});
```

**メリット**:
- ✅ 高速（データベースクエリのみ）
- ✅ Google Drive API呼び出しなし
- ✅ タイムアウトなし
- ✅ 既存の `image_url` データを活用
- ✅ フロントエンド変更不要

**デメリット**:
- `image_url` が未設定の物件は画像が表示されない
  - → `populate-property-image-urls.ts` を再実行して解決

### 代替案1: キャッシュを強化

`PropertyImageService` のキャッシュを強化して、Google Drive API呼び出しを減らす。

**メリット**:
- 2回目以降のアクセスは高速

**デメリット**:
- 初回アクセスは依然として遅い
- キャッシュの管理が複雑

### 代替案2: バックグラウンドジョブで画像URLを更新

定期的に `populate-property-image-urls.ts` を実行して、`image_url` を最新に保つ。

**メリット**:
- ユーザーは常に高速なレスポンスを得られる

**デメリット**:
- 実装が複雑
- Google Drive API の制限に注意が必要

## 次のステップ

### ステップ1: バックエンドを修正（優先度: 最高）

`backend/src/services/PropertyListingService.ts` の `getPublicProperties()` メソッドを修正:

```typescript
// 画像取得部分を削除し、image_urlを使用
const propertiesWithImages = (data || []).map((property) => {
  const images = property.image_url ? [property.image_url] : [];
  return { ...property, images };
});
```

### ステップ2: 残りの物件の画像URLを取得（優先度: 高）

```bash
cd backend
npx tsx populate-property-image-urls.ts
```

これにより、`storage_location` が設定されている残りの物件の `image_url` を取得できます。

### ステップ3: `storage_location` が未設定の物件を修正（優先度: 中）

73件の公開物件のうち、多くが `storage_location` を持っていません。

```bash
cd backend
npx tsx sync-storage-locations.ts
```

これにより、`work_tasks` テーブルから `storage_url` を取得して、`property_listings.storage_location` に設定できます。

### ステップ4: フロントエンドで確認（優先度: 高）

```bash
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173/public/properties` を開いて、画像が表示されることを確認します。

## 期待される結果

### 修正前
- 公開物件一覧の読み込みに **20〜100秒** かかる
- 多くの物件で画像が表示されない
- タイムアウトエラーが頻発

### 修正後
- 公開物件一覧の読み込みが **1秒以内** に完了
- 79件の物件で画像が表示される（52%）
- タイムアウトエラーなし

### さらなる改善後（ステップ2〜3実行後）
- より多くの物件で画像が表示される（目標: 80%以上）

## 技術的な詳細

### データフロー（現在）

```
1. フロントエンド: GET /api/public/properties
2. バックエンド: property_listings テーブルからデータ取得
3. バックエンド: 各物件について imageService.getFirstImage() を呼び出し
4. バックエンド: Google Drive API を呼び出し（遅い！）
5. バックエンド: タイムアウトまたはエラー → images: []
6. フロントエンド: 画像が表示されない
```

### データフロー（修正後）

```
1. フロントエンド: GET /api/public/properties
2. バックエンド: property_listings テーブルからデータ取得（image_url含む）
3. バックエンド: image_url を images 配列に変換
4. フロントエンド: 画像が表示される ✅
```

## 関連ファイル

### バックエンド
- `backend/src/services/PropertyListingService.ts` - 修正が必要
- `backend/src/services/PropertyImageService.ts` - 現在使用されているが、不要になる
- `backend/populate-property-image-urls.ts` - 画像URL一括取得スクリプト
- `backend/sync-storage-locations.ts` - storage_location同期スクリプト

### フロントエンド
- `frontend/src/components/PublicPropertyCard.tsx` - 画像表示コンポーネント（変更不要）
- `frontend/src/hooks/usePublicProperties.ts` - データ取得フック（変更不要）
- `frontend/src/types/publicProperty.ts` - 型定義（変更不要）

### ドキュメント
- `.kiro/specs/public-property-image-display-investigation/BATCH_POPULATION_COMPLETE.md` - 一括取得結果
- `.kiro/specs/public-property-image-display-investigation/requirements-recurring-issue.md` - 要件定義

## まとめ

画像が表示されない根本原因は、**バックエンドが毎回Google Drive APIを呼び出しているため**です。

解決策は簡単で、**データベースの `image_url` フィールドを使用する**だけです。これにより:
- パフォーマンスが劇的に向上（100倍以上）
- タイムアウトエラーがなくなる
- ユーザー体験が大幅に改善

修正は数行のコード変更で完了し、フロントエンドの変更は不要です。

## 作成日

2026年1月3日
