import React from 'react';
import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface Buyer {
  id: string;
  name: string;
  inquiryDate?: string;
  viewingDate?: string;
  hasPurchaseOffer?: boolean;
  confidenceLevel?: string;
}

interface CompactBuyerListProps {
  buyers: Buyer[];
  loading?: boolean;
}

/**
 * CompactBuyerList - 固定高さの買主リストコンポーネント
 * 
 * 最大高さ: 200px (約5行分)
 * 内部スクロール可能
 * 各買主を1行で表示（氏名、受付日、内覧日、買付有無）
 */
const CompactBuyerList: React.FC<CompactBuyerListProps> = ({
  buyers,
  loading,
}) => {
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const getConfidenceColor = (level?: string): 'success' | 'info' | 'warning' | 'default' => {
    if (!level) return 'default';
    if (level === 'A') return 'success';
    if (level === 'B') return 'info';
    if (level === 'C') return 'warning';
    return 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (buyers.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          買主なし
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxHeight: '180px',
        overflow: 'auto',
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      {/* ヘッダー行 */}
      <Box
        sx={{
          p: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '2px solid',
          borderColor: 'divider',
          backgroundColor: 'grey.100',
          fontSize: '11px',
          fontWeight: 600,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, minWidth: '100px' }}>
          氏名
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, minWidth: '85px' }}>
          受付日
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, minWidth: '85px' }}>
          内覧日
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 600, minWidth: '50px' }}>
          買付
        </Typography>
      </Box>

      {/* データ行 */}
      {buyers.map((buyer, index) => (
        <Box
          key={buyer.id}
          sx={{
            p: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: index < buyers.length - 1 ? '1px solid' : 'none',
            borderColor: 'divider',
            backgroundColor: index % 2 === 0 ? 'background.paper' : 'grey.50',
            fontSize: '12px',
            minHeight: '32px',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          {/* 氏名 */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: '12px',
              minWidth: '100px',
              maxWidth: '100px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {buyer.name}
          </Typography>

          {/* 受付日 */}
          <Typography variant="body2" sx={{ fontSize: '11px', minWidth: '85px', color: 'text.secondary' }}>
            {formatDate(buyer.inquiryDate)}
          </Typography>

          {/* 内覧日 */}
          <Typography variant="body2" sx={{ fontSize: '11px', minWidth: '85px', color: 'text.secondary' }}>
            {formatDate(buyer.viewingDate)}
          </Typography>

          {/* 買付 */}
          <Box sx={{ minWidth: '50px', display: 'flex', alignItems: 'center' }}>
            {buyer.hasPurchaseOffer ? (
              <Chip
                icon={<CheckCircle sx={{ fontSize: '12px' }} />}
                label="有"
                size="small"
                color="success"
                sx={{ height: '20px', fontSize: '10px', fontWeight: 600, '& .MuiChip-label': { px: 0.5 } }}
              />
            ) : (
              <Typography variant="caption" sx={{ fontSize: '11px', color: 'text.disabled' }}>
                -
              </Typography>
            )}
          </Box>

          {/* 確度 */}
          {buyer.confidenceLevel && (
            <Chip
              label={buyer.confidenceLevel}
              size="small"
              color={getConfidenceColor(buyer.confidenceLevel)}
              sx={{ height: '20px', fontSize: '10px', minWidth: '28px', fontWeight: 600, '& .MuiChip-label': { px: 0.5 } }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default CompactBuyerList;
