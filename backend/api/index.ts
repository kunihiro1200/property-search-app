// 公開物件サイト専用のエントリーポイント
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import publicPropertiesRoutes from '../src/routes/publicProperties';
import publicInquiriesRoutes from '../src/routes/publicInquiries';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // 公開サイトなので全てのオリジンを許可
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 公開物件サイト用のルートのみ
app.use('/api/public', publicPropertiesRoutes);
app.use('/api/public/inquiries', publicInquiriesRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      retryable: false,
    },
  });
});

// Vercel用のハンドラー（重要：これがないとVercelで動作しない）
// Vercelのサーバーレス関数として動作させるため、Expressアプリをラップ
export default async (req: VercelRequest, res: VercelResponse) => {
  // Expressアプリにリクエストを渡す
  return app(req as any, res as any);
};
