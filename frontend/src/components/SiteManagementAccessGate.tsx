import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useAuthStore } from '../store/authStore';

// 社員マスタで確認済みの3名。表示名・URLパラメータは認可に使用しない。
export const SITE_MANAGER_EMPLOYEE_IDS = new Set([
  'daf26dc4-3bbe-475e-9faa-a50845989e49', // 久米
  '420cef67-503d-4602-b7b2-9db923ac2b68', // 木村
  'a382d47c-50a7-4a9c-8802-9bf93ed53bd5', // 和田
]);

export const SITE_MANAGER_EMAILS = new Set([
  'mariko.kume@ifoo-oita.com',
  'jyuna.wada@ifoo-oita.com',
  'yurine.kimura@ifoo-oita.com',
]);

export const canManageSite = (employee: { id?: string; email?: string; isActive?: boolean; is_active?: boolean } | null | undefined) =>
  !!employee && employee.isActive !== false && employee.is_active !== false &&
  (SITE_MANAGER_EMPLOYEE_IDS.has(employee.id || '') || SITE_MANAGER_EMAILS.has((employee.email || '').trim().toLowerCase()));

export default function SiteManagementAccessGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { search } = location;
  const employee = useAuthStore(state => state.employee);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const loginWithGoogle = useAuthStore(state => state.loginWithGoogle);
  const logout = useAuthStore(state => state.logout);
  const isAdminRequest = new URLSearchParams(search).get('canHide') === 'true';

  // 通常の公開ページは誰でも閲覧可能。管理モードのみ権限を検証する。
  if (!isAdminRequest) return <>{children}</>;
  if (isLoading) return <Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (isAuthenticated && canManageSite(employee)) return <>{children}</>;

  const handleLogin = async () => {
    sessionStorage.setItem('siteManagementReturnTo', location.pathname + location.search);
    // 別ドメインに残っている旧社員のセッションを破棄してから選び直す。
    if (employee || isAuthenticated) await logout();
    try {
      await loginWithGoogle();
    } catch (error) {
      sessionStorage.removeItem('siteManagementReturnTo');
      console.error('Site management login failed', error);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: 3 }}>
      <Alert severity={isAuthenticated && employee ? 'warning' : 'info'}>
        {isAuthenticated && employee
          ? '現在このサイトで認証されている社員には管理権限がありません。久米・木村・和田のアカウントでログインし直してください。'
          : '管理ページを開くには、久米・木村・和田のGoogleアカウントでログインしてください。'}
      </Alert>
      {employee && (employee.name || employee.email) && <Typography variant="body2" sx={{ mt: 2 }}>現在のサイト内ログイン：{employee.name || '名前未取得'}（{employee.email || 'メール未取得'}）</Typography>}
      <Button variant="contained" sx={{ mt: 2, mr: 2 }} onClick={handleLogin}>
        {isAuthenticated && employee ? '別のGoogleアカウントでログイン' : 'Googleでログイン'}
      </Button>
      <Button sx={{ mt: 2 }} href="/public/properties">一般向け物件一覧へ戻る</Button>
    </Box>
  );
}
