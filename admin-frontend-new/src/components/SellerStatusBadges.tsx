/**
 * 売主ステータスバッジコンポーネント
 * 
 * 複数のステータスをバッジで表示します。
 * 各ステータスに応じて色分けされます。
 */

import { Chip, Box } from '@mui/material';

interface SellerStatusBadgesProps {
  statuses: string[];
  size?: 'small' | 'medium';
}

/**
 * ステータスに応じた色を取得
 * 
 * @param status ステータス文字列
 * @returns 背景色
 */
function getStatusColor(status: string): string {
  if (status === '不通') {
    return '#f44336'; // 赤
  }
  if (status === '訪問日前日') {
    return '#ff9800'; // オレンジ
  }
  if (status.startsWith('当日TEL')) {
    return '#2196f3'; // 青
  }
  if (status === 'Pinrich空欄') {
    return '#9e9e9e'; // グレー
  }
  return '#757575'; // デフォルト（ダークグレー）
}

/**
 * 売主のステータスバッジを表示するコンポーネント
 * 
 * @param statuses - ステータスの配列
 * @param size - バッジのサイズ（デフォルト: 'small'）
 * @returns バッジコンポーネント、またはステータスがない場合は「-」
 * 
 * @example
 * <SellerStatusBadges statuses={["不通", "Pinrich空欄"]} />
 * // => 赤い「不通」バッジとグレーの「Pinrich空欄」バッジが表示される
 * 
 * <SellerStatusBadges statuses={[]} />
 * // => 「-」が表示される
 */
export default function SellerStatusBadges({
  statuses,
  size = 'small',
}: SellerStatusBadgesProps): JSX.Element {
  // ステータスがない場合は「-」を表示
  if (!statuses || statuses.length === 0) {
    return <span style={{ color: '#9e9e9e' }}>-</span>;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {statuses.map((status, index) => (
        <Chip
          key={index}
          label={status}
          size={size}
          aria-label={`ステータス: ${status}`}
          sx={{
            backgroundColor: getStatusColor(status),
            color: '#fff',
            fontWeight: 'bold',
            fontSize: size === 'small' ? '0.7rem' : '0.8rem',
            height: size === 'small' ? 20 : 24,
            '& .MuiChip-label': {
              px: size === 'small' ? 0.75 : 1,
            },
          }}
        />
      ))}
    </Box>
  );
}
