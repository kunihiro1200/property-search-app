# 公開物件一覧ページの画像表示問題 - 根本原因と解決策

## ステータス: 🔴 実装待ち

## 問題の概要

### 現象
- **物件一覧ページ** (`/public/properties`): 画像が表示されない（空配列が返される）
- **物件詳細ページ** (`/public/properties/:id`): 画像が正常に複数枚表示される

### 影響範囲
- 公開物件サイトの一覧ページを訪問するすべてのユーザー
- 画像が表示されないため、物件の魅力が伝わらず、問い合わせ率が低下する可能性

## 根本原因分析（2026年1月3日）

### 重要な事実

1. **データベースには画像データが存在する**
   - 152件の公開物件のうち、82.9%（126件）が`storage_location`フィールドを持つ
   - `storage_location`にはGoogle DriveフォルダのURLが格納されている

2. **詳細ページでは画像が正常に表示される**
   - フロントエンドが`/properties/:id/images`エンドポイントを呼び出し
   - `PropertyImageService.getImagesFromStorageUrl()`を使用してGoogle Driveから画像を取得
   - 正常に複数枚の画像が表示される

3. **一覧ページでは画像が表示されない**
   - バックエンドAPIが`image_url`フィールドのみを使用
   - `storage_location`フィールドが存在するのに使用していない

### APIレスポンスの比較

**物件一覧API** (`GET /api/public/properties`):
```json
{
  "properties": [
    {
      "id": "...",
      "property_number": "AA13129",
      "address": "...",
      "images": [],  // ❌ 空配列（image_urlがnullのため）
      "storage_location": "https://drive.google.com/drive/folders/..."  // ✅ データは存在する
    }
  ],
  "total": 152
}
```

**物件詳細API** (`GET /api/public/properties/:id/images`):
```json
{
  "images": [
    {
      "id": "...",
      "name": "image1.jpg",
      "thumbnailUrl": "https://drive.google.com/thumbnail?id=...",
      "fullImageUrl": "https://drive.google.com/uc?export=view&id=..."
    },
    // ... 複数の画像
  ],
  "folderId": "...",
  "cached": false
}
```

### バックエンドコード分析

**ファイル**: `backend/src/services/PropertyListingService.ts`

**問題のあるコード** (Lines 217-220):
```typescript
// 現在の実装（問題あり）
const propertiesWithImages = (data || []).map((property) => {
  const images = property.image_url ? [property.image_url] : [];
  return { ...property, images };
});
```

**問題点**:
1. `image_url`フィールドのみを使用している
2. `storage_location`フィールドが存在するのに使用していない
3. `PropertyImageService.getImagesFromStorageUrl()`を使用していない
4. 詳細APIとは異なる画像取得ロジックを使用している

**正常に動作しているコード** (`backend/src/routes/publicProperties.ts`, Lines 127-145):
```typescript
// 物件画像一覧取得（格納先URLから）
router.get('/properties/:id/images', async (req: Request, res: Response): Promise<void> => {
  // ...
  
  // storage_locationを優先的に使用し、なければwork_tasksテーブルからstorage_urlを取得
  let storageUrl = property.storage_location;
  
  if (!storageUrl) {
    const workTask = await workTaskService.getByPropertyNumber(property.property_number);
    storageUrl = workTask?.storage_url;
  }

  // 格納先URLから画像を取得
  const result = await propertyImageService.getImagesFromStorageUrl(storageUrl);
  // ...
});
```

## 根本原因

### 原因: 一覧APIで画像取得ロジックが実装されていない 🔴 **Critical**

**問題**:
- `PropertyListingService.getPublicProperties()`メソッドが`image_url`フィールドのみを使用
- `storage_location`フィールドからの画像取得が実装されていない
- `PropertyImageService.getImagesFromStorageUrl()`を使用していない

**影響**:
- `image_url`フィールドは32.9%の物件にしか存在しない
- `storage_location`フィールドは82.9%の物件に存在するが、使用されていない
- 結果として、多くの物件で画像が表示されない

**なぜこの問題が発生したか**:
- 詳細APIと一覧APIで異なる画像取得ロジックを使用している
- 一覧APIは古い実装（`image_url`のみ）を使用している
- 詳細APIは新しい実装（`storage_location` + `PropertyImageService`）を使用している

## 解決策

### アプローチ1: 一覧APIで画像取得ロジックを実装（推奨）🟢

**概要**:
- `PropertyListingService.getPublicProperties()`メソッドを修正
- 各物件の`storage_location`から最初の1枚の画像URLを取得
- `PropertyImageService.getFirstImage()`メソッドを使用（既に実装済み）

**メリット**:
- 詳細APIと同じロジックを使用するため、一貫性が保たれる
- `storage_location`フィールドを活用できる
- 既存の`PropertyImageService`を再利用できる

**デメリット**:
- 各物件ごとにGoogle Drive APIを呼び出すため、パフォーマンスへの影響がある
- 152件の物件がある場合、152回のAPI呼び出しが発生する可能性がある

**実装方法**:
```typescript
// backend/src/services/PropertyListingService.ts
async getPublicProperties(options: { ... }) {
  // ... 既存のクエリ処理 ...
  
  const { data, error, count } = await query;
  
  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }
  
  // PropertyImageServiceを使用して各物件の最初の画像を取得
  const propertyImageService = new PropertyImageService();
  
  const propertiesWithImages = await Promise.all(
    (data || []).map(async (property) => {
      try {
        // storage_locationから最初の1枚の画像URLを取得
        const images = await propertyImageService.getFirstImage(
          property.id,
          property.storage_location
        );
        return { ...property, images };
      } catch (error) {
        console.error(`Failed to fetch image for property ${property.id}:`, error);
        return { ...property, images: [] };
      }
    })
  );
  
  return { 
    properties: propertiesWithImages, 
    total: count || 0,
    limit,
    offset 
  };
}
```

**パフォーマンス最適化**:
- `PropertyImageService.getFirstImage()`は既にキャッシュ機構を実装している（5分間のTTL）
- 並列処理（`Promise.all`）を使用して複数の画像取得を同時に実行
- タイムアウトを設定して、遅いリクエストが全体をブロックしないようにする

### アプローチ2: フロントエンドで画像を個別に取得（代替案）🟡

**概要**:
- 一覧APIは画像URLを返さない
- フロントエンドが各物件の`/properties/:id/images`エンドポイントを個別に呼び出す

**メリット**:
- バックエンドの変更が不要
- 画像の遅延読み込みが可能

**デメリット**:
- フロントエンドの実装が複雑になる
- ネットワークリクエスト数が増加する
- ユーザー体験が低下する可能性がある

## 実装計画

### Phase 1: 画像取得ロジックの実装（即時対応）🔴

**目的**: 一覧ページで画像を表示する

**所要時間**: 2-3時間

**タスク**:
1. `PropertyListingService.getPublicProperties()`メソッドを修正
   - `PropertyImageService.getFirstImage()`を使用して各物件の最初の画像を取得
   - エラーハンドリングを追加（画像取得失敗時は空配列を返す）
   - 並列処理を使用してパフォーマンスを最適化
2. テスト環境で動作確認
   - 10件の物件で画像が表示されることを確認
   - パフォーマンスを測定（レスポンス時間）
3. 本番環境にデプロイ

**期待される成果**:
- 一覧ページで画像が表示される
- 画像表示率が80%以上に改善

### Phase 2: パフォーマンス最適化（1週間以内）🟢

**目的**: APIレスポンス時間を1秒以内に抑える

**所要時間**: 3-4時間

**タスク**:
1. キャッシュ戦略を最適化
   - Redis等の外部キャッシュを検討
   - キャッシュTTLを調整
2. バッチ処理を実装
   - 複数の物件の画像を一度に取得
3. CDNを活用
   - 画像URLをCDN経由で配信

**期待される成果**:
- APIレスポンス時間が1秒以内
- ユーザー体験の向上

### Phase 3: モニタリングとアラート（1週間以内）🟢

**目的**: 問題の早期発見

**所要時間**: 2-3時間

**タスク**:
1. 画像表示率を監視
   - 一覧APIのレスポンスに含まれる物件のうち、画像を持つ物件の割合を計算
   - 画像表示率が80%未満の場合は警告ログを出力
2. アラート機能を実装
   - 画像表示率が前回から10%以上低下した場合はアラートを発行

**期待される成果**:
- 問題の早期発見が可能になる
- 画像表示率が90%以上を維持

## 成功基準

### 定量的指標

1. **画像表示率**: 公開物件の80%以上が画像を持つ
2. **APIレスポンス時間**: 物件一覧APIの応答時間が2秒以内（Phase 1）、1秒以内（Phase 2）
3. **エラー率**: 画像関連エラーが月間10件以下

### 定性的指標

1. **ユーザー体験**: 物件一覧ページで画像が表示される
2. **開発者体験**: 詳細APIと一覧APIで同じロジックを使用し、保守性が向上
3. **一貫性**: 詳細ページと一覧ページで同じ画像が表示される

## リスク評価

| リスク | 確率 | 影響度 | 対策 |
|--------|------|--------|------|
| Google Drive APIのレート制限 | 中 | 高 | キャッシュを活用、リクエスト数を制限 |
| パフォーマンス低下 | 中 | 中 | 並列処理、タイムアウト設定 |
| 画像取得失敗 | 低 | 低 | エラーハンドリング、空配列を返す |

## 関連ファイル

### バックエンド
- `backend/src/services/PropertyListingService.ts` - 修正対象
- `backend/src/services/PropertyImageService.ts` - 既存の画像取得サービス（再利用）
- `backend/src/routes/publicProperties.ts` - APIルート（参考）

### フロントエンド
- `frontend/src/pages/PublicPropertyListingPage.tsx` - 一覧ページ
- `frontend/src/components/PublicPropertyCard.tsx` - 物件カード
- `frontend/src/hooks/usePublicProperties.ts` - データ取得フック

### データベース
- `property_listings` テーブル - `storage_location`フィールドを使用

## タイムライン

- **問題発見**: 2026年1月3日
- **根本原因特定**: 2026年1月3日
- **Phase 1 完了予定**: 2026年1月3日（当日）
- **Phase 2 完了予定**: 2026年1月10日
- **Phase 3 完了予定**: 2026年1月10日

## 備考

### 重要な教訓

1. **一貫性の重要性**: 詳細APIと一覧APIで異なるロジックを使用すると、予期しない問題が発生する
2. **既存のコードの再利用**: `PropertyImageService`は既に正しく実装されていたが、一覧APIで使用されていなかった
3. **データベースの活用**: `storage_location`フィールドは存在していたが、活用されていなかった

### 誤った分析の訂正

以前の分析では以下の誤解がありました:
- ❌ Google Sheetsからの直接同期が必要
- ❌ `storage_location`フィールドが同期されていない
- ❌ データベースに画像データが存在しない

**正しい状況**:
- ✅ データベースには画像データが存在する（82.9%の物件が`storage_location`を持つ）
- ✅ 詳細APIでは画像が正常に表示される
- ✅ 問題は一覧APIの実装にある（`storage_location`を使用していない）

