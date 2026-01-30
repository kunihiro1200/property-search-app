import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  InputAdornment,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  StatusCategory,
  filterSellersByCategory,
} from '../utils/sellerStatusFilters';
import { formatInquiryDate } from '../utils/inquiryDateFormatter';
import PageNavigation from '../components/PageNavigation';
import { ManualSyncButton } from '../components/ManualSyncButton';
import { SyncNotification, SyncNotificationData } from '../components/SyncNotification';
import { useAutoSync } from '../hooks/useAutoSync';
import { useSellerStatus } from '../hooks/useSellerStatus';
import SellerStatusBadges from '../components/SellerStatusBadges';
import SellerStatusSidebar from '../components/SellerStatusSidebar';

interface Seller {
  id: string;
  sellerNumber?: string;
  name: string;
  address: string;
  phoneNumber: string;
  email?: string;
  status: string;
  confidence?: string;
  nextCallDate?: string;
  createdAt: string;
  lastCallDate?: string;
  inquirySource?: string;
  inquiryDate?: string;
  inquiryDetailedDatetime?: string;
  inquiryYear?: number;
  inquirySite?: string;
  site?: string;
  confidenceLevel?: string;
  firstCallerInitials?: string;
  isUnreachable?: boolean;
}

const statusLabels: Record<string, string> = {
  following_up: '追客中',
  appointment_scheduled: '訪問査定予定',
  visited: '訪問済み',
  contracted: '契約済み',
  lost: '失注',
};

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning'> = {
  following_up: 'warning',
  appointment_scheduled: 'secondary',
  visited: 'default',
  contracted: 'success',
  lost: 'error',
};

// スプレッドシートから同期された日本語の状況値の色を判定
const getStatusColor = (status: string | null | undefined): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' => {
  // nullまたはundefinedの場合はデフォルトを返す
  if (!status) {
    return 'default';
  }
  
  // 既存のenumベースの色があればそれを使用
  if (statusColors[status]) {
    return statusColors[status];
  }
  
  // 日本語の値の場合、キーワードで判定
  if (status.includes('専任') || status.includes('一般媒介')) return 'success';
  if (status.includes('他決')) return 'warning';
  if (status.includes('追客')) return 'warning';
  if (status.includes('訪問')) return 'secondary';
  if (status.includes('失注')) return 'error';
  if (status.includes('契約')) return 'success';
  
  return 'default';
};

/**
 * 売主ステータスセルコンポーネント
 * useSellerStatusフックを使用してステータスを計算し、バッジで表示
 */
function SellerStatusCell({ seller }: { seller: any }) {
  const statuses = useSellerStatus(seller);
  return <SellerStatusBadges statuses={statuses} size="small" />;
}

export default function SellersPage() {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  
  // サイドバー用のカテゴリカウント（APIから直接取得）
  const [sidebarCounts, setSidebarCounts] = useState<{
    todayCall: number;
    todayCallWithInfo: number;
    visitScheduled: number;
    visitCompleted: number;
    unvaluated: number;
    mailingPending: number;
  }>({
    todayCall: 0,
    todayCallWithInfo: 0,
    visitScheduled: 0,
    visitCompleted: 0,
    unvaluated: 0,
    mailingPending: 0,
  });
  const [sidebarLoading, setSidebarLoading] = useState(true);
  
  // ページ状態をsessionStorageから復元
  const [page, setPage] = useState(() => {
    const saved = sessionStorage.getItem('sellersPage');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const saved = sessionStorage.getItem('sellersRowsPerPage');
    return saved ? parseInt(saved, 10) : 50;
  });
  
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Phase 1 filters
  const [inquirySourceFilter, setInquirySourceFilter] = useState('');
  const [confidenceLevelFilter, setConfidenceLevelFilter] = useState('');
  const [showUnreachableOnly, setShowUnreachableOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Status category filter
  const [selectedCategory, setSelectedCategory] = useState<StatusCategory>(() => {
    // 通話モードページから戻ってきた場合、sessionStorageからカテゴリを復元
    const savedCategory = sessionStorage.getItem('selectedStatusCategory');
    if (savedCategory) {
      sessionStorage.removeItem('selectedStatusCategory'); // 一度使ったら削除
      return savedCategory as StatusCategory;
    }
    return 'all';
  });

  // 自動同期の通知データ
  const [syncNotificationData, setSyncNotificationData] = useState<SyncNotificationData | null>(null);
  const [syncError, setSyncError] = useState<{ message: string; recoverable: boolean } | null>(null);

  // ページ状態が変更されたらsessionStorageに保存
  useEffect(() => {
    sessionStorage.setItem('sellersPage', page.toString());
  }, [page]);

  useEffect(() => {
    sessionStorage.setItem('sellersRowsPerPage', rowsPerPage.toString());
  }, [rowsPerPage]);

  // スクロール位置を復元（売主IDベース）
  useEffect(() => {
    const selectedSellerId = sessionStorage.getItem('selectedSellerId');
    if (selectedSellerId && sellers.length > 0) {
      setTimeout(() => {
        // 売主IDに対応する行を探す
        const targetRow = document.querySelector(`[data-seller-id="${selectedSellerId}"]`);
        if (targetRow) {
          // 行の位置を取得して、少し上にオフセットしてスクロール
          const rowPosition = targetRow.getBoundingClientRect().top + window.scrollY;
          const offset = 100; // ヘッダー分のオフセット
          window.scrollTo({
            top: rowPosition - offset,
            behavior: 'smooth'
          });
        } else {
          // 行が見つからない場合は、保存されたスクロール位置を使用
          const savedScrollPosition = sessionStorage.getItem('sellersScrollPosition');
          if (savedScrollPosition) {
            window.scrollTo(0, parseInt(savedScrollPosition, 10));
          }
        }
        // クリーンアップ
        sessionStorage.removeItem('selectedSellerId');
        sessionStorage.removeItem('sellersScrollPosition');
      }, 100);
    }
  }, [sellers]);

  // 自動同期フックを使用
  const { isSyncing } = useAutoSync({
    thresholdMinutes: 5,
    enabled: true,
    onSyncComplete: (result) => {
      // データが更新された場合、通知を表示してリストを再取得
      if (result.hasChanges) {
        setSyncNotificationData({
          recordsAdded: result.recordsAdded,
          recordsUpdated: result.recordsUpdated,
          recordsDeleted: result.recordsDeleted,
          hasChanges: true,
        });
        fetchSellers();
        fetchSidebarCounts(); // サイドバーカウントも更新
      }
    },
    onSyncError: (error) => {
      console.error('Auto sync error:', error);
    },
  });

  // カテゴリ別の売主数をカウント（APIから取得したカウントを使用）
  const categoryCounts = {
    ...sidebarCounts,
    all: total, // ページネーション前の全体件数を使用
  };

  // カテゴリ別にフィルタリング（ユーティリティ関数を使用）
  const getFilteredSellers = () => {
    return filterSellersByCategory(sellers, selectedCategory);
  };

  // サイドバー用のカテゴリカウントを取得（APIから直接取得）
  const fetchSidebarCounts = async () => {
    try {
      setSidebarLoading(true);
      const response = await api.get('/api/sellers/sidebar-counts');
      setSidebarCounts(response.data);
    } catch (error) {
      console.error('Failed to fetch sidebar counts:', error);
      // エラー時はカウントを0にリセット
      setSidebarCounts({
        todayCall: 0,
        todayCallWithInfo: 0,
        visitScheduled: 0,
        visitCompleted: 0,
        unvaluated: 0,
        mailingPending: 0,
      });
    } finally {
      setSidebarLoading(false);
    }
  };

  // 初回ロード時にサイドバーカウントを取得
  useEffect(() => {
    fetchSidebarCounts();
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [page, rowsPerPage, inquirySourceFilter, confidenceLevelFilter, showUnreachableOnly, selectedCategory]);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        pageSize: rowsPerPage,
        sortBy: 'inquiry_date',
        sortOrder: 'desc',
      };
      
      // Add Phase 1 filters
      if (inquirySourceFilter) {
        params.inquirySource = inquirySourceFilter;
      }
      if (confidenceLevelFilter) {
        params.confidenceLevel = confidenceLevelFilter;
      }
      if (showUnreachableOnly) {
        params.isUnreachable = true;
      }
      
      // サイドバーカテゴリフィルター
      if (selectedCategory && selectedCategory !== 'all') {
        params.statusCategory = selectedCategory;
      }
      
      const response = await api.get('/api/sellers', { params });
      setSellers(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchSellers();
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/sellers/search', {
        params: { q: searchQuery },
      });
      setSellers(response.data);
      setTotal(response.data.length);
    } catch (error) {
      console.error('Failed to search sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // バックエンドでフィルタリングするため、sellersをそのまま使用
  const filteredSellers = sellers;

  return (
    <Container maxWidth="xl">
      {/* 自動同期通知 */}
      <SyncNotification
        data={syncNotificationData}
        onClose={() => setSyncNotificationData(null)}
        position="top"
      />

      {/* エラー通知 */}
      {syncError && (
        <SyncNotification
          type="error"
          message={syncError.message}
          details={syncError.recoverable ? 'リトライ可能なエラーです。もう一度お試しください。' : undefined}
          onClose={() => setSyncError(null)}
        />
      )}

      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            売主リスト
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* 手動更新ボタン */}
            <ManualSyncButton
              onSyncComplete={(result) => {
                if (result.success) {
                  setSyncError(null); // エラーをクリア
                  fetchSellers();
                }
              }}
              onSyncError={(error: any) => {
                setSyncError({
                  message: error.message,
                  recoverable: error.recoverable || false,
                });
              }}
            />
            <Button
              variant="outlined"
              onClick={() => navigate('/settings')}
            >
              設定
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/activity-logs')}
            >
              活動ログ
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/sellers/new')}
            >
              新規登録
            </Button>
          </Box>
        </Box>

        {/* ページナビゲーション */}
        <PageNavigation />

        {/* サイドバーとメインコンテンツのレイアウト */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* 左側サイドバー - SellerStatusSidebarコンポーネントを使用 */}
          <SellerStatusSidebar
            categoryCounts={categoryCounts}
            selectedCategory={selectedCategory}
            onCategorySelect={(category) => {
              setSelectedCategory(category);
              setPage(0); // カテゴリが変わったらページを0にリセット
            }}
            isCallMode={false}
            sellers={sellers}
            loading={sidebarLoading}
          />

          {/* メインコンテンツ */}
          <Box sx={{ flex: 1 }}>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: showFilters ? 2 : 0 }}>
            <TextField
              fullWidth
              placeholder="名前、住所、電話番号で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <Button onClick={handleSearch}>検索</Button>
                ),
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              フィルタ
            </Button>
          </Box>
          
          {showFilters && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                select
                label="問合元"
                value={inquirySourceFilter}
                onChange={(e) => setInquirySourceFilter(e.target.value)}
                sx={{ minWidth: 150 }}
                size="small"
              >
                <MenuItem value="">全て</MenuItem>
                <MenuItem value="ウ">ウ (ウェブ)</MenuItem>
                <MenuItem value="L">L (LINE)</MenuItem>
                <MenuItem value="紹介">紹介</MenuItem>
                <MenuItem value="チラシ">チラシ</MenuItem>
              </TextField>
              
              <TextField
                select
                label="確度"
                value={confidenceLevelFilter}
                onChange={(e) => setConfidenceLevelFilter(e.target.value)}
                sx={{ minWidth: 180 }}
                size="small"
              >
                <MenuItem value="">全て</MenuItem>
                <MenuItem value="A">A（売る気あり）</MenuItem>
                <MenuItem value="B">B（売る気あるがまだ先の話）</MenuItem>
                <MenuItem value="B_PRIME">B'（売る気は全く無い）</MenuItem>
                <MenuItem value="C">C（電話が繋がらない）</MenuItem>
                <MenuItem value="D">D（再建築不可）</MenuItem>
                <MenuItem value="E">E（収益物件）</MenuItem>
                <MenuItem value="DUPLICATE">ダブり（重複している）</MenuItem>
              </TextField>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <label>
                  <input
                    type="checkbox"
                    checked={showUnreachableOnly}
                    onChange={(e) => setShowUnreachableOnly(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  不通のみ表示
                </label>
              </Box>
              
              <Button
                variant="text"
                onClick={() => {
                  setInquirySourceFilter('');
                  setConfidenceLevelFilter('');
                  setShowUnreachableOnly(false);
                }}
                size="small"
              >
                フィルタをクリア
              </Button>
            </Box>
          )}
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

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>売主番号</TableCell>
                <TableCell>名前</TableCell>
                <TableCell>反響年</TableCell>
                <TableCell>反響日付</TableCell>
                <TableCell>サイト</TableCell>
                <TableCell>確度</TableCell>
                <TableCell>不通</TableCell>
                <TableCell>次電日</TableCell>
                <TableCell>訪問日</TableCell>
                <TableCell>状況（当社）</TableCell>
                <TableCell>Pinrich</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>除外日</TableCell>
                <TableCell>電話番号</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} align="center">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : filteredSellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} align="center">
                    売主が見つかりませんでした
                  </TableCell>
                </TableRow>
              ) : (
                filteredSellers.map((seller: any) => (
                  <TableRow 
                    key={seller.id} 
                    hover
                    onClick={() => {
                      // スクロール位置と売主IDを保存
                      sessionStorage.setItem('sellersScrollPosition', window.scrollY.toString());
                      sessionStorage.setItem('selectedSellerId', seller.id);
                      navigate(`/sellers/${seller.id}/call`);
                    }}
                    sx={{ cursor: 'pointer' }}
                    data-seller-id={seller.id}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {seller.sellerNumber || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{seller.name}</TableCell>
                    <TableCell>{seller.inquiryYear || '-'}</TableCell>
                    <TableCell>
                      {formatInquiryDate(seller)}
                    </TableCell>
                    <TableCell>{seller.inquirySite || seller.site || '-'}</TableCell>
                    <TableCell>
                      {seller.confidence ? (
                        <Chip
                          label={
                            seller.confidence === 'A' ? 'A' :
                            seller.confidence === 'B' ? 'B' :
                            seller.confidence === 'B_PRIME' ? "B'" :
                            seller.confidence === 'C' ? 'C' :
                            seller.confidence === 'D' ? 'D' :
                            seller.confidence === 'E' ? 'E' :
                            seller.confidence === 'DUPLICATE' ? 'ダブり' :
                            seller.confidence
                          }
                          color={
                            seller.confidence === 'A' ? 'success' :
                            seller.confidence === 'B' ? 'info' :
                            seller.confidence === 'C' ? 'warning' :
                            'default'
                          }
                          size="small"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {seller.unreachable ? (
                        <Chip label="不通" size="small" color="error" />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {seller.nextCallDate
                        ? new Date(seller.nextCallDate).toLocaleDateString('ja-JP')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {seller.visitDate
                        ? new Date(seller.visitDate).toLocaleDateString('ja-JP')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusLabels[seller.status] || seller.status}
                        color={getStatusColor(seller.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{seller.pinrichStatus || '-'}</TableCell>
                    <TableCell>
                      <SellerStatusCell seller={seller} />
                    </TableCell>
                    <TableCell>
                      {seller.exclusionDate
                        ? new Date(seller.exclusionDate).toLocaleDateString('ja-JP')
                        : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {seller.phoneNumber ? (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PhoneIcon fontSize="small" color="action" />
                            <a
                              href={`tel:${seller.phoneNumber}`}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              {seller.phoneNumber}
                            </a>
                          </Box>
                          {seller.lastCallDate && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2.5 }}>
                              最終: {new Date(seller.lastCallDate).toLocaleString('ja-JP', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        '-'
                      )}
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
      </Box>
    </Container>
  );
}
