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
  isVisitScheduled,
  isVisitCompleted,
  isUnvaluated,
  isMailingPending,
  isTodayCallNotStarted,
  isPinrichEmpty,
  getVisitStatusLabel,
} from '../utils/sellerStatusFilters';
import { Seller } from '../types';

interface SellerStatusSidebarProps {
  /** 現在表示中の売主（通話モードページで使用） */
  currentSeller?: Seller | any;
  /** カテゴリ別の件数（売主リストページで使用） */
  categoryCounts?: CategoryCounts;
  /** 選択中のカテゴリ（売主リストページで使用） */
  selectedCategory?: StatusCategory;
  /** 選択中の営担イニシャル（訪問予定/訪問済みで使用） */
  selectedVisitAssignee?: string;
  /** カテゴリ選択時のコールバック（売主リストページで使用） */
  onCategorySelect?: (category: StatusCategory, visitAssignee?: string) => void;
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
  
  // 優先順位: 訪問予定 > 訪問済み > 当日TEL分 > 当日TEL（内容） > 未査定 > 査定（郵送）
  if (isVisitScheduled(seller)) return 'visitScheduled';
  if (isVisitCompleted(seller)) return 'visitCompleted';
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
    case 'visitScheduled':
      return sellers.filter(isVisitScheduled);
    case 'visitCompleted':
      return sellers.filter(isVisitCompleted);
    case 'todayCall':
      return sellers.filter(isTodayCall);
    case 'todayCallWithInfo':
      return sellers.filter(isTodayCallWithInfo);
    case 'unvaluated':
      return sellers.filter(isUnvaluated);
    case 'mailingPending':
      return sellers.filter(isMailingPending);
    case 'todayCallNotStarted':
      return sellers.filter(isTodayCallNotStarted);
    case 'pinrichEmpty':
      return sellers.filter(isPinrichEmpty);
    default:
      return sellers;
  }
};

/**
 * カテゴリの表示名を取得
 */
const getCategoryLabel = (category: StatusCategory): string => {
  switch (category) {
    case 'visitScheduled':
      return '①訪問予定';
    case 'visitCompleted':
      return '②訪問済み';
    case 'todayCall':
      return '③当日TEL分';
    case 'todayCallWithInfo':
      return '④当日TEL（内容）';
    case 'unvaluated':
      return '⑤未査定';
    case 'mailingPending':
      return '⑥査定（郵送）';
    case 'todayCallNotStarted':
      return '⑦当日TEL_未着手';
    case 'pinrichEmpty':
      return '⑧Pinrich空欄';
    case 'all':
      return 'All';
    default:
      return '';
  }
};

/**
 * 訪問予定/訪問済みの営担イニシャル別データを取得
 * @returns { initial: string, count: number, sellers: any[] }[] イニシャル別のデータ
 */
const getVisitDataByAssignee = (
  sellers: any[],
  filterFn: (seller: any) => boolean
): { initial: string; count: number; sellers: any[] }[] => {
  const dataMap: { [initial: string]: any[] } = {};
  
  sellers.filter(filterFn).forEach(seller => {
    const assignee = seller.visitAssignee || seller.visit_assignee || '';
    if (assignee && assignee.trim() !== '') {
      const initial = assignee.trim();
      if (!dataMap[initial]) {
        dataMap[initial] = [];
      }
      dataMap[initial].push(seller);
    }
  });
  
  return Object.entries(dataMap)
    .map(([initial, sellers]) => ({
      initial,
      count: sellers.length,
      sellers,
    }))
    .sort((a, b) => b.count - a.count); // 件数の多い順
};

/**
 * カテゴリの色を取得
 */
const getCategoryColor = (category: StatusCategory): string => {
  switch (category) {
    case 'visitScheduled':
      return 'success.main';  // 緑色
    case 'visitCompleted':
      return 'primary.main';  // 青色
    case 'todayCall':
      return 'error.main';
    case 'todayCallWithInfo':
      return 'secondary.main';
    case 'unvaluated':
      return 'warning.main';
    case 'mailingPending':
      return 'info.main';
    case 'todayCallNotStarted':
      return '#ff9800';  // オレンジ
    case 'pinrichEmpty':
      return '#795548';  // ブラウン
    default:
      return 'text.primary';
  }
};

export default function SellerStatusSidebar({
  currentSeller,
  categoryCounts,
  selectedCategory,
  selectedVisitAssignee,
  onCategorySelect,
  isCallMode = false,
  sellers = [],
  loading = false,
}: SellerStatusSidebarProps) {
  const navigate = useNavigate();
  
  // 展開中のカテゴリ（nullの場合は全カテゴリ表示）
  // sessionStorageから復元（リロード時に状態を維持）
  const [expandedCategory, setExpandedCategory] = useState<StatusCategory | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('sidebarExpandedCategory');
      return saved as StatusCategory | null;
    }
    return null;
  });
  
  // 訪問予定/訪問済みは展開せず、クリックでメインテーブルにフィルタリング結果を表示するため、
  // expandedVisitKeyは廃止（展開機能を削除）
  
  // sellersが有効な配列かどうかを確認
  const validSellers = Array.isArray(sellers) ? sellers : [];
  
  // expandedCategoryが変更されたらsessionStorageに保存
  useEffect(() => {
    if (expandedCategory) {
      sessionStorage.setItem('sidebarExpandedCategory', expandedCategory);
    } else {
      sessionStorage.removeItem('sidebarExpandedCategory');
    }
  }, [expandedCategory]);
  
  // 通話モードページの場合、現在の売主のカテゴリを判定
  const currentSellerCategory = isCallMode ? getSellerCategory(currentSeller) : null;
  
  // 通話モードページの場合、sessionStorageに保存された展開状態がなければ現在の売主のカテゴリを自動展開
  // ※ sessionStorageに保存された展開状態がある場合は、それを優先する（ユーザーが選択したカテゴリを維持）
  useEffect(() => {
    if (isCallMode && currentSellerCategory) {
      // sessionStorageに展開状態が保存されていない場合のみ、現在の売主のカテゴリを自動展開
      const savedCategory = sessionStorage.getItem('sidebarExpandedCategory');
      
      if (!savedCategory) {
        setExpandedCategory(currentSellerCategory);
      }
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

  // 通話モードページで現在の売主の営担イニシャルを取得
  const currentSellerVisitAssignee = isCallMode && currentSeller 
    ? (currentSeller.visitAssignee || currentSeller.visit_assignee || '').trim()
    : '';

  /**
   * 営担イニシャルが一致するかどうかを判定
   * 
   * 注意: APIレスポンスでは、visitAssigneeがイニシャルからフルネームに変換される場合がある
   * 例: '生' → '生野'
   * そのため、完全一致だけでなく、先頭文字での一致もチェックする
   * 
   * @param assignee 現在の売主の営担（フルネームの場合あり）
   * @param initial サイドバーに表示されるイニシャル
   * @returns 一致するかどうか
   */
  const isMatchingAssignee = (assignee: string, initial: string): boolean => {
    if (!assignee || !initial) return false;
    
    // 完全一致をチェック
    if (assignee === initial) return true;
    
    // 先頭文字での一致をチェック（フルネームの場合）
    // 例: assignee='生野', initial='生' → true
    if (assignee.charAt(0) === initial) return true;
    
    // イニシャルが先頭文字と一致するかチェック（逆方向）
    // 例: assignee='生', initial='生野' → true（通常はこのケースはないが念のため）
    if (initial.charAt(0) === assignee) return true;
    
    return false;
  };

  // 訪問予定/訪問済みのイニシャル別ボタンをレンダリング
  // クリックでメインテーブルにフィルタリング結果を表示（展開機能は廃止）
  const renderVisitCategoryButtons = (
    category: 'visitScheduled' | 'visitCompleted',
    prefix: string,
    color: string
  ) => {
    // categoryCountsからイニシャル別カウントを取得（APIから取得したデータを優先）
    const byAssigneeKey = category === 'visitScheduled' ? 'visitScheduledByAssignee' : 'visitCompletedByAssignee';
    const byAssigneeData = categoryCounts?.[byAssigneeKey] || [];
    
    // APIからイニシャル別カウントが取得できた場合はそれを使用
    if (byAssigneeData.length > 0) {
      return (
        <Box key={category}>
          {byAssigneeData.map(({ initial, count }) => {
            const visitKey = `${category}-${initial}`;
            // 選択状態の判定: 
            // - 売主リストページ: カテゴリとイニシャルの両方が一致する場合
            // - 通話モードページ: 現在の売主のカテゴリとイニシャルが一致する場合
            // 注意: currentSellerVisitAssigneeはフルネームの場合があるため、isMatchingAssigneeで比較
            const isSelected = isCallMode
              ? (currentSellerCategory === category && isMatchingAssignee(currentSellerVisitAssignee, initial))
              : (selectedCategory === category && selectedVisitAssignee === initial);
            const label = `${prefix}(${initial})`;
            
            return (
              <Box key={visitKey}>
                <Button
                  fullWidth
                  onClick={() => {
                    if (isSelected) {
                      // 既に選択中の場合は選択解除
                      if (!isCallMode) {
                        onCategorySelect?.('all', undefined);
                      }
                    } else {
                      // 新しいカテゴリを選択してメインテーブルをフィルタリング
                      setExpandedCategory(null);
                      if (!isCallMode) {
                        onCategorySelect?.(category, initial);
                      }
                    }
                  }}
                  sx={{ 
                    justifyContent: 'space-between', 
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    py: 0.75,
                    px: 1.5,
                    color: isSelected ? 'white' : color,
                    bgcolor: isSelected ? color : 'transparent',
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: isSelected ? color : `${color}15`,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{label}</span>
                    <Chip 
                      label={count} 
                      size="small"
                      sx={{ 
                        height: 20, 
                        fontSize: '0.7rem',
                        bgcolor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                        color: isSelected ? 'white' : undefined,
                      }}
                    />
                  </Box>
                </Button>
              </Box>
            );
          })}
        </Box>
      );
    }
    
    // フォールバック: sellersからフィルタリング（従来の動作）
    const filterFn = category === 'visitScheduled' ? isVisitScheduled : isVisitCompleted;
    const visitData = getVisitDataByAssignee(sellers, filterFn);
    
    // 該当データがない場合は非表示
    if (visitData.length === 0) return null;
    
    return (
      <Box key={category}>
        {visitData.map(({ initial, count }) => {
          const visitKey = `${category}-${initial}`;
          // 選択状態の判定: 
          // - 売主リストページ: カテゴリとイニシャルの両方が一致する場合
          // - 通話モードページ: 現在の売主のカテゴリとイニシャルが一致する場合
          // 注意: currentSellerVisitAssigneeはフルネームの場合があるため、isMatchingAssigneeで比較
          const isSelected = isCallMode
            ? (currentSellerCategory === category && isMatchingAssignee(currentSellerVisitAssignee, initial))
            : (selectedCategory === category && selectedVisitAssignee === initial);
          const label = `${prefix}(${initial})`;
          
          return (
            <Box key={visitKey}>
              <Button
                fullWidth
                onClick={() => {
                  if (isSelected) {
                    if (!isCallMode) {
                      onCategorySelect?.('all', undefined);
                    }
                  } else {
                    setExpandedCategory(null);
                    if (!isCallMode) {
                      onCategorySelect?.(category, initial);
                    }
                  }
                }}
                sx={{ 
                  justifyContent: 'space-between', 
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  py: 0.75,
                  px: 1.5,
                  color: isSelected ? 'white' : color,
                  bgcolor: isSelected ? color : 'transparent',
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: isSelected ? color : `${color}15`,
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{label}</span>
                  <Chip 
                    label={count} 
                    size="small"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      bgcolor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                      color: isSelected ? 'white' : undefined,
                    }}
                  />
                </Box>
              </Button>
            </Box>
          );
        })}
      </Box>
    );
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
  const renderAllCategories = () => {
    // 通話モードページで、現在の売主がどのカテゴリにも属さない場合は「All」をハイライト
    const isAllActive = isCallMode 
      ? (currentSellerCategory === null)  // どのカテゴリにも属さない場合
      : isActive('all');
    
    return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {/* All */}
      <Button
        fullWidth
        variant={isAllActive ? 'contained' : 'text'}
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
      
      {/* ①訪問予定（イニシャル別に縦並び） */}
      {renderVisitCategoryButtons('visitScheduled', '①訪問予定', '#2e7d32')}
      
      {/* ②訪問済み（イニシャル別に縦並び） */}
      {renderVisitCategoryButtons('visitCompleted', '②訪問済み', '#1976d2')}
      
      {renderCategoryButton('todayCall', '③当日TEL分', '#d32f2f')}
      {renderCategoryButton('todayCallWithInfo', '④当日TEL（内容）', '#9c27b0')}
      {renderCategoryButton('unvaluated', '⑤未査定', '#ed6c02')}
      {renderCategoryButton('mailingPending', '⑥査定（郵送）', '#0288d1')}
      {renderCategoryButton('todayCallNotStarted', '⑦当日TEL_未着手', '#ff9800')}
      {renderCategoryButton('pinrichEmpty', '⑧Pinrich空欄', '#795548')}
    </Box>
  );};

  // 訪問予定/訪問済みのボタンは展開せず、クリックでメインテーブルにフィルタリング結果を表示
  // renderExpandedVisitCategory関数は削除（展開機能を廃止）

  // 展開モード（特定のカテゴリが展開されている場合）
  // 訪問予定/訪問済みは展開せず、メインテーブルにフィルタリング結果を表示するため、expandedVisitKeyは使用しない
  const renderExpandedCategory = () => {
    if (!expandedCategory) return null;
    
    const label = getCategoryLabel(expandedCategory);
    const color = getCategoryColor(expandedCategory);
    
    return (
      <Box>
        {renderCategoryButton(
          expandedCategory, 
          label, 
          color === 'success.main' ? '#2e7d32' :
          color === 'primary.main' ? '#1976d2' :
          color === 'error.main' ? '#d32f2f' :
          color === 'secondary.main' ? '#9c27b0' :
          color === 'warning.main' ? '#ed6c02' :
          color === 'info.main' ? '#0288d1' :
          color === '#ff9800' ? '#ff9800' :
          color === '#795548' ? '#795548' : '#000'
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
