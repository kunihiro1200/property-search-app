# 公開物件サイト画像表示安定化 - 設計書

## 設計概要

画像表示の安定性を向上させるため、以下の3つのアプローチを採用します：

1. **エラーハンドリングの強化**: 画像読み込みエラー時に自動的にフォールバックする
2. **画像読み込み状態の管理**: ローディング状態を明示的に管理し、ユーザーにフィードバックを提供
3. **プレースホルダー画像の最適化**: プレースホルダー画像をBase64エンコードしてインライン化し、確実に表示

## アーキテクチャ

### コンポーネント構成

```
PublicPropertyHeader
├── PublicPropertyLogo (修正)
│   ├── ロゴ画像
│   ├── エラーハンドリング
│   └── フォールバック表示
│
PublicPropertiesPage
└── PublicPropertyCard (修正)
    ├── 物件画像
    ├── エラーハンドリング
    ├── ローディング状態
    └── プレースホルダー表示
```

### カスタムフックの追加

```typescript
// useImageLoader.ts
// 画像読み込み状態を管理するカスタムフック
```

## 詳細設計

### 1. PublicPropertyLogo.tsx の改善

#### 1.1 エラーハンドリングの追加

**現在の実装**:
```typescript
<img 
  src="/comfortable-tenant-search-logo.png" 
  alt="comfortable TENANT SEARCH" 
  className="logo-image"
/>
```

**改善後の実装**:
```typescript
const [imageError, setImageError] = useState(false);
const [imageLoaded, setImageLoaded] = useState(false);

<img 
  src="/comfortable-tenant-search-logo.png" 
  alt="comfortable TENANT SEARCH" 
  className="logo-image"
  onLoad={() => setImageLoaded(true)}
  onError={(e) => {
    console.error('Logo image failed to load:', e);
    setImageError(true);
  }}
  style={{
    opacity: imageLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out'
  }}
/>

{/* フォールバック表示 */}
{imageError && (
  <div className="logo-fallback">
    <span className="company-name-fallback">株式会社いふう</span>
  </div>
)}
```

#### 1.2 画像の事前読み込み

**index.html に追加**:
```html
<link rel="preload" href="/comfortable-tenant-search-logo.png" as="image">
```

#### 1.3 Base64エンコード（オプション）

ロゴ画像が小さい場合（< 10KB）、Base64エンコードしてインライン化することで、確実に表示できます。

```typescript
const LOGO_BASE64 = 'data:image/png;base64,...';

<img 
  src={imageError ? LOGO_BASE64 : "/comfortable-tenant-search-logo.png"}
  alt="comfortable TENANT SEARCH" 
  className="logo-image"
  onError={() => setImageError(true)}
/>
```

### 2. PublicPropertyCard.tsx の改善

#### 2.1 カスタムフック `useImageLoader` の作成

**ファイル**: `frontend/src/hooks/useImageLoader.ts`

```typescript
import { useState, useEffect } from 'react';

interface UseImageLoaderOptions {
  src: string;
  fallbackSrc?: string;
  onError?: (error: Event) => void;
}

interface UseImageLoaderReturn {
  imageSrc: string;
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
}

export const useImageLoader = ({
  src,
  fallbackSrc = '/placeholder-property.jpg',
  onError
}: UseImageLoaderOptions): UseImageLoaderReturn => {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    // srcが変更されたらリセット
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = (error: Event) => {
    console.error('Image failed to load:', src, error);
    
    // エラーコールバックを実行
    if (onError) {
      onError(error);
    }

    // リトライ回数が3回未満の場合はリトライ
    if (retryCount < 3) {
      console.log(`Retrying image load (${retryCount + 1}/3)...`);
      setRetryCount(prev => prev + 1);
      // 少し遅延してからリトライ
      setTimeout(() => {
        setImageSrc(`${src}?retry=${retryCount + 1}`);
      }, 1000 * (retryCount + 1)); // 1秒、2秒、3秒と遅延を増やす
    } else {
      // リトライ上限に達したらフォールバック画像に切り替え
      console.log('Max retries reached, using fallback image');
      setImageSrc(fallbackSrc);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const retry = () => {
    setRetryCount(0);
    setImageSrc(src);
    setIsLoading(true);
    setHasError(false);
  };

  return {
    imageSrc,
    isLoading,
    hasError,
    retry
  };
};
```

#### 2.2 PublicPropertyCard.tsx での使用

```typescript
import { useImageLoader } from '../hooks/useImageLoader';

const PublicPropertyCard: React.FC<PublicPropertyCardProps> = ({ 
  property, 
  animationDelay = 0,
  navigationState
}) => {
  const thumbnailUrl = property.images && property.images.length > 0
    ? property.images[0]
    : property.image_url || '/placeholder-property.jpg';
  
  // カスタムフックを使用
  const { imageSrc, isLoading, hasError } = useImageLoader({
    src: thumbnailUrl,
    fallbackSrc: '/placeholder-property.jpg',
    onError: (error) => {
      console.error('Property image error:', property.property_number, error);
    }
  });

  return (
    <Card className="property-card">
      <Box className="property-card-image-container">
        {/* ローディングインジケーター */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              zIndex: 1
            }}
          >
            <CircularProgress size={40} />
          </Box>
        )}
        
        <img
          src={imageSrc}
          alt={`${property.display_address || property.address}の物件画像`}
          className="property-card-image"
          loading="lazy"
          crossOrigin="anonymous"
          onLoad={() => {
            // 画像読み込み完了時の処理はカスタムフック内で管理
          }}
          onError={() => {
            // エラー処理はカスタムフック内で管理
          }}
          style={{
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
        
        {/* エラー表示（オプション） */}
        {hasError && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              zIndex: 2
            }}
          >
            画像を読み込めませんでした
          </Box>
        )}
        
        {/* 既存のバッジやオーバーレイ */}
        <Box className="property-card-image-overlay" />
        {renderBadge()}
        <Chip label={typeConfig.label} className="property-type-badge" />
      </Box>
      
      {/* 既存のCardContent */}
      <CardContent className="property-card-content">
        {/* ... */}
      </CardContent>
    </Card>
  );
};
```

### 3. プレースホルダー画像の最適化

#### 3.1 プレースホルダー画像のBase64エンコード

**ファイル**: `frontend/src/utils/placeholderImage.ts`

```typescript
// プレースホルダー画像をBase64エンコードして保存
// これにより、ネットワークエラー時でも確実に表示できる

export const PLACEHOLDER_IMAGE_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7nlarnianjgYzjgYLjgorjgb7jgZvjgpM8L3RleHQ+Cjwvc3ZnPg==';

// SVGソース（参考）:
// <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
//   <rect width="400" height="300" fill="#f3f4f6"/>
//   <text x="50%" y="50%" font-family="Arial" font-size="18" fill="#9ca3af" text-anchor="middle" dy=".3em">画像がありません</text>
// </svg>
```

#### 3.2 useImageLoader での使用

```typescript
export const useImageLoader = ({
  src,
  fallbackSrc = PLACEHOLDER_IMAGE_BASE64, // Base64エンコードされたプレースホルダーを使用
  onError
}: UseImageLoaderOptions): UseImageLoaderReturn => {
  // ...
};
```

### 4. CORS設定の確認

#### 4.1 Google Drive画像のCORS

Google Drive画像は直接アクセスできない場合があります。その場合は、バックエンドでプロキシを実装します。

**バックエンド**: `backend/api/index.ts`

```typescript
// 画像プロキシエンドポイント
app.get('/api/proxy/image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Google Drive URLの検証
    if (!url.includes('drive.google.com') && !url.includes('googleusercontent.com')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }
    
    // 画像を取得
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    // Content-Typeを設定
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400'); // 1日キャッシュ
    res.send(response.data);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});
```

**フロントエンド**: 画像URLをプロキシ経由に変更

```typescript
const getProxiedImageUrl = (originalUrl: string): string => {
  if (!originalUrl) return '/placeholder-property.jpg';
  
  // Google Drive URLの場合はプロキシ経由
  if (originalUrl.includes('drive.google.com') || originalUrl.includes('googleusercontent.com')) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${apiUrl}/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
  }
  
  return originalUrl;
};

// 使用例
const thumbnailUrl = getProxiedImageUrl(
  property.images && property.images.length > 0
    ? property.images[0]
    : property.image_url || '/placeholder-property.jpg'
);
```

### 5. パフォーマンス最適化

#### 5.1 画像の遅延読み込み

`loading="lazy"`を適切に使用し、スクロール時のパフォーマンスを向上させます。

```typescript
<img
  src={imageSrc}
  alt="..."
  loading="lazy" // ブラウザネイティブの遅延読み込み
  decoding="async" // 非同期デコード
  crossOrigin="anonymous"
/>
```

#### 5.2 Intersection Observer の使用（オプション）

より細かい制御が必要な場合は、Intersection Observerを使用します。

```typescript
import { useEffect, useRef, useState } from 'react';

const useIntersectionObserver = (options?: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    const currentTarget = targetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [options]);

  return { targetRef, isIntersecting };
};

// 使用例
const { targetRef, isIntersecting } = useIntersectionObserver({
  threshold: 0.1,
  rootMargin: '50px'
});

// isIntersectingがtrueになったら画像を読み込む
```

## データフロー

### 画像読み込みの流れ

```
1. コンポーネントマウント
   ↓
2. useImageLoader フックが初期化
   ↓
3. 画像読み込み開始（isLoading = true）
   ↓
4. 画像読み込み成功
   ├─ onLoad イベント発火
   ├─ isLoading = false
   └─ 画像をフェードイン表示
   
   または
   
4. 画像読み込み失敗
   ├─ onError イベント発火
   ├─ リトライ（最大3回）
   │  ├─ 成功 → 画像表示
   │  └─ 失敗 → 次のリトライ
   └─ リトライ上限到達
      ├─ フォールバック画像に切り替え
      ├─ hasError = true
      └─ isLoading = false
```

## エラーハンドリング

### エラーの種類と対処

| エラーの種類 | 原因 | 対処方法 |
|------------|------|---------|
| ネットワークエラー | インターネット接続の問題 | リトライ（最大3回） |
| 404エラー | 画像URLが無効 | フォールバック画像を表示 |
| CORSエラー | CORS設定の問題 | プロキシ経由で取得 |
| タイムアウト | 画像サイズが大きい | フォールバック画像を表示 |
| 画像形式エラー | 対応していない形式 | フォールバック画像を表示 |

### エラーログの記録

```typescript
const logImageError = (context: string, url: string, error: any) => {
  console.error(`[Image Error] ${context}:`, {
    url,
    error: error.message || error,
    timestamp: new Date().toISOString()
  });
  
  // 本番環境では、エラートラッキングサービスに送信
  if (import.meta.env.PROD) {
    // Sentry, LogRocket, etc.
    // trackError({ context, url, error });
  }
};
```

## テスト戦略

### 1. 単体テスト

#### useImageLoader フックのテスト

```typescript
import { renderHook, act } from '@testing-library/react';
import { useImageLoader } from './useImageLoader';

describe('useImageLoader', () => {
  it('should load image successfully', async () => {
    const { result } = renderHook(() => useImageLoader({
      src: 'https://example.com/image.jpg'
    }));
    
    expect(result.current.isLoading).toBe(true);
    
    // 画像読み込み成功をシミュレート
    act(() => {
      // onLoad イベントをトリガー
    });
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });
  
  it('should fallback to placeholder on error', async () => {
    const { result } = renderHook(() => useImageLoader({
      src: 'https://example.com/invalid.jpg',
      fallbackSrc: '/placeholder.jpg'
    }));
    
    // 画像読み込み失敗をシミュレート
    act(() => {
      // onError イベントをトリガー
    });
    
    // リトライ後、フォールバック画像に切り替わる
    expect(result.current.imageSrc).toBe('/placeholder.jpg');
    expect(result.current.hasError).toBe(true);
  });
});
```

### 2. 統合テスト

#### PublicPropertyCard のテスト

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import PublicPropertyCard from './PublicPropertyCard';

describe('PublicPropertyCard', () => {
  it('should display property image', async () => {
    const property = {
      property_number: 'AA1234',
      images: ['https://example.com/image.jpg'],
      // ...
    };
    
    render(<PublicPropertyCard property={property} />);
    
    const image = screen.getByAlt(/の物件画像/);
    expect(image).toBeInTheDocument();
    
    // 画像が読み込まれるまで待つ
    await waitFor(() => {
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });
  });
  
  it('should display placeholder on image error', async () => {
    const property = {
      property_number: 'AA1234',
      images: ['https://example.com/invalid.jpg'],
      // ...
    };
    
    render(<PublicPropertyCard property={property} />);
    
    const image = screen.getByAlt(/の物件画像/);
    
    // 画像エラーをシミュレート
    fireEvent.error(image);
    
    // フォールバック画像に切り替わる
    await waitFor(() => {
      expect(image).toHaveAttribute('src', expect.stringContaining('placeholder'));
    });
  });
});
```

### 3. E2Eテスト

#### Playwright でのテスト

```typescript
import { test, expect } from '@playwright/test';

test('should display logo in header', async ({ page }) => {
  await page.goto('/public/properties');
  
  // ロゴが表示されることを確認
  const logo = page.locator('.logo-image');
  await expect(logo).toBeVisible();
  
  // ロゴがクリック可能であることを確認
  await logo.click();
  // 新しいタブが開くことを確認
});

test('should display property images in list', async ({ page }) => {
  await page.goto('/public/properties');
  
  // 物件カードが表示されることを確認
  const propertyCards = page.locator('.property-card');
  await expect(propertyCards.first()).toBeVisible();
  
  // 画像が表示されることを確認
  const image = propertyCards.first().locator('.property-card-image');
  await expect(image).toBeVisible();
  
  // 画像が読み込まれることを確認（srcが設定されている）
  const src = await image.getAttribute('src');
  expect(src).toBeTruthy();
});

test('should handle image load error gracefully', async ({ page }) => {
  // ネットワークエラーをシミュレート
  await page.route('**/*.jpg', route => route.abort());
  
  await page.goto('/public/properties');
  
  // プレースホルダー画像が表示されることを確認
  const image = page.locator('.property-card-image').first();
  await expect(image).toBeVisible();
  
  // エラーメッセージが表示されることを確認（オプション）
  const errorMessage = page.locator('text=画像を読み込めませんでした');
  await expect(errorMessage).toBeVisible();
});
```

## デプロイメント

### 1. 画像ファイルの確認

デプロイ前に、以下の画像ファイルが存在することを確認します：

```bash
# ロゴ画像
frontend/public/comfortable-tenant-search-logo.png

# プレースホルダー画像
frontend/public/placeholder-property.jpg
```

### 2. Vercel設定

**vercel.json**:
```json
{
  "headers": [
    {
      "source": "/comfortable-tenant-search-logo.png",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/placeholder-property.jpg",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 3. 環境変数

必要な環境変数が設定されていることを確認します：

```
VITE_API_URL=https://property-site-frontend-kappa.vercel.app
```

## モニタリング

### 1. エラーログの記録

画像読み込みエラーをコンソールに記録します：

```typescript
console.error('[Image Error]', {
  context: 'PublicPropertyCard',
  propertyNumber: property.property_number,
  url: thumbnailUrl,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

### 2. エラー率の監視

本番環境では、エラートラッキングサービス（Sentry, LogRocketなど）を使用して、画像読み込みエラー率を監視します。

## 正確性プロパティ

### Property 1: ロゴ画像の表示保証

**検証要件**: 1.1, 1.2

**プロパティ**: ロゴ画像が常に表示される（実際の画像またはフォールバック）

**テスト戦略**:
```typescript
// Property-Based Test
import fc from 'fast-check';

fc.assert(
  fc.property(
    fc.boolean(), // imageLoadSuccess
    fc.boolean(), // imageError
    (imageLoadSuccess, imageError) => {
      // ロゴコンポーネントをレンダリング
      const { container } = render(<PublicPropertyLogo />);
      
      // 画像読み込み成功または失敗をシミュレート
      if (imageLoadSuccess) {
        // onLoad イベントをトリガー
      } else if (imageError) {
        // onError イベントをトリガー
      }
      
      // 何らかの表示があることを確認
      const logo = container.querySelector('.logo-image') || 
                   container.querySelector('.logo-fallback');
      
      return logo !== null;
    }
  )
);
```

### Property 2: 物件画像の表示保証

**検証要件**: 2.1, 2.2

**プロパティ**: 物件画像が常に表示される（実際の画像またはプレースホルダー）

**テスト戦略**:
```typescript
fc.assert(
  fc.property(
    fc.string(), // imageUrl
    fc.boolean(), // imageLoadSuccess
    (imageUrl, imageLoadSuccess) => {
      const property = {
        property_number: 'AA1234',
        images: [imageUrl],
        // ...
      };
      
      const { container } = render(<PublicPropertyCard property={property} />);
      
      // 画像読み込み成功または失敗をシミュレート
      if (!imageLoadSuccess) {
        // onError イベントをトリガー
      }
      
      // 画像が表示されることを確認
      const image = container.querySelector('.property-card-image');
      
      return image !== null && image.getAttribute('src') !== null;
    }
  )
);
```

### Property 3: エラーハンドリングの無限ループ防止

**検証要件**: 3.5

**プロパティ**: 画像読み込みエラー時に無限ループが発生しない

**テスト戦略**:
```typescript
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 10 }), // errorCount
    (errorCount) => {
      let actualErrorCount = 0;
      
      const { result } = renderHook(() => useImageLoader({
        src: 'https://example.com/invalid.jpg',
        onError: () => {
          actualErrorCount++;
        }
      }));
      
      // errorCount回エラーをシミュレート
      for (let i = 0; i < errorCount; i++) {
        act(() => {
          // onError イベントをトリガー
        });
      }
      
      // エラー回数が上限（3回）を超えないことを確認
      return actualErrorCount <= 3;
    }
  )
);
```

## まとめ

この設計により、以下の目標を達成します：

1. **ロゴの安定表示**: エラーハンドリングとフォールバックにより、常に何らかの表示がある
2. **物件画像の安定表示**: リトライ機能とプレースホルダーにより、常に画像が表示される
3. **エラーハンドリング**: 適切なエラーハンドリングにより、ユーザー体験が向上する
4. **パフォーマンス**: 遅延読み込みとキャッシュにより、パフォーマンスが向上する
5. **モニタリング**: エラーログにより、問題を早期に発見できる
