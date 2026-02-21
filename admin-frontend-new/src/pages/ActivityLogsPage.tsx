import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Grid,
  Button,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import api from '../services/api';

interface ActivityLog {
  id: string;
  employeeId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface ActivityStatistics {
  employeeStats: {
    employeeId: string;
    employeeName: string;
    totalActivities: number;
    byType: Record<string, number>;
  }[];
  totalActivities: number;
  period: {
    from: Date;
    to: Date;
  };
}

const actionLabels: Record<string, string> = {
  create_seller: '売主登録',
  update_seller: '売主更新',
  send_valuation_email: '査定メール送信',
  send_follow_up_email: '追客メール送信',
  calculate_valuation: '査定実行',
  record_activity: '活動記録',
  create_appointment: '予約作成',
  cancel_appointment: '予約キャンセル',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // フィルタ
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [activityType, setActivityType] = useState<string>('');

  useEffect(() => {
    fetchLogs();
    fetchStatistics();
  }, [dateFrom, dateTo, activityType]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (dateFrom) {
        params.dateFrom = dateFrom.toISOString();
      }
      if (dateTo) {
        params.dateTo = dateTo.toISOString();
      }
      if (activityType) {
        params.activityType = activityType;
      }

      const response = await api.get('/activity-logs', { params });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params: any = {};
      
      if (dateFrom) {
        params.dateFrom = dateFrom.toISOString();
      }
      if (dateTo) {
        params.dateTo = dateTo.toISOString();
      }

      const response = await api.get('/activity-logs/statistics', { params });
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClearFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setActivityType('');
  };

  const paginatedLogs = logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Container maxWidth="xl">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            活動ログ
          </Typography>

          {/* 統計ダッシュボード */}
          {statistics && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                活動統計
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        総活動数
                      </Typography>
                      <Typography variant="h4">
                        {statistics.totalActivities}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        活動中の社員数
                      </Typography>
                      <Typography variant="h4">
                        {statistics.employeeStats.length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        期間
                      </Typography>
                      <Typography variant="body1">
                        {dateFrom ? dateFrom.toLocaleDateString('ja-JP') : '全期間'} 〜{' '}
                        {dateTo ? dateTo.toLocaleDateString('ja-JP') : '現在'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* 社員ごとの統計 */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  社員ごとの活動件数
                </Typography>
                <Grid container spacing={2}>
                  {statistics.employeeStats.map((stat, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          社員ID: {stat.employeeId}
                        </Typography>
                        <Typography variant="h5" color="primary" gutterBottom>
                          {stat.totalActivities} 件
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {Object.entries(stat.byType).map(([type, count]) => (
                            <Chip
                              key={type}
                              label={`${actionLabels[type] || type}: ${count}`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          )}

          {/* フィルタ */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              フィルタ
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="開始日"
                  value={dateFrom}
                  onChange={(newValue) => setDateFrom(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="終了日"
                  value={dateTo}
                  onChange={(newValue) => setDateTo(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="活動種別"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="">すべて</option>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleClearFilters}
                >
                  クリア
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* 上部ページネーション */}
          <Box sx={{ mb: 2 }}>
            <Paper>
              <TablePagination
                rowsPerPageOptions={[25, 50, 100]}
                component="div"
                count={logs.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="表示件数:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
              />
            </Paper>
          </Box>

          {/* ログテーブル */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>日時</TableCell>
                  <TableCell>社員ID</TableCell>
                  <TableCell>アクション</TableCell>
                  <TableCell>対象タイプ</TableCell>
                  <TableCell>対象ID</TableCell>
                  <TableCell>IPアドレス</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      ログが見つかりませんでした
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        {new Date(log.createdAt).toLocaleString('ja-JP')}
                      </TableCell>
                      <TableCell>{log.employeeId}</TableCell>
                      <TableCell>
                        <Chip
                          label={actionLabels[log.action] || log.action}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{log.targetType}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {log.targetId.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{log.ipAddress || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100]}
              component="div"
              count={logs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="表示件数:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
            />
          </TableContainer>
        </Box>
      </Container>
    </LocalizationProvider>
  );
}
