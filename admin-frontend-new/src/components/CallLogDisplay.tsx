import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Phone as PhoneIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import api from '../services/api';
import { Activity } from '../types';
import { getDisplayName } from '../utils/employeeUtils';

interface CallLogDisplayProps {
  sellerId: string;
}

interface CallLog {
  id: string;
  calledAt: string;
  employeeName: string;
  employeeId: string;
}

const CallLogDisplay = ({ sellerId }: CallLogDisplayProps) => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCallLogs();
  }, [sellerId]);

  const loadCallLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // 既存のactivities APIを使用
      const response = await api.get(`/api/sellers/${sellerId}/activities`);
      const activities: Activity[] = response.data;

      // phone_callタイプのみをフィルタリング
      const phoneCalls = activities.filter((activity) => activity.type === 'phone_call');

      // CallLogビューモデルに変換
      const logs: CallLog[] = phoneCalls.map((activity) => ({
        id: activity.id,
        calledAt: activity.createdAt,
        employeeName: getDisplayName(activity.employee),
        employeeId: activity.employeeId,
      }));

      // 日時降順でソート（最新が上）
      logs.sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime());

      setCallLogs(logs);
    } catch (err: any) {
      console.error('Failed to load call logs:', err);
      setError(err.response?.data?.error?.message || '追客ログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    loadCallLogs();
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={handleRetry} startIcon={<RefreshIcon />}>
            再試行
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (callLogs.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <PhoneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body1" color="text.secondary">
          まだ追客ログがありません
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          電話をかけると、ここに履歴が表示されます
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon />
          売主追客ログ
          <Typography
            component="span"
            variant="body2"
            sx={{
              ml: 1,
              px: 1.5,
              py: 0.5,
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 1,
              fontWeight: 'bold',
            }}
          >
            {callLogs.length}
          </Typography>
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={handleRetry}>
          更新
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>日付 ↓</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>担当（前半）</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {callLogs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{formatDateTime(log.calledAt)}</TableCell>
                <TableCell>{log.employeeName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CallLogDisplay;
