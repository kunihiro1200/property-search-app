import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Event as CalendarIcon, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { googleCalendarApi } from '../services/api';

export const GoogleCalendarConnect: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 接続状態を確認
  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const status = await googleCalendarApi.getStatus();
      setIsConnected(status.connected);
    } catch (err: any) {
      console.error('Failed to check connection status:', err);
      setError('接続状態の確認に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 初回ロード時に接続状態を確認
  useEffect(() => {
    // URLパラメータから接続結果を確認
    const params = new URLSearchParams(window.location.search);
    const calendarConnected = params.get('calendar_connected');
    const calendarError = params.get('calendar_error');

    if (calendarConnected === 'true') {
      setSuccess('Googleカレンダーに接続しました！');
      setIsConnected(true);
      setLoading(false);
      // URLパラメータをクリア
      window.history.replaceState({}, '', window.location.pathname);
    } else if (calendarError) {
      const decodedError = decodeURIComponent(calendarError);
      
      // エラーメッセージを分かりやすく変換
      let errorMessage = '接続に失敗しました';
      if (decodedError.includes('No refresh token')) {
        errorMessage = 'Googleアカウントの設定で一度アクセス権を取り消してから、再度接続してください。\n\nGoogle アカウント → セキュリティ → サードパーティアクセス から「不動産査定システム」を削除してください。';
      } else if (decodedError !== 'exchange_failed') {
        errorMessage = `接続に失敗しました: ${decodedError}`;
      }
      
      setError(errorMessage);
      setLoading(false);
      // URLパラメータをクリア
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // パラメータがない場合のみ接続状態を確認
      checkConnectionStatus();
    }
  }, []);

  // Google Calendar接続を開始
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const { authUrl } = await googleCalendarApi.getAuthUrl();
      
      // OAuth認証画面にリダイレクト
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Failed to get auth URL:', err);
      setError('認証URLの取得に失敗しました');
      setLoading(false);
    }
  };

  // Google Calendar連携を解除
  const handleDisconnect = async () => {
    if (!confirm('Googleカレンダーとの連携を解除しますか？')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await googleCalendarApi.revoke();
      setIsConnected(false);
      setSuccess('Googleカレンダーとの連携を解除しました');
    } catch (err: any) {
      console.error('Failed to disconnect:', err);
      setError('連携解除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Googleカレンダー連携</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Box display="flex" alignItems="center" mb={2}>
              {isConnected ? (
                <>
                  <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="body2" color="success.main">
                    接続済み
                  </Typography>
                </>
              ) : (
                <>
                  <ErrorIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    未接続
                  </Typography>
                </>
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" mb={2}>
              {isConnected
                ? '訪問査定予約が自動的にGoogleカレンダーに同期されます。'
                : 'Googleカレンダーと連携すると、訪問査定予約が自動的にカレンダーに追加されます。'}
            </Typography>

            {isConnected ? (
              <Button
                variant="outlined"
                color="error"
                onClick={handleDisconnect}
                disabled={loading}
              >
                連携を解除
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleConnect}
                disabled={loading}
                startIcon={<CalendarIcon />}
              >
                Googleカレンダーと連携
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
