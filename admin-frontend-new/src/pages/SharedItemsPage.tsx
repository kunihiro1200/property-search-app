import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  List,
  ListItemButton,
  ListItemText,
  Badge,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import api from '../services/api';
import PageNavigation from '../components/PageNavigation';
import { SECTION_COLORS } from '../theme/sectionColors';

interface SharedItem {
  id: string;
  sharing_location: string;
  sharing_date: string | null;
  staff_not_shared: string | null;
  confirmation_date: string | null;
  [key: string]: any;
}

interface Category {
  key: string;
  label: string;
  count: number;
}

export default function SharedItemsPage() {
  const navigate = useNavigate();
  const sharedItemsColor = SECTION_COLORS.sharedItems;
  const [allItems, setAllItems] = useState<SharedItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // カテゴリー計算（useCallbackで定義）
  const calculateCategory = useCallback((item: SharedItem): string => {
    // スタッフ確認カテゴリー
    if (item.staff_not_shared && !item.confirmation_date) {
      return `${item.staff_not_shared}は要確認`;
    }
    // 基本カテゴリー
    return item.sharing_location || 'その他';
  }, []);

  useEffect(() => {
    fetchAllItems();
    fetchCategories();
  }, []);

  const fetchAllItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/shared-items');
      setAllItems(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shared items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/shared-items/categories');
      const cats = response.data.data || [];
      // 「全て」カテゴリーを追加
      setCategories([
        { key: 'all', label: '全て', count: allItems.length },
        ...cats,
      ]);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // カテゴリーが変更されたら件数を更新
  useEffect(() => {
    if (categories.length > 0) {
      const updatedCategories = categories.map(cat => {
        if (cat.key === 'all') {
          return { ...cat, count: allItems.length };
        }
        return cat;
      });
      setCategories(updatedCategories);
    }
  }, [allItems]);

  // フィルタリング
  const filteredItems = useMemo(() => {
    // 検索クエリが入力されている場合
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return allItems.filter(item => 
        Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(query)
        )
      );
    }
    
    // カテゴリーでフィルタリング
    if (selectedCategory === 'all') {
      return allItems;
    }
    
    return allItems.filter(item => {
      const category = calculateCategory(item);
      return category === selectedCategory;
    });
  }, [allItems, selectedCategory, searchQuery, calculateCategory]);

  // ページネーション
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

  const handleCategoryChange = (key: string) => {
    setSelectedCategory(key);
    setPage(0);
  };

  // 行クリック時の処理
  const handleRowClick = (item: SharedItem) => {
    // 詳細ページに遷移
    navigate(`/shared-items/${item.id}`);
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
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: sharedItemsColor.main }}>
        共有
      </Typography>
      
      {/* ページナビゲーション */}
      <PageNavigation />

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* 左サイドバー */}
        <Paper sx={{ width: 400, flexShrink: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              共有カテゴリー
            </Typography>
          </Box>
          <List dense>
            {categories.map((cat) => (
              <ListItemButton
                key={cat.key}
                selected={selectedCategory === cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                sx={{ 
                  py: 0.5,
                  '&.Mui-selected': { 
                    bgcolor: `${sharedItemsColor.light}30`,
                    color: sharedItemsColor.dark,
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                    }
                  }
                }}
              >
                <ListItemText 
                  primary={cat.label}
                  primaryTypographyProps={{ 
                    variant: 'body2',
                    sx: { 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }
                  }}
                />
                <Badge
                  badgeContent={cat.count}
                  max={999}
                  sx={{ 
                    ml: 1,
                    '& .MuiBadge-badge': {
                      bgcolor: sharedItemsColor.main,
                      color: sharedItemsColor.contrastText,
                    }
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        {/* メインコンテンツ */}
        <Box sx={{ flex: 1 }}>
          {/* 検索バー */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search 共有"
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
                      edge="end"
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
                  <TableCell>入力者</TableCell>
                  <TableCell>共有日</TableCell>
                  <TableCell>項目</TableCell>
                  <TableCell>タイトル</TableCell>
                  <TableCell>内容</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      共有データが見つかりませんでした
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow 
                      key={item.id} 
                      hover
                      onClick={() => handleRowClick(item)}
                      sx={{ 
                        cursor: 'pointer',
                        opacity: item.sharing_date ? 0.6 : 1,
                      }}
                    >
                      <TableCell>{item['ID'] || '-'}</TableCell>
                      <TableCell>{item['入力者'] || '-'}</TableCell>
                      <TableCell>{formatDate(item.sharing_date)}</TableCell>
                      <TableCell>{item['項目'] || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" sx={{ color: sharedItemsColor.main }}>
                          {item['タイトル'] || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item['内容'] || '-'}
                      </TableCell>
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
      </Box>
    </Container>
  );
}
