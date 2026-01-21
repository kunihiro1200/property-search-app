// Vercel用のエントリーポイント（公開物件サイト + 全機能）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import publicPropertiesRoutes from '../src/routes/publicProperties';

const app = express();

// Supabase クライアントの初期化（ヘルスチェック用）
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const { createClient } = require('@supabase/supabase-js');
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

// 公開物件ルートを登録
app.use('/api/public', publicPropertiesRoutes);

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
