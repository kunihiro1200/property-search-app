import { Chip } from '@mui/material';
import { mapAtbbStatusToDisplayStatus, StatusType } from '../utils/atbbStatusDisplayMapper';

interface StatusBadgeProps {
  atbbStatus: string | null;
  size?: 'small' | 'medium';
}

interface BadgeConfig {
  label: string;
  color: string;
  backgroundColor: string;
}

const BADGE_CONFIGS: Record<StatusType, BadgeConfig> = {
  pre_publish: {
    label: '公開前情報',
    color: '#fff',
    backgroundColor: '#ff9800', // オレンジ
  },
  private: {
    label: '非公開物件',
    color: '#fff',
    backgroundColor: '#f44336', // 赤
  },
  sold: {
    label: '成約済み',
    color: '#fff',
    backgroundColor: '#9e9e9e', // グレー
  },
  other: {
    label: '',
    color: '',
    backgroundColor: '',
  },
};

/**
 * 物件のステータスバッジを表示するコンポーネント
 * 
 * @param atbbStatus - ATBB状況の値
 * @param size - バッジのサイズ（デフォルト: 'small'）
 * @returns バッジコンポーネント、または表示不要の場合はnull
 */
export default function StatusBadge({ atbbStatus, size = 'small' }: StatusBadgeProps): JSX.Element | null {
  // atbb_statusがnullまたは空の場合はバッジを表示しない
  if (!atbbStatus || atbbStatus === '') {
    return null;
  }

  // ステータスを判定
  const result = mapAtbbStatusToDisplayStatus(atbbStatus);

  // 'other'タイプの場合はバッジを表示しない
  if (result.statusType === 'other') {
    return null;
  }

  // バッジ設定を取得
  const config = BADGE_CONFIGS[result.statusType];

  // バッジを表示
  return (
    <Chip
      label={config.label}
      size={size}
      aria-label={`ステータス: ${config.label}`}
      sx={{
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontWeight: 'bold',
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        height: size === 'small' ? 24 : 32,
        '& .MuiChip-label': {
          px: size === 'small' ? 1 : 1.5,
        },
      }}
    />
  );
}
