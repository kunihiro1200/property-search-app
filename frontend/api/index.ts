// 環境変数チェック版
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
    message: 'API is working',
    timestamp: new Date().toISOString() 
  });
});

// Environment variables check
app.get('/api/check-env', (_req, res) => {
  const envCheck = {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? `Set (${process.env.SUPABASE_SERVICE_KEY.length} chars)` : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? `Set (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : 'Missing',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? `Set (${process.env.SUPABASE_ANON_KEY.length} chars)` : 'Missing',
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? `Set (${process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length} chars)` : 'Missing',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
  };

  res.status(200).json({
    message: 'Environment Variables Check',
    env: envCheck,
    timestamp: new Date().toISOString()
  });
});

// Vercel handler
export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};
