import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon, Add as AddIcon } from '@mui/icons-material';
import api from '../services/api';
import BuyerTable from './BuyerTable';
import { getDisplayStatus } from '../utils/atbbStatusDisplayMapper';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyNumber: string | null;
  onUpdate?: () => void;
}

interface BuyerTabState {
  buyers: any[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
}

export default function PropertyListingDetailModal({ open, onClose, propertyNumber, onUpdate }: Props) {
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });
  const [buyerTabState, setBuyerTabState] = useState<BuyerTabState>({
    buyers: [],
    loading: false,
    error: null,
    loaded: false,
  });

  useEffect(() => {
    if (open && propertyNumber) {
      fetchData();
      setEditedData({});
      // モーダルを開いたときに買主タブの状態をリセット
      setBuyerTabState({
        buyers: [],
        loading: false,
        error: null,
        loaded: false,
      });
    }
  }, [open, propertyNumber]);

  const fetchData = async () => {
    if (!propertyNumber) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/property-listings/${propertyNumber}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuyersData = async () => {
    if (!propertyNumber) return;
    setBuyerTabState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.get(`/api/property-listings/${propertyNumber}/buyers`);
      setBuyerTabState({
        buyers: response.data,
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      setBuyerTabState(prev => ({
        ...prev,
        loading: false,
        error: '買主データの取得に失敗しました',
      }));
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    
    // 買主タブが選択され、まだデータをロードしていない場合
    if (newValue === 2 && !buyerTabState.loaded && propertyNumber) {
      fetchBuyersData();
    }
  };

  const handleBuyerClick = () => {
    onClose(); // モーダルを閉じる
  };

  const handleCreateBuyer = () => {
    // 物件番号をURLパラメータとして渡す
    navigate(`/buyers/new?propertyNumber=${propertyNumber}`);
    onClose(); // モーダルを閉じる
  };

  const getBuyerTabLabel = () => {
    if (buyerTabState.loading) return '買主';
    return `買主 (${buyerTabState.buyers.length})`;
  };

  const handleSave = async () => {
    if (!propertyNumber || Object.keys(editedData).length === 0) return;
    setSaving(true);
    try {
      await api.put(`/api/property-listings/${propertyNumber}`, editedData);
      setSnackbar({ open: true, message: '保存しました', severity: 'success' });
      await fetchData();
      setEditedData({});
      onUpdate?.();
    } catch (error) {
      setSnackbar({ open: true, message: '保存に失敗しました', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const getValue = (field: string) => {
    return editedData[field] !== undefined ? editedData[field] : data?.[field];
  };

  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toISOString().split('T')[0]; } catch { return ''; }
  };

  const hasChanges = Object.keys(editedData).length > 0;

  const Field = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => (
    <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
      <Grid item xs={4}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
      </Grid>
      <Grid item xs={8}>
        {type === 'date' ? (
          <TextField size="small" type="date" value={formatDateForInput(getValue(field))}
            onChange={(e) => handleFieldChange(field, e.target.value || null)} fullWidth />
        ) : type === 'number' ? (
          <TextField size="small" type="number" value={getValue(field) || ''}
            onChange={(e) => handleFieldChange(field, e.target.value ? Number(e.target.value) : null)} fullWidth />
        ) : (
          <TextField size="small" value={getValue(field) || ''}
            onChange={(e) => handleFieldChange(field, e.target.value)} fullWidth />
        )}
      </Grid>
    </Grid>
  );

  // 基本情報セクション
  const BasicInfoSection = () => (
    <Box sx={{ p: 2 }}>
      <Field label="物件番号" field="property_number" />
      <Field label="担当名（営業）" field="sales_assignee" />
      <Field label="種別" field="property_type" />
      <Field label="契約日" field="contract_date" type="date" />
      <Field label="決済日" field="settlement_date" type="date" />
      <Field label="所在地" field="address" />
      <Field label="住居表示" field="display_address" />
      <Field label="土地面積" field="land_area" type="number" />
      <Field label="建物面積" field="building_area" type="number" />
      <Field label="価格" field="price" type="number" />
      <Field label="状況" field="status" />
      <Grid container spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
        <Grid item xs={4}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>ATBB状況</Typography>
        </Grid>
        <Grid item xs={8}>
          <Typography variant="body2">
            {getDisplayStatus(data?.atbb_status) || '-'}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );

  // 売主情報
  const SellerInfoSection = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>売主情報</Typography>
      <Field label="名前（売主）" field="seller_name" />
      <Field label="住所（売主）" field="seller_address" />
      <Field label="連絡先（売主）" field="seller_contact" />
      <Field label="メール（売主）" field="seller_email" />
    </Box>
  );

  // 手数料・価格
  const FinanceSection = () => (
    <Box sx={{ p: 2 }}>
      <Field label="手数料（計）" field="total_commission" type="number" />
      <Field label="転売差額" field="resale_margin" type="number" />
      <Field label="売主から" field="commission_from_seller" type="number" />
      <Field label="買主から" field="commission_from_buyer" type="number" />
      <Field label="売出価格" field="listing_price" type="number" />
      <Field label="固定資産税" field="property_tax" type="number" />
    </Box>
  );

  // 物件詳細
  const DetailSection = () => (
    <Box sx={{ p: 2 }}>
      <Field label="構造" field="structure" />
      <Field label="新築年月" field="construction_year_month" />
      <Field label="間取り" field="floor_plan" />
      <Field label="専有面積" field="exclusive_area" type="number" />
      <Field label="主要採光面" field="main_lighting" />
      <Field label="現況" field="current_status" />
      <Field label="引渡し" field="delivery" />
      <Field label="駐車場" field="parking" />
      <Field label="管理費" field="management_fee" type="number" />
      <Field label="積立金" field="reserve_fund" type="number" />
      <Field label="特記" field="special_notes" />
    </Box>
  );

  const tabLabels = ['基本情報', '売主', getBuyerTabLabel(), '手数料・価格', '物件詳細'];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          <Typography variant="h6">物件詳細 - {propertyNumber || ''}</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            {tabLabels.map((label, i) => <Tab key={i} label={label} />)}
          </Tabs>
        </Box>
        <DialogContent sx={{ minHeight: 400 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress />
            </Box>
          ) : !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <Typography color="text.secondary">データが見つかりません</Typography>
            </Box>
          ) : (
            <>
              {tabIndex === 0 && <BasicInfoSection />}
              {tabIndex === 1 && <SellerInfoSection />}
              {tabIndex === 2 && (
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">買主リスト</Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={handleCreateBuyer}
                    >
                      新規作成
                    </Button>
                  </Box>
                  <BuyerTable propertyNumber={propertyNumber || ''} onBuyerClick={handleBuyerClick} />
                </Box>
              )}
              {tabIndex === 3 && <FinanceSection />}
              {tabIndex === 4 && <DetailSection />}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit">閉じる</Button>
          <Button onClick={handleSave} variant="contained" disabled={!hasChanges || saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
}
