import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  InputAdornment,
  Chip,
} from '@mui/material';
import { PublicPropertyFilters } from '../types/publicProperty';

interface PublicPropertyFiltersProps {
  filters: PublicPropertyFilters;
  onFiltersChange: (filters: PublicPropertyFilters) => void;
  resultCount?: number;
  searchQuery?: string;
  onClearSearchQuery?: () => void;
}

const PublicPropertyFiltersComponent: React.FC<PublicPropertyFiltersProps> = ({
  filters,
  onFiltersChange,
  resultCount,
  searchQuery,
  onClearSearchQuery,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localFilters, setLocalFilters] = useState<PublicPropertyFilters>(filters);
  const [minAgeInput, setMinAgeInput] = useState<string>(filters.minAge?.toString() || '');
  const [maxAgeInput, setMaxAgeInput] = useState<string>(filters.maxAge?.toString() || '');
  const [ageRangeError, setAgeRangeError] = useState<string>('');
  // 所在地検索フィールドは削除されました（UnifiedSearchBarに統合）

  // Parse URL query parameters on mount and restore filter state
  useEffect(() => {
    const urlFilters: PublicPropertyFilters = {};
    
    const propertyType = searchParams.get('propertyType');
    if (propertyType) urlFilters.propertyType = propertyType;
    
    const minPrice = searchParams.get('minPrice');
    if (minPrice) urlFilters.minPrice = parseInt(minPrice, 10);
    
    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) urlFilters.maxPrice = parseInt(maxPrice, 10);
    
    const minAge = searchParams.get('minAge');
    if (minAge) {
      urlFilters.minAge = parseInt(minAge, 10);
      setMinAgeInput(minAge);
    }
    
    const maxAge = searchParams.get('maxAge');
    if (maxAge) {
      urlFilters.maxAge = parseInt(maxAge, 10);
      setMaxAgeInput(maxAge);
    }
    
    const areas = searchParams.get('areas');
    if (areas) urlFilters.areas = areas.split(',');
    
    const page = searchParams.get('page');
    if (page) urlFilters.page = parseInt(page, 10);
    
    const limit = searchParams.get('limit');
    if (limit) urlFilters.limit = parseInt(limit, 10);
    
    // Only update if URL has filters
    if (Object.keys(urlFilters).length > 0) {
      setLocalFilters({ ...filters, ...urlFilters });
      onFiltersChange({ ...filters, ...urlFilters });
    }
  }, []); // Run only on mount

  // Update URL query parameters when filters change
  const updateUrlParams = (newFilters: PublicPropertyFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.propertyType) params.set('propertyType', newFilters.propertyType);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice.toString());
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice.toString());
    if (newFilters.minAge !== undefined) params.set('minAge', newFilters.minAge.toString());
    if (newFilters.maxAge !== undefined) params.set('maxAge', newFilters.maxAge.toString());
    if (newFilters.areas && newFilters.areas.length > 0) params.set('areas', newFilters.areas.join(','));
    if (newFilters.page && newFilters.page > 1) params.set('page', newFilters.page.toString());
    if (newFilters.limit) params.set('limit', newFilters.limit.toString());
    
    setSearchParams(params, { replace: true });
  };

  const handleMinPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value ? parseInt(event.target.value, 10) * 10000 : undefined;
    const newFilters = { ...localFilters, minPrice: value };
    setLocalFilters(newFilters);
  };

  const handleMaxPriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value ? parseInt(event.target.value, 10) * 10000 : undefined;
    const newFilters = { ...localFilters, maxPrice: value };
    setLocalFilters(newFilters);
  };

  const handleApplyPriceFilters = () => {
    const newFilters = { ...localFilters, page: 1 };
    updateUrlParams(newFilters);
    onFiltersChange(newFilters);
  };

  // handleLocationChange と handleClearLocation は削除されました（UnifiedSearchBarに統合）

  const validateAgeRange = (min: number | undefined, max: number | undefined): string => {
    if (min !== undefined && min < 0) {
      return '築年数は0以上で入力してください';
    }
    if (max !== undefined && max < 0) {
      return '築年数は0以上で入力してください';
    }
    if (min !== undefined && max !== undefined && min > max) {
      return '最小値は最大値以下で入力してください';
    }
    return '';
  };

  const handleMinAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMinAgeInput(value);
  };

  const handleMaxAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMaxAgeInput(value);
  };

  const handleApplyAgeFilters = () => {
    const minAge = minAgeInput ? parseInt(minAgeInput, 10) : undefined;
    const maxAge = maxAgeInput ? parseInt(maxAgeInput, 10) : undefined;
    
    const error = validateAgeRange(minAge, maxAge);
    setAgeRangeError(error);
    
    if (!error) {
      const newFilters = { ...localFilters, minAge, maxAge, page: 1 };
      setLocalFilters(newFilters);
      updateUrlParams(newFilters);
      onFiltersChange(newFilters);
    }
  };

  const handleRemoveFilter = (filterKey: keyof PublicPropertyFilters) => {
    const newFilters = { ...localFilters, [filterKey]: undefined, page: 1 };
    setLocalFilters(newFilters);
    updateUrlParams(newFilters);
    onFiltersChange(newFilters);

    // Update local input states
    if (filterKey === 'minAge') {
      setMinAgeInput('');
    } else if (filterKey === 'maxAge') {
      setMaxAgeInput('');
    }
  };

  const handleClearAllFilters = () => {
    const clearedFilters: PublicPropertyFilters = {
      page: 1,
      limit: filters.limit,
    };
    setLocalFilters(clearedFilters);
    setMinAgeInput('');
    setMaxAgeInput('');
    setAgeRangeError('');
    updateUrlParams(clearedFilters);
    onFiltersChange(clearedFilters);
    
    // 検索クエリもクリア
    if (onClearSearchQuery) {
      onClearSearchQuery();
    }
  };

  const hasActiveFilters = !!(
    localFilters.minPrice ||
    localFilters.maxPrice ||
    localFilters.minAge !== undefined ||
    localFilters.maxAge !== undefined ||
    (localFilters.areas && localFilters.areas.length > 0) ||
    searchQuery
  );

  const getActiveFilterChips = () => {
    const chips: Array<{ label: string; key: keyof PublicPropertyFilters | 'searchQuery' }> = [];
    
    // 検索クエリのチップを追加
    if (searchQuery) {
      chips.push({
        label: `検索: ${searchQuery}`,
        key: 'searchQuery',
      });
    }
    
    // 物件タイプはPropertyTypeFilterButtonsで管理されるため、ここでは表示しない
    
    if (localFilters.minPrice || localFilters.maxPrice) {
      const minLabel = localFilters.minPrice ? `${localFilters.minPrice / 10000}万円` : '';
      const maxLabel = localFilters.maxPrice ? `${localFilters.maxPrice / 10000}万円` : '';
      const priceLabel = minLabel && maxLabel 
        ? `${minLabel} 〜 ${maxLabel}`
        : minLabel 
        ? `${minLabel}以上`
        : `${maxLabel}以下`;
      chips.push({ label: `価格: ${priceLabel}`, key: 'minPrice' });
    }
    
    if (localFilters.minAge !== undefined || localFilters.maxAge !== undefined) {
      const minLabel = localFilters.minAge !== undefined ? `${localFilters.minAge}年` : '';
      const maxLabel = localFilters.maxAge !== undefined ? `${localFilters.maxAge}年` : '';
      const ageLabel = minLabel && maxLabel
        ? `${minLabel} 〜 ${maxLabel}`
        : minLabel
        ? `${minLabel}以上`
        : `${maxLabel}以下`;
      chips.push({ label: `築年数: ${ageLabel}`, key: 'minAge' });
    }
    
    return chips;
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography 
        variant="h6" 
        sx={{ 
          backgroundColor: '#1976d2',
          color: 'white',
          p: 2,
          borderRadius: 1,
          mx: -3,
          mt: -3,
          mb: 3
        }}
      >
        物件を絞り込む
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 所在地検索フィールドは削除されました（UnifiedSearchBarに統合） */}
        {/* 物件タイプフィルターはPropertyTypeFilterButtonsコンポーネントに統合されました */}

        {/* 価格範囲 */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            価格範囲（万円）
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="最低価格"
              type="number"
              value={localFilters.minPrice ? localFilters.minPrice / 10000 : ''}
              onChange={handleMinPriceChange}
              onBlur={handleApplyPriceFilters}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyPriceFilters();
                }
              }}
              InputProps={{
                inputProps: { min: 0, step: 100 },
              }}
              sx={{ flex: 1 }}
            />
            <Typography>〜</Typography>
            <TextField
              label="最高価格"
              type="number"
              value={localFilters.maxPrice ? localFilters.maxPrice / 10000 : ''}
              onChange={handleMaxPriceChange}
              onBlur={handleApplyPriceFilters}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyPriceFilters();
                }
              }}
              InputProps={{
                inputProps: { min: 0, step: 100 },
              }}
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>

        {/* 築年数範囲 */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            築年数（年）
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="最小築年数"
              type="number"
              placeholder="例: 0"
              value={minAgeInput}
              onChange={handleMinAgeChange}
              onBlur={handleApplyAgeFilters}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyAgeFilters();
                }
              }}
              InputProps={{
                inputProps: { min: 0, step: 1 },
                endAdornment: <InputAdornment position="end">年</InputAdornment>,
              }}
              error={!!ageRangeError}
              sx={{ flex: 1 }}
            />
            <Typography>〜</Typography>
            <TextField
              label="最大築年数"
              type="number"
              placeholder="例: 20"
              value={maxAgeInput}
              onChange={handleMaxAgeChange}
              onBlur={handleApplyAgeFilters}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyAgeFilters();
                }
              }}
              InputProps={{
                inputProps: { min: 0, step: 1 },
                endAdornment: <InputAdornment position="end">年</InputAdornment>,
              }}
              error={!!ageRangeError}
              sx={{ flex: 1 }}
            />
          </Box>
          {ageRangeError && (
            <Typography color="error" variant="caption" sx={{ mt: 0.5 }}>
              {ageRangeError}
            </Typography>
          )}
        </Box>

        {/* アクティブフィルタ表示 */}
        {hasActiveFilters && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              適用中のフィルタ
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {getActiveFilterChips().map((chip) => (
                <Chip
                  key={chip.key}
                  label={chip.label}
                  onDelete={() => {
                    if (chip.key === 'searchQuery' && onClearSearchQuery) {
                      onClearSearchQuery();
                    } else {
                      handleRemoveFilter(chip.key as keyof PublicPropertyFilters);
                    }
                  }}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* 結果件数表示 */}
        {resultCount !== undefined && (
          <Typography variant="body2" color="text.secondary">
            {resultCount > 0
              ? `${resultCount}件の物件が見つかりました`
              : '条件に一致する物件が見つかりませんでした'}
          </Typography>
        )}

        {/* すべてクリアボタン */}
        {hasActiveFilters && (
          <Button
            variant="outlined"
            onClick={handleClearAllFilters}
            sx={{ alignSelf: 'flex-start' }}
          >
            すべてクリア
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default PublicPropertyFiltersComponent;
