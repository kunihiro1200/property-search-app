# 公開物件サイト 手動更新機能 - 実装タスク

## タスク一覧

- [x] 1. バックエンドAPI実装
  - [x] 1.1 `/refresh-essential`エンドポイント追加
  - [x] 1.2 `/refresh-all`エンドポイント追加
  - [x] 1.3 サービス層に`bypassCache`オプション追加
  - [x] 1.4 エラーハンドリング実装
- [x] 2. フロントエンド実装
  - [x] 2.1 `usePropertyRefresh`カスタムフック作成
  - [x] 2.2 `RefreshButtons`コンポーネント作成
  - [x] 2.3 `PublicPropertyDetailPage`にボタン統合
  - [x] 2.4 状態管理とデータ更新ロジック実装
- [x] 3. テスト
  - [x] 3.1 バックエンドAPIテスト
  - [x] 3.2 フロントエンドコンポーネントテスト
  - [x] 3.3 E2Eテスト（ローカル環境）
- [x] 4. デプロイと動作確認
  - [x] 4.1 コミットとプッシュ
  - [x] 4.2 本番環境で動作確認
  - [x] 4.3 パフォーマンス確認

---

## 1. バックエンドAPI実装

### 1.1 `/refresh-essential`エンドポイント追加

**ファイル**: `backend/api/index.ts`

**実装内容**:
```typescript
// 画像・基本情報を更新
app.post('/api/public/properties/:identifier/refresh-essential', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    console.log(`[Refresh Essential] Request for property: ${identifier}`);
    
    // 基本情報を取得（データベース）
    const property = await PropertyService.getPropertyByIdentifier(identifier);
    
    if (!property) {
      console.log(`[Refresh Essential] Property not found: ${identifier}`);
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
    }
    
    console.log(`[Refresh Essential] Property found: ${property.property_number}`);
    
    // 画像を取得（Google Drive）- キャッシュをバイパス
    const images = await PropertyImageService.getPropertyImages(
      property.property_number,
      { bypassCache: true }
    );
    
    console.log(`[Refresh Essential] Images fetched: ${images.length} images`);
    
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
```

**受け入れ基準**:
- ✅ エンドポイントが正しく動作する
- ✅ 基本情報がデータベースから取得される
- ✅ 画像がGoogle Driveから取得される（キャッシュバイパス）
- ✅ レスポンスが正しい形式で返される
- ✅ エラーハンドリングが実装されている

---

### 1.2 `/refresh-all`エンドポイント追加

**ファイル**: `backend/api/index.ts`

**実装内容**:
```typescript
// 全て更新
app.post('/api/public/properties/:identifier/refresh-all', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    console.log(`[Refresh All] Request for property: ${identifier}`);
    
    // 基本情報を取得
    const property = await PropertyService.getPropertyByIdentifier(identifier);
    
    if (!property) {
      console.log(`[Refresh All] Property not found: ${identifier}`);
      return res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
    }
    
    console.log(`[Refresh All] Property found: ${property.property_number}`);
    
    // 全てのデータを並列取得（キャッシュをバイパス）
    const startTime = Date.now();
    
    const [images, recommendedComments, favoriteComment, athomeData] = await Promise.all([
      PropertyImageService.getPropertyImages(property.property_number, { bypassCache: true }),
      RecommendedCommentService.getRecommendedComments(property.property_number, { bypassCache: true }),
      FavoriteCommentService.getFavoriteComment(property.property_number, { bypassCache: true }),
      AthomeDataService.getAthomeData(property.property_number, { bypassCache: true })
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`[Refresh All] All data fetched in ${duration}ms`);
    
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

**受け入れ基準**:
- ✅ エンドポイントが正しく動作する
- ✅ 全てのデータが並列取得される
- ✅ 取得時間が5秒以内
- ✅ レスポンスが正しい形式で返される
- ✅ エラーハンドリングが実装されている

---

### 1.3 サービス層に`bypassCache`オプション追加

#### PropertyImageService.ts

**ファイル**: `backend/src/services/PropertyImageService.ts`

**実装内容**:
```typescript
async getPropertyImages(
  propertyNumber: string,
  options?: { bypassCache?: boolean }
): Promise<PropertyImage[]> {
  const cacheKey = `property-images-${propertyNumber}`;
  
  // キャッシュをバイパスする場合はキャッシュをクリア
  if (options?.bypassCache) {
    console.log(`[PropertyImageService] Bypassing cache for ${propertyNumber}`);
    this.cache.delete(cacheKey);
  }
  
  // 既存のキャッシュロジック
  if (this.cache.has(cacheKey)) {
    console.log(`[PropertyImageService] Cache hit for ${propertyNumber}`);
    return this.cache.get(cacheKey);
  }
  
  console.log(`[PropertyImageService] Fetching from Google Drive for ${propertyNumber}`);
  
  // Google Driveから取得
  const images = await this.fetchImagesFromDrive(propertyNumber);
  
  // キャッシュに保存（60分）
  this.cache.set(cacheKey, images, 60 * 60 * 1000);
  
  return images;
}
```

#### RecommendedCommentService.ts

**ファイル**: `backend/src/services/RecommendedCommentService.ts`

**実装内容**:
```typescript
async getRecommendedComments(
  propertyNumber: string,
  options?: { bypassCache?: boolean }
): Promise<string[]> {
  const cacheKey = `recommended-comments-${propertyNumber}`;
  
  if (options?.bypassCache) {
    console.log(`[RecommendedCommentService] Bypassing cache for ${propertyNumber}`);
    this.cache.delete(cacheKey);
  }
  
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }
  
  // Google Sheetsから取得
  const comments = await this.fetchCommentsFromSheets(propertyNumber);
  
  // キャッシュに保存（60分）
  this.cache.set(cacheKey, comments, 60 * 60 * 1000);
  
  return comments;
}
```

#### FavoriteCommentService.ts

**ファイル**: `backend/src/services/FavoriteCommentService.ts`

**実装内容**:
```typescript
async getFavoriteComment(
  propertyNumber: string,
  options?: { bypassCache?: boolean }
): Promise<string | null> {
  const cacheKey = `favorite-comment-${propertyNumber}`;
  
  if (options?.bypassCache) {
    console.log(`[FavoriteCommentService] Bypassing cache for ${propertyNumber}`);
    this.cache.delete(cacheKey);
  }
  
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }
  
  // Google Sheetsから取得
  const comment = await this.fetchCommentFromSheets(propertyNumber);
  
  // キャッシュに保存（60分）
  this.cache.set(cacheKey, comment, 60 * 60 * 1000);
  
  return comment;
}
```

#### AthomeDataService.ts

**ファイル**: `backend/src/services/AthomeDataService.ts`

**実装内容**:
```typescript
async getAthomeData(
  propertyNumber: string,
  options?: { bypassCache?: boolean }
): Promise<{ panoramaUrl: string | null }> {
  const cacheKey = `athome-data-${propertyNumber}`;
  
  if (options?.bypassCache) {
    console.log(`[AthomeDataService] Bypassing cache for ${propertyNumber}`);
    this.cache.delete(cacheKey);
  }
  
  if (this.cache.has(cacheKey)) {
    return this.cache.get(cacheKey);
  }
  
  // Google Sheetsから取得
  const data = await this.fetchDataFromSheets(propertyNumber);
  
  // キャッシュに保存（60分）
  this.cache.set(cacheKey, data, 60 * 60 * 1000);
  
  return data;
}
```

**受け入れ基準**:
- ✅ 全てのサービスに`bypassCache`オプションが追加されている
- ✅ `bypassCache: true`の場合、キャッシュがクリアされる
- ✅ 既存の機能に影響がない

---

### 1.4 エラーハンドリング実装

**実装内容**:
- 404エラー: 物件が見つからない
- 500エラー: サーバーエラー
- ログ出力: エラー内容を詳細にログ

**受け入れ基準**:
- ✅ エラーが適切にハンドリングされる
- ✅ エラーメッセージが日本語で返される
- ✅ エラーログが出力される

---

## 2. フロントエンド実装

### 2.1 `usePropertyRefresh`カスタムフック作成

**ファイル**: `frontend/src/hooks/usePropertyRefresh.ts`

**実装内容**:
```typescript
import { useState } from 'react';
import { publicApi } from '../services/api';

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
      console.log(`[usePropertyRefresh] Refreshing essential data for ${propertyId}`);
      const response = await publicApi.post(
        `/api/public/properties/${propertyId}/refresh-essential`
      );
      console.log('[usePropertyRefresh] Essential data refreshed successfully');
      return response.data;
    } catch (err: any) {
      console.error('[usePropertyRefresh] Error refreshing essential data:', err);
      const errorMessage = err.response?.data?.message || '更新に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const refreshAll = async (propertyId: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      console.log(`[usePropertyRefresh] Refreshing all data for ${propertyId}`);
      const response = await publicApi.post(
        `/api/public/properties/${propertyId}/refresh-all`
      );
      console.log('[usePropertyRefresh] All data refreshed successfully');
      return response.data;
    } catch (err: any) {
      console.error('[usePropertyRefresh] Error refreshing all data:', err);
      const errorMessage = err.response?.data?.message || '更新に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return { refreshEssential, refreshAll, isRefreshing, error };
};
```

**受け入れ基準**:
- ✅ `refreshEssential`関数が実装されている
- ✅ `refreshAll`関数が実装されている
- ✅ ローディング状態が管理されている
- ✅ エラーハンドリングが実装されている

---

### 2.2 `RefreshButtons`コンポーネント作成

**ファイル**: `frontend/src/components/RefreshButtons.tsx`

**実装内容**:
```typescript
import React, { useState } from 'react';
import { Box, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePropertyRefresh } from '../hooks/usePropertyRefresh';

interface RefreshButtonsProps {
  propertyId: string;
  onRefreshComplete: (data: any) => void;
  canRefresh: boolean;
}

export const RefreshButtons: React.FC<RefreshButtonsProps> = ({
  propertyId,
  onRefreshComplete,
  canRefresh
}) => {
  const { refreshEssential, refreshAll, isRefreshing } = usePropertyRefresh();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  
  if (!canRefresh) return null;
  
  const handleRefreshEssential = async () => {
    try {
      const result = await refreshEssential(propertyId);
      onRefreshComplete(result.data);
      setSnackbar({
        open: true,
        message: '画像と基本情報を更新しました',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '更新に失敗しました',
        severity: 'error'
      });
    }
  };
  
  const handleRefreshAll = async () => {
    try {
      const result = await refreshAll(propertyId);
      onRefreshComplete(result.data);
      setSnackbar({
        open: true,
        message: '全てのデータを更新しました',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '更新に失敗しました',
        severity: 'error'
      });
    }
  };
  
  return (
    <>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleRefreshEssential}
          disabled={isRefreshing}
          startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          {isRefreshing ? '更新中...' : '画像・基本情報を更新'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          {isRefreshing ? '更新中...' : '全て更新'}
        </Button>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
```

**受け入れ基準**:
- ✅ 2つのボタンが表示される
- ✅ 管理者モードの場合のみ表示される
- ✅ ローディング状態が視覚的に表示される
- ✅ 成功/失敗メッセージが表示される

---

### 2.3 `PublicPropertyDetailPage`にボタン統合

**ファイル**: `frontend/src/pages/PublicPropertyDetailPage.tsx`

**実装内容**:
```typescript
import { RefreshButtons } from '../components/RefreshButtons';
import { useAuthStore } from '../store/authStore';

// 既存のコードに追加
const { isAuthenticated } = useAuthStore();
const [completeData, setCompleteData] = useState<any>(null);

const handleRefreshComplete = (data: any) => {
  console.log('[PublicPropertyDetailPage] Refresh complete, updating state');
  
  // 状態を更新
  setCompleteData(data);
  
  // 必要に応じて他の状態も更新
  if (data.property) {
    // 基本情報を更新
  }
  if (data.images) {
    // 画像を更新
  }
  if (data.recommendedComments) {
    // おすすめコメントを更新
  }
  if (data.favoriteComment) {
    // お気に入り文言を更新
  }
};

return (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    {/* ページ上部にボタンを配置 */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4">
        {property?.property_number} - {property?.address}
      </Typography>
      
      <RefreshButtons
        propertyId={property?.property_number || ''}
        onRefreshComplete={handleRefreshComplete}
        canRefresh={isAuthenticated}
      />
    </Box>
    
    {/* 既存のコンテンツ */}
  </Container>
);
```

**受け入れ基準**:
- ✅ ボタンがページ上部に表示される
- ✅ 更新後、画面が最新データで更新される
- ✅ 既存の機能に影響がない

---

### 2.4 状態管理とデータ更新ロジック実装

**実装内容**:
- `completeData`状態を更新
- 各セクション（基本情報、画像、コメント）の状態を更新
- 画面を再レンダリング

**受け入れ基準**:
- ✅ 更新後、全てのセクションが最新データで表示される
- ✅ 状態管理が適切に実装されている

---

## 3. テスト

### 3.1 バックエンドAPIテスト

**ファイル**: `backend/test-refresh-api.ts`

**実装内容**:
```typescript
import axios from 'axios';

async function testRefreshAPI() {
  const baseURL = 'http://localhost:3000';
  const propertyId = 'CC6';
  
  console.log('Testing /refresh-essential...');
  const essentialResponse = await axios.post(
    `${baseURL}/api/public/properties/${propertyId}/refresh-essential`
  );
  console.log('Essential response:', essentialResponse.data);
  
  console.log('\nTesting /refresh-all...');
  const allResponse = await axios.post(
    `${baseURL}/api/public/properties/${propertyId}/refresh-all`
  );
  console.log('All response:', allResponse.data);
}

testRefreshAPI();
```

**受け入れ基準**:
- ✅ `/refresh-essential`が正しく動作する
- ✅ `/refresh-all`が正しく動作する
- ✅ レスポンスが正しい形式で返される

---

### 3.2 フロントエンドコンポーネントテスト

**テスト内容**:
- ボタンが正しく表示されるか
- クリック時に正しい関数が呼ばれるか
- ローディング状態が正しく表示されるか

**受け入れ基準**:
- ✅ 全てのテストがパスする

---

### 3.3 E2Eテスト（ローカル環境）

**テスト手順**:
1. ローカル環境でバックエンドとフロントエンドを起動
2. 管理者としてログイン
3. CC6の詳細ページを開く
4. 「画像・基本情報を更新」ボタンをクリック
5. 1-2秒後、最新データが表示されることを確認
6. 「全て更新」ボタンをクリック
7. 3-5秒後、全てのデータが表示されることを確認

**受け入れ基準**:
- ✅ 全ての手順が正常に動作する
- ✅ 更新時間が期待通り

---

## 4. デプロイと動作確認

### 4.1 コミットとプッシュ

**コマンド**:
```bash
git add .
git commit -m "Add: Manual refresh buttons for public property detail page"
git push
```

**受け入れ基準**:
- ✅ コミットが成功する
- ✅ プッシュが成功する

---

### 4.2 本番環境で動作確認

**確認項目**:
1. Vercelのデプロイが成功しているか
2. 本番環境でボタンが表示されるか
3. ボタンが正しく動作するか
4. 更新時間が期待通りか

**受け入れ基準**:
- ✅ 全ての確認項目がOK

---

### 4.3 パフォーマンス確認

**確認項目**:
1. 「画像・基本情報を更新」: 1-2秒以内
2. 「全て更新」: 3-5秒以内

**受け入れ基準**:
- ✅ パフォーマンスが期待通り

---

## 完了条件

- [ ] 全てのタスクが完了している
- [ ] 全てのテストがパスしている
- [ ] 本番環境で正常に動作している
- [ ] パフォーマンスが期待通り
- [ ] ドキュメントが更新されている
