# Design Document: 公開物件サイト本番環境移行

## Overview

このドキュメントは、既に開発が完了している公開物件サイトをVercelにデプロイし、本番環境で運用するための設計を定義します。フロントエンド（React/Vite）とバックエンド（Express.js）の統合デプロイ、環境変数の管理、SEO最適化、パフォーマンス最適化を含みます。

## Architecture

### Current Architecture

```
開発環境:
┌─────────────────┐
│  Frontend       │
│  (Vite Dev)     │
│  localhost:5173 │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Backend        │
│  (Express)      │
│  localhost:3001 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │
│  (PostgreSQL)   │
└─────────────────┘
```

### Target Production Architecture

```
本番環境 (Vercel):
┌──────────────────────────────────────┐
│           Vercel Platform            │
│                                      │
│  ┌────────────────┐                 │
│  │  Vercel CDN    │ ← Static Assets │
│  └────────┬───────┘                 │
│           │                          │
│           ▼                          │
│  ┌────────────────┐                 │
│  │  Frontend      │                 │
│  │  (Static SPA)  │                 │
│  └────────┬───────┘                 │
│           │                          │
│           ▼                          │
│  ┌────────────────┐                 │
│  │  Backend       │                 │
│  │  (Serverless)  │                 │
│  └────────┬───────┘                 │
└───────────┼──────────────────────────┘
            │
            ▼
   ┌─────────────────┐
   │  Supabase       │
   │  (PostgreSQL)   │
   └─────────────────┘
```

## Deployment Strategy

### Option 1: Monorepo Deployment (推奨)

フロントエンドとバックエンドを1つのVercelプロジェクトでデプロイ

**メリット:**
- 1つのデプロイで完結
- 環境変数の一元管理
- シンプルな設定

**デメリット:**
- ビルド時間が長くなる可能性

### Option 2: Separate Deployments

フロントエンドとバックエンドを別々のVercelプロジェクトでデプロイ

**メリット:**
- 独立したデプロイ
- スケーリングの柔軟性

**デメリット:**
- CORS設定が必要
- 環境変数の管理が複雑

**選択: Option 1 (Monorepo Deployment)** を採用

## Vercel Configuration

### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "backend/src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/src/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Build Commands

**Frontend:**
```bash
cd frontend && npm install && npm run build
```

**Backend:**
```bash
cd backend && npm install && npm run build
```

## Environment Variables

### Frontend Environment Variables

```env
# API URL
VITE_API_URL=https://your-domain.vercel.app/api

# Public Keys (safe to expose)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Backend Environment Variables

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
DATABASE_URL=your_database_url

# Google Sheets API
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
PROPERTY_LISTING_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
GOOGLE_SHEETS_BUYER_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
GYOMU_LIST_SPREADSHEET_ID=1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json

# Google Drive API
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=3

# Node Environment
NODE_ENV=production
PORT=3001
```

### Environment Variable Management

Vercelの環境変数は以下の方法で設定:

1. **Vercel Dashboard**: プロジェクト設定 → Environment Variables
2. **Vercel CLI**: `vercel env add`
3. **vercel.json**: 公開しても安全な変数のみ

## SEO Implementation

### Meta Tags Component

```typescript
// frontend/src/components/SEOHead.tsx
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  canonicalUrl: string;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  ogImage,
  canonicalUrl,
}) => {
  const siteName = '不動産物件サイト';
  const fullTitle = `${title} | ${siteName}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
};
```

### Structured Data (JSON-LD)

```typescript
// frontend/src/utils/structuredData.ts
export const generatePropertyStructuredData = (property: PublicProperty) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.address,
    description: property.description || `${property.propertyType}の物件`,
    price: property.price * 10000, // 万円 → 円
    priceCurrency: 'JPY',
    address: {
      '@type': 'PostalAddress',
      addressLocality: extractCity(property.address),
      addressRegion: '大分県',
      streetAddress: property.address,
    },
    image: property.images?.map(img => img.url) || [],
  };
};

export const StructuredData: React.FC<{ data: any }> = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
};
```

### Sitemap Generation

バックエンドで既に実装済み: `GET /api/public/sitemap`

フロントエンドでアクセス可能にするため、Vercelのルーティング設定:

```json
{
  "routes": [
    {
      "src": "/sitemap.xml",
      "dest": "/api/public/sitemap"
    }
  ]
}
```

## Performance Optimization

### Image Optimization

```typescript
// frontend/src/components/OptimizedImage.tsx
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {hasError && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500">画像を読み込めません</span>
        </div>
      )}
    </div>
  );
};
```

### Code Splitting

Viteは自動的にコード分割を行いますが、さらに最適化:

```typescript
// frontend/src/App.tsx
import { lazy, Suspense } from 'react';

// Lazy load pages
const PublicPropertyListingPage = lazy(
  () => import('./pages/PublicPropertyListingPage')
);
const PublicPropertyDetailPage = lazy(
  () => import('./pages/PublicPropertyDetailPage')
);

export const App = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/public" element={<PublicPropertyListingPage />} />
        <Route path="/public/:id" element={<PublicPropertyDetailPage />} />
      </Routes>
    </Suspense>
  );
};
```

### Caching Strategy

```typescript
// frontend/src/api/publicApi.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      cacheTime: 10 * 60 * 1000, // 10分
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### Compression

Vercelは自動的にgzip/brotli圧縮を適用しますが、バックエンドでも設定:

```typescript
// backend/src/index.ts
import compression from 'compression';

app.use(compression());
```

## Security Configuration

### CORS Settings

```typescript
// backend/src/index.ts
import cors from 'cors';

const allowedOrigins = [
  'https://your-domain.vercel.app',
  'https://www.your-domain.com',
];

if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:5173');
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
```

### Security Headers

```typescript
// backend/src/index.ts
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.example.com'],
      },
    },
  })
);
```

### Rate Limiting

既に実装済み（`backend/src/middleware/rateLimiter.ts`）

## Monitoring and Error Tracking

### Error Logging

```typescript
// backend/src/middleware/errorHandler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
```

### Client-Side Error Tracking

```typescript
// frontend/src/utils/errorTracking.ts
export const trackError = (error: Error, context?: any) => {
  console.error('Client Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });

  // 本番環境では外部サービス（Sentry等）に送信
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service
  }
};
```

## Deployment Process

### GitHub Actions Workflow (Optional)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend && npm install
          cd ../backend && npm install
      
      - name: Run tests
        run: |
          cd backend && npm test
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Manual Deployment

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# デプロイ
vercel --prod
```

## Health Checks

### Backend Health Check Endpoint

```typescript
// backend/src/routes/health.ts
import { Router } from 'express';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // データベース接続チェック
    await supabase.from('properties').select('count').limit(1);

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
```

## Rollback Strategy

1. **Vercel Dashboard**: Deployments → 以前のデプロイを選択 → Promote to Production
2. **Vercel CLI**: `vercel rollback`
3. **Git**: 以前のコミットに戻してデプロイ

## Domain Configuration

### Custom Domain Setup

1. Vercel Dashboard → Settings → Domains
2. ドメインを追加（例: `www.your-domain.com`）
3. DNS設定を更新:
   - A Record: `76.76.21.21`
   - CNAME Record: `cname.vercel-dns.com`
4. SSL証明書は自動的にプロビジョニング

### DNS Configuration Example

```
Type    Name    Value                   TTL
A       @       76.76.21.21            Auto
CNAME   www     cname.vercel-dns.com   Auto
```

## Testing Strategy

### Pre-Deployment Checklist

- [ ] すべてのテストが通過
- [ ] ビルドエラーがない
- [ ] 環境変数が正しく設定されている
- [ ] データベース接続が正常
- [ ] APIエンドポイントが正常に動作
- [ ] フロントエンドが正しくレンダリング
- [ ] 画像が正しく表示される
- [ ] フォーム送信が正常に動作

### Post-Deployment Verification

- [ ] サイトにアクセスできる
- [ ] 物件一覧が表示される
- [ ] 物件詳細が表示される
- [ ] 問い合わせフォームが動作する
- [ ] サイトマップが生成される
- [ ] メタタグが正しく設定されている
- [ ] Lighthouse スコアが90以上

## Correctness Properties

### Property 1: Deployment Success
*For any* valid codebase, when deploying to Vercel, the deployment should complete successfully without errors.
**Validates: Requirements 1.1, 8.1**

### Property 2: Environment Variable Security
*For any* sensitive environment variable, it should NOT be exposed in client-side code or public API responses.
**Validates: Requirements 2.6, 6.5**

### Property 3: SEO Meta Tags
*For any* page, it should have unique meta title and description tags.
**Validates: Requirements 4.1, 4.2**

### Property 4: Performance Metrics
*For any* page load, the initial load time should be less than 3 seconds on a standard connection.
**Validates: Requirements 5.1**

### Property 5: Security Headers
*For any* HTTP response, it should include appropriate security headers (CSP, X-Frame-Options, etc.).
**Validates: Requirements 6.6**

### Property 6: Error Logging
*For any* server error, it should be logged with timestamp, error message, and stack trace.
**Validates: Requirements 7.1, 7.6**

### Property 7: Health Check
*For any* health check request, the system should return current status and uptime.
**Validates: Requirements 8.3**

### Property 8: HTTPS Enforcement
*For any* HTTP request, it should be redirected to HTTPS.
**Validates: Requirements 6.1, 9.3**

## Monitoring Metrics

### Key Performance Indicators (KPIs)

- **Uptime**: 99.9%以上
- **Response Time**: 平均200ms以下
- **Error Rate**: 0.1%以下
- **Lighthouse Score**: 90以上
- **Page Load Time**: 3秒以内

### Alerts

- サーバーエラー率が1%を超えた場合
- レスポンスタイムが1秒を超えた場合
- デプロイが失敗した場合
- データベース接続が失敗した場合

## Future Enhancements

1. **CDN最適化**: Cloudflare等の追加CDN
2. **画像最適化サービス**: Cloudinary等の統合
3. **A/Bテスト**: 異なるUIバージョンのテスト
4. **Progressive Web App**: オフライン対応
5. **国際化**: 多言語対応
