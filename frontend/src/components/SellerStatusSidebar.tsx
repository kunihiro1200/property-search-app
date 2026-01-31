/**
 * SellerStatusSidebar - 売主ステータスサイドバーコンポーネント
 * 
 * 売主リストページと通話モードページで共通で使用するサイドバー
 * 現在の売主がどのステータスカテゴリに属するかをハイライト表示
 * 
 * 【サイドバーステータス定義】
 * 1. 「当日TEL分」 - 追客中 + 次電日が今日以前 + コミュニケーション情報が全て空
 * 2. 「当日TEL（内容）」 - 追客中 + 次電日が今日以前 + コミュニケーション情報あり
 * 3. 「未査定」 - 査定額が全て空 + 反響日付が2025/12/8以降 + 営担が空
 * 4. 「査定（郵送）」 - 郵送ステータスが「未」
 * 
 * 【機能】
 * - カテゴリをクリックすると展開され、該当する売主リストが表示される
 * - 「売主リスト」タイトルをクリックすると全カテゴリ表示に戻る
 */

import { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button, Chip, Collapse, IconButton, List, ListItem, Divider, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ExpandMore, ExpandLess, Edit, Email, Phone, Chat, LocationOn } from '@mui/icons-material';
import {
  StatusCategory,
  CategoryCounts,
  isTodayCall,
  isTodayCallWithInfo,
  isUnvaluated,
  isMailingPending,
} from '../utils/sellerStatusFilters';
import { Seller } from '../types';

interface SellerStatusSidebarProps {
  /** 現在表示中の売主（通話モードページで使用） */
  currentSeller?: Seller | any;
  /** カテゴリ別の件数（売主リストページで使用） */
  categoryCounts?: CategoryCounts;
  /** 選択中のカテゴリ（売主リストページで使用） */
  selectedCategory?: StatusCategory;
  /** カテゴリ選択時のコールバック（売主リストページで使用） */
  onCategorySelect?: (category: StatusCategory) => void;
  /** 通話モードページかどうか */
  isCallMode?: boolean;
  /** 売主リスト（展開時に表示する売主データ） */
  sellers?: any[];
  /** ローディング中かどうか */
  loading?: boolean;
}

/**
 * 売主がどのステータスカテゴリに属するかを判定
 */
const getSellerCategory = (seller: Seller | any): StatusCategory | null => {
  if (!seller) return null;
  
  // 優先順位: 当日TEL分 > 当日TEL（内容） > 未査定 > 査定（郵送）
  if (isTodayCall(seller)) return 'todayCall';
  if (isTodayCallWithInfo(seller)) return 'todayCallWithInfo';
  if (isUnvaluated(seller)) return 'unvaluated';
  if (isMailingPending(seller)) return 'mailingPending';
  
  return null;
};

/**
 * カテゴリに該当する売主をフィルタリング
 */
const filterSellersByCategory = (sellers: any[], category: StatusCategory): any[] => {
  if (!sellers) return [];
  
  switch (category) {
    case 'todayCall':
      return sellers.filter(isTodayCall);
    case 'todayCallWithInfo':
      return sellers.filter(isTodayCallWithInfo);
    case 'unvaluated':
      return sellers.filter(isUnvaluated);
    case 'mailingPending':
      return sellers.filter(isMailingPending);
    default:
      return sellers;
  }
};

/**
 * カテゴリの表示名を取得
 */
const getCategoryLabel = (category: StatusCategory): string => {
  switch (category) {
    case 'todayCall':
      return '①当日TEL分';
    case 'todayCallWithInfo':
      return '②当日TEL（内容）';
    case 'unvaluated':
      return '③未査定';
    case 'mailingPending':
      return '④査定（郵送）';
    case 'all':
      return 'All';
    default:
      return '';
  }
};

/**
 * カテゴリの色を取得
 */
const getCategoryColor = (category: StatusCategory): string => {
  switch (category) {
    case 'todayCall':
      return 'error.main';
    case 'todayCallWithInfo':
      return 'secondary.main';
    case 'unvaluated':
      return 'warning.main';
    case 'mailingPending':
      return 'info.main';
    default:
      return 'text.primary';
  }
};

export default function SellerStatusSidebar({
  currentSeller,
  categoryCounts,
  selectedCategory,
  onCategorySelect,
  isCallMode = false,
  sellers = [],
  loading = false,
}: SellerStatusSidebarProps) {
  const navigate = useNavigate();
  
  // デバッグログ - コンポーネントがレンダリングされるたびに出力
  console.log('=== SellerStatusSidebar レンダリング ===');
  console.log('レンダリング時刻:', new Date().toISOString());
  console.log('isCallMode:', isCallMode);
  console.log('loading:', loading);
  console.log('sellers prop received:', sellers);
  console.log('sellers count:', sellers?.length ?? 'undefined/null');
  console.log('sellers type:', typeof sellers);
  console.log('sellers is array:', Array.isArray(sellers));
  
  // sellersが有効な配列かどうかを確認
  const validSellers = Array.isArray(sellers) ? sellers : [];
  console.log('validSellers count:', validSellers.length);
  
  if (validSellers.length > 0) {
    console.log('サンプル売主 (最初の1件):', validSellers[0]);
    
    // フィルタリング結果を確認
    const todayCallCount = validSellers.filter(isTodayCall).length;
    const todayCallWithInfoCount = validSellers.filter(isTodayCallWithInfo).length;
    const unvaluatedCount = validSellers.filter(isUnvaluated).length;
    const mailingPendingCount = validSellers.filter(isMailingPending).length;
    console.log('=== フィルタリング結果 ===');
    console.log('当日TEL分:', todayCallCount);
    console.log('当日TEL（内容）:', todayCallWithInfoCount);
    console.log('未査定:', unvaluatedCount);
    console.log('査定（郵送）:', mailingPendingCount);
    
    // 追客中の売主を確認
    const followingUpSellers = validSellers.filter((s: any) => {
      const status = s.status || '';
      return typeof status === 'string' && status.includes('追客中');
    });
    console.log('追客中の売主:', followingUpSellers.length);
    
    // 次電日が今日以前の売主を確認
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrBeforeSellers = validSellers.filter((s: any) => {
      const nextCallDate = s.nextCallDate || s.next_call_date;
      if (!nextCallDate) return false;
      const date = new Date(nextCallDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() <= today.getTime();
    });
    console.log('次電日が今日以前の売主:', todayOrBeforeSellers.length);
  } else {
    console.warn('⚠️ sellers配列が空です - CallModePageからデータが渡されていない可能性があります');
  }
  
  // 展開中のカテゴリ（nullの場合は全カテゴリ表示）
  const [expandedCategory, setExpandedCategory] = useState<StatusCategory | null>(null);
  
  // 通話モードページの場合、現在の売主のカテゴリを判定
  const currentSellerCategory = isCallMode ? getSellerCategory(currentSeller) : null;
  
  // 通話モードページの場合、現在の売主のカテゴリを自動展開
  useEffect(() => {
    if (isCallMode && currentSellerCategory) {
      setExpandedCategory(currentSellerCategory);
    }
  }, [isCallMode, currentSellerCategory]);
  
  // ボタンがアクティブかどうかを判定
  const isActive = (category: StatusCategory): boolean => {
    if (isCallMode) {
      // 通話モードページ: 現在の売主のカテゴリと一致するかどうか
      return currentSellerCategory === category;
    } else {
      // 売主リストページ: 選択中のカテゴリと一致するかどうか
      return selectedCategory === category;
    }
  };
  
  // カテゴリヘッダークリック時の処理
  const handleCategoryClick = (category: StatusCategory) => {
    if (expandedCategory === category) {
      // 既に展開中のカテゴリをクリックした場合は閉じる
      setExpandedCategory(null);
    } else {
      // 新しいカテゴリを展開
      setExpandedCategory(category);
    }
    
    // 売主リストページの場合、カテゴリを選択
    if (!isCallMode) {
      onCategorySelect?.(category);
    }
  };
  
  // 「売主リスト」タイトルクリック時の処理
  const handleTitleClick = () => {
    setExpandedCategory(null);
    if (!isCallMode) {
      onCategorySelect?.('all');
    }
  };
  
  // 売主クリック時の処理
  const handleSellerClick = (sellerId: string) => {
    navigate(`/sellers/${sellerId}/call`);
  };
  
  // 件数を取得
  const getCount = (category: StatusCategory): number => {
    if (categoryCounts) {
      return categoryCounts[category] ?? 0;
    }
    // sellersから計算
    return filterSellersByCategory(sellers, category).length;
  };

  // カテゴリボタンをレンダリング
  const renderCategoryButton = (category: StatusCategory, label: string, color: string) => {
    const count = getCount(category);
    const isExpanded = expandedCategory === category;
    const filteredSellers = filterSellersByCategory(sellers, category);
    
    // 件数が0の場合は非表示（展開中でない場合）
    if (count === 0 && !isExpanded) return null;
    
    return (
      <Box key={category}>
        <Button
          fullWidth
          onClick={() => handleCategoryClick(category)}
          sx={{ 
            justifyContent: 'space-between', 
            textAlign: 'left',
            fontSize: '0.85rem',
            py: 1,
            px: 1.5,
            color: isActive(category) || isExpanded ? 'white' : color,
            bgcolor: isActive(category) || isExpanded ? color : 'transparent',
            borderRadius: isExpanded ? '4px 4px 0 0' : 1,
            '&:hover': {
              bgcolor: isActive(category) || isExpanded ? color : `${color}15`,
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{label}</span>
            {count > 0 && (
              <Chip 
                label={count} 
                size="small"
                sx={{ 
                  height: 20, 
                  fontSize: '0.7rem',
                  bgcolor: isActive(category) || isExpanded ? 'rgba(255,255,255,0.3)' : undefined,
                  color: isActive(category) || isExpanded ? 'white' : undefined,
                }}
              />
            )}
          </Box>
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </Button>
        
        {/* 展開時の売主リスト */}
        <Collapse in={isExpanded}>
          <Box sx={{ 
            bgcolor: 'grey.50', 
            borderRadius: '0 0 4px 4px',
            border: 1,
            borderColor: 'grey.300',
            borderTop: 0,
            maxHeight: 400,
            overflow: 'auto',
          }}>
            {/* カテゴリサブヘッダー */}
            <Box sx={{ 
              p: 1.5, 
              borderBottom: 1, 
              borderColor: 'grey.200',
              bgcolor: 'grey.100',
            }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color }}>
                {label} <Chip label={count} size="small" sx={{ height: 18, fontSize: '0.7rem', ml: 1 }} />
              </Typography>
            </Box>
            
            {filteredSellers.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  該当する売主がいません
                </Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {filteredSellers.map((seller, index) => (
                  <Box key={seller.id}>
                    <ListItem
                      sx={{ 
                        py: 1.5, 
                        px: 2,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'grey.100' },
                        bgcolor: currentSeller?.id === seller.id ? 'primary.light' : 'transparent',
                      }}
                      onClick={() => handleSellerClick(seller.id)}
                    >
                      <Box sx={{ width: '100%' }}>
                        {/* 売主番号と名前 */}
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {seller.sellerNumber}（{seller.name}）
                          {seller.status && (
                            <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                              ({seller.status})
                            </Typography>
                          )}
                        </Typography>
                        
                        {/* 住所と次電日 */}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {seller.propertyAddress || seller.address || '-'}
                          {seller.nextCallDate && (
                            <span> ({new Date(seller.nextCallDate).toLocaleDateString('ja-JP')})</span>
                          )}
                        </Typography>
                        
                        {/* アクションアイコン */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                          <IconButton size="small" sx={{ p: 0.5 }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          {seller.email && (
                            <IconButton size="small" sx={{ p: 0.5 }}>
                              <Email fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton size="small" sx={{ p: 0.5 }}>
                            <Phone fontSize="small" />
                          </IconButton>
                          <IconButton size="small" sx={{ p: 0.5 }}>
                            <Chat fontSize="small" />
                          </IconButton>
                          <IconButton size="small" sx={{ p: 0.5 }}>
                            <LocationOn fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </ListItem>
                    {index < filteredSellers.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Box>
        </Collapse>
      </Box>
    );
  };

  // 全カテゴリ表示モード（展開中のカテゴリがない場合）
  const renderAllCategories = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {/* All */}
      <Button
        fullWidth
        variant={isActive('all') ? 'contained' : 'text'}
        onClick={() => {
          setExpandedCategory(null);
          if (!isCallMode) {
            onCategorySelect?.('all');
          } else {
            sessionStorage.setItem('selectedStatusCategory', 'all');
            navigate('/');
          }
        }}
        sx={{ 
          justifyContent: 'space-between', 
          textAlign: 'left',
          fontSize: '0.85rem',
          py: 1,
          px: 1.5,
        }}
      >
        <span>All</span>
        {categoryCounts && (
          <Chip label={categoryCounts.all} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
        )}
      </Button>
      
      {renderCategoryButton('todayCall', '①当日TEL分', '#d32f2f')}
      {renderCategoryButton('todayCallWithInfo', '②当日TEL（内容）', '#9c27b0')}
      {renderCategoryButton('unvaluated', '③未査定', '#ed6c02')}
      {renderCategoryButton('mailingPending', '④査定（郵送）', '#0288d1')}
    </Box>
  );

  // 展開モード（特定のカテゴリが展開されている場合）
  const renderExpandedCategory = () => {
    if (!expandedCategory) return null;
    
    const label = getCategoryLabel(expandedCategory);
    const color = getCategoryColor(expandedCategory);
    
    return (
      <Box>
        {renderCategoryButton(
          expandedCategory, 
          label, 
          color === 'error.main' ? '#d32f2f' :
          color === 'secondary.main' ? '#9c27b0' :
          color === 'warning.main' ? '#ed6c02' :
          color === 'info.main' ? '#0288d1' : '#000'
        )}
      </Box>
    );
  };

  return (
    <Paper sx={{ width: 280, flexShrink: 0, p: 2 }}>
      {/* タイトル（クリックで全カテゴリ表示に戻る） */}
      <Button
        fullWidth
        onClick={handleTitleClick}
        sx={{ 
          justifyContent: 'space-between',
          textAlign: 'left',
          mb: 1,
          py: 1,
          px: 1,
          bgcolor: expandedCategory ? 'grey.100' : 'transparent',
          '&:hover': { bgcolor: 'grey.200' },
        }}
      >
        <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold' }}>
          売主リスト
        </Typography>
        {expandedCategory && <ExpandMore />}
      </Button>
      
      {/* ローディング中の表示 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 1 }}>読み込み中...</Typography>
        </Box>
      ) : (
        /* カテゴリリスト */
        expandedCategory ? renderExpandedCategory() : renderAllCategories()
      )}
    </Paper>
  );
}
