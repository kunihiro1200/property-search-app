import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface NearbyBuyer {
  buyer_number: string;
  name: string;
  phone: string;
  distribution_areas: string[];
  latest_status: string;
  latest_viewing_date: string;
}

interface NearbyBuyersListProps {
  sellerId: string;
}

const NearbyBuyersList = ({ sellerId }: NearbyBuyersListProps) => {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<NearbyBuyer[]>([]);
  const [matchedAreas, setMatchedAreas] = useState<string[]>([]);
  const [propertyAddress, setPropertyAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearbyBuyers = async () => {
      try {
        setLoading(true);
        setError(null);
        setMessage(null);

        console.log('🔍 [NearbyBuyersList] Fetching nearby buyers for seller:', sellerId);
        const response = await api.get(`/api/sellers/${sellerId}/nearby-buyers`);
        console.log('✅ [NearbyBuyersList] Response:', response.data);
        
        setBuyers(response.data.buyers || []);
        setMatchedAreas(response.data.matchedAreas || []);
        setPropertyAddress(response.data.propertyAddress);
        
        if (response.data.message) {
          setMessage(response.data.message);
          console.log('ℹ️ [NearbyBuyersList] Message:', response.data.message);
        }
      } catch (err: any) {
        console.error('❌ [NearbyBuyersList] Failed to fetch nearby buyers:', err);
        console.error('❌ [NearbyBuyersList] Error response:', err.response?.data);
        setError(err.response?.data?.error?.message || 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchNearbyBuyers();
    }
  }, [sellerId]);

  const handleBuyerClick = (buyerNumber: string) => {
    // 別タブで買主詳細ページを開く
    window.open(`/buyers/${buyerNumber}`, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (message) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {message}
      </Alert>
    );
  }

  if (buyers.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        該当する買主はいません
      </Alert>
    );
  }

  return (
    <Box>
      {/* エリア情報 */}
      {propertyAddress && matchedAreas.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            物件住所: {propertyAddress}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              該当エリア:
            </Typography>
            {matchedAreas.map((area, index) => (
              <Chip
                key={index}
                label={area}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* 買主リストテーブル */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>買主番号</TableCell>
              <TableCell>氏名</TableCell>
              <TableCell>電話番号</TableCell>
              <TableCell>希望エリア</TableCell>
              <TableCell>最新状況</TableCell>
              <TableCell>内覧日</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {buyers.map((buyer) => (
              <TableRow
                key={buyer.buyer_number}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => handleBuyerClick(buyer.buyer_number)}
              >
                <TableCell>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuyerClick(buyer.buyer_number);
                    }}
                    sx={{ textDecoration: 'none' }}
                  >
                    {buyer.buyer_number}
                  </Link>
                </TableCell>
                <TableCell>{buyer.name || '-'}</TableCell>
                <TableCell>{buyer.phone || '-'}</TableCell>
                <TableCell>
                  {buyer.distribution_areas && buyer.distribution_areas.length > 0 ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {buyer.distribution_areas.map((area, index) => (
                        <Chip
                          key={index}
                          label={area}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{buyer.latest_status || '-'}</TableCell>
                <TableCell>
                  {buyer.latest_viewing_date
                    ? new Date(buyer.latest_viewing_date).toLocaleDateString('ja-JP')
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 件数表示 */}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {buyers.length}件の買主が見つかりました
      </Typography>
    </Box>
  );
};

export default NearbyBuyersList;
