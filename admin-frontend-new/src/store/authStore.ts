import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee } from '../types';
import api from '../services/api';
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
      const errorParam = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      console.log('🔵 Hash params:', {
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
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        error: sessionError?.message
      });

      if (sessionError) {
        throw new Error(`セッション取得エラー: ${sessionError.message}`);
      }

      if (!session || !session.user) {
        throw new Error('有効なセッションが見つかりません。もう一度ログインしてください。');
      }

      // トークンを保存
      localStorage.setItem('session_token', session.access_token);
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token);
      }

      // 社員情報を作成（Supabaseのユーザー情報から）
      const employee = {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Unknown',
        email: session.user.email || '',
        avatar_url: session.user.user_metadata?.avatar_url || null,
      };

      console.log('✅ Employee info created from Supabase user:', employee);
      
      set({
        employee,
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
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
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
        hasUser: !!session?.user,
        error: sessionError?.message
      });

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        set({ isLoading: false, isAuthenticated: false, employee: null });
        return;
      }

      if (!session || !session.user) {
        console.log('ℹ️ No active session');
        set({ isLoading: false, isAuthenticated: false, employee: null });
        return;
      }

      // トークンを保存
      localStorage.setItem('session_token', session.access_token);
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token);
      }

      // 社員情報を作成（Supabaseのユーザー情報から）
      const employee = {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Unknown',
        email: session.user.email || '',
        avatar_url: session.user.user_metadata?.avatar_url || null,
      };

      console.log('✅ Auth check successful, employee:', employee);
      set({ employee, isAuthenticated: true, isLoading: false });
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
