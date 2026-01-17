import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';

interface BuyerWithDetails {
  id: number;
  name: string;
  buyer_number: string;
  reception_date?: string;
  viewing_date?: string;
  has_offer: boolean;
  inquiry_confidence?: string;
  phone_number?: string;
  email?: string;
}

interface CompactBuyerListForPropertyProps {
  buyers: BuyerWithDetails[];
  propertyNumber: string;
  loading?: boolean;
  maxInitialDisplay?: number;
}

export default function CompactBuyerListForProperty({
  buyers,
  propertyNumber,
  loading = false,
  maxInitialDisplay = 5,
}: CompactBuyerListForPropertyProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const displayedBuyers = expanded ? buyers : buyers.slice(0, maxInitialDisplay);
  const hasMore = buyers.length > maxInitialDisplay;

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          買主リスト
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, maxWidth: '400px', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6">買主リスト</Typography>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate(`/buyers/new?propertyNumber=${propertyNumber}`)}
        >
          新規作成
        </Button>
      </Box>

      {buyers.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          買主がまだ登録されていません
        </Typography>
      ) : (
        <>
          <Box>
            {displayedBuyers.map((buyer) => (
              <Box
                key={buyer.id}
                sx={{
                  mb: 1.5,
                  p: 1.5,
                  border: '1px solid #eee',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  },
                }}
                onClick={() => {
                  navigate(`/buyers/${buyer.buyer_number}`, {
                    state: {
                      propertyNumber: propertyNumber,
                      source: 'property-detail',
                    },
                  });
                }}
              >
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  {buyer.name}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    受付: {formatDate(buyer.reception_date)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    内覧: {formatDate(buyer.viewing_date)}
                  </Typography>
                  {buyer.has_offer && (
                    <Chip label="買付有" size="small" color="success" />
                  )}
                </Box>
              </Box>
            ))}
          </Box>

          {hasMore && !expanded && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setExpanded(true)}
              sx={{ mt: 1 }}
            >
              すべて表示 ({buyers.length}件)
            </Button>
          )}

          {expanded && hasMore && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setExpanded(false)}
              sx={{ mt: 1 }}
            >
              閉じる
            </Button>
          )}
        </>
      )}
    </Paper>
  );
}
