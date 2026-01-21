# Vercel本番環境トラブルシューティングガイド

## 問題の概要

本番環境（Vercel）でログインできない、または500エラーが発生する問題の解決方法をまとめたガイドです。

---

## 問題の根本原因

### 1. Vercelのエントリーポイントの問題

**問題**: `backend/api/index.ts`が複雑すぎて、Vercelのサーバーレス環境で起動に失敗する

**原因**:
- 多数のサービスクラスのインポート
- 初期化時に外部サービス（Google Sheets、Google Drive）への認証を試みる
- 認証ルート（`auth.supabase.ts`）のインポートがVercel環境で失敗

**症状**:
- `FUNCTION_INVOCATION_FAILED`エラー
- 500 Internal Server Error
- CORSエラー（実際はバックエンドが起動していないため）

---

## 解決方法

### ✅ 解決策: 最小構成のエントリーポイント

`backend/api/index.ts`を**最小構成**に変更する：

```typescript
// Vercel用のエントリーポイント（公開物件サイト専用・最小構成）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';

const app = express();

// Supabase クライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://property-site-frontend-kappa.vercel.app',
    'https://baikyaku-property-site3.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OPTIONSリクエスト（プリフライト）を処理
app.options('*', (_req, res) => {
  res.status(200).end();
});

// 公開物件一覧取得（最小実装）
app.get('/api/public/properties', async (req, res) => {
  try {
    console.log('🔍 Fetching properties from database...');
    
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Supabaseから直接取得（最小実装）
    const { data: properties, error, count } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact' })
      .eq('atbb_status', '公開中')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log(`✅ Found ${properties?.length || 0} properties`);

    res.json({ 
      success: true, 
      properties: properties || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching properties:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch properties'
    });
  }
});

// 公開物件詳細取得（最小実装）
app.get('/api/public/properties/:propertyIdentifier', async (req, res) => {
  try {
    const { propertyIdentifier } = req.params;
    console.log(`🔍 Fetching property details for: ${propertyIdentifier}`);
    
    const isUuid = propertyIdentifier.length === 36 && propertyIdentifier.includes('-');
    
    let query = supabase
      .from('property_listings')
      .select('*');
    
    if (isUuid) {
      query = query.eq('id', propertyIdentifier);
    } else {
      query = query.eq('property_number', propertyIdentifier);
    }
    
    const { data: property, error } = await query.single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    if (!property) {
      return res.status(404).json({ 
        success: false, 
        error: 'Property not found'
      });
    }

    console.log(`✅ Found property: ${propertyIdentifier}`);

    res.json({ 
      success: true, 
      property
    });
  } catch (error: any) {
    console.error('❌ Error fetching property details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      retryable: false,
    },
  });
});

// Vercel用のハンドラー
export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};
```

---

## 重要なポイント

### 1. ❌ 避けるべきこと

- **複雑なサービスクラスのインポート**
  ```typescript
  // ❌ これらはVercel環境で問題を起こす
  import { PropertyListingService } from '../src/services/PropertyListingService';
  import { PropertyImageService } from '../src/services/PropertyImageService';
  import { GoogleDriveService } from '../src/services/GoogleDriveService';
  import publicPropertiesRoutes from '../src/routes/publicProperties';
  import authRoutes from '../src/routes/auth.supabase';
  ```

- **初期化時の外部サービス認証**
  ```typescript
  // ❌ これはVercel環境で失敗する
  inquirySyncService.authenticate().catch(error => {
    console.error('[publicProperties] InquirySyncService認証エラー:', error);
  });
  ```

### 2. ✅ 推奨すること

- **Supabaseクライアントのみを使用**
  ```typescript
  // ✅ シンプルで確実
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  ```

- **必要最小限のエンドポイントのみ実装**
  - `/health` - ヘルスチェック
  - `/api/public/properties` - 物件一覧
  - `/api/public/properties/:id` - 物件詳細

- **動的インポートを使用（必要な場合のみ）**
  ```typescript
  // ✅ 必要な時だけインポート
  const { PropertyService } = await import('../src/services/PropertyService');
  ```

---

## トラブルシューティング手順

### ステップ1: エラーの確認

1. **ブラウザのコンソールを開く**（F12キー）
2. **Networkタブを確認**
3. **エラーメッセージを確認**:
   - `500 Internal Server Error` → バックエンドの起動失敗
   - `CORS error` → バックエンドが起動していない、またはCORS設定の問題

### ステップ2: Vercelのログを確認

1. Vercelダッシュボードを開く: https://vercel.com/kunihiro1200s-projects/baikyaku-property-site3
2. **Deployments**タブを開く
3. 最新のデプロイメントをクリック
4. **Function Logs**を確認

### ステップ3: 最小構成に戻す

1. `backend/api/index.ts`を最小構成に変更（上記のコード参照）
2. コミット＆プッシュ
3. Vercelが自動的に再デプロイ（約1-2分）
4. 再度テスト

### ステップ4: CORS設定を確認

`backend/vercel.json`にCORSヘッダーが設定されているか確認：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.ts",
      "headers": {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Origin": "https://property-site-frontend-kappa.vercel.app",
        "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
        "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
      }
    }
  ]
}
```

### ステップ5: フロントエンドの環境変数を確認

Vercelのフロントエンドプロジェクト（property-site-frontend）の環境変数を確認：

1. https://vercel.com/kunihiro1200s-projects/property-site-frontend
2. **Settings** → **Environment Variables**
3. `VITE_API_URL`が`https://baikyaku-property-site3.vercel.app`に設定されているか確認

---

## よくある質問

### Q1: ローカル環境は動くのに、本番環境だけエラーになる

**A**: Vercelのサーバーレス環境は、ローカル環境と異なる制約があります：
- タイムアウト（10秒）
- メモリ制限
- ファイルシステムへのアクセス制限
- 環境変数の違い

**解決策**: `backend/api/index.ts`を最小構成に変更する

### Q2: 認証機能（ログイン）が必要な場合は？

**A**: 現在の最小構成では、認証機能は含まれていません。認証が必要な場合は、以下の方法を検討してください：

1. **Supabase Authを直接使用**（フロントエンドから）
2. **認証ルートを別のVercelプロジェクトに分離**
3. **認証ルートを動的インポート**（必要な時だけロード）

### Q3: 画像が表示されない

**A**: 現在の最小構成では、画像プロキシエンドポイントは含まれていません。画像が必要な場合は、以下の方法を検討してください：

1. **Google Driveの公開リンクを使用**
2. **画像プロキシエンドポイントを追加**（動的インポートを使用）
3. **Vercel Blobストレージを使用**

---

## 成功事例

### 2025年1月21日の問題解決

**問題**: 
- 本番環境でログインできない
- 500 Internal Server Error
- CORSエラー

**原因**:
- `backend/api/index.ts`が複雑すぎた
- 多数のサービスクラスのインポート
- 初期化時の外部サービス認証

**解決策**:
1. `backend/api/index.ts`を最小構成に変更
2. Supabaseクライアントのみを使用
3. 必要最小限のエンドポイントのみ実装

**結果**:
- ✅ 本番環境で正常に動作
- ✅ 公開物件サイトが表示される
- ✅ 物件一覧・詳細が取得できる

---

## まとめ

### 重要な教訓

1. **Vercelのサーバーレス環境は、ローカル環境と異なる**
2. **複雑なサービスクラスのインポートは避ける**
3. **初期化時の外部サービス認証は避ける**
4. **最小構成から始めて、必要に応じて機能を追加する**
5. **動的インポートを活用する**

### 今後の対応

- 認証機能が必要な場合は、別のアプローチを検討する
- 画像プロキシが必要な場合は、動的インポートを使用する
- 複雑な機能は、別のVercelプロジェクトに分離することを検討する

---

**このガイドを参照することで、今後同様の問題が発生した場合でも、迅速に解決できます。**
