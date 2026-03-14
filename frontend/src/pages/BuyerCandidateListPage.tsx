import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
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
  Chip,
  Link,
  IconButton,
  Button,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { SECTION_COLORS } from '../theme/sectionColors';

interface BuyerCandidate {
  buyer_number: string;
  name: string | null;
  latest_status: string | null;
  desired_area: string | null;
  desired_property_type: string | null;
  reception_date: string | null;
  email: string | null;
  phone_number: string | null;
  inquiry_property_address: string | null;
}

interface BuyerCandidateResponse {
  candidates: BuyerCandidate[];
  total: number;
  property: {
    property_number: string;
    property_type: string | null;
    sales_price: number | null;
    distribution_areas: string | null;
    address: string | null;
  };
}

export default function BuyerCandidateListPage() {
  const { propertyNumber } = useParams<{ propertyNumber: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<BuyerCandidateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyNumber) {
      fetchCandidates();
    }
  }, [propertyNumber]);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/property-listings/${propertyNumber}/buyer-candidates`);
      console.log('[BuyerCandidateListPage] API Response:', response.data);
      console.log('[BuyerCandidateListPage] First candidate:', response.data.candidates[0]);
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch buyer candidates:', err);
      setError(err.response?.data?.error || '買主候補の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerClick = (buyerNumber: string) => {
    console.log('[BuyerCandidateListPage] Navigating to buyer:', buyerNumber);
    navigate(`/buyers/${buyerNumber}`);
  };

  const handleBack = () => {
    navigate(`/property-listings/${propertyNumber}`);
  };

  const formatDate = (dateString: string | null) => {
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

  const getStatusColor = (status: string | null): 'success' | 'warning' | 'default' => {
    if (!status) return 'default';
    if (status.includes('A')) return 'success';
    if (status.includes('B')) return 'warning';
    return 'default';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            {error || 'データの取得に失敗しました'}
          </Typography>
          <Button variant="contained" onClick={handleBack} sx={{ mt: 2 }}>
            物件詳細に戻る
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, zoom: '0.6' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} size="large">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ color: SECTION_COLORS.property.main, fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
                買主候補リスト
              </Typography>
              <Chip
                label={`${data.total}件`}
                size="medium"
                sx={{
                  bgcolor: SECTION_COLORS.property.main,
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 5 }}>
              物件番号: {data.property.property_number}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Property Info */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          物件情報
        </Typography>
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">物件番号</Typography>
            <Typography variant="body1" fontWeight="medium">{data.property.property_number}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">所在地</Typography>
            <Typography variant="body1" fontWeight="medium">{data.property.address || '-'}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">種別</Typography>
            <Typography variant="body1" fontWeight="medium">{data.property.property_type || '-'}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">価格</Typography>
            <Typography variant="body1" fontWeight="medium">
              {data.property.sales_price ? `¥${data.property.sales_price.toLocaleString()}` : '-'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Candidates Table */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            条件: 最新状況がA/B/C/不明を含む買主（受付日の最新順、最大50件）
          </Typography>
        </Box>

        {data.candidates.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              該当する買主候補がありません
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>買主番号</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>氏名</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>最新状況</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>問い合わせ物件住所</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>希望エリア</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>希望種別</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>受付日</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.candidates.map((candidate) => (
                  <TableRow
                    key={candidate.buyer_number}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: `${SECTION_COLORS.property.main}08`,
                      },
                    }}
                    onClick={() => handleBuyerClick(candidate.buyer_number)}
                  >
                    <TableCell>
                      <Link
                        component="button"
                        variant="body1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyerClick(candidate.buyer_number);
                        }}
                        sx={{ 
                          fontWeight: 'bold',
                          color: SECTION_COLORS.property.main,
                          fontSize: '1rem',
                        }}
                      >
                        {candidate.buyer_number}
                      </Link>
                    </TableCell>
                    <TableCell sx={{ fontSize: '1rem' }}>{candidate.name || '-'}</TableCell>
                    <TableCell>
                      {candidate.latest_status ? (
                        <Chip
                          label={candidate.latest_status}
                          size="small"
                          color={getStatusColor(candidate.latest_status)}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '1rem' }}>
                      <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {candidate.inquiry_property_address || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '1rem' }}>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {candidate.desired_area || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '1rem' }}>{candidate.desired_property_type || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '1rem' }}>{formatDate(candidate.reception_date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}
