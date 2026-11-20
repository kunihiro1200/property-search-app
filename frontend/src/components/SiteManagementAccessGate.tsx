import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Box, Button } from '@mui/material';
import { useAuthStore } from '../store/authStore';

// 社員マスタで確認済みの3名。表示名・URLパラメータは認可に使用しない。
export const SITE_MANAGER_EMPLOYEE_IDS = new Set([
  'daf26dc4-3bbe-475e-9faa-a50845989e49', // 久米
  '420cef67-503d-4602-b7b2-9db923ac2b68', // 木村
  'a382d47c-50a7-4a9c-8802-9bf93ed53bd5', // 和田
]);

export const canManageSite = (employee: { id: string; isActive?: boolean } | null | undefined) =>
  !!employee && employee.isActive !== false && SITE_MANAGER_EMPLOYEE_IDS.has(employee.id);

export default function SiteManagementAccessGate({ children }: { children: ReactNode }) {
  const { search } = useLocation();
  const employee = useAuthStore(state => state.employee);
  const isAdminRequest = new URLSearchParams(search).get('canHide') === 'true';

  // 通常の公開ページは誰でも閲覧可能。管理モードのみ権限を検証する。
  if (!isAdminRequest || canManageSite(employee)) return <>{children}</>;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: 3 }}>
      <Alert severity="error">この管理ページは久米・木村・和田の担当者のみ利用できます。</Alert>
      <Button sx={{ mt: 2 }} href="/public/properties">一般向け物件一覧へ戻る</Button>
    </Box>
  );
}
