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
import { SECTION_COLORS } from '../theme/sectionColors';

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
  broker_response?: string; // 業者への対応
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
  themeColor?: 'buyer' | 'property' | 'seller' | 'workTask'; // テーマカラーを指定
}

export default function PropertyInfoCard({ 
  propertyId, 
  buyer, 
  onClose, 
  showCloseButton = true,
  themeColor = 'property', // デフォルトは物件（青）
}: PropertyInfoCardProps) {
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // テーマカラーを取得
  const colorTheme = SECTION_COLORS[themeColor];

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

  const handleCopyAddress = async () => {
    if (!property?.address) return;
    
    try {
      await navigator.clipboard.writeText(property.address);
      setSnackbarMessage('所在地をコピーしました');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to copy address:', err);
      setSnackbarMessage('コピーに失敗しました');
      setSnackbarOpen(true);
    }
  };

  const handleCopyDisplayAddress = async () => {
    if (!property?.display_address) return;
    
    try {
      await navigator.clipboard.writeText(property.display_address);
      setSnackbarMessage('住居表示をコピーしました');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to copy display address:', err);
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
        borderColor: colorTheme.main,
        bgcolor: `${colorTheme.main}08`,
      }}
    >
      {/* Header - 外部リンクアイコンと閉じるボタンのみ */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
        <IconButton 
          size="small" 
          onClick={handleNavigateToProperty} 
          sx={{ 
            color: colorTheme.main,
            '&:hover': {
              backgroundColor: `${colorTheme.main}15`,
            },
          }}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
        {showCloseButton && onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* 業者への対応日付表示（今日より後の場合のみ） */}
      {property.broker_response && (() => {
        try {
          // broker_responseの値を確認
          let brokerDateValue = property.broker_response;
          
          // Excelシリアル値の場合は変換
          if (typeof brokerDateValue === 'number' || !isNaN(Number(brokerDateValue))) {
            const serialNumber = Number(brokerDateValue);
            // Excelシリアル値を日付に変換（1900年1月1日からの日数）
            const excelEpoch = new Date(1900, 0, 1);
            const daysOffset = serialNumber - 2; // Excelの1900年うるう年バグ対応
            brokerDateValue = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          }
          
          // 東京時間で今日の日付を取得
          const now = new Date();
          const tokyoNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
          const tokyoToday = new Date(tokyoNow.getFullYear(), tokyoNow.getMonth(), tokyoNow.getDate());
          
          // broker_responseの日付をパース
          const brokerDate = new Date(brokerDateValue);
          const tokyoBrokerDate = new Date(brokerDate.getFullYear(), brokerDate.getMonth(), brokerDate.getDate());
          
          // 今日より後の日付の場合のみ表示
          if (tokyoBrokerDate > tokyoToday) {
            const formattedDate = `${tokyoBrokerDate.getFullYear()}/${String(tokyoBrokerDate.getMonth() + 1).padStart(2, '0')}/${String(tokyoBrokerDate.getDate()).padStart(2, '0')}`;
            return (
              <Box
                sx={{
                  mb: 2,
                  px: 3,
                  py: 1.5,
                  background: '#ffeb3b',
                  borderRadius: 1,
                  border: '3px solid #d32f2f',
                  boxShadow: '0 0 20px rgba(244, 67, 54, 0.6)',
                  animation: 'blink 1.5s infinite, shake 0.5s infinite',
                  '@keyframes blink': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.8 },
                  },
                  '@keyframes shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-2px)' },
                    '75%': { transform: 'translateX(2px)' },
                  },
                }}
              >
                <Typography
                  sx={{
                    color: '#d32f2f',
                    fontWeight: 'bold',
                    fontSize: '1.3rem',
                    letterSpacing: '0.05em',
                    textAlign: 'center',
                  }}
                >
                  ⚠️ 業者対応: {formattedDate} ⚠️
                </Typography>
              </Box>
            );
          }
        } catch (error) {
          console.error('Failed to parse broker_response date:', error);
        }
        return null;
      })()}

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
                <Typography variant="body1" fontWeight="bold" sx={{ color: colorTheme.main }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {property.address}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={handleCopyAddress}
                    aria-label="所在地をコピー"
                    sx={{ 
                      padding: '4px',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            )}

            {/* 住居表示 */}
            {property.display_address && (
              <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                <Typography variant="caption" color="text.secondary">
                  住居表示
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {property.display_address}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={handleCopyDisplayAddress}
                    aria-label="住居表示をコピー"
                    sx={{ 
                      padding: '4px',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
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

        {/* 価格 + Suumo URL + Google Map */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* 価格 */}
            {(property.price || property.listing_price) && (
              <Box sx={{ flex: '0 0 auto' }}>
                <Typography variant="caption" color="text.secondary">
                  価格
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>
                  {formatPrice(property.price || property.listing_price)}
                </Typography>
              </Box>
            )}

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

        {/* 値下げ履歴 + 理由 */}
        {(property.price_reduction_history || property.sale_reason) && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* 値下げ履歴 */}
              {property.price_reduction_history && (
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="caption" color="text.secondary">
                    値下げ履歴
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                    {property.price_reduction_history}
                  </Typography>
                </Box>
              )}

              {/* 理由 */}
              {property.sale_reason && (
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="caption" color="text.secondary">
                    理由
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {property.sale_reason}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        )}



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
