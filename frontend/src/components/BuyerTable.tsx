import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Button,
  Chip,
  Link,
} from '@mui/material';
import { Phone as PhoneIcon, Email as EmailIcon } from '@mui/icons-material';
import api from '../services/api';

interface BuyerTableProps {
  propertyNumber: string;
  onBuyerClick?: (buyerId: string) => void;
}

interface BuyerSummary {
  id: string;
  buyer_number: string;
  name: string;
  phone_number: string;
  email: string;
  latest_status: string;
  inquiry_confidence: string;
  reception_date: string;
  latest_viewing_date: string | null;
  next_call_date: string | null;
}

export default function BuyerTable({ propertyNumber, onBuyerClick }: BuyerTableProps) {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<BuyerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyNumber) {
      fetchBuyers();
    }
  }, [propertyNumber]);

  const fetchBuyers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/property-listings/${propertyNumber}/buyers`);
      setBuyers(response.data);
    } catch (err) {
      setError('買主データの取得に失敗しました');
      console.error('Failed to fetch buyers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (buyerId: string) => {
    onBuyerClick?.(buyerId);
    navigate(`/buyers/${buyerId}`);
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 行クリックを防ぐ
    // tel: または mailto: リンクは自動的に処理される
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    if (['A', 'S', 'A+', 'S+'].includes(confidence)) return 'error';
    return 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button onClick={fetchBuyers} variant="outlined">再試行</Button>
      </Box>
    );
  }

  if (buyers.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          この物件への問い合わせはまだありません
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>買主番号</TableCell>
            <TableCell>氏名</TableCell>
            <TableCell>確度</TableCell>
            <TableCell>ステータス</TableCell>
            <TableCell>受付日</TableCell>
            <TableCell>次電日</TableCell>
            <TableCell>連絡先</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {buyers.map((buyer) => (
            <TableRow
              key={buyer.id}
              hover
              onClick={() => handleRowClick(buyer.buyer_number)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {buyer.buyer_number}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {buyer.name || '名前未登録'}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={buyer.inquiry_confidence || '-'}
                  size="small"
                  color={getConfidenceColor(buyer.inquiry_confidence)}
                  sx={{ minWidth: 50 }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                  {buyer.latest_status || '-'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(buyer.reception_date)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography 
                  variant="body2" 
                  color={buyer.next_call_date ? 'primary' : 'text.secondary'}
                  fontWeight={buyer.next_call_date ? 'medium' : 'normal'}
                >
                  {formatDate(buyer.next_call_date)}
                </Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {buyer.phone_number ? (
                    <Link
                      href={`tel:${buyer.phone_number}`}
                      onClick={handleContactClick}
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <PhoneIcon fontSize="small" />
                    </Link>
                  ) : null}
                  {buyer.email ? (
                    <Link
                      href={`mailto:${buyer.email}`}
                      onClick={handleContactClick}
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <EmailIcon fontSize="small" />
                    </Link>
                  ) : null}
                  {!buyer.phone_number && !buyer.email && (
                    <Typography variant="caption" color="text.disabled">
                      未登録
                    </Typography>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
