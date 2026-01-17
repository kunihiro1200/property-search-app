import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import publicApi from '../services/publicApi';
import {
  PublicProperty,
  PublicPropertyListResponse,
  PublicPropertyFilters,
  PropertyInquiry,
  PropertyInquiryResponse,
  ApiError,
  PropertyImagesResult,
} from '../types/publicProperty';

// 公開物件一覧を取得
export const usePublicProperties = (
  filters: PublicPropertyFilters = {},
  options?: Omit<UseQueryOptions<PublicPropertyListResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PublicPropertyListResponse, ApiError, PublicPropertyListResponse>({
    queryKey: ['publicProperties', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.propertyType) params.append('propertyType', filters.propertyType);
      // NEW: 複数物件タイプフィルター
      if (filters.types && filters.types.length > 0) {
        params.append('types', filters.types.join(','));
      }
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.areas && filters.areas.length > 0) {
        filters.areas.forEach(area => params.append('areas', area));
      }
      // NEW: 所在地フィルター
      if (filters.location) params.append('location', filters.location);
      // NEW: 物件番号フィルター
      if (filters.propertyNumber) params.append('propertyNumber', filters.propertyNumber);
      // NEW: 築年数フィルター
      if (filters.minAge !== undefined) params.append('minAge', filters.minAge.toString());
      if (filters.maxAge !== undefined) params.append('maxAge', filters.maxAge.toString());
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await publicApi.get<PublicPropertyListResponse>(
        `/properties?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
    ...options,
  });
};

// 公開物件詳細を取得
export const usePublicProperty = (
  propertyId: string | undefined,
  options?: Omit<UseQueryOptions<PublicProperty, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PublicProperty, ApiError, PublicProperty>({
    queryKey: ['publicProperty', propertyId],
    queryFn: async () => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      const response = await publicApi.get<PublicProperty>(`/properties/${propertyId}`);
      return response.data;
    },
    enabled: !!propertyId, // propertyIdが存在する場合のみクエリを実行
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
    ...options,
  });
};

// 物件画像を取得
export const usePropertyImages = (
  propertyId: string | undefined,
  includeHidden: boolean = false,
  options?: Omit<UseQueryOptions<PropertyImagesResult, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PropertyImagesResult, ApiError, PropertyImagesResult>({
    queryKey: ['propertyImages', propertyId, includeHidden],
    queryFn: async () => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      const params = includeHidden ? '?includeHidden=true' : '';
      const response = await publicApi.get<PropertyImagesResult>(`/properties/${propertyId}/images${params}`);
      return response.data;
    },
    enabled: !!propertyId,
    staleTime: 60 * 60 * 1000, // 1時間キャッシュ
    gcTime: 2 * 60 * 60 * 1000, // 2時間キャッシュを保持
    ...options,
  });
};

// 問い合わせを送信
export const useSubmitInquiry = () => {
  return useMutation<PropertyInquiryResponse, ApiError, PropertyInquiry>({
    mutationFn: async (inquiry: PropertyInquiry) => {
      const response = await publicApi.post<PropertyInquiryResponse>(
        '/inquiries',
        inquiry
      );
      return response.data;
    },
  });
};
