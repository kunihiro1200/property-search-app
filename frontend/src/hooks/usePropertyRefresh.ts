import { useState } from 'react';
import api from '../services/api';

interface UsePropertyRefreshReturn {
  refreshEssential: (propertyId: string) => Promise<any>;
  refreshAll: (propertyId: string) => Promise<any>;
  isRefreshing: boolean;
  error: string | null;
}

export const usePropertyRefresh = (): UsePropertyRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshEssential = async (propertyId: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      console.log(`[usePropertyRefresh] Refreshing essential data for ${propertyId}`);
      const response = await api.post(
        `/api/public/properties/${propertyId}/refresh-essential`
      );
      console.log('[usePropertyRefresh] Essential data refreshed successfully');
      return response.data;
    } catch (err: any) {
      console.error('[usePropertyRefresh] Error refreshing essential data:', err);
      const errorMessage = err.response?.data?.message || '更新に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const refreshAll = async (propertyId: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      console.log(`[usePropertyRefresh] Refreshing all data for ${propertyId}`);
      const response = await api.post(
        `/api/public/properties/${propertyId}/refresh-all`
      );
      console.log('[usePropertyRefresh] All data refreshed successfully');
      return response.data;
    } catch (err: any) {
      console.error('[usePropertyRefresh] Error refreshing all data:', err);
      const errorMessage = err.response?.data?.message || '更新に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return { refreshEssential, refreshAll, isRefreshing, error };
};
