import React, { useState } from 'react';
import {
  Container,
  Grid,
  Box,
  Pagination,
  Alert,
} from '@mui/material';
import PublicPropertyHero from '../components/PublicPropertyHero';
import PublicPropertyCard from '../components/PublicPropertyCard';
import PropertyCardSkeleton from '../components/PropertyCardSkeleton';
import PublicPropertyFiltersComponent from '../components/PublicPropertyFilters';
import { usePublicProperties } from '../hooks/usePublicProperties';
import { PublicPropertyFilters } from '../types/publicProperty';
import { detectSearchType } from '../utils/searchQueryDetector';

const PublicPropertyListingPage: React.FC = () => {
  const [filters, setFilters] = useState<PublicPropertyFilters>({
    page: 1,
    limit: 12,
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data, isLoading, isError, error } = usePublicProperties(filters);

  const handleFiltersChange = (newFilters: PublicPropertyFilters) => {
    setFilters({
      ...newFilters,
      page: 1,
      limit: filters.limit,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setFilters({
      ...filters,
      page,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (query: string) => {
    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery);
    
    if (trimmedQuery) {
      // 検索クエリのタイプを検出（物件番号 or 所在地）
      const searchQuery = detectSearchType(trimmedQuery);
      
      // 既存の検索フィルタをクリア
      const { propertyNumber, location, ...restFilters } = filters;
      
      // 検索タイプに応じて適切なフィルタを設定
      if (searchQuery.type === 'property_number') {
        setFilters({
          ...restFilters,
          propertyNumber: searchQuery.value,
          page: 1,
        });
      } else {
        setFilters({
          ...restFilters,
          location: searchQuery.value,
          page: 1,
        });
      }
    } else {
      // 検索クエリが空の場合、検索フィルタをクリア
      const { propertyNumber, location, ...restFilters } = filters;
      setFilters({
        ...restFilters,
        page: 1,
      });
    }
  };

  const handleClearSearchQuery = () => {
    setSearchQuery('');
    const { propertyNumber, location, ...restFilters } = filters;
    setFilters({
      ...restFilters,
      page: 1,
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--color-bg-light)' }}>
      {/* Hero Section */}
      <PublicPropertyHero onSearch={handleSearch} />

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Filters */}
        <PublicPropertyFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          resultCount={data?.total}
          searchQuery={searchQuery}
          onClearSearchQuery={handleClearSearchQuery}
        />

        {/* Error State */}
        {isError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error?.message || '物件の読み込みに失敗しました'}
          </Alert>
        )}

        {/* Loading State with Skeletons */}
        {isLoading && (
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <PropertyCardSkeleton />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Property Grid */}
        {data && !isLoading && (
          <>
            {data.properties.length > 0 ? (
              <>
                <Grid container spacing={3} sx={{ mt: 2 }}>
                  {data.properties.map((property, index) => (
                    <Grid item xs={12} sm={6} md={4} key={property.id}>
                      <PublicPropertyCard 
                        property={property} 
                        animationDelay={index * 0.1}
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Pagination（下部） - 常に表示 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                  <Pagination
                    count={data.totalPages || 1}
                    page={data.page}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              </>
            ) : (
              <Alert severity="info" sx={{ mt: 3 }}>
                条件に一致する物件が見つかりませんでした。フィルターを変更してお試しください。
              </Alert>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default PublicPropertyListingPage;
