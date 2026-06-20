import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// サービスロールキーを使用（バックエンド専用 - 管理操作用）
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// クライアント用（匿名キー - トークン検証用、オプション）
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabaseClient = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase; // anonKeyがない場合はserviceKeyを使用

console.log('✅ Supabase initialized');

export default supabase;
