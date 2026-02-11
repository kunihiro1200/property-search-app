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
  price: number;               // 価格（BS列）
  sales_price?: number;        // 売出価格（オプショナル）
  atbb_status: string;
  sales_assignee?: string;
  floor_plan?: string;
  pet_consultation?: string;  // ペット相談（マンションの場合のみ表示）
  parking?: string;            // 駐車場（AL列）
  property_about?: string;     // 内覧前伝達事項（BQ列）
  pre_viewing_notes?: string;  // 内覧前伝達事項（旧カラム）
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

  const formatPropertyAbout = (property: PropertyListing) => {
    let text = property.property_about || property.pre_viewing_notes;
    if (!text) return '-';
    
    // 「【こちらの物件について】」を省略
    text = text.replace(/【こちらの物件について】\s*/g, '');
    
    return text;
  };

  // マンションが含まれているか確認
  const hasApartment = nearbyProperties.some(p => p.property_type === 'マンション');

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
        <Typography variant="h5">近隣物件 ({nearbyProperties.length}件)</Typography>
      </Box>

      {/* 基準物件情報 */}
      {baseProperty && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>基準物件</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`物件番号: ${baseProperty.property_number}`} />
            <Chip label={`住所: ${baseProperty.address}`} />
            <Chip label={`価格: ${formatPrice(baseProperty.price)}`} />
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
                <TableCell>ステータス</TableCell>
                <TableCell>担当</TableCell>
                <TableCell>間取り</TableCell>
                {hasApartment && <TableCell>ペット</TableCell>}
                <TableCell>駐車場</TableCell>
                <TableCell>内覧前伝達事項</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nearbyProperties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasApartment ? 10 : 9} align="center">
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
                    <TableCell align="right">{formatPrice(property.price)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={property.atbb_status} 
                        size="small"
                        color={property.atbb_status?.includes('公開中') ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{property.sales_assignee || '-'}</TableCell>
                    <TableCell>{property.floor_plan || '-'}</TableCell>
                    {hasApartment && (
                      <TableCell>
                        {property.property_type === 'マンション' 
                          ? (property.pet_consultation || '-')
                          : '-'
                        }
                      </TableCell>
                    )}
                    <TableCell>{property.parking || '-'}</TableCell>
                    <TableCell 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxWidth: '300px',
                        minWidth: '200px'
                      }}
                    >
                      {formatPropertyAbout(property)}
                    </TableCell>
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
