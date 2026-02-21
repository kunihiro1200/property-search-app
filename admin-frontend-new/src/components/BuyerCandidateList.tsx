import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Chip,
  Link,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface BuyerCandidate {
  id: string;
  buyer_number: string;
  name: string | null;
  latest_status: string | null;
  inquiry_confidence: string | null;
  desired_area: string | null;
  desired_property_type: string | null;
  reception_date: string | null;
  email: string | null;
  phone_number: string | null;
}

interface BuyerCandidateResponse {
  candidates: BuyerCandidate[];
  total: number;
  property: {
    property_number: string;
    property_type: string | null;
    sales_price: number | null;
    distribution_areas: string | null;
  };
}

interface BuyerCandidateListProps {
  propertyNumber: string;
}

export default function BuyerCandidateList({ propertyNumber }: BuyerCandidateListProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<BuyerCandidateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

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
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch buyer candidates:', err);
      setError(err.response?.data?.error || '買主候補の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerClick = (buyerId: string) => {
    navigate(`/buyers/${buyerId}`);
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

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          mb: expanded ? 2 : 0,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            買主候補リスト
          </Typography>
          {data && (
            <Chip
              label={`${data.total}件`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ py: 2 }}>
            {error}
          </Typography>
        ) : !data || data.candidates.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">
              該当する買主候補がありません
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              条件: 最新状況がA/Bを含む、または問合せ時確度がA/B
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              物件条件に合致する買主候補（受付日の最新順、最大50件）
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>買主番号</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>氏名</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>最新状況</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>問合せ時確度</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>希望エリア</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>希望種別</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>受付日</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.candidates.map((candidate) => (
                    <TableRow
                      key={candidate.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleBuyerClick(candidate.id)}
                    >
                      <TableCell>
                        <Link
                          component="button"
                          variant="body2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyerClick(candidate.id);
                          }}
                          sx={{ fontWeight: 'bold' }}
                        >
                          {candidate.buyer_number}
                        </Link>
                      </TableCell>
                      <TableCell>{candidate.name || '-'}</TableCell>
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
                      <TableCell>
                        {candidate.inquiry_confidence ? (
                          <Chip
                            label={candidate.inquiry_confidence}
                            size="small"
                            color={getStatusColor(candidate.inquiry_confidence)}
                            variant="outlined"
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {candidate.desired_area || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{candidate.desired_property_type || '-'}</TableCell>
                      <TableCell>{formatDate(candidate.reception_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Collapse>
    </Paper>
  );
}
