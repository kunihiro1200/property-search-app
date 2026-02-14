import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Alert,
  Grid,
  TextField,
  Link,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  OpenInNew as OpenInNewIcon,
  ContentCopy as ContentCopyIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Send as SendIcon,
  Sms as SmsIcon,
} from '@mui/icons-material';
import api from '../services/api';
import FrequentlyAskedSection from '../components/FrequentlyAskedSection';
import PriceSection from '../components/PriceSection';
import PropertyDetailsSection from '../components/PropertyDetailsSection';
import CompactBuyerListForProperty from '../components/CompactBuyerListForProperty';
import EditableSection from '../components/EditableSection';
import GmailDistributionButton from '../components/GmailDistributionButton';
import DistributionAreaField from '../components/DistributionAreaField';
import EditableUrlField from '../components/EditableUrlField';
import MessageTemplateDialog from '../components/MessageTemplateDialog';
import AssigneeChatSender from '../components/AssigneeChatSender';
import PropertySidebarStatus from '../components/PropertySidebarStatus';
import { SECTION_COLORS } from '../theme/sectionColors';

interface PropertyListing {
  id: number;
  property_number: string;
  sales_assignee?: string;
  property_type?: string;
  contract_date?: string;
  settlement_date?: string;
  distribution_date?: string;
  address?: string;
  display_address?: string;
  land_area?: number;
  building_area?: number;
  sales_price?: number;
  status?: string;
  atbb_status?: string;
  seller_name?: string;
  seller_address?: string;
  seller_contact?: string;
  seller_email?: string;
  buyer_name?: string;
  buyer_address?: string;
  buyer_contact?: string;
  total_commission?: number;
  resale_margin?: number;
  commission_from_seller?: number;
  commission_from_buyer?: number;
  listing_price?: number;
  property_tax?: number;
  structure?: string;
  construction_year_month?: string;
  floor_plan?: string;
  exclusive_area?: number;
  main_lighting?: string;
  current_status?: string;
  delivery?: string;
  parking?: string;
  parking_fee?: number;
  bike_parking?: string;
  bike_parking_fee?: number;
  bicycle_parking?: string;
  bicycle_parking_fee?: number;
  management_fee?: number;
  reserve_fund?: number;
  special_notes?: string;
  pre_viewing_notes?: string;
  owner_info?: string;
  viewing_key?: string;
  viewing_parking?: string;
  viewing_notes?: string;
  viewing_available_date?: string;
  building_viewing?: string;
  broker_response?: string;
  sale_reason?: string;
  price?: number;
  price_reduction_history?: string;
  offer_date?: string;
  offer_status?: string;
  offer_amount?: string;
  offer_comment?: string;
  company_name?: string;
  image_url?: string;
  pdf_url?: string;
  google_map_url?: string;
  suumo_url?: string;
  distribution_areas?: string;
  management_type?: string;
  management_work_type?: string;
  management_company?: string;
  pet_consultation?: string;
  hot_spring?: string;
  hot_spring_status?: string;
  hot_spring_usage_type?: string;
  hot_spring_cost?: string;
  deduction_usage?: string;
  delivery_method?: string;
  broker?: string;
  judicial_scrivener?: string;
  storage_location?: string;
  memo?: string;
  running_cost?: number;
  running_cost_item1?: string;
  running_cost_item2?: string;
  running_cost_item3?: string;
  running_cost_price1?: number;
  running_cost_price2?: number;
  running_cost_price3?: number;
}

interface Buyer {
  id: number;
  name: string;
  confidence_level?: string;
  phone?: string;
  email?: string;
}

interface WorkTaskData {
  storage_url?: string;
}

export default function PropertyListingDetailPage() {
  const { propertyNumber } = useParams<{ propertyNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [data, setData] = useState<PropertyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [workTaskData, setWorkTaskData] = useState<WorkTaskData | null>(null);
  const [retrievingStorageUrl, setRetrievingStorageUrl] = useState(false);
  const [isCalculatingAreas, setIsCalculatingAreas] = useState(false);
  const [messageTemplateDialogOpen, setMessageTemplateDialogOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [staffData, setStaffData] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    fixed_holiday?: string;
  } | null>(null);
  
  // Edit mode states for each section
  const [isPriceEditMode, setIsPriceEditMode] = useState(false);
  const [isBasicInfoEditMode, setIsBasicInfoEditMode] = useState(false);
  const [isPropertyDetailsEditMode, setIsPropertyDetailsEditMode] = useState(false);
  const [isFrequentlyAskedEditMode, setIsFrequentlyAskedEditMode] = useState(false);
  const [isViewingInfoEditMode, setIsViewingInfoEditMode] = useState(false);
  const [isSellerBuyerEditMode, setIsSellerBuyerEditMode] = useState(false);
  const [communicationHistory, setCommunicationHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Check for buyer context from navigation state
  const buyerContext = location.state as { buyerId?: string; buyerName?: string; source?: string } | null;

  useEffect(() => {
    if (propertyNumber) {
      fetchPropertyData();
      fetchBuyers();
      fetchWorkTaskData();
      fetchCommunicationHistory();
    }
  }, [propertyNumber]);

  const fetchStaffData = async (assigneeName: string) => {
    try {
      console.log('[fetchStaffData] Fetching staff data for:', assigneeName);
      const response = await api.get('/api/staff');
      const staffList = response.data;
      
      console.log('[fetchStaffData] Staff list sample:', staffList[0]); // 最初のスタッフのデータ構造を確認
      console.log('[fetchStaffData] Available columns:', staffList[0] ? Object.keys(staffList[0]) : 'No data');
      
      // 担当名で検索（C列で検索 - カラム名を確認）
      // 可能性のあるカラム名: '名字', '苗字', '名前', 'lastname', etc.
      const staff = staffList.find((s: any) => {
        // 複数のカラム名を試す
        const lastName = s['名字'] || s['苗字'] || s['名前'] || s['姓'];
        console.log('[fetchStaffData] Checking staff:', { lastName, assigneeName, match: lastName === assigneeName });
        return lastName === assigneeName;
      });
      
      if (staff) {
        console.log('[fetchStaffData] Staff found:', staff);
        setStaffData({
          name: staff['姓名'],
          phone: staff['電話番号'],
          email: staff['メアド'],
          fixed_holiday: staff['固定休'],
        });
      } else {
        console.log('[fetchStaffData] Staff not found for:', assigneeName);
        console.log('[fetchStaffData] All staff names:', staffList.map((s: any) => s['名字'] || s['苗字'] || s['名前'] || s['姓']));
        setStaffData(null);
      }
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
      setStaffData(null);
    }
  };

  const fetchCommunicationHistory = async () => {
    if (!propertyNumber) return;
    setHistoryLoading(true);
    try {
      const response = await api.get(`/api/activity-logs?target_type=property_seller&target_id=${propertyNumber}`);
      setCommunicationHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch communication history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchPropertyData = async () => {
    if (!propertyNumber) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/property-listings/${propertyNumber}`);
      setData(response.data);
      
      // 担当者情報を取得
      if (response.data.sales_assignee) {
        await fetchStaffData(response.data.sales_assignee);
      }
    } catch (error) {
      console.error('Failed to fetch property data:', error);
      setSnackbar({
        open: true,
        message: '物件データの取得に失敗しました',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBuyers = async () => {
    if (!propertyNumber) return;
    setBuyersLoading(true);
    try {
      const response = await api.get(`/api/property-listings/${propertyNumber}/buyers`);
      setBuyers(response.data);
    } catch (error) {
      console.error('Failed to fetch buyers:', error);
    } finally {
      setBuyersLoading(false);
    }
  };

  const fetchWorkTaskData = async () => {
    if (!propertyNumber) return;
    try {
      const response = await api.get(`/api/work-tasks/${propertyNumber}`);
      setWorkTaskData(response.data);
    } catch (error) {
      console.error('Failed to fetch work task data:', error);
      // Don't break the page if work task data is unavailable
    }
  };

  const handleFieldChange = async (field: string, value: any) => {
    // 即座にローカル状態を更新
    setEditedData((prev) => ({ ...prev, [field]: value }));
    
    // 売買価格（sales_price）以外のフィールドは自動保存
    if (field === 'sales_price') {
      // 売買価格は自動保存しない（保存ボタンで確定）
      return;
    }
    
    // 自動保存（デバウンス処理なし - 即座に保存）
    if (!propertyNumber) return;
    
    try {
      await api.put(`/api/property-listings/${propertyNumber}`, { [field]: value });
      // 保存成功後、データを再取得
      await fetchPropertyData();
      // editedDataをクリア
      setEditedData({});
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSnackbar({
        open: true,
        message: '自動保存に失敗しました',
        severity: 'error',
      });
    }
  };

  // Save handlers for each section
  const handleSavePrice = async () => {
    if (!propertyNumber || Object.keys(editedData).length === 0) return;
    try {
      await api.put(`/api/property-listings/${propertyNumber}`, editedData);
      setSnackbar({
        open: true,
        message: '価格情報を保存しました',
        severity: 'success',
      });
      await fetchPropertyData();
      setEditedData({});
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存に失敗しました',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!propertyNumber || Object.keys(editedData).length === 0) return;
    try {
      await api.put(`/api/property-listings/${propertyNumber}`, editedData);
      setSnackbar({
        open: true,
        message: '基本情報を保存しました',
        severity: 'success',
      });
      await fetchPropertyData();
      setEditedData({});
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存に失敗しました',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleSavePropertyDetails = async () => {
    if (!propertyNumber || Object.keys(editedData).length === 0) return;
    try {
      await api.put(`/api/property-listings/${propertyNumber}`, editedData);
      setSnackbar({
        open: true,
        message: '物件詳細情報を保存しました',
        severity: 'success',
      });
      await fetchPropertyData();
      setEditedData({});
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存に失敗しました',
        severity: 'error',
      });
      throw error;
    }
  };

  // Cancel handlers for each section
  const handleCancelPrice = () => {
    setEditedData({});
    setIsPriceEditMode(false);
  };

  const handleCancelBasicInfo = () => {
    setEditedData({});
    setIsBasicInfoEditMode(false);
  };

  const handleCancelPropertyDetails = () => {
    setEditedData({});
    setIsPropertyDetailsEditMode(false);
  };

  const handleSaveFrequentlyAsked = async () => {
    if (!propertyNumber || Object.keys(editedData).length === 0) return;
    try {
      await api.put(`/api/property-listings/${propertyNumber}`, editedData);
      setSnackbar({
        open: true,
        message: 'よく聞かれる項目を保存しました',
        severity: 'success',
      });
      await fetchPropertyData();
      setEditedData({});
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存に失敗しました',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleCancelFrequentlyAsked = () => {
    setEditedData({});
    setIsFrequentlyAskedEditMode(false);
  };

  const handleSaveViewingInfo = async () => {
    if (!propertyNumber || Object.keys(editedData).length === 0) return;
    try {
      await api.put(`/api/property-listings/${propertyNumber}`, editedData);
      setSnackbar({
        open: true,
        message: '内覧情報を保存しました',
        severity: 'success',
      });
      await fetchPropertyData();
      setEditedData({});
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存に失敗しました',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleCancelViewingInfo = () => {
    setEditedData({});
    setIsViewingInfoEditMode(false);
  };

  const handleSaveSellerBuyer = async () => {
    if (!propertyNumber || Object.keys(editedData).length === 0) return;
    try {
      await api.put(`/api/property-listings/${propertyNumber}`, editedData);
      setSnackbar({
        open: true,
        message: '売主買主情報を保存しました',
        severity: 'success',
      });
      await fetchPropertyData();
      setEditedData({});
    } catch (error) {
      setSnackbar({
        open: true,
        message: '保存に失敗しました',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleCancelSellerBuyer = () => {
    setEditedData({});
    setIsSellerBuyerEditMode(false);
  };

  // 物件番号コピー機能
  const handleCopyPropertyNumber = async () => {
    if (!data?.property_number) return;
    
    try {
      await navigator.clipboard.writeText(data.property_number);
      setSnackbar({
        open: true,
        message: '物件番号をコピーしました',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to copy property number:', error);
      setSnackbar({
        open: true,
        message: '物件番号のコピーに失敗しました',
        severity: 'error',
      });
    }
  };

  // 公開URLコピー機能
  const handleCopyPublicUrl = async () => {
    if (!data?.property_number) return;
    
    const publicUrl = `https://property-site-frontend-kappa.vercel.app/public/properties/${data.property_number}`;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      setSnackbar({
        open: true,
        message: '公開URLをコピーしました',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to copy public URL:', error);
      setSnackbar({
        open: true,
        message: '公開URLのコピーに失敗しました',
        severity: 'error',
      });
    }
  };

  // 公開URLを新しいタブで開く
  const handleOpenPublicUrl = () => {
    if (!data?.property_number) return;
    
    const publicUrl = `https://property-site-frontend-kappa.vercel.app/public/properties/${data.property_number}`;
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

  // 買主候補リストページを開く
  const handleOpenBuyerCandidates = () => {
    if (!propertyNumber) return;
    
    // 新しいタブで買主候補リストページを開く
    window.open(
      `/property-listings/${propertyNumber}/buyer-candidates`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // URL patterns for validation
  const GOOGLE_MAP_URL_PATTERN = /^https:\/\/(maps\.google\.com|www\.google\.com\/maps|goo\.gl\/maps)\/.+/;
  const GOOGLE_DRIVE_FOLDER_PATTERN = /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/.+/;

  // URL update handlers
  const handleUpdateGoogleMapUrl = async (newUrl: string) => {
    try {
      const response = await api.patch(
        `/api/property-listings/${propertyNumber}/google-map-url`,
        { googleMapUrl: newUrl }
      );
      
      // Update local state
      setData(prev => prev ? {
        ...prev,
        google_map_url: newUrl,
        distribution_areas: response.data.distributionAreas
      } : null);
      
      // Show success message
      setSnackbar({
        open: true,
        message: '地図URLを更新しました',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || '地図URLの更新に失敗しました',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleUpdateStorageLocation = async (newUrl: string) => {
    try {
      await api.patch(
        `/api/property-listings/${propertyNumber}/storage-location`,
        { storageLocation: newUrl }
      );
      
      // Update local state
      setData(prev => prev ? {
        ...prev,
        storage_location: newUrl
      } : null);
      
      // Show success message
      setSnackbar({
        open: true,
        message: '格納先URLを更新しました',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || '格納先URLの更新に失敗しました',
        severity: 'error',
      });
      throw error;
    }
  };

  // 格納先URLを自動取得
  const handleAutoRetrieveStorageUrl = async () => {
    if (!propertyNumber) return;
    
    setRetrievingStorageUrl(true);
    try {
      const response = await api.post(
        `/api/public/properties/${propertyNumber}/retrieve-storage-url`
      );
      
      if (response.data.success && response.data.storageUrl) {
        // Update local state
        setData(prev => prev ? {
          ...prev,
          storage_location: response.data.storageUrl
        } : null);
        
        // Show success message
        setSnackbar({
          open: true,
          message: response.data.message || '格納先URLを自動取得しました',
          severity: 'success',
        });
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || '格納先URLの自動取得に失敗しました',
        severity: 'error',
      });
    } finally {
      setRetrievingStorageUrl(false);
    }
  };

  const handleBack = () => {
    // If navigated from buyer detail page, go back to buyer detail
    if (buyerContext?.buyerId && buyerContext?.source === 'buyer-detail') {
      navigate(`/buyers/${buyerContext.buyerId}`);
      return;
    }
    
    // Otherwise, go back to property listings
    const savedState = sessionStorage.getItem('propertyListState');
    if (savedState) {
      navigate('/property-listings', { state: JSON.parse(savedState) });
    } else {
      navigate('/property-listings');
    }
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

  if (!data) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            物件が見つかりません
          </Typography>
          <Button variant="contained" onClick={handleBack} sx={{ mt: 2 }}>
            物件リストに戻る
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, zoom: '0.6' }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* 左サイドバー - サイドバーステータス */}
        <PropertySidebarStatus
          listings={[data]}
          selectedStatus={data.sidebar_status || null}
          onStatusChange={() => {}} // 詳細画面では変更不可
          pendingPriceReductionProperties={new Set()}
        />
        
        {/* メインコンテンツ */}
        <Box sx={{ flex: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} size="large">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
              {data.property_number}
            </Typography>
            <IconButton
              size="small"
              onClick={handleCopyPropertyNumber}
              sx={{ color: SECTION_COLORS.property.main }}
              title="物件番号をコピー"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
              {/* 公開URLボタン */}
              <Button
                variant="outlined"
                size="medium"
                onClick={handleOpenPublicUrl}
                endIcon={<OpenInNewIcon />}
                sx={{
                  ml: 1,
                  borderColor: SECTION_COLORS.property.main,
                  color: SECTION_COLORS.property.main,
                  '&:hover': {
                    borderColor: SECTION_COLORS.property.dark,
                    backgroundColor: `${SECTION_COLORS.property.main}08`,
                  },
                }}
              >
                公開URL
              </Button>
              <IconButton
                size="medium"
                onClick={handleCopyPublicUrl}
                sx={{ color: SECTION_COLORS.property.main }}
                title="公開URLをコピー"
              >
                <ContentCopyIcon />
              </IconButton>
              {/* 売主連絡先ボタン */}
              {data.seller_contact && (
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={async () => {
                    // 電話をかける
                    window.location.href = `tel:${data.seller_contact}`;
                    
                    // コミュニケーション履歴を記録
                    try {
                      const { supabase } = await import('../config/supabase');
                      const { data: { user } } = await supabase.auth.getUser();
                      
                      if (user?.email) {
                        await api.post('/api/activity-logs', {
                          action: 'phone_call',
                          targetType: 'property_seller',
                          targetId: data.property_number,
                          metadata: {
                            seller_name: data.seller_name,
                            seller_contact: data.seller_contact,
                            property_number: data.property_number,
                            property_address: data.address || data.display_address,
                          },
                        });
                        // 履歴を再取得
                        fetchCommunicationHistory();
                      }
                    } catch (error) {
                      console.error('Failed to log phone call:', error);
                      // エラーでも電話は続行
                    }
                  }}
                  startIcon={<PhoneIcon />}
                  sx={{
                    ml: 1,
                    borderColor: '#2e7d32',
                    color: '#2e7d32',
                    '&:hover': {
                      borderColor: '#1b5e20',
                      backgroundColor: '#2e7d3208',
                    },
                  }}
                >
                  売主
                </Button>
              )}
              {data.seller_email && (
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={() => setMessageTemplateDialogOpen(true)}
                  startIcon={<EmailIcon />}
                  sx={{
                    borderColor: '#1976d2',
                    color: '#1976d2',
                    '&:hover': {
                      borderColor: '#115293',
                      backgroundColor: '#1976d208',
                    },
                  }}
                >
                  売主
                </Button>
              )}
              {/* 売主へSMS送信ボタン */}
              {data.seller_contact && (
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={async () => {
                    // SMS本文を作成
                    const sellerName = data.seller_name || '売主';
                    const smsBody = `${sellerName}様

お世話になっております。



㈱いふう`;
                    
                    // SMSアプリを開く（sms:スキーム）
                    const smsUrl = `sms:${data.seller_contact}?body=${encodeURIComponent(smsBody)}`;
                    window.location.href = smsUrl;
                    
                    // コミュニケーション履歴を記録
                    try {
                      const { supabase } = await import('../config/supabase');
                      const { data: { user } } = await supabase.auth.getUser();
                      
                      if (user?.email) {
                        await api.post('/api/activity-logs', {
                          action: 'sms',
                          targetType: 'property_seller',
                          targetId: data.property_number,
                          metadata: {
                            seller_name: data.seller_name,
                            seller_contact: data.seller_contact,
                            property_number: data.property_number,
                            property_address: data.address || data.display_address,
                            body: smsBody,
                          },
                        });
                        // 履歴を再取得
                        fetchCommunicationHistory();
                      }
                    } catch (error) {
                      console.error('Failed to log SMS:', error);
                      // エラーでもSMS送信は続行
                    }
                  }}
                  startIcon={<SmsIcon />}
                  sx={{
                    borderColor: '#ff9800',
                    color: '#ff9800',
                    '&:hover': {
                      borderColor: '#f57c00',
                      backgroundColor: '#ff980808',
                    },
                  }}
                >
                  売主
                </Button>
              )}
              {/* 担当へChat送信ボタン */}
              {data.sales_assignee && (
                <Button
                  variant="outlined"
                  size="medium"
                  onClick={async () => {
                    const userMessage = prompt('担当者へのメッセージを入力してください:');
                    if (userMessage) {
                      try {
                        // 物件詳細画面のURL
                        const propertyDetailUrl = `${window.location.origin}/property-listings/${data.property_number}`;
                        
                        // ログインユーザーのメールアドレスを取得
                        const { supabase } = await import('../config/supabase');
                        const { data: { user } } = await supabase.auth.getUser();
                        const userEmail = user?.email;
                        
                        // スタッフ名を取得
                        let senderName = userEmail || 'システム';
                        if (userEmail) {
                          try {
                            console.log('Fetching staff name for email:', userEmail);
                            const staffResponse = await api.get(`/api/staff/by-email/${encodeURIComponent(userEmail)}`);
                            console.log('Staff API response:', staffResponse.data);
                            if (staffResponse.data && staffResponse.data.name) {
                              // フルネームから名字を抽出（例: "国広智子" → "国広"）
                              const fullName = staffResponse.data.name;
                              const lastName = fullName.split(/\s+/)[0]; // スペースで区切って最初の部分を取得
                              senderName = lastName;
                              console.log('Staff name found:', senderName);
                            } else {
                              console.warn('Staff name not found in response, using email:', userEmail);
                            }
                          } catch (error: any) {
                            console.error('Failed to fetch staff name:', error);
                            console.error('Error details:', error.response?.data);
                            // エラーの場合はメールアドレスを使用
                            console.warn('Using email as sender name:', userEmail);
                          }
                        }
                        
                        // 詳細情報を含めたメッセージを作成
                        const detailedMessage = `
【送信者】${senderName}

【メッセージ】
${userMessage.trim()}

━━━━━━━━━━━━━━━━━━━━
【物件情報】
物件番号: ${data.property_number}
所在地: ${data.address || data.display_address || '未設定'}
価格: ${data.price ? `¥${data.price.toLocaleString()}` : '未設定'}

【売主情報】
売主名: ${data.seller_name || '未設定'}
売主連絡先: ${data.seller_contact || '未設定'}

【物件詳細画面】
${propertyDetailUrl}
━━━━━━━━━━━━━━━━━━━━
                        `.trim();
                        
                        await api.post(`/api/chat-notifications/property-assignee/${data.property_number}`, {
                          message: detailedMessage,
                        });
                        
                        setSnackbar({
                          open: true,
                          message: `担当者（${data.sales_assignee}）にChat送信しました`,
                          severity: 'success',
                        });
                      } catch (error: any) {
                        setSnackbar({
                          open: true,
                          message: error.response?.data?.error?.message || '担当者へのChat送信に失敗しました',
                          severity: 'error',
                        });
                      }
                    }
                  }}
                  startIcon={<SendIcon />}
                  sx={{
                    ml: 2,
                    borderColor: '#9c27b0',
                    color: '#9c27b0',
                    '&:hover': {
                      borderColor: '#7b1fa2',
                      backgroundColor: '#9c27b008',
                    },
                  }}
                >
                  担当へChat
                </Button>
              )}
              {/* 業者への対応日付表示（今日より後の場合のみ） */}
              {data.broker_response && (() => {
                try {
                  // broker_responseの値を確認
                  let brokerDateValue = data.broker_response;
                  
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
                          ml: 3,
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
            </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={handleOpenBuyerCandidates}
            sx={{
              borderColor: SECTION_COLORS.property.main,
              color: SECTION_COLORS.property.main,
              '&:hover': {
                borderColor: SECTION_COLORS.property.dark,
                backgroundColor: `${SECTION_COLORS.property.main}08`,
              },
            }}
          >
            買主候補
          </Button>
          <GmailDistributionButton
            propertyNumber={data.property_number}
            propertyAddress={data.address || data.display_address}
            distributionAreas={editedData.distribution_areas !== undefined ? editedData.distribution_areas : data.distribution_areas}
            isCalculatingAreas={isCalculatingAreas}
            size="medium"
            variant="contained"
          />
        </Box>
      </Box>

      {/* Property Header - Key Information */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold">所在地</Typography>
            <Typography variant="body1" fontWeight="medium">
              {data.address || data.display_address || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold">種別</Typography>
            <Typography variant="body1" fontWeight="medium">
              {data.property_type || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold">売主名</Typography>
            <Typography variant="body1" fontWeight="medium">
              {data.seller_name || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold">ステータス</Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ color: '#d32f2f' }}>
              {data.atbb_status || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold">現況</Typography>
            <Typography variant="body1" fontWeight="medium">
              {data.current_status || '-'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold">担当</Typography>
            <Typography variant="body1" fontWeight="medium">
              {data.sales_assignee || '-'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Full Width Content */}
        <Grid item xs={12}>
          {/* 1. 価格情報 + 買主リスト */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 2, 
            mb: 2,
            p: 2,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
            border: '1px solid #e0e0e0'
          }}>
            {/* 価格情報 */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 33%' } }}>
              <EditableSection
                title="価格情報"
                isEditMode={isPriceEditMode}
                onEditToggle={() => setIsPriceEditMode(!isPriceEditMode)}
                onSave={handleSavePrice}
                onCancel={handleCancelPrice}
              >
                <PriceSection
                  salesPrice={data.price}
                  listingPrice={data.listing_price}
                  priceReductionHistory={data.price_reduction_history}
                  onFieldChange={handleFieldChange}
                  editedData={editedData}
                  isEditMode={isPriceEditMode}
                  propertyNumber={data.property_number}
                  salesAssignee={data.sales_assignee}
                  address={data.address}
                  onChatSendSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
                  onChatSendError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
                />
              </EditableSection>
            </Box>
            
            {/* 買主リスト */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 67%' } }}>
              <CompactBuyerListForProperty
                buyers={buyers as any[]}
                propertyNumber={data.property_number}
                loading={buyersLoading}
              />
            </Box>
          </Box>

          {/* 2. よく聞かれる項目 + 特記・備忘録 */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 2, 
            mb: 2,
            p: 2,
            bgcolor: '#fff8e1',
            borderRadius: 2,
            border: '1px solid #ffe082'
          }}>
            {/* よく聞かれる項目 */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 50%' } }}>
              <EditableSection
                title="よく聞かれる項目"
                isEditMode={isFrequentlyAskedEditMode}
                onEditToggle={() => setIsFrequentlyAskedEditMode(!isFrequentlyAskedEditMode)}
                onSave={handleSaveFrequentlyAsked}
                onCancel={handleCancelFrequentlyAsked}
              >
                <FrequentlyAskedSection 
                  data={data} 
                  editedData={editedData}
                  onFieldChange={handleFieldChange}
                  isEditMode={isFrequentlyAskedEditMode}
                />
              </EditableSection>
            </Box>
            
            {/* 特記・備忘録 */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 50%' } }}>
              <Paper sx={{ p: 2, bgcolor: '#fff9e6', height: '100%' }}>
                <Box sx={{ 
                  mb: 2, 
                  pb: 1, 
                  borderBottom: `2px solid ${SECTION_COLORS.property.main}`,
                }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: SECTION_COLORS.property.main, fontSize: '1.25rem' }}>
                    特記・備忘録
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ fontSize: '1rem' }}>特記</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={editedData.special_notes !== undefined ? editedData.special_notes : (data.special_notes || '')}
                    onChange={(e) => handleFieldChange('special_notes', e.target.value)}
                    placeholder="特記事項を入力してください"
                    sx={{ '& .MuiInputBase-input': { fontSize: '18px', lineHeight: 1.8 } }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ fontSize: '1rem' }}>備忘録</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={editedData.memo !== undefined ? editedData.memo : (data.memo || '')}
                    onChange={(e) => handleFieldChange('memo', e.target.value)}
                    placeholder="備忘録を入力してください"
                    sx={{ '& .MuiInputBase-input': { fontSize: '18px', lineHeight: 1.8 } }}
                  />
                </Box>
              </Paper>
            </Box>
          </Box>

          {/* 3. 内覧情報 + 基本情報 */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 2, 
            mb: 2,
            p: 2,
            bgcolor: '#e3f2fd',
            borderRadius: 2,
            border: '1px solid #90caf9'
          }}>
            {/* 内覧情報 */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 50%' } }}>
              <EditableSection
                title="内覧情報"
                isEditMode={isViewingInfoEditMode}
                onEditToggle={() => setIsViewingInfoEditMode(!isViewingInfoEditMode)}
                onSave={handleSaveViewingInfo}
                onCancel={handleCancelViewingInfo}
              >
                <Grid container spacing={2}>
                  {(isViewingInfoEditMode || data.viewing_key) && (
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>内覧時（鍵等）</Typography>
                      {isViewingInfoEditMode ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={editedData.viewing_key !== undefined ? editedData.viewing_key : (data.viewing_key || '')}
                          onChange={(e) => handleFieldChange('viewing_key', e.target.value)}
                        />
                      ) : (
                        <Typography variant="body1">{data.viewing_key}</Typography>
                      )}
                    </Grid>
                  )}
                  {(isViewingInfoEditMode || data.viewing_parking) && (
                    <Grid item xs={12}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>内覧時駐車場</Typography>
                      {isViewingInfoEditMode ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={editedData.viewing_parking !== undefined ? editedData.viewing_parking : (data.viewing_parking || '')}
                          onChange={(e) => handleFieldChange('viewing_parking', e.target.value)}
                        />
                      ) : (
                        <Typography variant="body1">{data.viewing_parking}</Typography>
                      )}
                    </Grid>
                  )}
                  {(isViewingInfoEditMode || data.viewing_notes) && (
                    <Grid item xs={12}>
                      <Box sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 1, border: '2px solid #2196f3' }}>
                        <Typography variant="h6" color="primary.dark" fontWeight="bold" gutterBottom sx={{ fontSize: '1.25rem' }}>
                          📝 内覧の時の伝達事項
                        </Typography>
                        {isViewingInfoEditMode ? (
                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={editedData.viewing_notes !== undefined ? editedData.viewing_notes : (data.viewing_notes || '')}
                            onChange={(e) => handleFieldChange('viewing_notes', e.target.value)}
                            sx={{ 
                              bgcolor: 'white',
                              '& .MuiInputBase-input': { fontSize: '1.1rem', lineHeight: 1.8 }
                            }}
                          />
                        ) : (
                          <Typography 
                            variant="body1"
                            sx={{ 
                              fontSize: '1.1rem', 
                              lineHeight: 1.8,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            {data.viewing_notes}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  )}
                  {(isViewingInfoEditMode || data.viewing_available_date) && (
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>内覧可能日</Typography>
                      {isViewingInfoEditMode ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={editedData.viewing_available_date !== undefined ? editedData.viewing_available_date : (data.viewing_available_date || '')}
                          onChange={(e) => handleFieldChange('viewing_available_date', e.target.value)}
                        />
                      ) : (
                        <Typography variant="body1">{data.viewing_available_date}</Typography>
                      )}
                    </Grid>
                  )}
                  {(isViewingInfoEditMode || data.building_viewing) && (
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>建物内覧</Typography>
                      {isViewingInfoEditMode ? (
                        <TextField
                          fullWidth
                          size="small"
                          value={editedData.building_viewing !== undefined ? editedData.building_viewing : (data.building_viewing || '')}
                          onChange={(e) => handleFieldChange('building_viewing', e.target.value)}
                        />
                      ) : (
                        <Typography variant="body1">{data.building_viewing}</Typography>
                      )}
                    </Grid>
                  )}
                </Grid>
              </EditableSection>
            </Box>

            {/* 基本情報 */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 50%' } }}>
              <EditableSection
                title="基本情報"
                isEditMode={isBasicInfoEditMode}
                onEditToggle={() => setIsBasicInfoEditMode(!isBasicInfoEditMode)}
                onSave={handleSaveBasicInfo}
                onCancel={handleCancelBasicInfo}
              >
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>物件番号</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.25rem' }}>{data.property_number}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>担当</Typography>
                {isBasicInfoEditMode ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedData.sales_assignee !== undefined ? editedData.sales_assignee : (data.sales_assignee || '')}
                    onChange={(e) => handleFieldChange('sales_assignee', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { fontSize: '1.1rem' } }}
                  />
                ) : (
                  <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>{data.sales_assignee || '-'}</Typography>
                )}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>種別</Typography>
                {isBasicInfoEditMode ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedData.property_type !== undefined ? editedData.property_type : (data.property_type || '')}
                    onChange={(e) => handleFieldChange('property_type', e.target.value)}
                  />
                ) : (
                  <Typography variant="body1">{data.property_type || '-'}</Typography>
                )}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>状況</Typography>
                {isBasicInfoEditMode ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedData.status !== undefined ? editedData.status : (data.status || '')}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  />
                ) : (
                  <Typography variant="body1">{data.status || '-'}</Typography>
                )}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>現況</Typography>
                {isBasicInfoEditMode ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedData.current_status !== undefined ? editedData.current_status : (data.current_status || '')}
                    onChange={(e) => handleFieldChange('current_status', e.target.value)}
                  />
                ) : (
                  <Typography variant="body1">{data.current_status || '-'}</Typography>
                )}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>配信日（公開）</Typography>
                {isBasicInfoEditMode ? (
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={editedData.distribution_date !== undefined ? editedData.distribution_date : (data.distribution_date || '')}
                    onChange={(e) => handleFieldChange('distribution_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                ) : (
                  <Typography variant="body1">{data.distribution_date || '-'}</Typography>
                )}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>売出価格</Typography>
                {isBasicInfoEditMode ? (
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={editedData.listing_price !== undefined ? editedData.listing_price : (data.listing_price || '')}
                    onChange={(e) => handleFieldChange('listing_price', e.target.value ? Number(e.target.value) : null)}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 0.5 }}>¥</Typography>,
                    }}
                  />
                ) : (
                  <Typography variant="body1">
                    {data.listing_price ? `¥${data.listing_price.toLocaleString()}` : '-'}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>所在地</Typography>
                {isBasicInfoEditMode ? (
                  <TextField
                    fullWidth
                    size="small"
                    value={editedData.address !== undefined ? editedData.address : (data.address || data.display_address || '')}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                  />
                ) : (
                  <Typography variant="body1">{data.address || data.display_address || '-'}</Typography>
                )}
              </Grid>
              {/* その他情報の非空欄フィールドを統合 */}
              {data.management_type && (
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>管理形態</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.management_type !== undefined ? editedData.management_type : (data.management_type || '')}
                      onChange={(e) => handleFieldChange('management_type', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.management_type}</Typography>
                  )}
                </Grid>
              )}
              {data.management_company && (
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>管理会社</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.management_company !== undefined ? editedData.management_company : (data.management_company || '')}
                      onChange={(e) => handleFieldChange('management_company', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.management_company}</Typography>
                  )}
                </Grid>
              )}
              {data.pet_consultation && (
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>ペット相談</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.pet_consultation !== undefined ? editedData.pet_consultation : (data.pet_consultation || '')}
                      onChange={(e) => handleFieldChange('pet_consultation', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.pet_consultation}</Typography>
                  )}
                </Grid>
              )}
              {data.hot_spring && (
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>温泉</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.hot_spring !== undefined ? editedData.hot_spring : (data.hot_spring || '')}
                      onChange={(e) => handleFieldChange('hot_spring', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.hot_spring}</Typography>
                  )}
                </Grid>
              )}
              {data.deduction_usage && (
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>控除利用</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.deduction_usage !== undefined ? editedData.deduction_usage : (data.deduction_usage || '')}
                      onChange={(e) => handleFieldChange('deduction_usage', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.deduction_usage}</Typography>
                  )}
                </Grid>
              )}
              {data.delivery_method && (
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>引渡方法</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.delivery_method !== undefined ? editedData.delivery_method : (data.delivery_method || '')}
                      onChange={(e) => handleFieldChange('delivery_method', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.delivery_method}</Typography>
                  )}
                </Grid>
              )}
              {data.broker && (
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>仲介業者</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.broker !== undefined ? editedData.broker : (data.broker || '')}
                      onChange={(e) => handleFieldChange('broker', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.broker}</Typography>
                  )}
                </Grid>
              )}
              {data.judicial_scrivener && (
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>司法書士</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.judicial_scrivener !== undefined ? editedData.judicial_scrivener : (data.judicial_scrivener || '')}
                      onChange={(e) => handleFieldChange('judicial_scrivener', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.judicial_scrivener}</Typography>
                  )}
                </Grid>
              )}
              {data.storage_location && (
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>保存場所</Typography>
                  {isBasicInfoEditMode ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedData.storage_location !== undefined ? editedData.storage_location : (data.storage_location || '')}
                      onChange={(e) => handleFieldChange('storage_location', e.target.value)}
                    />
                  ) : (
                    <Typography variant="body1">{data.storage_location}</Typography>
                  )}
                </Grid>
              )}
                </Grid>
              </EditableSection>
            </Box>
          </Box>

          {/* 4. 地図・サイトURL + 物件詳細情報 */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 2, 
            mb: 2,
            p: 2,
            bgcolor: '#f3e5f5',
            borderRadius: 2,
            border: '1px solid #ce93d8'
          }}>
            {/* 地図・サイトURL */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 50%' } }}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Box sx={{ 
                  mb: 2, 
                  pb: 1, 
                  borderBottom: `2px solid ${SECTION_COLORS.property.main}`,
                }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
                    地図・サイトURL
                  </Typography>
                </Box>
                
                <EditableUrlField
                  label="地図URL"
                  value={data.google_map_url || null}
                  placeholder="https://maps.google.com/..."
                  urlPattern={GOOGLE_MAP_URL_PATTERN}
                  errorMessage="有効なGoogle Map URLを入力してください"
                  onSave={handleUpdateGoogleMapUrl}
                  helperText="物件の位置を示すGoogle Map URLを入力してください"
                />
                
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      格納先URL
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAutoRetrieveStorageUrl}
                      disabled={retrievingStorageUrl}
                      startIcon={retrievingStorageUrl ? <CircularProgress size={16} /> : null}
                      sx={{
                        borderColor: SECTION_COLORS.property.main,
                        color: SECTION_COLORS.property.main,
                        '&:hover': {
                          borderColor: SECTION_COLORS.property.dark,
                          backgroundColor: `${SECTION_COLORS.property.main}08`,
                        },
                      }}
                    >
                      {retrievingStorageUrl ? '取得中...' : '自動取得'}
                    </Button>
                  </Box>
                  
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      現在のURL:
                    </Typography>
                    {data.storage_location ? (
                      <Link
                        href={data.storage_location}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          wordBreak: 'break-all',
                          fontSize: '0.875rem'
                        }}
                      >
                        {data.storage_location}
                        <OpenInNewIcon fontSize="small" />
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        未設定
                      </Typography>
                    )}
                  </Box>
                  
                  <EditableUrlField
                    label=""
                    value={data.storage_location || null}
                    placeholder="https://drive.google.com/drive/folders/..."
                    urlPattern={GOOGLE_DRIVE_FOLDER_PATTERN}
                    errorMessage="有効なGoogle DriveフォルダURLを入力してください"
                    onSave={handleUpdateStorageLocation}
                    helperText="物件関連ドキュメントが保存されているGoogle DriveフォルダのURLを入力してください"
                  />
                </Box>
              </Paper>
            </Box>

            {/* 物件詳細情報 */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 50%' } }}>
              <EditableSection
                title="物件詳細情報"
                isEditMode={isPropertyDetailsEditMode}
                onEditToggle={() => setIsPropertyDetailsEditMode(!isPropertyDetailsEditMode)}
                onSave={handleSavePropertyDetails}
                onCancel={handleCancelPropertyDetails}
              >
                <PropertyDetailsSection
                  data={data}
                  editedData={editedData}
                  onFieldChange={handleFieldChange}
                  isEditMode={isPropertyDetailsEditMode}
                />
              </EditableSection>
            </Box>
          </Box>

          {/* 5. 配信エリア番号（全幅） */}
          <Box sx={{ 
            mb: 2,
            p: 2,
            bgcolor: '#e8f5e9',
            borderRadius: 2,
            border: '1px solid #a5d6a7'
          }}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ 
                mb: 2, 
                pb: 1, 
                borderBottom: `2px solid ${SECTION_COLORS.property.main}`,
              }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
                  配信エリア番号
                </Typography>
              </Box>
              <DistributionAreaField
                propertyNumber={propertyNumber || ''}
                googleMapUrl={data.google_map_url}
                value={editedData.distribution_areas !== undefined ? editedData.distribution_areas : (data.distribution_areas || '')}
                onChange={(value) => handleFieldChange('distribution_areas', value)}
                onCalculatingChange={setIsCalculatingAreas}
              />
            </Paper>
          </Box>

          {/* 6. 売主・買主情報 + 手数料情報 */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 2, 
            mb: 2,
            p: 2,
            bgcolor: '#fce4ec',
            borderRadius: 2,
            border: '1px solid #f48fb1'
          }}>
            {/* 売主・買主情報 */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 50%' } }}>
              <EditableSection
                title="売主・買主情報"
                isEditMode={isSellerBuyerEditMode}
                onEditToggle={() => setIsSellerBuyerEditMode(!isSellerBuyerEditMode)}
                onSave={handleSaveSellerBuyer}
                onCancel={handleCancelSellerBuyer}
              >
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>売主</Typography>
                  <Grid container spacing={2}>
                    {(isSellerBuyerEditMode || data.seller_name) && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>名前</Typography>
                        {isSellerBuyerEditMode ? (
                          <TextField
                            fullWidth
                            size="small"
                            value={editedData.seller_name !== undefined ? editedData.seller_name : (data.seller_name || '')}
                            onChange={(e) => handleFieldChange('seller_name', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">{data.seller_name}</Typography>
                        )}
                      </Grid>
                    )}
                    {(isSellerBuyerEditMode || data.seller_address) && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>住所</Typography>
                        {isSellerBuyerEditMode ? (
                          <TextField
                            fullWidth
                            size="small"
                            value={editedData.seller_address !== undefined ? editedData.seller_address : (data.seller_address || '')}
                            onChange={(e) => handleFieldChange('seller_address', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">{data.seller_address}</Typography>
                        )}
                      </Grid>
                    )}
                    {(isSellerBuyerEditMode || data.seller_contact) && (
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>連絡先</Typography>
                        {isSellerBuyerEditMode ? (
                          <TextField
                            fullWidth
                            size="small"
                            value={editedData.seller_contact !== undefined ? editedData.seller_contact : (data.seller_contact || '')}
                            onChange={(e) => handleFieldChange('seller_contact', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">{data.seller_contact}</Typography>
                        )}
                      </Grid>
                    )}
                    {(isSellerBuyerEditMode || data.seller_email) && (
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>メールアドレス</Typography>
                        {isSellerBuyerEditMode ? (
                          <TextField
                            fullWidth
                            size="small"
                            value={editedData.seller_email !== undefined ? editedData.seller_email : (data.seller_email || '')}
                            onChange={(e) => handleFieldChange('seller_email', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">{data.seller_email}</Typography>
                        )}
                      </Grid>
                    )}
                    {(isSellerBuyerEditMode || data.sale_reason) && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>売却理由</Typography>
                        {isSellerBuyerEditMode ? (
                          <TextField
                            fullWidth
                            size="small"
                            value={editedData.sale_reason !== undefined ? editedData.sale_reason : (data.sale_reason || '')}
                            onChange={(e) => handleFieldChange('sale_reason', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">{data.sale_reason}</Typography>
                        )}
                      </Grid>
                    )}
                  </Grid>
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>買主</Typography>
                  <Grid container spacing={2}>
                    {(isSellerBuyerEditMode || data.buyer_name) && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" fontWeight="bold">名前</Typography>
                        {isSellerBuyerEditMode ? (
                          <TextField
                            fullWidth
                            size="small"
                            value={editedData.buyer_name !== undefined ? editedData.buyer_name : (data.buyer_name || '')}
                            onChange={(e) => handleFieldChange('buyer_name', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">{data.buyer_name}</Typography>
                        )}
                      </Grid>
                    )}
                    {(isSellerBuyerEditMode || data.buyer_address) && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" fontWeight="bold">住所</Typography>
                        {isSellerBuyerEditMode ? (
                          <TextField
                            fullWidth
                            size="small"
                            value={editedData.buyer_address !== undefined ? editedData.buyer_address : (data.buyer_address || '')}
                            onChange={(e) => handleFieldChange('buyer_address', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">{data.buyer_address}</Typography>
                        )}
                      </Grid>
                    )}
                    {(isSellerBuyerEditMode || data.buyer_contact) && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" fontWeight="bold">連絡先</Typography>
                        {isSellerBuyerEditMode ? (
                          <TextField
                            fullWidth
                            size="small"
                            value={editedData.buyer_contact !== undefined ? editedData.buyer_contact : (data.buyer_contact || '')}
                            onChange={(e) => handleFieldChange('buyer_contact', e.target.value)}
                          />
                        ) : (
                          <Typography variant="body1">{data.buyer_contact}</Typography>
                        )}
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </EditableSection>
            </Box>

            {/* 手数料情報 */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 50%' } }}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Box sx={{ 
                  mb: 2, 
                  pb: 1, 
                  borderBottom: `2px solid ${SECTION_COLORS.property.main}`,
                }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
                    手数料情報
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">手数料（計）</Typography>
                    <Typography variant="body1">
                      {data.total_commission ? `¥${data.total_commission.toLocaleString()}` : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">転売差額</Typography>
                    <Typography variant="body1">
                      {data.resale_margin ? `¥${data.resale_margin.toLocaleString()}` : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">売主から</Typography>
                    <Typography variant="body1">
                      {data.commission_from_seller ? `¥${data.commission_from_seller.toLocaleString()}` : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">買主から</Typography>
                    <Typography variant="body1">
                      {data.commission_from_buyer ? `¥${data.commission_from_buyer.toLocaleString()}` : '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          </Box>

          {/* 7. コミュニケーション履歴（全幅） */}
          <Box sx={{ 
            mb: 2,
            p: 2,
            bgcolor: '#e8eaf6',
            borderRadius: 2,
            border: '1px solid #9fa8da'
          }}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ 
                mb: 2, 
                pb: 1, 
                borderBottom: `2px solid ${SECTION_COLORS.property.main}`,
              }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
                  コミュニケーション履歴
                </Typography>
              </Box>
              {historyLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : communicationHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  履歴がありません
                </Typography>
              ) : (
                <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {communicationHistory.map((log, index) => (
                    <Box 
                      key={log.id || index} 
                      sx={{ 
                        mb: 2, 
                        p: 2, 
                        bgcolor: '#f5f5f5', 
                        borderRadius: 1,
                        borderLeft: `4px solid ${
                          log.action === 'phone_call' ? '#2e7d32' : 
                          log.action === 'email' ? '#1976d2' : 
                          log.action === 'sms' ? '#ff9800' : '#757575'
                        }`,
                        cursor: (log.action === 'email' || log.action === 'sms') ? 'pointer' : 'default',
                        '&:hover': (log.action === 'email' || log.action === 'sms') ? {
                          bgcolor: '#eeeeee',
                        } : {},
                      }}
                      onClick={() => {
                        if (log.action === 'email' || log.action === 'sms') {
                          setExpandedHistoryId(expandedHistoryId === log.id ? null : log.id);
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {log.action === 'phone_call' && <PhoneIcon sx={{ color: '#2e7d32' }} />}
                          {log.action === 'email' && <EmailIcon sx={{ color: '#1976d2' }} />}
                          {log.action === 'sms' && <SmsIcon sx={{ color: '#ff9800' }} />}
                          <Typography variant="subtitle2" fontWeight="bold">
                            {log.action === 'phone_call' ? '電話' : 
                             log.action === 'email' ? 'メール' : 
                             log.action === 'sms' ? 'SMS' : log.action}
                          </Typography>
                          {log.action === 'email' && log.metadata?.template_type && (
                            <Typography variant="caption" sx={{ 
                              bgcolor: '#1976d2', 
                              color: 'white', 
                              px: 1, 
                              py: 0.5, 
                              borderRadius: 1,
                              fontWeight: 'bold'
                            }}>
                              {log.metadata.template_type}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.created_at).toLocaleString('ja-JP')}
                        </Typography>
                      </Box>
                      {log.metadata && (
                        <Box sx={{ mt: 1 }}>
                          {log.metadata.seller_name && (
                            <Typography variant="body2" color="text.secondary">
                              売主: {log.metadata.seller_name}
                            </Typography>
                          )}
                          {log.metadata.seller_contact && (
                            <Typography variant="body2" color="text.secondary">
                              連絡先: {log.metadata.seller_contact}
                            </Typography>
                          )}
                          {log.metadata.seller_email && (
                            <Typography variant="body2" color="text.secondary">
                              メール: {log.metadata.seller_email}
                            </Typography>
                          )}
                          {log.metadata.property_address && (
                            <Typography variant="body2" color="text.secondary">
                              物件: {log.metadata.property_address}
                            </Typography>
                          )}
                          {/* メールの件名を表示 */}
                          {log.action === 'email' && log.metadata.subject && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              件名: {log.metadata.subject}
                            </Typography>
                          )}
                          {/* 本文を展開表示 */}
                          {expandedHistoryId === log.id && (log.action === 'email' || log.action === 'sms') && log.metadata.body && (
                            <Box sx={{ 
                              mt: 2, 
                              p: 2, 
                              bgcolor: 'white', 
                              borderRadius: 1,
                              border: '1px solid #ddd'
                            }}>
                              <Typography variant="body2" fontWeight="bold" gutterBottom>
                                {log.action === 'email' ? 'メール本文:' : 'SMS本文:'}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  fontSize: '0.9rem',
                                  lineHeight: 1.6
                                }}
                              >
                                {log.metadata.body}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                      {/* クリック可能な場合はヒントを表示 */}
                      {(log.action === 'email' || log.action === 'sms') && log.metadata?.body && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            display: 'block', 
                            mt: 1, 
                            fontStyle: 'italic',
                            textAlign: 'right'
                          }}
                        >
                          {expandedHistoryId === log.id ? '▲ クリックで閉じる' : '▼ クリックで本文を表示'}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Box>

          {/* 8. 買付情報（全幅・条件付き表示） */}
          {(data.offer_date || data.offer_status || data.offer_amount) && (
            <Box sx={{ 
              mb: 2,
              p: 2,
              bgcolor: '#fff3e0',
              borderRadius: 2,
              border: '1px solid #ffb74d'
            }}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ 
                  mb: 2, 
                  pb: 1, 
                  borderBottom: `2px solid ${SECTION_COLORS.property.main}`,
                }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
                    買付情報
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">買付日</Typography>
                    <Typography variant="body1">{data.offer_date || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">買付</Typography>
                    <Typography variant="body1">{data.offer_status || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">金額</Typography>
                    <Typography variant="body1">{data.offer_amount || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">会社名</Typography>
                    <Typography variant="body1">{data.company_name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">買付コメント</Typography>
                    <Typography variant="body1">{data.offer_comment || '-'}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}

          {/* 8. 添付画像・資料（全幅） */}
          <Box sx={{ 
            mb: 2,
            p: 2,
            bgcolor: '#f1f8e9',
            borderRadius: 2,
            border: '1px solid #aed581'
          }}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ 
                mb: 2, 
                pb: 1, 
                borderBottom: `2px solid ${SECTION_COLORS.property.main}`,
              }}>
                <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ color: SECTION_COLORS.property.main }}>
                  添付画像・資料
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {data.image_url && (
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        画像
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        href={data.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        画像を開く
                      </Button>
                    </Box>
                  </Grid>
                )}
                {data.pdf_url && (
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        PDF
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        href={data.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        PDFを開く
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
              {!data.image_url && !data.pdf_url && (
                <Typography variant="body2" color="text.secondary">
                  添付資料がありません
                </Typography>
              )}
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* メッセージテンプレートダイアログ */}
      {data?.seller_email && (
        <MessageTemplateDialog
          open={messageTemplateDialogOpen}
          onClose={() => setMessageTemplateDialogOpen(false)}
          recipientEmail={data.seller_email}
          propertyNumber={data.property_number}
          propertyData={{
            property_number: data.property_number,
            address: data.address,
            display_address: data.display_address,
            price: data.price,
            seller_name: data.seller_name,
            seller_contact: data.seller_contact,
            property_type: data.property_type,
            land_area: data.land_area,
            building_area: data.building_area,
            structure: data.structure,
            construction_year_month: data.construction_year_month,
            floor_plan: data.floor_plan,
            owner_info: data.owner_info,
            sales_assignee: data.sales_assignee,
          }}
          staffData={staffData || undefined}
          onSendSuccess={async (templateType: string, subject: string, body: string) => {
            // メール送信成功時にコミュニケーション履歴を記録
            try {
              const { supabase } = await import('../config/supabase');
              const { data: { user } } = await supabase.auth.getUser();
              
              if (user?.email) {
                await api.post('/api/activity-logs', {
                  action: 'email',
                  targetType: 'property_seller',
                  targetId: data.property_number,
                  metadata: {
                    seller_name: data.seller_name,
                    seller_email: data.seller_email,
                    property_number: data.property_number,
                    property_address: data.address || data.display_address,
                    template_type: templateType,
                    subject: subject,
                    body: body,
                  },
                });
                // 履歴を再取得
                fetchCommunicationHistory();
              }
            } catch (error) {
              console.error('Failed to log email:', error);
              // エラーでもメール送信は成功しているので、エラーメッセージは表示しない
            }
          }}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
        </Box> {/* メインコンテンツの閉じタグ */}
      </Box> {/* サイドバーとメインコンテンツのコンテナの閉じタグ */}
    </Container>
  );
}
