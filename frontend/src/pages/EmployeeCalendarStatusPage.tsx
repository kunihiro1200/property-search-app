import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
} from '@mui/material';
import { ArrowBack, CheckCircle, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { employeeApi, googleCalendarApi } from '../services/api';

const EmployeeCalendarStatusPage = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [highlightedEmployeeId, setHighlightedEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
    checkCalendarConnection();

    // URLパラメータから接続結果を確認
    const params = new URLSearchParams(window.location.search);
    const calendarConnected = params.get('calendar_connected');
    const calendarError = params.get('calendar_error');
    const employeeId = params.get('employeeId');

    // 特定の従業員をハイライト
    if (employeeId) {
      setHighlightedEmployeeId(employeeId);
      // 3秒後にハイライトを解除
      setTimeout(() => setHighlightedEmployeeId(null), 3000);
    }

    if (calendarConnected === 'true') {
      setIsCalendarConnected(true);
      setError(null);
      // URLパラメータをクリア
      window.history.replaceState({}, '', window.location.pathname);
      // 従業員リストを再読み込み
      loadEmployees();
    } else if (calendarError) {
      const decodedError = decodeURIComponent(calendarError);
      setError(`カレンダー接続に失敗しました: ${decodedError}`);
      // URLパラメータをクリア
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const employeesData = await employeeApi.getAll();
      setEmployees(employeesData);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '従業員情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const checkCalendarConnection = async () => {
    try {
      setCheckingConnection(true);
      const status = await googleCalendarApi.getStatus();
      setIsCalendarConnected(status.connected);
    } catch (err: any) {
      console.error('Failed to check calendar connection:', err);
    } finally {
      setCheckingConnection(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Chip
            icon={<CheckCircle />}
            label="接続済み"
            color="success"
            size="small"
          />
        );
      case 'expired':
        return (
          <Chip
            icon={<Warning />}
            label="期限切れ"
            color="warning"
            size="small"
          />
        );
      case 'not_connected':
        return (
          <Chip
            icon={<ErrorIcon />}
            label="未接続"
            color="error"
            size="small"
          />
        );
      default:
        return <Chip label="不明" size="small" />;
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const { authUrl } = await googleCalendarApi.getAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      setError('認証URLの取得に失敗しました');
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Googleカレンダーとの連携を解除しますか？')) {
      return;
    }

    try {
      await googleCalendarApi.revoke();
      setIsCalendarConnected(false);
      setError(null);
      // 従業員リストを再読み込み
      await loadEmployees();
    } catch (err: any) {
      setError('連携解除に失敗しました');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          従業員カレンダー接続状態
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            従業員一覧（会社アカウント方式）
          </Typography>
          {checkingConnection ? (
            <CircularProgress size={24} />
          ) : isCalendarConnected ? (
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisconnectCalendar}
            >
              カレンダー連携を解除
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleConnectCalendar}
            >
              会社アカウントでGoogleカレンダーを接続
            </Button>
          )}
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>名前</TableCell>
                <TableCell>メールアドレス</TableCell>
                <TableCell>役割</TableCell>
                <TableCell>カレンダー接続状態</TableCell>
                <TableCell>トークン有効期限</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((employee) => (
                <TableRow 
                  key={employee.id}
                  sx={{
                    backgroundColor: highlightedEmployeeId === employee.id ? 'rgba(25, 118, 210, 0.12)' : 'inherit',
                    transition: 'background-color 0.3s ease',
                  }}
                >
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    {employee.role === 'admin' && '管理者'}
                    {employee.role === 'agent' && '営業'}
                    {employee.role === 'viewer' && '閲覧者'}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(employee.calendarStatus?.status)}
                  </TableCell>
                  <TableCell>
                    {employee.calendarStatus?.tokenExpiry ? (
                      new Date(employee.calendarStatus.tokenExpiry).toLocaleString('ja-JP')
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {employees.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              従業員が登録されていません
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>カレンダー接続について：</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              • 会社の共有Googleアカウントで一度認証すれば、全スタッフのカレンダーにアクセスできます
            </Typography>
            <Typography variant="body2">
              • 訪問査定予約を作成する際、営担に指定された従業員のGoogleカレンダーにイベントが作成されます
            </Typography>
            <Typography variant="body2">
              • 各スタッフは事前に自分のカレンダーを会社アカウントに共有してください（予定の変更権限が必要）
            </Typography>
            <Typography variant="body2">
              • トークンが期限切れの場合は、再度接続してください
            </Typography>
          </Alert>
        </Box>
      </Paper>
    </Container>
  );
};

export default EmployeeCalendarStatusPage;
