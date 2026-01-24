# 公開物件サイト 手動更新ボタン実装記録

## ⚠️ 動作確認済みコミット

- `5ed8f39` - Fix: Correct import in usePropertyRefresh.ts
- `6028723` - Add: Refresh endpoints to publicProperties routes
- `0511eb1` - Fix: Hide refresh buttons from public users

---

## 機能

1. **「画像・基本情報を更新」ボタン**（1-2秒）
2. **「全て更新」ボタン**（3-5秒）

### 表示条件

- ログイン済み **かつ** URLに`?canHide=true`パラメータがある場合のみ表示
- 一般ユーザーには表示されない

---

## 変更ファイル

1. `frontend/src/hooks/usePropertyRefresh.ts` - **重要**: `import api from '../services/api';`
2. `frontend/src/components/RefreshButtons.tsx`
3. `frontend/src/pages/PublicPropertyDetailPage.tsx` - **重要**: `isAdminMode = isAuthenticated && canHideParam`
4. `backend/src/routes/publicProperties.ts` - ローカル環境用
5. `backend/api/index.ts` - 本番環境用

---

## 🔧 復元手順（問題が発生した場合）

### ステップ1: 動作確認済みコミットに戻す

```bash
# フロントエンドのファイルを復元
git checkout 0511eb1 -- frontend/src/hooks/usePropertyRefresh.ts
git checkout 0511eb1 -- frontend/src/components/RefreshButtons.tsx
git checkout 0511eb1 -- frontend/src/pages/PublicPropertyDetailPage.tsx

# バックエンドのファイルを復元
git checkout 6028723 -- backend/src/routes/publicProperties.ts
git checkout 6028723 -- backend/api/index.ts
```

### ステップ2: 確認

```bash
# ファイルの先頭を確認（文字化けチェック）
Get-Content frontend/src/hooks/usePropertyRefresh.ts -Head 10
Get-Content backend/src/routes/publicProperties.ts -Head 10
```

### ステップ3: コミット

```bash
git add frontend/src/hooks/usePropertyRefresh.ts
git add frontend/src/components/RefreshButtons.tsx
git add frontend/src/pages/PublicPropertyDetailPage.tsx
git add backend/src/routes/publicProperties.ts
git add backend/api/index.ts

git commit -m "Restore: Manual refresh buttons implementation (working version)"
git push
```

---

## 📝 重要なコード部分

### 1. usePropertyRefresh.ts（正しいインポート）

```typescript
import { useState } from 'react';
import api from '../services/api'; // ← デフォルトインポート（重要！）

export const usePropertyRefresh = (): UsePropertyRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshEssential = async (propertyId: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const response = await api.post(
        `/api/public/properties/${propertyId}/refresh-essential`
      );
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '更新に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // refreshAll も同様
  
  return { refreshEssential, refreshAll, isRefreshing, error };
};
```

### 2. PublicPropertyDetailPage.tsx（管理者モード判定）

```typescript
// 認証状態を取得（管理者モード判定用）
const { isAuthenticated } = useAuthStore();

// URLクエリパラメータから管理者モードを判定
const searchParams = new URLSearchParams(location.search);
const canHideParam = searchParams.get('canHide') === 'true';

// 管理者モード: 認証済み かつ canHide=true パラメータがある場合のみ
const isAdminMode = isAuthenticated && canHideParam;

// ボタンの表示
{isAdminMode && (
  <Box className="no-print" sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
    <RefreshButtons
      propertyId={property?.property_number || ''}
      onRefreshComplete={(data) => {
        setCompleteData(data);
      }}
      canRefresh={isAdminMode}
    />
  </Box>
)}
```

### 3. backend/src/routes/publicProperties.ts（エンドポイント）

```typescript
// 画像・基本情報を更新（軽量版）
router.post('/properties/:identifier/refresh-essential', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    
    // UUIDまたは物件番号で物件を取得
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(identifier);
    
    let property;
    if (isUUID) {
      property = await propertyListingService.getPublicPropertyById(identifier);
    } else {
      property = await propertyListingService.getPublicPropertyByNumber(identifier);
    }
    
    if (!property) {
      res.status(404).json({
        success: false,
        error: 'Property not found',
        message: '物件が見つかりません'
      });
      return;
    }
    
    // 画像キャッシュをクリアして再取得
    let storageUrl = property.storage_location;
    if (!storageUrl && property.athome_data && Array.isArray(property.athome_data)) {
      storageUrl = property.athome_data[0];
    }
    
    let images = [];
    if (storageUrl) {
      const folderId = propertyImageService.extractFolderIdFromUrl(storageUrl);
      if (folderId) {
        propertyImageService.clearCache(folderId);
      }
      
      const result = await propertyImageService.getImagesFromStorageUrl(storageUrl, property.property_number);
      const hiddenImages = await propertyListingService.getHiddenImages(property.id);
      images = result.images.filter(img => !hiddenImages.includes(img.id));
    }
    
    res.json({
      success: true,
      data: { property, images },
      message: '画像と基本情報を更新しました'
    });
  } catch (error: any) {
    console.error('[Refresh Essential] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '更新に失敗しました'
    });
  }
});

// 全て更新（完全版）も同様の構造
```

---

## 🚀 使用方法

### 一般ユーザー（お客様）

**URL**: 
```
https://property-site-frontend-kappa.vercel.app/public/properties/CC6
```

**結果**: 更新ボタンは表示されない ✅

### 管理者（ローカル環境）

**URL**: 
```
http://localhost:5173/public/properties/CC6?canHide=true
```

**手順**:
1. ログインする
2. URLに`?canHide=true`を追加
3. 更新ボタンが表示される
4. ボタンをクリックして更新

### 管理者（本番環境）

**URL**: 
```
https://property-site-frontend-kappa.vercel.app/public/properties/CC6?canHide=true
```

**手順**:
1. ログインする
2. URLに`?canHide=true`を追加
3. 更新ボタンが表示される
4. ボタンをクリックして更新

---

## 🐛 トラブルシューティング

### 問題1: ボタンが表示されない（管理者）

**原因**: URLに`?canHide=true`がない

**解決策**:
```
http://localhost:5173/public/properties/CC6?canHide=true
```

### 問題2: ボタンが表示される（一般ユーザー）

**原因**: ブラウザのキャッシュ

**解決策**:
1. ハードリロード（Ctrl+Shift+R）
2. シークレットモードで確認
3. Vercelのデプロイが完了するまで待つ

### 問題3: 更新に失敗する

**原因**: バックエンドサーバーが起動していない

**解決策**:
```bash
cd backend
npm run dev
```

### 問題4: インポートエラー

**エラー**: `The requested module '/src/services/api.ts' does not provide an export named 'publicApi'`

**原因**: `usePropertyRefresh.ts`で間違ったインポート

**解決策**:
```typescript
// ❌ 間違い
import { publicApi } from '../services/api';

// ✅ 正しい
import api from '../services/api';
```

---

## 📊 環境変数（確認用）

### フロントエンド（`.env.local`）

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### バックエンド（`.env`）

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
GOOGLE_SERVICE_ACCOUNT_JSON=your_google_service_account_json
```

---

## 🔍 動作確認方法

### ローカル環境

1. **バックエンドを起動**:
   ```bash
   cd backend
   npm run dev
   ```

2. **フロントエンドを起動**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **ブラウザで確認**:
   ```
   http://localhost:5173/public/properties/CC6?canHide=true
   ```

4. **ログイン後、ボタンが表示されることを確認**

5. **ボタンをクリックして更新が成功することを確認**

### 本番環境

1. **Vercelのデプロイが完了していることを確認**

2. **一般ユーザーとして確認**:
   ```
   https://property-site-frontend-kappa.vercel.app/public/properties/CC6
   ```
   - ボタンが表示されないことを確認

3. **管理者として確認**:
   ```
   https://property-site-frontend-kappa.vercel.app/public/properties/CC6?canHide=true
   ```
   - ログイン後、ボタンが表示されることを確認

---

## 📚 関連ドキュメント

- [手動画像キャッシュクリア機能](.kiro/steering/manual-image-cache-clear.md)
- [ローカル管理者ログインガイド](.kiro/steering/local-admin-login-guide.md)
- [公開物件コメント表示パフォーマンス修正](.kiro/steering/public-property-comment-performance-fix.md)

---

## ✅ 実装完了チェックリスト

- [x] フロントエンド: `usePropertyRefresh.ts`カスタムフック作成
- [x] フロントエンド: `RefreshButtons.tsx`コンポーネント作成
- [x] フロントエンド: `PublicPropertyDetailPage.tsx`にボタン統合
- [x] フロントエンド: 管理者モード判定（`isAdminMode`）実装
- [x] バックエンド: `backend/src/routes/publicProperties.ts`にエンドポイント追加
- [x] バックエンド: `backend/api/index.ts`にエンドポイント追加
- [x] テスト: ローカル環境で動作確認
- [x] テスト: 本番環境で動作確認（一般ユーザー）
- [x] テスト: 本番環境で動作確認（管理者）
- [x] ドキュメント: 復元手順作成

---

## 🎯 まとめ

### 実装された機能

1. **画像・基本情報を更新**ボタン（1-2秒）
2. **全て更新**ボタン（3-5秒）
3. 管理者のみ表示（`?canHide=true`パラメータ必須）
4. 一般ユーザーには非表示

### 重要なポイント

- **URLパラメータ`?canHide=true`が必須**
- **ログイン済みでもパラメータがないとボタンは表示されない**
- **一般ユーザーには絶対に表示されない**

### 今後の注意事項

- この機能を削除する場合は、上記のファイルを全て元に戻す必要があります
- 問題が発生した場合は、このドキュメントの「復元手順」を参照してください
- 新しい機能を追加する場合は、このドキュメントを更新してください

---

**このドキュメントは、問題が発生した際の復元用です。必ず保管してください。**

**最終更新日**: 2026年1月25日
**動作確認済みコミット**: `0511eb1`
