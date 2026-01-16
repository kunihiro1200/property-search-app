import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  TextField,
  Stack,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ListIcon from '@mui/icons-material/List';
import { UnifiedSearchBar } from '../components/UnifiedSearchBar';
import { useUnifiedSearch } from '../hooks/useUnifiedSearch';
import { PropertyTypeFilterButtons, PropertyType } from '../components/PropertyTypeFilterButtons';
import PublicPropertyCard from '../components/PublicPropertyCard';
import PublicPropertyHeader from '../components/PublicPropertyHeader';
import PropertyMapView from '../components/PropertyMapView';
import { PublicProperty } from '../types/publicProperty';
import { NavigationState } from '../types/navigationState';
import { SEOHead } from '../components/SEOHead';
import { StructuredData } from '../components/StructuredData';
import { generatePropertyListStructuredData } from '../utils/structuredData';


interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PublicPropertiesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [allProperties, setAllProperties] = useState<PublicProperty[]>([]); // 地図用の全物件
  const [isLoadingAllProperties, setIsLoadingAllProperties] = useState(false); // 全件取得中フラグ
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  // 初回ロードとフィルターロードを分離
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // 表示モード（リスト or 地図）
  // URLパラメータから初期値を取得
  const viewModeParam = searchParams.get('view');
  const [viewMode, setViewMode] = useState<'list' | 'map'>(
    viewModeParam === 'map' ? 'map' : 'list'
  );
  
  // 物件タイプフィルター状態
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);
  
  // 価格フィルター状態
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  
  // 築年数フィルター状態
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  
  // 公開中のみ表示フィルター状態
  const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);
  
  // 初回ロード完了フラグ
  const isInitialLoadDone = useRef(false);
  
  // 統一検索フックを使用
  const { searchQuery, setSearchQuery, handleSearch: originalHandleSearch, searchType } = useUnifiedSearch();
  
  // 物件グリッドへの参照
  const propertyGridRef = useRef<HTMLDivElement>(null);
  
  // 検索実行フラグ
  const [shouldScrollToGrid, setShouldScrollToGrid] = useState(false);
  
  // 検索実行後に物件グリッドまでスクロール
  const handleSearch = () => {
    originalHandleSearch();
    setShouldScrollToGrid(true); // スクロールフラグを立てる
  };
  
  // データ取得完了後にスクロール
  useEffect(() => {
    if (shouldScrollToGrid && !initialLoading && !filterLoading && properties.length > 0 && propertyGridRef.current) {
      // 少し遅延してからスクロール（レンダリング完了を待つ）
      const timer = setTimeout(() => {
        propertyGridRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        setShouldScrollToGrid(false); // フラグをリセット
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [shouldScrollToGrid, initialLoading, filterLoading, properties]);
  
  // 詳細画面から戻ってきた時の状態復元フラグ
  const hasRestoredState = useRef(false);
  
  // 状態復元が完了したかどうかのフラグ
  const [isStateRestored, setIsStateRestored] = useState(false);
  
  // location.stateを保持するref
  const savedNavigationState = useRef<NavigationState | null>(null);

  // fetchPropertiesのトリガー
  const propertyNumberParam = searchParams.get('propertyNumber');
  const locationParam = searchParams.get('location');
  const typesParam = searchParams.get('types');
  
  // 詳細画面から戻ってきた時の状態復元
  useEffect(() => {
    // location.stateから保存された状態を取得
    const savedState = location.state as NavigationState | null;
    
    // refに保存
    if (savedState) {
      savedNavigationState.current = savedState;
    }
    
    // location.keyが変わったら復元フラグをリセット（新しいページ遷移）
    // ただし、savedStateがある場合のみ
    if (savedState) {
      hasRestoredState.current = false;
    }
    
    if (savedState && !hasRestoredState.current) {
      // 復元完了フラグを先に立てる（無限ループ防止）
      hasRestoredState.current = true;
      
      // ページ番号を復元
      if (savedState.currentPage) {
        setCurrentPage(savedState.currentPage);
      }
      
      // フィルター設定を復元
      if (savedState.filters) {
        const { filters } = savedState;
        
        // 物件タイプフィルターを復元
        if (filters.propertyTypes && filters.propertyTypes.length > 0) {
          setSelectedTypes(filters.propertyTypes as PropertyType[]);
        }
        
        // 価格フィルターを復元
        if (filters.priceRange) {
          if (filters.priceRange.min) setMinPrice(filters.priceRange.min);
          if (filters.priceRange.max) setMaxPrice(filters.priceRange.max);
        }
        
        // 築年数フィルターを復元
        if (filters.buildingAgeRange) {
          if (filters.buildingAgeRange.min) setMinAge(filters.buildingAgeRange.min);
          if (filters.buildingAgeRange.max) setMaxAge(filters.buildingAgeRange.max);
        }
        
        // 検索クエリを復元
        if (filters.searchQuery) {
          setSearchQuery(filters.searchQuery);
        }
        
        // 公開中のみ表示フィルターを復元
        if (filters.showPublicOnly !== undefined) {
          setShowPublicOnly(filters.showPublicOnly);
        }
      }
      
      // 状態復元完了
      setIsStateRestored(true);
    } else if (!savedState) {
      // location.stateがない場合（新規アクセスなど）
      if (hasRestoredState.current) {
        hasRestoredState.current = false;
      }
      // 状態復元不要なので即座に完了扱い
      setIsStateRestored(true);
    }
  }, [location.state, location.key]); // location.keyを依存配列に追加
  
  // スクロール位置の復元（画像読み込み完了後）
  useEffect(() => {
    const savedState = location.state as NavigationState | null;
    
    // 物件データが読み込まれていて、スクロール位置が保存されている場合のみ復元
    if (savedState?.scrollPosition && properties.length > 0) {
      // 画像の読み込みを待ってからスクロール位置を復元
      // 複数回試行して確実に復元
      let attempts = 0;
      const maxAttempts = 5; // 試行回数を増やす
      
      const restoreScroll = () => {
        attempts++;
        
        window.scrollTo({
          top: savedState.scrollPosition!,
          behavior: 'auto'
        });
        
        // 復元が成功したか確認
        setTimeout(() => {
          const currentScroll = window.scrollY || window.pageYOffset;
          const diff = Math.abs(currentScroll - savedState.scrollPosition!);
          
          if (diff < 10) {
            // 復元成功（誤差10px以内）
            // 復元成功後、location.stateをクリア（次回のページ遷移で再度復元されないように）
            window.history.replaceState(null, '');
          } else if (attempts < maxAttempts) {
            // 復元失敗、再試行
            setTimeout(restoreScroll, 200); // 間隔を短くする
          } else {
            // 失敗した場合もlocation.stateをクリア
            window.history.replaceState(null, '');
          }
        }, 50); // チェック間隔を短くする
      };
      
      // 最初の試行は少し遅延してから
      const timer = setTimeout(restoreScroll, 300); // 遅延を短くする
      
      return () => clearTimeout(timer);
    }
  }, [properties, location.state, location.key]); // propertiesを依存配列に追加
  // URLパラメータから物件タイプフィルターを復元
  useEffect(() => {
    if (typesParam) {
      const types = typesParam.split(',') as PropertyType[];
      setSelectedTypes(types);
    }
    
    // 価格と築年数のパラメータも復元
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    const minAgeParam = searchParams.get('minAge');
    const maxAgeParam = searchParams.get('maxAge');
    
    if (minPriceParam) setMinPrice(minPriceParam);
    if (maxPriceParam) setMaxPrice(maxPriceParam);
    if (minAgeParam) setMinAge(minAgeParam);
    if (maxAgeParam) setMaxAge(maxAgeParam);
    
    // 公開中のみ表示パラメータも復元
    const showPublicOnlyParam = searchParams.get('showPublicOnly');
    if (showPublicOnlyParam === 'true') {
      setShowPublicOnly(true);
    }
  }, [typesParam]);
  
  // 物件タイプフィルターの変更をURLに反映
  useEffect(() => {
    if (selectedTypes.length > 0) {
      searchParams.set('types', selectedTypes.join(','));
    } else {
      searchParams.delete('types');
    }
    
    // 価格フィルターをURLに反映
    if (minPrice) {
      searchParams.set('minPrice', minPrice);
    } else {
      searchParams.delete('minPrice');
    }
    
    if (maxPrice) {
      searchParams.set('maxPrice', maxPrice);
    } else {
      searchParams.delete('maxPrice');
    }
    
    // 築年数フィルターをURLに反映
    if (minAge) {
      searchParams.set('minAge', minAge);
    } else {
      searchParams.delete('minAge');
    }
    
    if (maxAge) {
      searchParams.set('maxAge', maxAge);
    } else {
      searchParams.delete('maxAge');
    }
    
    // 公開中のみ表示フィルターをURLに反映
    if (showPublicOnly) {
      searchParams.set('showPublicOnly', 'true');
    } else {
      searchParams.delete('showPublicOnly');
    }
    
    // 表示モードをURLに反映
    if (viewMode === 'map') {
      searchParams.set('view', 'map');
    } else {
      searchParams.delete('view');
    }
    
    setSearchParams(searchParams, { replace: true });
  }, [selectedTypes, minPrice, maxPrice, minAge, maxAge, showPublicOnly, viewMode]);
  
  useEffect(() => {
    // 状態復元が完了するまで待つ
    if (!isStateRestored) {
      return;
    }
    
    fetchProperties();
  }, [currentPage, propertyNumberParam, locationParam, typesParam, minPrice, maxPrice, minAge, maxAge, showPublicOnly, isStateRestored]);
  
  // 全件取得は初回とフィルター変更時のみ（currentPageは除外）
  useEffect(() => {
    // 状態復元が完了するまで待つ
    if (!isStateRestored) {
      return;
    }
    
    fetchAllProperties();
  }, [propertyNumberParam, locationParam, typesParam, minPrice, maxPrice, minAge, maxAge, showPublicOnly, isStateRestored]);
  
  // viewModeが変更されたときも全件取得
  useEffect(() => {
    if (viewMode === 'map' && allProperties.length === 0) {
      console.log('🗺️ Map view activated, fetching all properties...');
      fetchAllProperties();
    }
  }, [viewMode]);

  const fetchProperties = async () => {
    try {
      // 初回ロードかフィルター変更かで異なるローディング状態を設定
      if (!isInitialLoadDone.current) {
        setInitialLoading(true);
      } else {
        setFilterLoading(true);
      }
      setError(null);
      
      const offset = (currentPage - 1) * 20;
      
      // URLパラメータから検索条件を取得
      const propertyNumber = searchParams.get('propertyNumber');
      const location = searchParams.get('location');
      const types = searchParams.get('types');
      const minPriceParam = searchParams.get('minPrice');
      const maxPriceParam = searchParams.get('maxPrice');
      const minAgeParam = searchParams.get('minAge');
      const maxAgeParam = searchParams.get('maxAge');
      const showPublicOnlyParam = searchParams.get('showPublicOnly');
      
      // クエリパラメータを構築
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
      });
      
      if (propertyNumber) {
        params.set('propertyNumber', propertyNumber);
      }
      
      if (location) {
        params.set('location', location);
      }
      
      if (types) {
        params.set('types', types);
      }
      
      if (minPriceParam) {
        params.set('minPrice', minPriceParam);
      }
      
      if (maxPriceParam) {
        params.set('maxPrice', maxPriceParam);
      }
      
      if (minAgeParam) {
        params.set('minAge', minAgeParam);
      }
      
      if (maxAgeParam) {
        params.set('maxAge', maxAgeParam);
      }
      
      if (showPublicOnlyParam === 'true') {
        params.set('showPublicOnly', 'true');
      }
      
      const response = await fetch(
        `http://localhost:3000/api/public/properties?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error('物件の取得に失敗しました');
      }
      
      const data = await response.json();
      setProperties(data.properties || []);
      
      // paginationにtotalPagesを追加
      if (data.pagination) {
        const totalPages = Math.ceil(data.pagination.total / data.pagination.limit);
        setPagination({
          ...data.pagination,
          page: currentPage,
          totalPages: totalPages
        });
      }
      
      // 初回ロード完了をマーク
      isInitialLoadDone.current = true;
      
      // 物件データ取得後、スクロール位置を復元
      // refから取得
      setTimeout(() => {
        const savedState = savedNavigationState.current;
        if (savedState?.scrollPosition) {
          window.scrollTo({
            top: savedState.scrollPosition,
            behavior: 'auto'
          });
          // 復元後、refとstateをクリア
          savedNavigationState.current = null;
          window.history.replaceState(null, '');
        }
      }, 600);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setInitialLoading(false);
      setFilterLoading(false);
    }
  };
  
  // 地図表示用に全件取得（フィルター条件は適用）
  // Supabaseの1000件制限を回避するため、複数回リクエストして全件取得
  const fetchAllProperties = async () => {
    try {
      console.log('🔄 fetchAllProperties: Starting to fetch all properties...');
      setIsLoadingAllProperties(true);
      
      // URLパラメータから検索条件を取得
      const propertyNumber = searchParams.get('propertyNumber');
      const location = searchParams.get('location');
      const types = searchParams.get('types');
      const minPriceParam = searchParams.get('minPrice');
      const maxPriceParam = searchParams.get('maxPrice');
      const minAgeParam = searchParams.get('minAge');
      const maxAgeParam = searchParams.get('maxAge');
      const showPublicOnlyParam = searchParams.get('showPublicOnly');
      
      const allFetchedProperties: PublicProperty[] = [];
      let offset = 0;
      const limit = 1000; // Supabaseの最大制限
      let hasMore = true;
      let batchCount = 0;
      
      while (hasMore) {
        batchCount++;
        
        // クエリパラメータを構築
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        });
        
        if (propertyNumber) {
          params.set('propertyNumber', propertyNumber);
        }
        
        if (location) {
          params.set('location', location);
        }
        
        if (types) {
          params.set('types', types);
        }
        
        if (minPriceParam) {
          params.set('minPrice', minPriceParam);
        }
        
        if (maxPriceParam) {
          params.set('maxPrice', maxPriceParam);
        }
        
        if (minAgeParam) {
          params.set('minAge', minAgeParam);
        }
        
        if (maxAgeParam) {
          params.set('maxAge', maxAgeParam);
        }
        
        if (showPublicOnlyParam === 'true') {
          params.set('showPublicOnly', 'true');
        }
        
        console.log(`🔄 fetchAllProperties: Fetching batch ${batchCount} with offset=${offset}, limit=${limit}`);
        
        const response = await fetch(
          `http://localhost:3000/api/public/properties?${params.toString()}`
        );
        
        if (!response.ok) {
          throw new Error('物件の取得に失敗しました');
        }
        
        const data = await response.json();
        const fetchedProperties = data.properties || [];
        
        console.log(`📊 fetchAllProperties: Batch ${batchCount} received ${fetchedProperties.length} properties`);
        
        allFetchedProperties.push(...fetchedProperties);
        
        // 取得した件数がlimit未満の場合、これ以上データがない
        if (fetchedProperties.length < limit) {
          hasMore = false;
          console.log(`✅ fetchAllProperties: All properties fetched (batch ${batchCount} was the last)`);
        } else {
          // 次のバッチへ
          offset += limit;
          console.log(`🔄 fetchAllProperties: Moving to batch ${batchCount + 1}, new offset=${offset}`);
        }
        
        // 安全装置：10回以上ループしたら停止（10,000件以上）
        if (offset >= 10000) {
          hasMore = false;
          console.warn('⚠️ fetchAllProperties: Stopped at 10,000 properties (safety limit)');
        }
      }
      
      console.log(`✅ fetchAllProperties: Total ${allFetchedProperties.length} properties fetched in ${batchCount} batches`);
      
      setAllProperties(allFetchedProperties);
    } catch (err: any) {
      console.error('全件取得エラー:', err);
    } finally {
      setIsLoadingAllProperties(false);
    }
  };
  
  // 物件タイプフィルターのトグル処理
  const handleTypeToggle = (type: PropertyType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
    // ページを1に戻す
    setCurrentPage(1);
  };
  
  // すべてのフィルターをクリアする処理
  const handleClearAllFilters = () => {
    try {
      // 物件タイプ選択をクリア
      setSelectedTypes([]);
      
      // 検索クエリをクリア
      setSearchQuery('');
      
      // 価格フィルターをクリア
      setMinPrice('');
      setMaxPrice('');
      
      // 築年数フィルターをクリア
      setMinAge('');
      setMaxAge('');
      
      // 公開中のみ表示フィルターをクリア
      setShowPublicOnly(false);
      
      // ページを1に戻す
      setCurrentPage(1);
      
      // URLパラメータをクリア
      const newSearchParams = new URLSearchParams();
      setSearchParams(newSearchParams, { replace: true });
      
    } catch (error) {
      console.error('Error clearing filters:', error);
      setError('フィルターのクリアに失敗しました。もう一度お試しください。');
    }
  };

  if (initialLoading) {
    // 初回ロード時のみフルスクリーンローディング表示
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2 }} color="text.secondary">
            読み込み中...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography color="error" variant="h6">
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={fetchProperties}
            sx={{ mt: 2 }}
          >
            再試行
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title="物件一覧"
        description="大分県の不動産物件を検索できます。戸建て、マンション、土地など、様々な物件情報を掲載しています。"
        keywords={['不動産', '物件', '大分', '戸建て', 'マンション', '土地', '売買', '賃貸']}
        canonicalUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />
      
      {/* Structured Data */}
      <StructuredData data={generatePropertyListStructuredData()} />
      
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        {/* ヘッダー */}
        <PublicPropertyHeader />
        
        <Paper elevation={1} sx={{ bgcolor: 'white' }}>
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
              物件一覧
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {pagination && `全${pagination.total}件の物件`}
            </Typography>
            
            {/* 検索バー */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <UnifiedSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder="所在地で検索"
              />
              {searchType && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {searchType === 'property_number' ? '物件番号で検索中' : '所在地で検索中'}
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              startIcon={<LocationOnIcon />}
              sx={{
                height: '56px',
                minWidth: '140px',
                borderColor: '#4CAF50',
                color: '#4CAF50',
                fontWeight: 'bold',
                '&:hover': {
                  borderColor: '#45A049',
                  backgroundColor: '#F1F8F4',
                },
              }}
              onClick={() => setViewMode('map')}
            >
              地図で検索
            </Button>
          </Box>
        </Container>
      </Paper>

      {/* 物件を絞り込むセクション */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper elevation={1} sx={{ p: 0, overflow: 'hidden' }}>
          <Box
            sx={{
              backgroundColor: '#FFC107',
              color: '#111827',
              p: 2,
            }}
          >
            <Typography variant="h6" fontWeight="600">
              物件を絞り込む
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>
          
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* 物件タイプフィルター */}
            <PropertyTypeFilterButtons
              selectedTypes={selectedTypes}
              onTypeToggle={handleTypeToggle}
              disabled={filterLoading}
            />
            
            {/* 価格帯フィルター */}
            <Box>
              <Typography variant="body2" fontWeight={500} color="text.secondary" gutterBottom>
                価格帯（万円）
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  type="number"
                  placeholder="最低価格"
                  size="small"
                  fullWidth
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  inputProps={{ min: 0, step: 100 }}
                />
                <Typography color="text.secondary">〜</Typography>
                <TextField
                  type="number"
                  placeholder="最高価格"
                  size="small"
                  fullWidth
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  inputProps={{ min: 0, step: 100 }}
                />
              </Stack>
            </Box>
            
            {/* 築年数フィルター */}
            <Box>
              <Typography variant="body2" fontWeight={500} color="text.secondary" gutterBottom>
                築年数（年）
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  type="number"
                  placeholder="最小築年数"
                  size="small"
                  fullWidth
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  inputProps={{ min: 0, step: 1 }}
                />
                <Typography color="text.secondary">〜</Typography>
                <TextField
                  type="number"
                  placeholder="最大築年数"
                  size="small"
                  fullWidth
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  inputProps={{ min: 0, step: 1 }}
                />
              </Stack>
            </Box>
            
            {/* 公開中のみ表示ボタン */}
            <Box>
              <Button
                variant={showPublicOnly ? "contained" : "outlined"}
                onClick={() => {
                  setShowPublicOnly(!showPublicOnly);
                  setCurrentPage(1);
                }}
                disabled={filterLoading}
                sx={{
                  borderColor: '#4CAF50',
                  color: showPublicOnly ? '#ffffff' : '#4CAF50',
                  backgroundColor: showPublicOnly ? '#4CAF50' : 'transparent',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#45A049',
                    backgroundColor: showPublicOnly ? '#45A049' : 'rgba(76, 175, 80, 0.08)',
                  },
                }}
                fullWidth
              >
                {showPublicOnly ? '✓ 公開中のみ表示' : '公開中のみ表示'}
              </Button>
            </Box>
            
            {/* すべての条件をクリアボタン */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="outlined"
                onClick={handleClearAllFilters}
                disabled={filterLoading}
                sx={{
                  mt: 1,
                  borderColor: '#FFC107',
                  color: '#FFC107',
                  '&:hover': {
                    borderColor: '#FFB300',
                    bgcolor: 'rgba(255, 193, 7, 0.08)',
                  },
                }}
                aria-label="すべてのフィルター条件をクリア"
              >
                すべての条件をクリア
              </Button>
            </Box>
          </Stack>
          </Box>
        </Paper>
      </Container>

      {/* メインコンテンツ */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* フィルター変更時のローディングインジケーター */}
        {filterLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography color="text.secondary">フィルター適用中...</Typography>
          </Box>
        )}
        
        {properties.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              現在公開中の物件はありません
            </Typography>
          </Box>
        ) : (
          <>
            {/* 表示モード切り替えボタン */}
            {viewMode === 'map' && (
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<ListIcon />}
                  onClick={() => setViewMode('list')}
                  sx={{
                    borderColor: '#FFC107',
                    color: '#000',
                    '&:hover': {
                      borderColor: '#FFB300',
                      backgroundColor: '#FFF9E6',
                    },
                  }}
                >
                  リスト表示に戻る
                </Button>
              </Box>
            )}

            {/* 地図表示 */}
            {viewMode === 'map' ? (
              isLoadingAllProperties ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '600px' }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 2 }} color="text.secondary">
                    全物件データを取得中...
                  </Typography>
                </Box>
              ) : (
                <PropertyMapView properties={allProperties} />
              )
            ) : (
              <>
                {/* 物件グリッド */}
                <Grid container spacing={3} id="property-grid" ref={propertyGridRef}>
                  {properties.map((property, index) => {
                    // 現在のナビゲーション状態を構築
                    const navigationState: Omit<NavigationState, 'scrollPosition'> = {
                      currentPage,
                      filters: {
                        propertyTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
                        priceRange: (minPrice || maxPrice) ? {
                          min: minPrice || undefined,
                          max: maxPrice || undefined
                        } : undefined,
                        buildingAgeRange: (minAge || maxAge) ? {
                          min: minAge || undefined,
                          max: maxAge || undefined
                        } : undefined,
                        searchQuery: searchQuery || undefined,
                        searchType: searchType || undefined,
                        showPublicOnly: showPublicOnly || undefined
                      }
                    };
                    
                    // デバッグ：navigationStateをログ出力
                    if (index === 0) {
                      // 最初の物件のみログ出力（デバッグ用）
                    }
                    
                    return (
                      <Grid item xs={12} md={6} lg={4} key={property.id}>
                        <PublicPropertyCard 
                          property={property}
                          animationDelay={index * 0.1}
                          navigationState={navigationState}
                        />
                      </Grid>
                    );
                  })}
                </Grid>

                {/* ページネーション */}
                {pagination && pagination.totalPages > 1 && (
                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        // ページ変更時はlocation.stateをクリア（スクロール位置を復元しない）
                        window.history.replaceState(null, '');
                        setCurrentPage(p => Math.max(1, p - 1));
                        // 物件グリッドの位置にスクロール
                        setTimeout(() => {
                          const gridElement = document.getElementById('property-grid');
                          if (gridElement) {
                            const yOffset = -20; // 少し余白を持たせる
                            const y = gridElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      disabled={currentPage === 1}
                    >
                      前へ
                    </Button>
                
                <Typography sx={{ px: 2 }}>
                  {currentPage} / {pagination.totalPages}
                </Typography>
                
                    <Button
                      variant="outlined"
                      onClick={() => {
                        // ページ変更時はlocation.stateをクリア（スクロール位置を復元しない）
                        window.history.replaceState(null, '');
                        setCurrentPage(p => Math.min(pagination.totalPages, p + 1));
                        // 物件グリッドの位置にスクロール
                        setTimeout(() => {
                          const gridElement = document.getElementById('property-grid');
                          if (gridElement) {
                            const yOffset = -20; // 少し余白を持たせる
                            const y = gridElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                      disabled={currentPage === pagination.totalPages}
                    >
                      次へ
                    </Button>
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </Container>
    </Box>
    </>
  );
};

export default PublicPropertiesPage;
