import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Raw ENV values:', {
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY_length: process.env.SUPABASE_ANON_KEY?.length,
  SUPABASE_SERVICE_KEY_length: supabaseServiceKey?.length,
});

// JWTトークンをデコードしてプロジェクトIDを確認
const decodeJWT = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.iss || payload.ref;
    }
  } catch (e) {
    return 'decode-failed';
  }
  return 'invalid-format';
};

console.log('🔍 Supabase Config Debug:', {
  url: supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  serviceKeyProject: supabaseServiceKey ? decodeJWT(supabaseServiceKey) : 'none',
  hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
  anonKeyProject: process.env.SUPABASE_ANON_KEY ? decodeJWT(process.env.SUPABASE_ANON_KEY) : 'none',
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Environment variables:', {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_KEY: supabaseServiceKey ? '***' : undefined,
  });
  throw new Error('Missing Supabase environment variables');
}

// サービスロールキーを使用（バックエンド専用 - 管理操作用）
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// クライアント用（匿名キー - トークン検証用）
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('✅ Supabase initialized');

export default supabase;
