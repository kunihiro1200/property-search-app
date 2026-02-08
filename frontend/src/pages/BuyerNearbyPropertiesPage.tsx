import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../services/api';

interface PropertyListing {
  id: string;
  property_number: string;
  address: string;
  display_address?: string;
  property_type: string;
  sales_price: number;
  listing_price?: number;
  atbb_status: string;
  sales_assignee?: string;
  distribution_areas?: string;
  land_area?: number;
  building_area?: number;
  floor_plan?: string;
}

export default function BuyerNearbyPropertiesPage() {
  const { buyer_number } = useParams<{ buyer_number: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyNumber = searchParams.get('propertyNumber');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseProperty, setBaseProperty] = useState<PropertyListing | null>(null);
  const [nearbyProperties, setNearbyProperties] = useState<PropertyListing[]>([]);

  useEffect(() => {
    if (propertyNumber) {
      fetchNearbyProperties();
    }
  }, [propertyNumber]);

  const fetchNearbyProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 基準物件と近隣物件を取得
      const res = await api.get(`/api/buyers/${buyer_number}/nearby-properties`, {
        params: { propertyNumber },
      });
      
      setBaseProperty(res.data.baseProperty);
      setNearbyProperties(res.data.nearbyProperties || []);
    } catch (err: any) {
      console.error('Failed to fetch nearby properties:', err);
      setError(err.response?.data?.error || '近隣物件の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return '-';
    return `${(price / 10000).toFixed(0)}万円`;
  };

  const formatArea = (area: number | null | undefined) => {
    if (!area) return '-';
    return `${area.toFixed(2)}㎡`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(`/buyers/${buyer_number}`)} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">物件近隣物件</Typography>
      </Box>

      {/* 基準物件情報 */}
      {baseProperty && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>基準物件</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`物件番号: ${baseProperty.property_number}`} />
            <Chip label={`住所: ${baseProperty.address}`} />
            <Chip label={`価格: ${formatPrice(baseProperty.sales_price)}`} />
            <Chip label={`種別: ${baseProperty.property_type}`} />
          </Box>
        </Paper>
      )}

      {/* 近隣物件テーブル */}
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            近隣物件一覧 ({nearbyProperties.length}件)
          </Typography>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>物件番号</TableCell>
                <TableCell>住所</TableCell>
                <TableCell>種別</TableCell>
                <TableCell align="right">価格</TableCell>
                <TableCell align="right">売出価格</TableCell>
                <TableCell>ステータス</TableCell>
                <TableCell>担当</TableCell>
                <TableCell>間取り</TableCell>
                <TableCell align="right">土地面積</TableCell>
                <TableCell align="right">建物面積</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nearbyProperties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    近隣物件が見つかりませんでした
                  </TableCell>
                </TableRow>
              ) : (
                nearbyProperties.map((property) => (
                  <TableRow 
                    key={property.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/property-listings/${property.property_number}`)}
                  >
                    <TableCell>{property.property_number}</TableCell>
                    <TableCell>{property.display_address || property.address}</TableCell>
                    <TableCell>{property.property_type}</TableCell>
                    <TableCell align="right">{formatPrice(property.sales_price)}</TableCell>
                    <TableCell align="right">{formatPrice(property.listing_price)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={property.atbb_status} 
                        size="small"
                        color={property.atbb_status?.includes('公開中') ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{property.sales_assignee || '-'}</TableCell>
                    <TableCell>{property.floor_plan || '-'}</TableCell>
                    <TableCell align="right">{formatArea(property.land_area)}</TableCell>
                    <TableCell align="right">{formatArea(property.building_area)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}
