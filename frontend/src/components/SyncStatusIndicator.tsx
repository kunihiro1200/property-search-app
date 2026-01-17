/**
 * SyncStatusIndicator - 同期ステータス表示コンポーネント
 * 
 * 買主データの同期ステータスを表示します。
 */

import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

export type SyncStatus = 'synced' | 'pending' | 'failed' | 'syncing';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  error?: string;
  lastSyncedAt?: string;
  size?: 'small' | 'medium';
}

const statusConfig: Record<SyncStatus, {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info';
  icon: React.ReactElement;
  tooltip: string;
}> = {
  synced: {
    label: '同期済み',
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />,
    tooltip: 'スプレッドシートと同期済みです',
  },
  pending: {
    label: '同期待ち',
    color: 'warning',
    icon: <ScheduleIcon fontSize="small" />,
    tooltip: 'スプレッドシートへの同期が保留中です',
  },
  failed: {
    label: '同期失敗',
    color: 'error',
    icon: <ErrorIcon fontSize="small" />,
    tooltip: 'スプレッドシートへの同期に失敗しました',
  },
  syncing: {
    label: '同期中',
    color: 'info',
    icon: <SyncIcon fontSize="small" className="rotating" />,
    tooltip: 'スプレッドシートに同期中です',
  },
};

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  error,
  lastSyncedAt,
  size = 'small',
}) => {
  const config = statusConfig[status];
  
  let tooltipContent = config.tooltip;
  if (error) {
    tooltipContent += `\nエラー: ${error}`;
  }
  if (lastSyncedAt) {
    const date = new Date(lastSyncedAt);
    tooltipContent += `\n最終同期: ${date.toLocaleString('ja-JP')}`;
  }

  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size={size}
        variant="outlined"
        sx={{
          '& .rotating': {
            animation: 'spin 1s linear infinite',
          },
          '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        }}
      />
    </Tooltip>
  );
};

export default SyncStatusIndicator;
