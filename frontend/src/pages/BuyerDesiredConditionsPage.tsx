import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import api, { buyerApi } from '../services/api';
import { InlineEditableField } from '../components/InlineEditableField';
import {
  AREA_OPTIONS,
  DESIRED_PROPERTY_TYPE_OPTIONS,
  PARKING_SPACES_OPTIONS,
  PRICE_RANGE_DETACHED_OPTIONS,
  PRICE_RANGE_MANSION_OPTIONS,
  PRICE_RANGE_LAND_OPTIONS,
  BUILDING_AGE_OPTIONS,
  FLOOR_PLAN_OPTIONS,
  HOT_SPRING_OPTIONS,
  GARDEN_OPTIONS,
  PET_ALLOWED_OPTIONS,
  HIGH_FLOOR_OPTIONS,
  CORNER_ROOM_OPTIONS,
  GOOD_VIEW_OPTIONS,
  MONTHLY_PARKING_OK_OPTIONS,
} from '../utils/buyerDesiredConditionsOptions';

interface Buyer {
  [key: string]: any;
}

const DESIRED_CONDITIONS_FIELDS = [
  { key: 'desired_timing', label: '希望時期', inlineEditable: true, fieldType: 'text' },
  { key: 'desired_area', label: '★エリア', inlineEditable: true, fieldType: 'dropdown', options: AREA_OPTIONS },
  { key: 'desired_property_type', label: '★希望種別', inlineEditable: true, fieldType: 'dropdown', options: DESIRED_PROPERTY_TYPE_OPTIONS },
  { key: 'desired_building_age', label: '★築年数', inlineEditable: true, fieldType: 'dropdown', options: BUILDING_AGE_OPTIONS },
  { key: 'desired_floor_plan', label: '★間取り', inlineEditable: true, fieldType: 'dropdown', options: FLOOR_PLAN_OPTIONS },
  { key: 'budget', label: '予算', inlineEditable: true, fieldType: 'text' },
  { key: 'price_range_house', label: '価格帯（戸建）', inlineEditable: true, fieldType: 'dropdown', options: PRICE_RANGE_DETACHED_OPTIONS },
  { key: 'price_range_apartment', label: '価格帯（マンション）', inlineEditable: true, fieldType: 'dropdown', options: PRICE_RANGE_MANSION_OPTIONS },
  { key: 'price_range_land', label: '価格帯（土地）', inlineEditable: true, fieldType: 'dropdown', options: PRICE_RANGE_LAND_OPTIONS },
  { key: 'parking_spaces', label: '●P台数', inlineEditable: true, fieldType: 'dropdown', options: PARKING_SPACES_OPTIONS },
  { key: 'monthly_parking_ok', label: '★月極でも可', inlineEditable: true, fieldType: 'dropdown', options: MONTHLY_PARKING_OK_OPTIONS },
  { key: 'hot_spring_required', label: '★温泉あり', inlineEditable: true, fieldType: 'dropdown', options: HOT_SPRING_OPTIONS },
  { key: 'garden_required', label: '★庭付き', inlineEditable: true, fieldType: 'dropdown', options: GARDEN_OPTIONS },
  { key: 'pet_allowed_required', label: '★ペット可', inlineEditable: true, fieldType: 'dropdown', options: PET_ALLOWED_OPTIONS },
  { key: 'good_view_required', label: '★眺望良好', inlineEditable: true, fieldType: 'dropdown', options: GOOD_VIEW_OPTIONS },
  { key: 'high_floor_required', label: '★高層階', inlineEditable: true, fieldType: 'dropdown', options: HIGH_FLOOR_OPTIONS },
  { key: 'corner_room_required', label: '★角部屋', inlineEditable: true, fieldType: 'dropdown', options: CORNER_ROOM_OPTIONS },
];

export default function BuyerDesiredConditionsPage() {
  const { buyer_number } = useParams<{ buyer_number: string }>();
  const navigate = useNavigate();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Validate buyer_number parameter
  const isUuid = buyer_number ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(buyer_number) : false;
  const isNumericBuyerNumber = buyer_number ? /^\d+$/.test(buyer_number) : false;
  const isByPrefixBuyerNumber = buyer_number ? /^BY_[A-Za-z0-9_]+$/.test(buyer_number) : false;
  const isValidBuyerNumber = isUuid || isNumericBuyerNumber || isByPrefixBuyerNumber;

  useEffect(() => {
    if (buyer_number && isValidBuyerNumber) {
      fetchBuyer();
    }
  }, [buyer_number, isValidBuyerNumber]);

  const fetchBuyer = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/buyers/${buyer_number}`);
      setBuyer(res.data);
    } catch (error) {
      console.error('Failed to fetch buyer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInlineFieldSave = async (fieldName: string, newValue: any) => {
    if (!buyer) return;

    try {
      const result = await buyerApi.update(
        buyer_number!,
        { [fieldName]: newValue },
        { sync: true }
      );
      
      if (result.conflicts && result.conflicts.length > 0) {
        console.warn('Sync conflict detected:', result.conflicts);
        setSnackbar({
          open: true,
          message: '同期競合が発生しました。スプレッドシートの値が変更されています。',
          severity: 'warning'
        });
        setBuyer(result.buyer);
        return { success: true };
      }
      
      setBuyer(result.buyer);
      
      if (result.syncStatus === 'pending') {
        setSnackbar({
          open: true,
          message: '保存しました（スプレッドシート同期は保留中）',
          severity: 'warning'
        });
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update field:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || '更新に失敗しました' 
      };
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };

  if (!buyer_number || !isValidBuyerNumber) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, px: 2 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="error" gutterBottom>
            無効な買主番号です
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            買主番号は有効な数値、UUID、またはBY_形式である必要があります
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/buyers')}
          >
            買主一覧に戻る
          </Button>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, px: 2, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!buyer) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, px: 2 }}>
        <Typography>買主が見つかりませんでした</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/buyers')}>
          一覧に戻る
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, px: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => navigate(`/buyers/${buyer_number}`)} 
            sx={{ mr: 2 }}
            aria-label="買主詳細に戻る"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            希望条件 - {buyer.name || buyer.buyer_number}
          </Typography>
        </Box>
      </Box>

      {/* 希望条件フィールド */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          希望条件
        </Typography>
        <Grid container spacing={2}>
          {DESIRED_CONDITIONS_FIELDS.map((field) => (
            <Grid item xs={12} sm={6} md={4} key={field.key}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {field.label}
                </Typography>
                {field.inlineEditable ? (
                  <InlineEditableField
                    value={buyer[field.key]}
                    onSave={(newValue) => handleInlineFieldSave(field.key, newValue)}
                    fieldType={field.fieldType || 'text'}
                    fieldName={field.key}
                    options={field.options}
                    multiline={false}
                    buyerId={buyer_number}
                    enableConflictDetection={true}
                    showEditIndicator={true}
                    oneClickDropdown={field.fieldType === 'dropdown'}
                  />
                ) : (
                  <Typography variant="body2">
                    {formatValue(buyer[field.key])}
                  </Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
