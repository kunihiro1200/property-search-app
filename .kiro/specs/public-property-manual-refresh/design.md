# 公開物件サイト 手動更新機能 - 設計書

## 1. アーキテクチャ概要

### システム構成

```
┌─────────────────────────────────────────────────────┐
│ フロントエンド (React + TypeScript)                 │
│                                                     │
│  PublicPropertyDetailPage.tsx                      │
│  ├─ RefreshButtons.tsx (新規)                      │
│  │  ├─ 「画像・基本情報を更新」ボタン              │
│  │  └─ 「全て更新」ボタン                          │
│  └─ usePropertyRefresh.ts (新規カスタムフック)     │
└─────────────────────────────────────────────────────┘
                        ↓ HTTP Request
┌─────────────────────────────────────────────────────┐
│ バックエンド (Node.js + Express)                    │
│                                                     │
│  /api/public/properties/:identifier/                │
│  ├─ refresh-essential (新規)                        │
│  │  └─ 基本情報 + 画像のみ取得                     │
│  └─ refresh-all (新規)                              │
│     └─ 全てのデータを取得                           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ データソース                                        │
│  ├─ Supabase (基本情報)                            │
│  ├─ Google Drive (画像)                            │
│  └─ Google Sheets (コメント)                       │
└─────────────────────────────────────────────────────┘
```

## 2. データフロー

### 2.1 「画像・基本情報を更新」ボタン

```
ユーザー
  ↓ クリック
RefreshButtons.tsx
  ↓ handleRefreshEssential()
usePropertyRefresh.ts
  ↓ refreshEssential()
publicApi.post('/api/public/properties/:identifier/refresh-essential')
  ↓
backend/api/index.ts
  ├─ PropertyService.getPropertyByIdentifier() → Supabase
  └─ PropertyImageService.getPropertyImages() → Google Drive
  ↓
レスポンス { property, images }
  ↓
フロントエンド: 状態を更新
  ↓
画面に最新データを表示
```

### 2.2 「全て更新」ボタン

```
ユーザー
  ↓ クリック
RefreshButtons.tsx
  ↓ handleRefreshAll()
usePropertyRefresh.ts
  ↓ refreshAll()
publicApi.post('/api/public/properties/:identifier/refresh-all')
  ↓
backend/api/index.ts
  ├─ PropertyService.getPropertyByIdentifier() → Supabase
  ├─ PropertyImageService.getPropertyImages() → Google Drive
  ├─ RecommendedCommentService.getRecommendedComments() → Google Sheets
  ├─ FavoriteCommentService.getFavoriteComment() → Google Sheets
  └─ AthomeDataService.getAthomeData() → Google Sheets
  ↓
レスポンス { property, images, recommendedComments, favoriteComment, athomeData }
  ↓
フロントエンド: 状態を更新
  ↓
画面に最新データを表示
```

## 3. API設計

### 3.1 画像・基本情報を更新

**エンドポイント**: `POST /api/public/properties/:identifier/refresh-essential`

**パラメータ**:
- `identifier`: 物件ID（UUID）または物件番号（例: CC6）

**レスポンス**:
```typescript
{
  success: true,
  data: {
    property: {
      id: string;
      property_number: string;
      address: string;
      price: number;
      land_area: number;
      building_area: number;
      floor_plan: string;
      construction_year_month: string;
      // ... 他の基本情報
    },
    images: Array<{
      id: string;
      url: string;
      thumbnailUrl: string;
      name: string;
      isHidden: boolean;
    }>
  },
  message: "画像と基本情報を更新しました"
}
```

**エラーレスポンス**:
```typescript
{
  success: false,
  error: "Property not found",
  message: "物件が見つかりません"
}
```

### 3.2 全て更新

**エンドポイント**: `POST /api/public/properties/:identifier/refresh-all`

**パラメータ**:
- `identifier`: 物件ID（UUID）または物件番号（例: CC6）

**レスポンス**:
```typescript
{
  success: true,
  data: {
    property: { /* 基本情報 */ },
    images: [ /* 画像 */ ],
    recommendedComments: string[],
    favoriteComment: string | null,
    athomeData: {
      panoramaUrl: string | null;
    }
  },
  message: "全てのデータを更新しました"
}
```

## 4. フロントエンド設計

### 4.1 コンポーネント構成

#### RefreshButtons.tsx（新規）

```typescript
interface RefreshButtonsProps {
  propertyId: string;
  onRefreshComplete: (data: any) => void;
  canRefresh: boolean; // 管理者モードかどうか
}

export const RefreshButtons: React.FC<RefreshButtonsProps> = ({
  propertyId,
  onRefreshComplete,
  canRefresh
}) => {
  const { refreshEssential, refreshAll, isRefreshing } = usePropertyRefresh();
  
  if (!canRefresh) return null;
  
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        variant="outlined"
        onClick={() => handleRefreshEssential()}
        disabled={isRefreshing}
        startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
      >
        {isRefreshing ? '更新中...' : '画像・基本情報を更新'}
      </Button>
      
      <Button
        variant="outlined"
        onClick={() => handleRefreshAll()}
        disabled={isRefreshing}
        startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
      >
        {isRefreshing ? '更新中...' : '全て更新'}
      </Button>
    </Box>
  );
};
```

#### usePropertyRefresh.ts（新規カスタムフック）

```typescript
interface UsePropertyRefreshReturn {
  refreshEssential: (propertyId: string) => Promise<any>;
  refreshAll: (propertyId: string) => Promise<any>;
  isRefreshing: boolean;
  error: string | null;
}

export const usePropertyRefresh = (): UsePropertyRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshEssential = async (propertyId: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const response = await publicApi.post(
        `/api/public/properties/${propertyId}/refresh-essential`
      );
      return response.data;
    } catch (err) {
      setError('更新に失敗しました');
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const refreshAll = async (propertyId: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const response = await publicApi.post(
        `/api/public/properties/${propertyId}/refresh-all`
      );
      return response.data;
    } catch (err) {
      setError('更新に失敗しました');
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return { refreshEssential, refreshAll, isRefreshing, error };
};
```

#### PublicPropertyDetailPage.tsx（修正）

```typescript
// 既存のコードに追加
const { isAuthenticated } = useAuthStore();
const [completeData, setCompleteData] = useState<any>(null);

const handleRefreshComplete = (data: any) => {
  // 状態を更新
  setCompleteData(data);
  
  // 成功メッセージを表示
  setSnackbar({
    open: true,
    message: '更新が完了しました',
    severity: 'success'
  });
};

return (
  <Container>
    {/* ページ上部にボタンを配置 */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
      <Typography variant="h4">
        {property?.property_number} - {property?.address}
      </Typography>
      
      <RefreshButtons
        propertyId={property?.property_number}
        onRefreshComplete={handleRefreshComplete}
        canRefresh={isAuthenticated}
      />
    </Box>
    
    {/* 既存のコンテンツ */}
  </Container>
);
```

### 4.2 状態管理

#### ローカル状態（useState）

```typescript
// RefreshButtons.tsx
const [isRefreshing, setIsRefreshing] = useState(false);
const [snackbar, setSnackbar] = useState({
  open: false,
  message: '',
  severity: 'success' as 'success' | 'error'
});

// PublicPropertyDetailPage.tsx
const [completeData, setCompleteData] = useState<any>(null);
```

#### グローバル状態（useAuthStore）

```typescript
// 既存の認証ストアを使用
const { isAuthenticated } = useAuthStore();
```

## 5. バックエンド設計

### 5.1 エンドポイント実装

#### backend/api/index.ts（追加）

```typescript
// 画像・基本情報を更新
app.post('/api/public/properties/:identifier/refresh-essential', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // 基本情報を取得（データベース）
    const property = await PropertyService.getPropertyByIdentifier(identifier);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
    }
    
    // 画像を取得（Google Drive）- キャッシュをバイパス
    const images = await PropertyImageService.getPropertyImages(
      property.property_number,
      { bypassCache: true }
    );
    
    res.json({
      success: true,
      data: {
        property,
        images
      },
      message: '画像と基本情報を更新しました'
    });
  } catch (error) {
    console.error('[Refresh Essential] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '更新に失敗しました'
    });
  }
});

// 全て更新
app.post('/api/public/properties/:identifier/refresh-all', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // 基本情報を取得
    const property = await PropertyService.getPropertyByIdentifier(identifier);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
    }
    
    // 全てのデータを並列取得（キャッシュをバイパス）
    const [images, recommendedComments, favoriteComment, athomeData] = await Promise.all([
      PropertyImageService.getPropertyImages(property.property_number, { bypassCache: true }),
      RecommendedCommentService.getRecommendedComments(property.property_number, { bypassCache: true }),
      FavoriteCommentService.getFavoriteComment(property.property_number, { bypassCache: true }),
      AthomeDataService.getAthomeData(property.property_number, { bypassCache: true })
    ]);
    
    res.json({
      success: true,
      data: {
        property,
        images,
        recommendedComments,
        favoriteComment,
        athomeData
      },
      message: '全てのデータを更新しました'
    });
  } catch (error) {
    console.error('[Refresh All] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '更新に失敗しました'
    });
  }
});
```

### 5.2 キャッシュバイパス機能

既存のサービスに`bypassCache`オプションを追加します。

#### PropertyImageService.ts（修正）

```typescript
async getPropertyImages(
  propertyNumber: string,
  options?: { bypassCache?: boolean }
): Promise<PropertyImage[]> {
  const cacheKey = `property-images-${propertyNumber}`;
  
  // キャッシュをバイパスする場合はキャッシュをクリア
  if (options?.bypassCache) {
    this.cache.delete(cacheKey);
  }
  
  // 既存のキャッシュロジック
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }
  
  // Google Driveから取得
  const images = await this.fetchImagesFromDrive(propertyNumber);
  
  // キャッシュに保存（60分）
  this.cache.set(cacheKey, images, 60 * 60 * 1000);
  
  return images;
}
```

同様に、他のサービス（`RecommendedCommentService`, `FavoriteCommentService`, `AthomeDataService`）にも`bypassCache`オプションを追加します。

## 6. UI/UXデザイン

### 6.1 ボタン配置

```
┌─────────────────────────────────────────────────────────────┐
│ CC6 - ふじが丘西１丁目１号棟                                │
│                                                             │
│ [画像・基本情報を更新] [全て更新]          [ログアウト]    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 ボタンスタイル

- **デザイン**: Material-UI `outlined` ボタン
- **色**: プライマリカラー（青）
- **アイコン**: `RefreshIcon`（更新中は`CircularProgress`）
- **サイズ**: `medium`

### 6.3 ローディング状態

```
[⟳ 更新中...]  [全て更新]
```

### 6.4 成功メッセージ

```
┌─────────────────────────────────────┐
│ ✓ 画像と基本情報を更新しました      │
└─────────────────────────────────────┘
```

### 6.5 エラーメッセージ

```
┌─────────────────────────────────────┐
│ ✗ 更新に失敗しました                │
└─────────────────────────────────────┘
```

## 7. パフォーマンス最適化

### 7.1 並列処理

「全て更新」ボタンでは、`Promise.all()`を使用して並列処理を行います。

```typescript
const [images, recommendedComments, favoriteComment, athomeData] = await Promise.all([
  PropertyImageService.getPropertyImages(propertyNumber, { bypassCache: true }),
  RecommendedCommentService.getRecommendedComments(propertyNumber, { bypassCache: true }),
  FavoriteCommentService.getFavoriteComment(propertyNumber, { bypassCache: true }),
  AthomeDataService.getAthomeData(propertyNumber, { bypassCache: true })
]);
```

**効果**:
- 逐次処理: 1秒 + 1秒 + 1秒 + 1秒 = 4秒
- 並列処理: max(1秒, 1秒, 1秒, 1秒) = 1秒

### 7.2 キャッシュ戦略

- **通常時**: 60分間キャッシュ（高速表示）
- **更新時**: キャッシュをバイパス（最新データ取得）
- **更新後**: 新しいデータをキャッシュに保存

## 8. エラーハンドリング

### 8.1 エラーの種類

1. **物件が見つからない**: 404エラー
2. **Google APIエラー**: 500エラー
3. **ネットワークエラー**: 500エラー
4. **レート制限エラー**: 429エラー

### 8.2 エラーメッセージ

```typescript
const errorMessages = {
  404: '物件が見つかりません',
  429: 'APIのレート制限に達しました。しばらく待ってから再試行してください',
  500: '更新に失敗しました。もう一度お試しください',
  default: '予期しないエラーが発生しました'
};
```

## 9. セキュリティ

### 9.1 認証

- フロントエンド: `useAuthStore`で認証状態を確認
- バックエンド: 既存の認証ミドルウェアを使用（必要に応じて）

### 9.2 認可

- 管理者のみがボタンを表示・使用できる
- `canRefresh`プロパティで制御

## 10. テスト計画

### 10.1 単体テスト

- `usePropertyRefresh.ts`のロジック
- エラーハンドリング

### 10.2 統合テスト

- APIエンドポイントのテスト
- データ取得のテスト

### 10.3 E2Eテスト

- ボタンクリック → データ更新 → 画面表示
- エラーケースのテスト

## 11. デプロイ計画

### 11.1 デプロイ手順

1. バックエンドのコード変更をコミット
2. フロントエンドのコード変更をコミット
3. Git push
4. Vercelが自動デプロイ（2-3分）
5. 本番環境で動作確認

### 11.2 ロールバック計画

問題が発生した場合、以下のコミットに戻します：

```bash
git revert <commit-hash>
git push
```

## 12. モニタリング

### 12.1 ログ

- 更新ボタンのクリック数
- 更新の成功/失敗
- 更新時間

### 12.2 メトリクス

- 平均更新時間
- 成功率
- エラー率

## 13. 今後の改善案

- FUT-1: 更新履歴の記録
- FUT-2: 更新通知機能
- FUT-3: 一括更新機能（複数物件）
- FUT-4: 自動更新の頻度カスタマイズ
