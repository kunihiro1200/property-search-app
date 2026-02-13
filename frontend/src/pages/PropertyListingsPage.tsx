import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Checkbox,
  Button,
  Link,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Search as SearchIcon, ClearAll as ClearAllIcon } from '@mui/icons-material';
import api from '../services/api';
import PropertyListingDetailModal from '../components/PropertyListingDetailModal';
import PageNavigation from '../components/PageNavigation';
import BuyerIndicator from '../components/BuyerIndicator';
import { InquiryResponseButton } from '../components/InquiryResponseButton';
import PublicUrlCell from '../components/PublicUrlCell';
import StatusBadge from '../components/StatusBadge';
import PublicSiteButtons from '../components/PublicSiteButtons';
import PropertySidebarStatus from '../components/PropertySidebarStatus';
import { getDisplayStatus } from '../utils/atbbStatusDisplayMapper';
import { SECTION_COLORS } from '../theme/sectionColors';

interface PropertyListing {
  id: string;
  property_number?: string;
  sidebar_status?: string;
  sales_assignee?: string;
  property_type?: string;
  address?: string;
  display_address?: string;
  seller_name?: string;
  buyer_name?: string;
  contract_date?: string;
  settlement_date?: string;
  price?: number;
  storage_location?: string;
  atbb_status?: string;
  [key: string]: any;
}

export default function PropertyListingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [allListings, setAllListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [sidebarStatus, setSidebarStatus] = useState<string | null>(null);
  const [selectedPropertyNumber, setSelectedPropertyNumber] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [buyerCounts, setBuyerCounts] = useState<Record<string, number>>({});
  const [highConfidenceProperties, setHighConfidenceProperties] = useState<Set<string>>(new Set());
  const [selectedPropertyNumbers, setSelectedPropertyNumbers] = useState<Set<string>>(new Set());
  const [pendingPriceReductionProperties, setPendingPriceReductionProperties] = useState<Set<string>>(new Set());

  // 状態を復元
  useEffect(() => {
    const savedState = location.state as any;
    if (savedState) {
      if (savedState.page !== undefined) setPage(savedState.page);
      if (savedState.rowsPerPage !== undefined) setRowsPerPage(savedState.rowsPerPage);
      if (savedState.searchQuery !== undefined) setSearchQuery(savedState.searchQuery);
      if (savedState.selectedAssignee !== undefined) setSelectedAssignee(savedState.selectedAssignee);
      if (savedState.sidebarStatus !== undefined) setSidebarStatus(savedState.sidebarStatus);
    }
  }, [location.state]);

  useEffect(() => {
    fetchAllData();
    fetchPendingPriceReductions();
  }, []);

  const fetchPendingPriceReductions = async () => {
    try {
      const response = await api.get('/api/chat-notifications/pending-price-reductions');
      if (response.data.success) {
        setPendingPriceReductionProperties(new Set(response.data.propertyNumbers));
      }
    } catch (error) {
      console.error('Failed to fetch pending price reductions:', error);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // 全件取得（複数回に分けて取得）
      const allListingsData: PropertyListing[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;
      
      console.log('物件データを取得中...');
      
      while (hasMore) {
        const listingsRes = await api.get('/api/property-listings', {
          params: { limit, offset, orderBy: 'distribution_date', orderDirection: 'desc' },
        });
        
        const fetchedData = listingsRes.data.data || [];
        allListingsData.push(...fetchedData);
        
        console.log(`取得: ${offset + 1}～${offset + fetchedData.length}件 / 合計${listingsRes.data.total}件`);
        
        // 次のページがあるかチェック
        if (fetchedData.length < limit || allListingsData.length >= listingsRes.data.total) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
      
      setAllListings(allListingsData);
      
      console.log('✅ データ取得成功:', {
        物件数: allListingsData.length,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 担当者別カウント
  const assigneeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allListings.length };
    allListings.forEach(listing => {
      const key = listing.sales_assignee || '未設定';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allListings]);

  // フィルタリング
  const filteredListings = useMemo(() => {
    let listings = allListings.map(listing => {
      // 値下げ未完了の物件に仮想的なsidebar_statusを付与
      if (pendingPriceReductionProperties.has(listing.property_number || '')) {
        return {
          ...listing,
          sidebar_status: '値下げ未完了',
        };
      }
      return listing;
    });
    
    // 担当者フィルター
    if (selectedAssignee && selectedAssignee !== 'all') {
      listings = listings.filter(l => 
        selectedAssignee === '未設定' 
          ? !l.sales_assignee 
          : l.sales_assignee === selectedAssignee
      );
    }
    
    // サイドバーステータスフィルター
    if (sidebarStatus && sidebarStatus !== 'all') {
      listings = listings.filter(l => l.sidebar_status === sidebarStatus);
    }
    
    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      listings = listings.filter(l =>
        l.property_number?.toLowerCase().includes(query) ||
        l.address?.toLowerCase().includes(query) ||
        l.seller_name?.toLowerCase().includes(query) ||
        l.buyer_name?.toLowerCase().includes(query)
      );
    }
    
    return listings;
  }, [allListings, selectedAssignee, sidebarStatus, searchQuery, pendingPriceReductionProperties]);

  const paginatedListings = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredListings.slice(start, start + rowsPerPage);
  }, [filteredListings, page, rowsPerPage]);

  // 前回取得した物件番号リストを記憶
  const prevPropertyNumbersRef = useRef<string>('');

  // 買主カウントを取得
  useEffect(() => {
    const fetchBuyerCounts = async () => {
      const propertyNumbers = paginatedListings
        .map(l => l.property_number)
        .filter(Boolean) as string[];

      const propertyNumbersKey = propertyNumbers.sort().join(',');
      
      // 前回と同じ物件リストの場合はスキップ
      if (propertyNumbersKey === prevPropertyNumbersRef.current) {
        return;
      }
      
      prevPropertyNumbersRef.current = propertyNumbersKey;

      if (propertyNumbers.length > 0) {
        try {
          const response = await api.get('/api/property-listings/buyer-counts/batch', {
            params: { propertyNumbers: propertyNumbers.join(',') }
          });
          setBuyerCounts(prevCounts => ({
            ...prevCounts,
            ...response.data
          }));
        } catch (error) {
          console.error('Failed to fetch buyer counts:', error);
        }
      }
    };

    fetchBuyerCounts();
  }, [paginatedListings]);

  // 高確度買主を持つ物件リストを取得
  useEffect(() => {
    const fetchHighConfidenceProperties = async () => {
      try {
        const response = await api.get('/api/property-listings/high-confidence-buyers/list');
        setHighConfidenceProperties(new Set(response.data));
      } catch (error) {
        console.error('Failed to fetch high confidence properties:', error);
      }
    };

    fetchHighConfidenceProperties();
  }, []);

  const handleRowClick = (propertyNumber: string) => {
    // 現在の状態をSession Storageに保存
    const currentState = {
      page,
      rowsPerPage,
      searchQuery,
      selectedAssignee,
      sidebarStatus,
    };
    sessionStorage.setItem('propertyListState', JSON.stringify(currentState));
    
    // 新しいページに遷移
    navigate(`/property-listings/${propertyNumber}`);
  };

  const handleSelectProperty = (propertyNumber: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedPropertyNumbers);
    if (newSelected.has(propertyNumber)) {
      newSelected.delete(propertyNumber);
    } else {
      newSelected.add(propertyNumber);
    }
    setSelectedPropertyNumbers(newSelected);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allPropertyNumbers = new Set(
        paginatedListings
          .map(l => l.property_number)
          .filter(Boolean) as string[]
      );
      setSelectedPropertyNumbers(allPropertyNumbers);
    } else {
      setSelectedPropertyNumbers(new Set());
    }
  };

  const handleClearSelection = () => {
    setSelectedPropertyNumbers(new Set());
  };

  const selectedProperties = useMemo(() => {
    return allListings.filter(l => 
      l.property_number && selectedPropertyNumbers.has(l.property_number)
    );
  }, [allListings, selectedPropertyNumbers]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP');
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return '-';
    return `${(price / 10000).toLocaleString()}万円`;
  };

  // 物件種別の色を取得
  const getPropertyTypeColor = (propertyType: string | undefined) => {
    if (!propertyType) return 'default';
    
    const type = propertyType.trim();
    if (type === 'マンション' || type === 'アパート') {
      return '#1976d2'; // 青
    } else if (type === '戸建' || type === '戸建て') {
      return '#2e7d32'; // 緑
    } else if (type === '土地') {
      return '#ed6c02'; // オレンジ
    } else if (type === '店舗' || type === '事務所') {
      return '#9c27b0'; // 紫
    } else {
      return '#757575'; // グレー
    }
  };

  // サイドバー用の担当者リスト
  const assigneeList = useMemo(() => {
    const list = [{ key: 'all', label: 'All', count: assigneeCounts.all }];
    Object.entries(assigneeCounts)
      .filter(([key]) => key !== 'all')
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => {
        list.push({ key, label: key, count });
      });
    return list;
  }, [assigneeCounts]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">物件リスト</Typography>
        <PublicSiteButtons />
      </Box>
      
      {/* ページナビゲーション */}
      <PageNavigation />

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* 左サイドバー - サイドバーステータス */}
        <PropertySidebarStatus
          listings={allListings}
          selectedStatus={sidebarStatus}
          onStatusChange={(status) => { setSidebarStatus(status); setPage(0); }}
          pendingPriceReductionProperties={pendingPriceReductionProperties}
          onCompletePriceReduction={async (propertyNumber) => {
            // 完了処理を実装
            try {
              // 通知IDを取得
              const response = await api.get('/api/chat-notifications/pending-price-reductions');
              const notification = response.data.notifications.find(
                (n: any) => n.property_number === propertyNumber && n.status === 'pending'
              );
              
              if (notification) {
                await api.post(`/api/chat-notifications/complete-price-reduction/${notification.id}`);
                // 再取得
                await fetchPendingPriceReductions();
              }
            } catch (error) {
              console.error('Failed to complete price reduction:', error);
            }
          }}
        />

        {/* メインコンテンツ */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search 物件（物件番号、所在地、売主、買主）"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={() => { setSearchQuery(''); setPage(0); }}
                      sx={{ minWidth: 'auto', p: 0.5 }}
                    >
                      ✕
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Paper>

          {/* 上部ページネーション */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Paper sx={{ flex: 1 }}>
              <TablePagination
                rowsPerPageOptions={[25, 50, 100]}
                component="div"
                count={filteredListings.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                labelRowsPerPage="表示件数:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
              />
            </Paper>
            
            {selectedPropertyNumbers.size > 0 && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: SECTION_COLORS.property.main }}>
                  {selectedPropertyNumbers.size}件選択中
                </Typography>
                <Button
                  size="small"
                  startIcon={<ClearAllIcon />}
                  onClick={handleClearSelection}
                >
                  選択解除
                </Button>
                <InquiryResponseButton
                  selectedProperties={selectedProperties}
                  onSuccess={() => {
                    handleClearSelection();
                  }}
                />
              </Box>
            )}
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedPropertyNumbers.size > 0 &&
                        selectedPropertyNumbers.size < paginatedListings.filter(l => l.property_number).length
                      }
                      checked={
                        paginatedListings.filter(l => l.property_number).length > 0 &&
                        selectedPropertyNumbers.size === paginatedListings.filter(l => l.property_number).length
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>物件番号</TableCell>
                  <TableCell>バッジ</TableCell>
                  <TableCell>担当</TableCell>
                  <TableCell>種別</TableCell>
                  <TableCell>所在地</TableCell>
                  <TableCell>売主</TableCell>
                  <TableCell>買主</TableCell>
                  <TableCell>問合せ</TableCell>
                  <TableCell>契約日</TableCell>
                  <TableCell>決済日</TableCell>
                  <TableCell>売買価格</TableCell>
                  <TableCell>公開URL</TableCell>
                  <TableCell>格納先URL</TableCell>
                  <TableCell>ATBB状況</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={15} align="center">読み込み中...</TableCell>
                  </TableRow>
                ) : paginatedListings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} align="center">物件データが見つかりませんでした</TableCell>
                  </TableRow>
                ) : (
                  paginatedListings.map((listing) => {
                    const isSelected = listing.property_number ? selectedPropertyNumbers.has(listing.property_number) : false;
                    return (
                      <TableRow
                        key={listing.id}
                        hover
                        sx={{ cursor: 'pointer', bgcolor: isSelected ? 'action.selected' : 'inherit' }}
                      >
                        <TableCell padding="checkbox" onClick={(e) => listing.property_number && handleSelectProperty(listing.property_number, e)}>
                          <Checkbox checked={isSelected} />
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>
                          <Typography variant="body2" sx={{ color: SECTION_COLORS.property.main }} fontWeight="bold">
                            {listing.property_number || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>
                          <StatusBadge atbbStatus={listing.atbb_status} size={isMobile ? 'small' : 'small'} />
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>{listing.sales_assignee || '-'}</TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>
                          {listing.property_type && (
                            <Chip 
                              label={listing.property_type} 
                              size="small"
                              sx={{
                                bgcolor: getPropertyTypeColor(listing.property_type),
                                color: 'white',
                                fontWeight: 'bold',
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {listing.address || listing.display_address || '-'}
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>{listing.seller_name || '-'}</TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>{listing.buyer_name || '-'}</TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>
                          {listing.property_number && (
                            <BuyerIndicator
                              propertyNumber={listing.property_number}
                              buyerCount={buyerCounts[listing.property_number] || 0}
                              hasHighConfidence={highConfidenceProperties.has(listing.property_number)}
                            />
                          )}
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>{formatDate(listing.contract_date)}</TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>{formatDate(listing.settlement_date)}</TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>{formatPrice(listing.price)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <PublicUrlCell
                            propertyNumber={listing.property_number}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {listing.storage_location ? (
                            <Link
                              href={listing.storage_location}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="hover"
                              sx={{
                                fontSize: '0.875rem',
                                maxWidth: 150,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}
                            >
                              Google Drive
                            </Link>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>
                          {getDisplayStatus(listing.atbb_status) || '-'}
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
              count={filteredListings.length}
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

      <PropertyListingDetailModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedPropertyNumber(null); }}
        propertyNumber={selectedPropertyNumber}
        onUpdate={fetchAllData}
      />
    </Container>
  );
}
