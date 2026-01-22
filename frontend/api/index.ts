// 段階的テスト: Supabaseクライアントを追加
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

// 環境変数のデバッグログ
console.log('🔍 Environment variables check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? `Set (${process.env.SUPABASE_SERVICE_KEY?.length} chars)` : 'Missing',
  NODE_ENV: process.env.NODE_ENV || 'Not set',
});

// Supabase クライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    message: 'Supabase client initialized',
    timestamp: new Date().toISOString() 
  });
});

// Test Supabase connection
app.get('/api/test/supabase', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('property_listings')
      .select('id, property_number')
      .limit(1);
    
    if (error) {
      res.status(500).json({ 
        status: 'error', 
        message: error.message 
      });
      return;
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Supabase connection successful',
      data 
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Vercel handler
export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};
