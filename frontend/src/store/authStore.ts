import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee } from '../types';
import axios from 'axios';

// 公開物件サイトは静的配信のため、認証APIは追客システムのバックエンドに接続する。
// VITE_API_URL は公開物件取得に使われるため変更しない。
const authApi = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || 'https://sateituikyaku-admin-backend.vercel.app',
  headers: { 'Content-Type': 'application/json' },
});
import { supabase } from '../config/supabase';

interface AuthState {
  employee: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  handleAuthCallback: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
  employee: null,
  isAuthenticated: false,
  isLoading: false, // 初期状態はfalseに変更

  loginWithGoogle: async () => {
    try {
      console.log('🔵 Starting Supabase Google login...');
      console.log('🔵 Redirect URL:', `${window.location.origin}/auth/callback`);
      
      // Supabase Authを使用してGoogleログイン
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account', // 'consent'から'select_account'に変更
          },
        },
      });

      if (error) {
        console.error('❌ Supabase login error:', error);
        throw new Error(`ログインに失敗しました: ${error.message}`);
      }

      console.log('✅ Supabase login initiated');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  },

  handleAuthCallback: async () => {
    set({ isLoading: true });
    
    try {
      console.log('🔵 handleAuthCallback called');
      console.log('🔵 Current URL:', window.location.href);
      
      // URLからハッシュフラグメントを確認（Supabase Authはハッシュフラグメントでトークンを返す）
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      console.log('🔵 Hash params:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        error: errorParam,
        errorDescription,
      });

      // エラーチェック
      if (errorParam) {
        throw new Error(errorDescription || errorParam);
      }

      // Supabase Authからセッションを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('🔵 Supabase session:', { 
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token,
        error: sessionError?.message
      });

      if (sessionError) {
        throw new Error(`セッション取得エラー: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error('有効なセッションが見つかりません。もう一度ログインしてください。');
      }

      // バックエンドにトークンを送信して社員情報を取得
      console.log('🔵 Calling backend /auth/callback...');
      const response = await authApi.post('/api/auth/callback', {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      console.log('✅ Got employee info:', response.data.employee);

      // トークンを保存
      localStorage.setItem('session_token', session.access_token);
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token);
      }
      
      set({
        employee: response.data?.employee ?? response.data,
        isAuthenticated: true,
        isLoading: false,
      });
      
      console.log('✅ Auth callback completed successfully');
    } catch (error) {
      console.error('❌ Auth callback error:', error);
      localStorage.removeItem('session_token');
      localStorage.removeItem('refresh_token');
      set({ employee: null, isAuthenticated: false, isLoading: false });
      
      // エラーメッセージを改善
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('認証処理中にエラーが発生しました。もう一度お試しください。');
      }
    }
  },

  logout: async () => {
    try {
      await authApi.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('session_token') || ''}` },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // API側のログアウトに加え、サイトのSupabaseブラウザセッションも消去する。
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Supabase logout error:', error);
      }
      localStorage.removeItem('session_token');
      localStorage.removeItem('refresh_token');
      set({ employee: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    try {
      console.log('🔍 Checking auth...');
      set({ isLoading: true });
      
      // Supabase Authからセッションを確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('🔍 Session check:', {
        hasSession: !!session,
        error: sessionError?.message
      });

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        set({ isLoading: false, isAuthenticated: false, employee: null });
        return;
      }

      if (!session) {
        console.log('ℹ️ No active session');
        set({ isLoading: false, isAuthenticated: false, employee: null });
        return;
      }

      // トークンを保存
      localStorage.setItem('session_token', session.access_token);
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token);
      }

      // 社員情報を取得
      try {
        const response = await authApi.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        console.log('✅ Auth check successful');
        const authenticatedEmployee = response.data?.employee ?? response.data;
        if (!authenticatedEmployee?.id && !authenticatedEmployee?.email) {
          throw new Error('社員情報の形式が不正です');
        }
        set({ employee: authenticatedEmployee, isAuthenticated: true, isLoading: false });
      } catch (apiError: any) {
        console.error('❌ Failed to get employee info:', apiError);
        
        // 401エラーの場合はセッションをクリア
        if (apiError.response?.status === 401) {
          console.log('ℹ️ Session expired, clearing tokens');
          await supabase.auth.signOut();
        }
        
        localStorage.removeItem('session_token');
        localStorage.removeItem('refresh_token');
        set({ employee: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('❌ Check auth error:', error);
      localStorage.removeItem('session_token');
      localStorage.removeItem('refresh_token');
      set({ employee: null, isAuthenticated: false, isLoading: false });
    }
  },
}),
    {
      name: 'auth-storage', // localStorageのキー名
      partialize: (state) => ({
        employee: state.employee,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
