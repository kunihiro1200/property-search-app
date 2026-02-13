import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

interface BuyerWithDetails {
  id: number;
  name: string;
  buyer_number: string;
  reception_date?: string;
  latest_viewing_date?: string;
  viewing_time?: string;
  latest_status?: string;
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
}: CompactBuyerListForPropertyProps) {
  const navigate = useNavigate();

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

  // 受付日順にソート（新しい順）
  const sortedBuyers = [...buyers].sort((a, b) => {
    if (!a.reception_date) return 1;
    if (!b.reception_date) return -1;
    return new Date(b.reception_date).getTime() - new Date(a.reception_date).getTime();
  });

  if (loading) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
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
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">買主リスト ({buyers.length}件)</Typography>
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
        <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>氏名</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>受付日</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>内覧日</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>時間</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>最新状況</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedBuyers.map((buyer) => (
                <TableRow
                  key={buyer.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                    },
                  }}
                  onClick={() => {
                    // 別タブで買主詳細ページを開く
                    window.open(
                      `/buyers/${buyer.buyer_number}`,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }}
                >
                  <TableCell>{buyer.name}</TableCell>
                  <TableCell>{formatDate(buyer.reception_date)}</TableCell>
                  <TableCell>{formatDate(buyer.latest_viewing_date)}</TableCell>
                  <TableCell>{buyer.viewing_time || '-'}</TableCell>
                  <TableCell>{buyer.latest_status || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
