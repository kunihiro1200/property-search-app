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
  List,
  ListItemButton,
  ListItemText,
  Badge,
  Divider,
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
import {
  PropertyListing,
  WorkTask,
  PROPERTY_STATUS_DEFINITIONS,
  calculatePropertyStatus,
  calculateStatusCounts,
  filterByStatus,
  createWorkTaskMap,
} from '../utils/propertyListingStatusUtils';
import { getDisplayStatus } from '../utils/atbbStatusDisplayMapper';

export default function PropertyListingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [allListings, setAllListings] = useState<PropertyListing[]>([]);
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedPropertyNumber, setSelectedPropertyNumber] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [buyerCounts, setBuyerCounts] = useState<Record<string, number>>({});
  const [highConfidenceProperties, setHighConfidenceProperties] = useState<Set<string>>(new Set());
  const [buyerFilter, setBuyerFilter] = useState<'all' | 'hasBuyers' | 'highConfidence'>('all');
  const [selectedPropertyNumbers, setSelectedPropertyNumbers] = useState<Set<string>>(new Set());

  // 状態を復元
  useEffect(() => {
    const savedState = location.state as any;
    if (savedState) {
      if (savedState.page !== undefined) setPage(savedState.page);
      if (savedState.rowsPerPage !== undefined) setRowsPerPage(savedState.rowsPerPage);
      if (savedState.searchQuery !== undefined) setSearchQuery(savedState.searchQuery);
      if (savedState.selectedAssignee !== undefined) setSelectedAssignee(savedState.selectedAssignee);
      if (savedState.selectedStatus !== undefined) setSelectedStatus(savedState.selectedStatus);
      if (savedState.buyerFilter !== undefined) setBuyerFilter(savedState.buyerFilter);
    }
  }, [location.state]);

  useEffect(() => {
    fetchAllData();
  }, []);

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
          params: { limit, offset, orderBy: 'contract_date', orderDirection: 'desc' },
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
      
      // 業務依頼データを取得
      const workTasksRes = await api.get('/api/work-tasks', {
        params: { limit: 1000, offset: 0 },
      });
      
      setAllListings(allListingsData);
      setWorkTasks(workTasksRes.data.data || []);
      
      console.log('✅ データ取得成功:', {
        物件数: allListingsData.length,
        業務依頼数: workTasksRes.data.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 業務依頼マップを作成
  const workTaskMap = useMemo(() => createWorkTaskMap(workTasks), [workTasks]);

  // 担当者別カウント
  const assigneeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allListings.length };
    allListings.forEach(listing => {
      const key = listing.sales_assignee || '未設定';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allListings]);

  // ステータス別カウント
  const statusCounts = useMemo(() => {
    // 簡易修正: すべての物件を表示
    const counts: Record<string, number> = { all: allListings.length };
    console.log('Status counts:', counts);
    return counts;
  }, [allListings]);

  // フィルタリング
  const filteredListings = useMemo(() => {
    let listings = allListings;
    
    // 担当者フィルター
    if (selectedAssignee && selectedAssignee !== 'all') {
      listings = listings.filter(l => 
        selectedAssignee === '未設定' 
          ? !l.sales_assignee 
          : l.sales_assignee === selectedAssignee
      );
    }
    
    // ステータスフィルター
    if (selectedStatus && selectedStatus !== 'all') {
      listings = filterByStatus(listings, selectedStatus, workTaskMap);
      console.log(`Status filter: ${selectedStatus}, filtered count: ${listings.length}`);
    }
    
    // 買主フィルター
    if (buyerFilter === 'hasBuyers') {
      listings = listings.filter(l => 
        l.property_number && buyerCounts[l.property_number] > 0
      );
    } else if (buyerFilter === 'highConfidence') {
      listings = listings.filter(l => 
        l.property_number && highConfidenceProperties.has(l.property_number)
      );
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
  }, [allListings, selectedAssignee, selectedStatus, buyerFilter, buyerCounts, highConfidenceProperties, searchQuery, workTaskMap]);

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
      selectedStatus,
      buyerFilter,
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

  // サイドバー用のステータスリスト（件数があるもののみ）
  const statusList = useMemo(() => {
    const list = [{ key: 'all', label: 'All', count: statusCounts.all, color: '#666' }];
    PROPERTY_STATUS_DEFINITIONS.forEach(status => {
      const count = statusCounts[status.key] || 0;
      if (count > 0) {
        list.push({ key: status.key, label: status.label, count, color: status.color });
      }
    });
    return list;
  }, [statusCounts]);

  // 各行のステータスを取得
  const getRowStatus = (listing: PropertyListing) => {
    return calculatePropertyStatus(listing, workTaskMap);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">物件リスト</Typography>
        <PublicSiteButtons />
      </Box>
      
      {/* ページナビゲーション */}
      <PageNavigation />

      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* 左サイドバー - フィルター */}
        <Paper sx={{ width: 220, flexShrink: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
            <Typography variant="subtitle1" fontWeight="bold">買主フィルター</Typography>
          </Box>
          <List dense>
            <ListItemButton
              selected={buyerFilter === 'all'}
              onClick={() => { setBuyerFilter('all'); setPage(0); }}
              sx={{ py: 0.5 }}
            >
              <ListItemText primary="すべて" primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
            <ListItemButton
              selected={buyerFilter === 'hasBuyers'}
              onClick={() => { setBuyerFilter('hasBuyers'); setPage(0); }}
              sx={{ py: 0.5 }}
            >
              <ListItemText primary="買主あり" primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
            <ListItemButton
              selected={buyerFilter === 'highConfidence'}
              onClick={() => { setBuyerFilter('highConfidence'); setPage(0); }}
              sx={{ py: 0.5 }}
            >
              <ListItemText primary="高確度買主あり" primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
          </List>
          
          <Divider />
          
          <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
            <Typography variant="subtitle1" fontWeight="bold">ステータス</Typography>
          </Box>
          <List dense sx={{ maxHeight: 'calc(50vh - 100px)', overflow: 'auto' }}>
            {statusList.map((item) => (
              <ListItemButton
                key={item.key}
                selected={selectedStatus === item.key || (!selectedStatus && item.key === 'all')}
                onClick={() => { setSelectedStatus(item.key === 'all' ? null : item.key); setPage(0); }}
                sx={{ py: 0.5 }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: item.color,
                    mr: 1,
                    flexShrink: 0,
                  }}
                />
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
          <List dense sx={{ maxHeight: 'calc(50vh - 100px)', overflow: 'auto' }}>
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
              placeholder="Search 物件（物件番号、所在地、売主、買主）"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
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
                <Typography variant="body2" color="primary">
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
                  <TableCell>ステータス</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={16} align="center">読み込み中...</TableCell>
                  </TableRow>
                ) : paginatedListings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} align="center">物件データが見つかりませんでした</TableCell>
                  </TableRow>
                ) : (
                  paginatedListings.map((listing) => {
                    const status = getRowStatus(listing);
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
                          <Typography variant="body2" color="primary" fontWeight="bold">
                            {listing.property_number || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>
                          <StatusBadge atbbStatus={listing.atbb_status} size={isMobile ? 'small' : 'small'} />
                        </TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>{listing.sales_assignee || '-'}</TableCell>
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>
                          {listing.property_type && (
                            <Chip label={listing.property_type} size="small" />
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
                        <TableCell onClick={() => listing.property_number && handleRowClick(listing.property_number)}>
                          <Chip 
                            label={status.label} 
                            size="small" 
                            sx={{ 
                              bgcolor: status.color, 
                              color: 'white',
                              maxWidth: 150,
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }
                            }} 
                          />
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
