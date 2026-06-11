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
import KujiraPropertyHeader from '../components/KujiraPropertyHeader';
import PropertyMapView from '../components/PropertyMapView';
import { PublicProperty } from '../types/publicProperty';
import { NavigationState } from '../types/navigationState';
import { SEOHead } from '../components/SEOHead';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const KujiraPropertiesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useGoogleMaps();

  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [allProperties, setAllProperties] = useState<PublicProperty[]>([]);
  const [isLoadingAllProperties, setIsLoadingAllProperties] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const isReturningFromDetail = useRef(!!sessionStorage.getItem('kujiraPropertiesNavigationState'));
  const [initialLoading, setInitialLoading] = useState(!isReturningFromDetail.current);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const viewModeParam = searchParams.get('view');
  const [viewMode, setViewMode] = useState<'list' | 'map'>(
    viewModeParam === 'map' ? 'map' : 'list'
  );

  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [showPublicOnly, setShowPublicOnly] = useState<boolean>(false);

  const isInitialLoadDone = useRef(false);
  const { searchQuery, setSearchQuery, handleSearch: originalHandleSearch, searchType } = useUnifiedSearch();

  const propertyGridRef = useRef<HTMLDivElement>(null);
  const mapViewRef = useRef<HTMLDivElement>(null);
  const mapFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapFetchAbortControllerRef = useRef<AbortController | null>(null);
  const listFetchAbortControllerRef = useRef<AbortController | null>(null);
  const [shouldScrollToGrid, setShouldScrollToGrid] = useState(false);
  const [shouldScrollToMap, setShouldScrollToMap] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      originalHandleSearch();
    }
    setShouldScrollToGrid(true);
  };

  // スクロール処理
  useEffect(() => {
    if (shouldScrollToGrid && !initialLoading && !filterLoading && properties.length > 0 && propertyGridRef.current) {
      const timer = setTimeout(() => {
        propertyGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setShouldScrollToGrid(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldScrollToGrid, initialLoading, filterLoading, properties]);

  useEffect(() => {
    if (shouldScrollToMap && viewMode === 'map' && !isLoadingAllProperties && mapViewRef.current) {
      const timer = setTimeout(() => {
        mapViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setShouldScrollToMap(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldScrollToMap, viewMode, isLoadingAllProperties]);

  const hasRestoredState = useRef(false);
  const [isStateRestored, setIsStateRestored] = useState(false);
  const isRestoringState = useRef(false);
  const savedNavigationState = useRef<NavigationState | null>(null);

  // 状態復元
  useEffect(() => {
    let savedState = location.state as NavigationState | null;

    if (!savedState) {
      const savedStateStr = sessionStorage.getItem('kujiraPropertiesNavigationState');
      if (savedStateStr) {
        try {
          savedState = JSON.parse(savedStateStr);
          sessionStorage.removeItem('kujiraPropertiesNavigationState');
        } catch (e) {
          console.error('Failed to parse saved state:', e);
        }
      }
    }

    if (savedState) {
      savedNavigationState.current = savedState;
    }

    if (savedState && !hasRestoredState.current) {
      hasRestoredState.current = true;
      isRestoringState.current = true;

      if (savedState.currentPage) setCurrentPage(savedState.currentPage);

      if (savedState.filters) {
        const { filters } = savedState;
        if (filters.propertyTypes?.length) setSelectedTypes(filters.propertyTypes as PropertyType[]);
        if (filters.priceRange?.min) setMinPrice(filters.priceRange.min);
        if (filters.priceRange?.max) setMaxPrice(filters.priceRange.max);
        if (filters.buildingAgeRange?.min) setMinAge(filters.buildingAgeRange.min);
        if (filters.buildingAgeRange?.max) setMaxAge(filters.buildingAgeRange.max);
        if (filters.searchQuery) setSearchQuery(filters.searchQuery);
        if (filters.showPublicOnly !== undefined) setShowPublicOnly(filters.showPublicOnly);
      }

      if (savedState.viewMode) {
        setViewMode(savedState.viewMode);
        if (savedState.viewMode === 'map') prevViewModeRef.current = 'map';
      }

      setTimeout(() => {
        isRestoringState.current = false;
        isReturningFromDetail.current = false;
        setIsStateRestored(true);
      }, 200);
    } else if (!savedState) {
      if (hasRestoredState.current) hasRestoredState.current = false;
      isRestoringState.current = false;
      setIsStateRestored(true);
    }
  }, [location.state, location.key]);

  // URLパラメータ復元（初回マウント時のみ）
  useEffect(() => {
    const typesParam = searchParams.get('types');
    if (typesParam) {
      const typeMapping: Record<string, PropertyType> = {
        'apartment': 'マンション',
        'detached_house': '戸建',
        'land': '土地',
        'income': '収益物件',
      };
      const types = typesParam.split(',').map(t => typeMapping[t] || t) as PropertyType[];
      setSelectedTypes(types);
    }

    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    const minAgeParam = searchParams.get('minAge');
    const maxAgeParam = searchParams.get('maxAge');
    const showPublicOnlyParam = searchParams.get('showPublicOnly');

    if (minPriceParam) setMinPrice(minPriceParam);
    if (maxPriceParam) setMaxPrice(maxPriceParam);
    if (minAgeParam) setMinAge(minAgeParam);
    if (maxAgeParam) setMaxAge(maxAgeParam);
    if (showPublicOnlyParam === 'true') setShowPublicOnly(true);
  }, []);

  // URLパラメータへの反映
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);

    if (selectedTypes.length > 0) newParams.set('types', selectedTypes.join(','));
    else newParams.delete('types');

    if (minPrice) newParams.set('minPrice', minPrice);
    else newParams.delete('minPrice');

    if (maxPrice) newParams.set('maxPrice', maxPrice);
    else newParams.delete('maxPrice');

    if (minAge) newParams.set('minAge', minAge);
    else newParams.delete('minAge');

    if (maxAge) newParams.set('maxAge', maxAge);
    else newParams.delete('maxAge');

    if (showPublicOnly) newParams.set('showPublicOnly', 'true');
    else newParams.delete('showPublicOnly');

    if (viewMode === 'map') newParams.set('view', 'map');
    else newParams.delete('view');

    setSearchParams(newParams, { replace: true });
  }, [selectedTypes, minPrice, maxPrice, minAge, maxAge, showPublicOnly, viewMode]);

  const prevViewModeRef = useRef<'list' | 'map'>('list');
  const filterChangedDuringMapRef = useRef(false);
  const searchParamsDuringMapRef = useRef<string>('');
  const propertiesLengthRef = useRef(0);

  const getFilterOnlyParams = (params: URLSearchParams): string => {
    const copy = new URLSearchParams(params);
    copy.delete('view');
    return copy.toString();
  };

  // リスト用データ取得トリガー
  useEffect(() => {
    if (!isStateRestored) return;

    if (viewMode === 'map') {
      const currentParams = getFilterOnlyParams(searchParams);
      if (prevViewModeRef.current === 'map' && searchParamsDuringMapRef.current !== currentParams) {
        filterChangedDuringMapRef.current = true;
      }
      searchParamsDuringMapRef.current = currentParams;
      prevViewModeRef.current = 'map';
      return;
    }

    if (prevViewModeRef.current === 'map' && viewMode === 'list') {
      prevViewModeRef.current = 'list';
      if (!filterChangedDuringMapRef.current && propertiesLengthRef.current > 0) {
        filterChangedDuringMapRef.current = false;
        return;
      }
      filterChangedDuringMapRef.current = false;
    } else {
      prevViewModeRef.current = 'list';
    }

    fetchProperties();
  }, [currentPage, searchParams, isStateRestored, viewMode]);

  // 地図用全件取得トリガー
  useEffect(() => {
    if (!isStateRestored) return;
    if (viewMode !== 'map') return;

    if (mapFetchTimerRef.current) clearTimeout(mapFetchTimerRef.current);

    mapFetchTimerRef.current = setTimeout(() => {
      fetchAllProperties();
    }, 400);

    return () => {
      if (mapFetchTimerRef.current) clearTimeout(mapFetchTimerRef.current);
    };
  }, [searchParams, isStateRestored, viewMode]);

  const fetchProperties = async () => {
    if (listFetchAbortControllerRef.current) listFetchAbortControllerRef.current.abort();
    const abortController = new AbortController();
    listFetchAbortControllerRef.current = abortController;

    try {
      if (!isInitialLoadDone.current && !isReturningFromDetail.current) {
        setInitialLoading(true);
      } else {
        setFilterLoading(true);
      }
      setError(null);

      const offset = (currentPage - 1) * 20;

      const propertyNumber = searchParams.get('propertyNumber');
      const location = searchParams.get('location');
      const types = searchParams.get('types');
      const minPriceParam = searchParams.get('minPrice');
      const maxPriceParam = searchParams.get('maxPrice');
      const minAgeParam = searchParams.get('minAge');
      const maxAgeParam = searchParams.get('maxAge');
      const showPublicOnlyParam = searchParams.get('showPublicOnly');

      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
        skipImages: 'true',
      });

      if (propertyNumber) params.set('propertyNumber', propertyNumber);
      if (location) params.set('location', location);
      if (types) params.set('types', types);
      if (minPriceParam) params.set('minPrice', minPriceParam);
      if (maxPriceParam) params.set('maxPrice', maxPriceParam);
      if (minAgeParam) params.set('minAge', minAgeParam);
      if (maxAgeParam) params.set('maxAge', maxAgeParam);
      if (showPublicOnlyParam === 'true') params.set('showPublicOnly', 'true');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      // くじら専用エンドポイント（FI物件のみ返す）
      const response = await fetch(
        `${apiUrl}/api/kujira/properties?${params.toString()}`,
        { signal: abortController.signal }
      );

      if (!response.ok) throw new Error('物件の取得に失敗しました');

      const data = await response.json();
      setProperties(data.properties || []);
      propertiesLengthRef.current = (data.properties || []).length;

      if (data.pagination) {
        const totalPages = Math.ceil(data.pagination.total / data.pagination.limit);
        setPagination({ ...data.pagination, page: currentPage, totalPages });
      }

      isInitialLoadDone.current = true;

      setTimeout(() => {
        const savedState = savedNavigationState.current;
        if (savedState?.scrollPosition) {
          window.scrollTo({ top: savedState.scrollPosition, behavior: 'auto' });
          savedNavigationState.current = null;
          window.history.replaceState(null, '');
        }
      }, 600);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'エラーが発生しました');
    } finally {
      if (!abortController.signal.aborted) {
        setInitialLoading(false);
        setFilterLoading(false);
      }
    }
  };

  const fetchAllProperties = async () => {
    if (mapFetchAbortControllerRef.current) mapFetchAbortControllerRef.current.abort();
    const abortController = new AbortController();
    mapFetchAbortControllerRef.current = abortController;

    try {
      setIsLoadingAllProperties(true);

      const params = new URLSearchParams();
      const types = searchParams.get('types');
      const minPriceParam = searchParams.get('minPrice');
      const maxPriceParam = searchParams.get('maxPrice');
      const showPublicOnlyParam = searchParams.get('showPublicOnly');

      if (types) params.set('types', types);
      if (minPriceParam) params.set('minPrice', minPriceParam);
      if (maxPriceParam) params.set('maxPrice', maxPriceParam);
      if (showPublicOnlyParam === 'true') params.set('showPublicOnly', 'true');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const queryString = params.toString();
      // くじら専用地図エンドポイント（FI物件のみ返す）
      const url = `${apiUrl}/api/kujira/map-properties${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, { signal: abortController.signal });
      if (!response.ok) throw new Error('物件の取得に失敗しました');

      const data = await response.json();
      setAllProperties(data.properties || []);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('全件取得エラー:', err);
    } finally {
      if (!abortController.signal.aborted) setIsLoadingAllProperties(false);
    }
  };

  const handleTypeToggle = (type: PropertyType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    if (!isRestoringState.current) setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setSelectedTypes([]);
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setMinAge('');
    setMaxAge('');
    setShowPublicOnly(false);
    if (!isRestoringState.current) setCurrentPage(1);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const hasActiveFilters = () =>
    selectedTypes.length > 0 ||
    minPrice !== '' ||
    maxPrice !== '' ||
    minAge !== '' ||
    maxAge !== '' ||
    showPublicOnly ||
    searchQuery.trim() !== '';

  if (initialLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ color: '#1565C0' }} />
          <Typography sx={{ mt: 2 }} color="text.secondary">読み込み中...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography color="error" variant="h6">{error}</Typography>
          <Button variant="contained" onClick={fetchProperties} sx={{ mt: 2, bgcolor: '#1565C0' }}>再試行</Button>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <SEOHead
        title="物件一覧 - 株式会社くじら不動産"
        description="株式会社くじら不動産の物件情報です。大分県の不動産物件を掲載しています。"
        keywords={['不動産', '物件', 'くじら不動産', '大分', '売買']}
        canonicalUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />

      <Box sx={{ minHeight: '100vh', bgcolor: '#EEF2FF' }}>
        {/* ヘッダー */}
        <KujiraPropertyHeader />

        <Paper elevation={1} sx={{ bgcolor: 'white' }}>
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom sx={{ color: '#0D47A1' }}>
              物件一覧
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {pagination && `全${pagination.total}件の物件`}
            </Typography>

            {/* 検索バー */}
            <Box
              sx={{
                mt: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                alignItems: { xs: 'stretch', sm: 'flex-start' },
              }}
            >
              <Box sx={{ flex: { xs: 'none', sm: 1 } }}>
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
                variant={viewMode === 'map' ? 'contained' : 'outlined'}
                startIcon={<LocationOnIcon />}
                sx={{
                  height: '56px',
                  minWidth: { xs: 'auto', sm: '140px' },
                  width: { xs: '100%', sm: 'auto' },
                  borderColor: '#1565C0',
                  color: viewMode === 'map' ? '#ffffff' : '#1565C0',
                  backgroundColor: viewMode === 'map' ? '#1565C0' : 'transparent',
                  fontWeight: 'bold',
                  '&:hover': {
                    borderColor: '#0D47A1',
                    backgroundColor: viewMode === 'map' ? '#0D47A1' : '#EEF2FF',
                  },
                }}
                onClick={() => {
                  if (listFetchAbortControllerRef.current) {
                    listFetchAbortControllerRef.current.abort();
                    listFetchAbortControllerRef.current = null;
                  }
                  setInitialLoading(false);
                  setFilterLoading(false);
                  setViewMode('map');
                  setShouldScrollToMap(true);
                }}
              >
                {viewMode === 'map' ? '✓ 地図で検索中' : '地図で検索'}
              </Button>
            </Box>
          </Container>
        </Paper>

        {/* 絞り込みセクション */}
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Paper elevation={1} sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ backgroundColor: '#1565C0', color: '#fff', p: 2 }}>
              <Typography variant="h6" fontWeight="600">物件を絞り込む</Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Stack spacing={3} sx={{ mt: 2 }}>
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
                      onChange={e => setMinPrice(e.target.value)}
                      inputProps={{ min: 0, step: 100 }}
                    />
                    <Typography color="text.secondary">〜</Typography>
                    <TextField
                      type="number"
                      placeholder="最高価格"
                      size="small"
                      fullWidth
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
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
                      onChange={e => setMinAge(e.target.value)}
                      inputProps={{ min: 0, step: 1 }}
                    />
                    <Typography color="text.secondary">〜</Typography>
                    <TextField
                      type="number"
                      placeholder="最大築年数"
                      size="small"
                      fullWidth
                      value={maxAge}
                      onChange={e => setMaxAge(e.target.value)}
                      inputProps={{ min: 0, step: 1 }}
                    />
                  </Stack>
                </Box>

                {/* 公開中のみ表示 */}
                <Box>
                  <Button
                    variant={showPublicOnly ? 'contained' : 'outlined'}
                    onClick={() => {
                      setShowPublicOnly(!showPublicOnly);
                      if (!isRestoringState.current) setCurrentPage(1);
                    }}
                    disabled={filterLoading}
                    sx={{
                      borderColor: '#1565C0',
                      color: showPublicOnly ? '#fff' : '#1565C0',
                      backgroundColor: showPublicOnly ? '#1565C0' : 'transparent',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#0D47A1',
                        backgroundColor: showPublicOnly ? '#0D47A1' : '#EEF2FF',
                      },
                    }}
                    fullWidth
                  >
                    {showPublicOnly ? '✓ 公開中のみ表示' : '公開中のみ表示'}
                  </Button>
                </Box>

                {/* 条件クリア */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Button
                    variant={hasActiveFilters() ? 'contained' : 'outlined'}
                    onClick={handleClearAllFilters}
                    disabled={filterLoading}
                    sx={{
                      mt: 1,
                      borderColor: '#1565C0',
                      color: hasActiveFilters() ? '#fff' : '#1565C0',
                      backgroundColor: hasActiveFilters() ? '#1565C0' : 'transparent',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#0D47A1',
                        bgcolor: hasActiveFilters() ? '#0D47A1' : '#EEF2FF',
                      },
                    }}
                    aria-label="すべてのフィルター条件をクリア"
                  >
                    {hasActiveFilters() ? '✓ 条件をクリア' : 'すべての条件をクリア'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Paper>
        </Container>

        {/* メインコンテンツ */}
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {filterLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
              <CircularProgress size={24} sx={{ mr: 1, color: '#1565C0' }} />
              <Typography color="text.secondary">フィルター適用中...</Typography>
            </Box>
          )}

          {viewMode === 'map' && (
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<ListIcon />}
                onClick={() => {
                  if (mapFetchAbortControllerRef.current) {
                    mapFetchAbortControllerRef.current.abort();
                    mapFetchAbortControllerRef.current = null;
                  }
                  if (mapFetchTimerRef.current) {
                    clearTimeout(mapFetchTimerRef.current);
                    mapFetchTimerRef.current = null;
                  }
                  setIsLoadingAllProperties(false);
                  setViewMode('list');
                }}
                sx={{
                  borderColor: '#1565C0',
                  color: '#1565C0',
                  '&:hover': {
                    borderColor: '#0D47A1',
                    backgroundColor: '#EEF2FF',
                  },
                }}
              >
                リスト表示に戻る
              </Button>
            </Box>
          )}

          {/* 地図モード */}
          {viewMode === 'map' ? (
            <Box ref={mapViewRef}>
              {isLoadingAllProperties ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '600px' }}>
                  <CircularProgress sx={{ color: '#1565C0' }} />
                  <Typography sx={{ mt: 2 }} color="text.secondary">全物件データを取得中...</Typography>
                </Box>
              ) : (
                <PropertyMapView
                  properties={allProperties}
                  isLoaded={isMapLoaded}
                  loadError={mapLoadError}
                  navigationState={{
                    currentPage,
                    viewMode,
                    filters: {
                      propertyTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
                      priceRange: (minPrice || maxPrice) ? { min: minPrice || undefined, max: maxPrice || undefined } : undefined,
                      buildingAgeRange: (minAge || maxAge) ? { min: minAge || undefined, max: maxAge || undefined } : undefined,
                      searchQuery: searchQuery || undefined,
                      searchType: searchType || undefined,
                      showPublicOnly: showPublicOnly || undefined,
                    },
                  }}
                  // くじらサイト用に詳細ページのベースURLを変更
                  detailBasePath="/kujira/properties"
                  // 物件がある場合はその中心、なければ日本全体
                  defaultMapCenter={
                    allProperties.length > 0 && allProperties[0].latitude && allProperties[0].longitude
                      ? {
                          lat: allProperties.reduce((sum, p) => sum + (p.latitude || 0), 0) / allProperties.length,
                          lng: allProperties.reduce((sum, p) => sum + (p.longitude || 0), 0) / allProperties.length,
                        }
                      : undefined
                  }
                />
              )}
            </Box>
          ) : (
            /* リストモード */
            <>
              {properties.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary">現在公開中の物件はありません</Typography>
                </Box>
              ) : (
                <>
                  {filterLoading && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 8, gap: 2 }}>
                      <CircularProgress size={48} sx={{ color: '#1565C0' }} />
                      <Typography color="text.secondary" variant="h6">次のページを読み込み中...</Typography>
                    </Box>
                  )}

                  <Grid container spacing={3} id="kujira-property-grid" ref={propertyGridRef} sx={{ opacity: filterLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}>
                    {properties.map((property, index) => {
                      const navigationState: Omit<NavigationState, 'scrollPosition'> = {
                        currentPage,
                        viewMode,
                        filters: {
                          propertyTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
                          priceRange: (minPrice || maxPrice) ? { min: minPrice || undefined, max: maxPrice || undefined } : undefined,
                          buildingAgeRange: (minAge || maxAge) ? { min: minAge || undefined, max: maxAge || undefined } : undefined,
                          searchQuery: searchQuery || undefined,
                          searchType: searchType || undefined,
                          showPublicOnly: showPublicOnly || undefined,
                        },
                      };

                      return (
                        <Grid item xs={12} md={6} lg={4} key={property.id}>
                          <PublicPropertyCard
                            property={property}
                            animationDelay={index * 0.1}
                            navigationState={navigationState}
                            // くじらサイト用に詳細ページのURLを変更
                            detailBasePath="/kujira/properties"
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
                          window.history.replaceState(null, '');
                          setCurrentPage(p => Math.max(1, p - 1));
                          setTimeout(() => {
                            const gridElement = document.getElementById('kujira-property-grid');
                            if (gridElement) {
                              const y = gridElement.getBoundingClientRect().top + window.pageYOffset - 20;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          }, 100);
                        }}
                        disabled={currentPage === 1 || filterLoading}
                        sx={{ borderColor: '#1565C0', color: '#1565C0' }}
                      >
                        前へ
                      </Button>
                      <Typography sx={{ px: 2 }}>
                        {currentPage} / {pagination.totalPages}
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          window.history.replaceState(null, '');
                          setCurrentPage(p => Math.min(pagination.totalPages, p + 1));
                          setTimeout(() => {
                            const gridElement = document.getElementById('kujira-property-grid');
                            if (gridElement) {
                              const y = gridElement.getBoundingClientRect().top + window.pageYOffset - 20;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          }, 100);
                        }}
                        disabled={currentPage === pagination.totalPages || filterLoading}
                        sx={{ borderColor: '#1565C0', color: '#1565C0' }}
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

export default KujiraPropertiesPage;
