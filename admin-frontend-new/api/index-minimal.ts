// 最小限のバージョン - テスト用
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Minimal version is working',
    timestamp: new Date().toISOString() 
  });
});

// Test endpoint
app.get('/api/test', (_req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString() 
  });
});

// Vercel handler
export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};
