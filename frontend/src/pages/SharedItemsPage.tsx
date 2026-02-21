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
  IconButton,
  Button,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import PageNavigation from '../components/PageNavigation';
import { SECTION_COLORS } from '../theme/sectionColors';

interface SharedItem {
  id: string;
  sharing_location: string;  // D列「共有場」
  sharing_date: string | null;  // P列「共有日」
  staff_not_shared: string | null;  // S列「共有できていない」
  confirmation_date: string | null;  // 確認日
  [key: string]: any;  // その他のカラム
}

export default function SharedItemsPage() {
  const navigate = useNavigate();
  const sharedItemsColor = SECTION_COLORS.sharedItems;
  const [allSharedItems, setAllSharedItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllSharedItems();
  }, []);

  const fetchAllSharedItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/shared-items', {
        params: {
          limit: 1000,
          offset: 0,
          orderBy: 'created_at',
          orderDirection: 'desc',
        },
      });
      setAllSharedItems(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shared items:', error);
    } finally {
      setLoading(false);
    }
  };

  // 検索フィルタリング
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allSharedItems;
    
    const query = searchQuery.toLowerCase();
    return allSharedItems.filter(item => {
      // 全てのフィールドを検索対象にする
      return Object.values(item).some(value => 
        value && String(value).toLowerCase().includes(query)
      );
    });
  }, [allSharedItems, searchQuery]);

  // ページネーション用
  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const total = filteredItems.length;

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (id: string) => {
    navigate(`/shared-items/${id}`);
  };

  // 日付フォーマット
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP');
    } catch {
      return dateStr;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ color: sharedItemsColor.main }}>
          共有（社内共有事項管理）
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/shared-items/new')}
          sx={{
            bgcolor: sharedItemsColor.main,
            '&:hover': { bgcolor: sharedItemsColor.dark },
          }}
        >
          新規作成
        </Button>
      </Box>
      
      {/* ページナビゲーション */}
      <PageNavigation />

      <Box sx={{ flex: 1 }}>
        {/* 検索バー */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search 共有リスト（全フィールド検索）"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSearchQuery('');
                      setPage(0);
                    }}
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
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
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="表示件数:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
            />
          </Paper>
        </Box>

        {/* テーブル */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: `${sharedItemsColor.light}20` }}>
                <TableCell>ID</TableCell>
                <TableCell>共有場</TableCell>
                <TableCell>共有日</TableCell>
                <TableCell>共有できていない</TableCell>
                <TableCell>確認日</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    共有データが見つかりませんでした
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow 
                    key={item.id} 
                    hover 
                    onClick={() => handleRowClick(item.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: sharedItemsColor.main }}>
                        {item.id || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.sharing_location || '-'}</TableCell>
                    <TableCell>{formatDate(item.sharing_date)}</TableCell>
                    <TableCell>{item.staff_not_shared || '-'}</TableCell>
                    <TableCell>{formatDate(item.confirmation_date)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100]}
            component="div"
            count={total}
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
  );
}
