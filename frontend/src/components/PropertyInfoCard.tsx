import { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Link,
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Launch as LaunchIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface PropertyFullDetails {
  id: number;
  property_number: string;
  atbb_status?: string; // atbb_status
  status?: string; // atbb成約済み/非公開
  distribution_date?: string; // 配信日
  address?: string; // 所在地
  display_address?: string; // 住居表示
  property_type?: string; // 種別
  sales_assignee?: string; // 担当名
  price?: number; // 価格
  listing_price?: number; // 売出価格
  monthly_loan_payment?: number; // 月々ローン支払い
  offer_status?: string; // 買付有無
  price_reduction_history?: string; // 値下げ履歴
  sale_reason?: string; // 理由
  suumo_url?: string; // Suumo URL
  google_map_url?: string; // Google Map URL
  confirmation_status?: string; // 確済
  structure?: string;
  floor_plan?: string;
  land_area?: number;
  building_area?: number;
  pre_viewing_notes?: string; // 内覧前伝達事項（物件リストから取得）
}

interface Buyer {
  pre_viewing_notes?: string;
  viewing_notes?: string;
  [key: string]: any;
}

interface PropertyInfoCardProps {
  propertyId: string;
  buyer?: Buyer;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function PropertyInfoCard({ 
  propertyId, 
  buyer, 
  onClose, 
  showCloseButton = true,
}: PropertyInfoCardProps) {
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    fetchPropertyDetails();
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/property-listings/${propertyId}`);
      setProperty(response.data);
    } catch (err: any) {
      console.error('Failed to fetch property details:', err);
      if (err.response?.status === 404) {
        setError('物件情報が見つかりません');
      } else if (err.response?.status === 403) {
        setError('アクセス権限がありません');
      } else {
        setError('物件情報の取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return `${(price / 10000).toLocaleString()}万円`;
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('ja-JP');
    } catch {
      return date;
    }
  };

  const handleNavigateToProperty = () => {
    if (property) {
      navigate(`/property-listings/${property.property_number}`);
    }
  };

  const handleCopyPropertyNumber = async () => {
    if (!property?.property_number) return;
    
    try {
      await navigator.clipboard.writeText(property.property_number);
      setSnackbarMessage('物件番号をコピーしました');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to copy property number:', err);
      setSnackbarMessage('コピーに失敗しました');
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, mb: 3, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, mb: 3, position: 'relative', bgcolor: '#fff3f3' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" color="error">
            物件情報
          </Typography>
          {showCloseButton && onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" size="small" onClick={fetchPropertyDetails}>
          再試行
        </Button>
      </Paper>
    );
  }

  if (!property) {
    return null;
  }

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3, 
        position: 'relative',
        border: '2px solid',
        borderColor: 'primary.main',
        bgcolor: '#f8f9ff',
      }}
    >
      {/* Header - 外部リンクアイコンと閉じるボタンのみ */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
        <IconButton size="small" onClick={handleNavigateToProperty} color="primary">
          <OpenInNewIcon fontSize="small" />
        </IconButton>
        {showCloseButton && onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Property Details */}
      <Grid container spacing={2}>
        {/* 1行目: 物件番号 + atbb_status + 配信日 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
            {/* 物件番号 */}
            <Box sx={{ flex: '0 0 auto' }}>
              <Typography variant="caption" color="text.secondary">
                物件番号
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="body1" fontWeight="bold" color="primary.main">
                  {property.property_number}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={handleCopyPropertyNumber}
                  aria-label="物件番号をコピー"
                  sx={{ 
                    padding: '4px',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* atbb_status */}
            {property.atbb_status && (
              <Box sx={{ flex: '0 0 auto' }}>
                <Typography variant="caption" color="text.secondary">
                  ステータス
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color={property.atbb_status.includes('非公開') ? 'error.main' : 'text.secondary'}
                  >
                    {property.atbb_status}
                  </Typography>
                  {property.atbb_status === '一般・公開中' && (
                    <Typography 
                      variant="caption" 
                      color="error.main"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      ⚠ 一般媒介なので売主様に状況確認してください
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* 配信日 */}
            {property.distribution_date && (
              <Box sx={{ flex: '0 0 auto' }}>
                <Typography variant="caption" color="text.secondary">
                  配信日
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {formatDate(property.distribution_date)}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* 2行目: 所在地 + 住居表示 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* 所在地 */}
            {property.address && (
              <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                <Typography variant="caption" color="text.secondary">
                  所在地
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {property.address}
                </Typography>
              </Box>
            )}

            {/* 住居表示 */}
            {property.display_address && (
              <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                <Typography variant="caption" color="text.secondary">
                  住居表示
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {property.display_address}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* 内覧前伝達事項 */}
        {property.pre_viewing_notes && (
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                bgcolor: '#fff9e6',
                borderRadius: 1,
                border: '1px solid #f0e5c0',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                内覧前伝達事項
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  mt: 1,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  color: '#555',
                  lineHeight: 1.5,
                }}
              >
                {property.pre_viewing_notes}
              </Typography>
            </Box>
          </Grid>
        )}

        {/* 種別 */}
        {property.property_type && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              種別
            </Typography>
            <Typography variant="body2">
              {property.property_type}
            </Typography>
          </Grid>
        )}

        {/* 担当名 */}
        {property.sales_assignee && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              担当名
            </Typography>
            <Typography variant="body2">
              {property.sales_assignee}
            </Typography>
          </Grid>
        )}

        {/* 価格 */}
        {(property.price || property.listing_price) && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              価格
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatPrice(property.price || property.listing_price)}
            </Typography>
          </Grid>
        )}

        {/* 月々ローン支払い */}
        {property.monthly_loan_payment && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              月々ローン支払い
            </Typography>
            <Typography variant="body2">
              {formatPrice(property.monthly_loan_payment)}
            </Typography>
          </Grid>
        )}

        {/* 買付有無 */}
        {property.offer_status && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              買付有無
            </Typography>
            <Typography variant="body2">
              {property.offer_status}
            </Typography>
          </Grid>
        )}

        {/* 値下げ履歴 */}
        {property.price_reduction_history && (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              値下げ履歴
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {property.price_reduction_history}
            </Typography>
          </Grid>
        )}

        {/* 理由 */}
        {property.sale_reason && (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              理由
            </Typography>
            <Typography variant="body2">
              {property.sale_reason}
            </Typography>
          </Grid>
        )}

        {/* 3行目: Suumo URL + Google Map */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* Suumo URL */}
            {property.suumo_url && (
              <Box sx={{ flex: '0 0 auto' }}>
                <Typography variant="caption" color="text.secondary">
                  Suumo URL
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Link 
                    href={property.suumo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Typography variant="body2">
                      Suumoで開く
                    </Typography>
                    <LaunchIcon fontSize="small" />
                  </Link>
                </Box>
              </Box>
            )}

            {/* Google Map URL */}
            {property.google_map_url && (
              <Box sx={{ flex: '0 0 auto' }}>
                <Typography variant="caption" color="text.secondary">
                  Google Map
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Link 
                    href={property.google_map_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Typography variant="body2">
                      地図を開く
                    </Typography>
                    <LaunchIcon fontSize="small" />
                  </Link>
                </Box>
              </Box>
            )}
          </Box>
        </Grid>

        {/* 確済 */}
        {property.confirmation_status && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              確済
            </Typography>
            <Typography variant="body2">
              {property.confirmation_status}
            </Typography>
          </Grid>
        )}

        {/* 追加情報 */}
        {property.structure && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              構造
            </Typography>
            <Typography variant="body2">
              {property.structure}
            </Typography>
          </Grid>
        )}

        {property.floor_plan && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              間取り
            </Typography>
            <Typography variant="body2">
              {property.floor_plan}
            </Typography>
          </Grid>
        )}

        {property.land_area && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              土地面積
            </Typography>
            <Typography variant="body2">
              {property.land_area}㎡
            </Typography>
          </Grid>
        )}

        {property.building_area && (
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              建物面積
            </Typography>
            <Typography variant="body2">
              {property.building_area}㎡
            </Typography>
          </Grid>
        )}

      </Grid>

      {/* Footer - Navigate to full property detail */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleNavigateToProperty}
          endIcon={<OpenInNewIcon />}
        >
          物件詳細ページを開く
        </Button>
      </Box>

      {/* Snackbar for copy notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
}
