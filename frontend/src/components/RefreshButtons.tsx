import React, { useState } from 'react';
import { Box, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePropertyRefresh } from '../hooks/usePropertyRefresh';

interface RefreshButtonsProps {
  propertyId: string;
  onRefreshComplete: (data: any) => void;
  canRefresh: boolean;
}

export const RefreshButtons: React.FC<RefreshButtonsProps> = ({
  propertyId,
  onRefreshComplete,
  canRefresh
}) => {
  const { refreshEssential, refreshAll, isRefreshing } = usePropertyRefresh();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  
  if (!canRefresh) return null;
  
  const handleRefreshEssential = async () => {
    try {
      const result = await refreshEssential(propertyId);
      onRefreshComplete(result.data);
      setSnackbar({
        open: true,
        message: '画像と基本情報を更新しました',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '更新に失敗しました',
        severity: 'error'
      });
    }
  };
  
  const handleRefreshAll = async () => {
    try {
      const result = await refreshAll(propertyId);
      onRefreshComplete(result.data);
      setSnackbar({
        open: true,
        message: '全てのデータを更新しました',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '更新に失敗しました',
        severity: 'error'
      });
    }
  };
  
  return (
    <>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleRefreshEssential}
          disabled={isRefreshing}
          startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          {isRefreshing ? '更新中...' : '画像・基本情報を更新'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          {isRefreshing ? '更新中...' : '全て更新'}
        </Button>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
