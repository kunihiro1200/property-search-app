import { useState, useEffect, useMemo } from 'react';
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
  InputAdornment,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Badge,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon, Sync as SyncIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageNavigation from '../components/PageNavigation';

interface Buyer {
  id: string;
  buyer_number: string;
  name: string;
  phone_number: string;
  email: string;
  property_number: string;
  latest_status: string;
  initial_assignee: string;
  follow_up_assignee: string;
  inquiry_confidence: string;
  reception_date: string;
  next_call_date: string;
  desired_area: string;
  desired_property_type: string;
}

export default function BuyersPage() {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byAssignee: Record<string, number>;
    byConfidence: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    fetchBuyers();
    fetchStats();
  }, [page, rowsPerPage, searchQuery, selectedAssignee, selectedStatus]);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy: 'reception_date',
        sortOrder: 'desc',
      };
      if (searchQuery) params.search = searchQuery;
      if (selectedAssignee) params.assignee = selectedAssignee;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.get('/api/buyers', { params });
      setBuyers(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch buyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/buyers/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await api.post('/api/buyers/sync');
      await fetchBuyers();
      await fetchStats();
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleRowClick = (buyerId: string) => {
    navigate(`/buyers/${buyerId}`);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP');
    } catch {
      return dateStr;
    }
  };

  // サイドバー用の担当者リスト
  const assigneeList = useMemo(() => {
    if (!stats) return [];
    const list = [{ key: 'all', label: 'All', count: stats.total }];
    Object.entries(stats.byAssignee)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => {
        list.push({ key, label: key, count });
      });
    return list;
  }, [stats]);

  // サイドバー用のステータスリスト
  const statusList = useMemo(() => {
    if (!stats) return [];
    const list = [{ key: 'all', label: 'All', count: stats.total }];
    Object.entries(stats.byStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => {
        list.push({ key, label: key, count });
      });
    return list;
  }, [stats]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">買主リスト</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/buyers/new')}
          >
            新規作成
          </Button>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? '同期中...' : 'スプレッドシートから同期'}
          </Button>
        </Box>
      </Box>

      {/* ページナビゲーション */}
      <PageNavigation />

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* 左サイドバー */}
        <Paper sx={{ width: 220, flexShrink: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
            <Typography variant="subtitle1" fontWeight="bold">ステータス</Typography>
          </Box>
          <List dense sx={{ maxHeight: 'calc(40vh - 100px)', overflow: 'auto' }}>
            {statusList.map((item) => (
              <ListItemButton
                key={item.key}
                selected={selectedStatus === item.key || (!selectedStatus && item.key === 'all')}
                onClick={() => { setSelectedStatus(item.key === 'all' ? null : item.key); setPage(0); }}
                sx={{ py: 0.5 }}
              >
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  sx={{ flex: 1, minWidth: 0 }}
                />
                <Badge badgeContent={item.count} color="primary" max={9999} sx={{ ml: 1 }} />
              </ListItemButton>
            ))}
          </List>
          
          <Divider />
          
          <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
            <Typography variant="subtitle1" fontWeight="bold">担当者</Typography>
          </Box>
          <List dense sx={{ maxHeight: 'calc(40vh - 100px)', overflow: 'auto' }}>
            {assigneeList.map((item) => (
              <ListItemButton
                key={item.key}
                selected={selectedAssignee === item.key || (!selectedAssignee && item.key === 'all')}
                onClick={() => { setSelectedAssignee(item.key === 'all' ? null : item.key); setPage(0); }}
                sx={{ py: 0.5 }}
              >
                <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2' }} />
                <Badge badgeContent={item.count} color="primary" max={9999} sx={{ ml: 1 }} />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* メインコンテンツ */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="検索（買主番号、氏名、電話番号、物件番号）"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }}
            />
          </Paper>

          {/* 上部ページネーション */}
          <Box sx={{ mb: 2 }}>
            <Paper>
              <TablePagination
                rowsPerPageOptions={[25, 50, 100]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                labelRowsPerPage="表示件数:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
              />
            </Paper>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell>買主番号</TableCell>
                  <TableCell>氏名</TableCell>
                  <TableCell>電話番号</TableCell>
                  <TableCell>物件番号</TableCell>
                  <TableCell>担当</TableCell>
                  <TableCell>確度</TableCell>
                  <TableCell>受付日</TableCell>
                  <TableCell>次電日</TableCell>
                  <TableCell>ステータス</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">読み込み中...</TableCell>
                  </TableRow>
                ) : buyers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">買主データが見つかりませんでした</TableCell>
                  </TableRow>
                ) : (
                  buyers.map((buyer) => {
                    return (
                      <TableRow
                        key={buyer.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(buyer.buyer_number)}
                      >
                        <TableCell>
                          <Typography variant="body2" color="primary" fontWeight="bold">
                            {buyer.buyer_number || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{buyer.name || '-'}</TableCell>
                        <TableCell>{buyer.phone_number || '-'}</TableCell>
                        <TableCell>
                          {buyer.property_number && (
                            <Chip label={buyer.property_number} size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>{buyer.follow_up_assignee || buyer.initial_assignee || '-'}</TableCell>
                        <TableCell>
                          {buyer.inquiry_confidence && (
                            <Chip label={buyer.inquiry_confidence} size="small" color="info" />
                          )}
                        </TableCell>
                        <TableCell>{formatDate(buyer.reception_date)}</TableCell>
                        <TableCell>{formatDate(buyer.next_call_date)}</TableCell>
                        <TableCell>
                          {buyer.latest_status && (
                            <Chip 
                              label={buyer.latest_status.substring(0, 20)} 
                              size="small" 
                              sx={{ maxWidth: 150 }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              labelRowsPerPage="表示件数:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
            />
          </TableContainer>
        </Box>
      </Box>
    </Container>
  );
}
