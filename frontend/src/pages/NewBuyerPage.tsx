import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Phone,
  Home as HomeIcon,
} from '@mui/icons-material';
import api from '../services/api';
import PropertyInfoCard from '../components/PropertyInfoCard';
import { InlineEditableField } from '../components/InlineEditableField';
import { INQUIRY_SOURCE_OPTIONS } from '../utils/buyerInquirySourceOptions';
import { LATEST_STATUS_OPTIONS } from '../utils/buyerLatestStatusOptions';
import {
  EMAIL_CONFIRMATION_OPTIONS,
  PINRICH_OPTIONS,
} from '../utils/buyerDetailFieldOptions';
import { SECTION_COLORS } from '../theme/sectionColors';

interface PropertyInfo {
  property_number: string;
  address: string;
  property_type: string;
  sales_price: number | null;
  land_area: number | null;
  building_area: number | null;
  floor_plan?: string;
  current_status?: string;
  pre_viewing_notes?: string;
  property_tax?: number;
  management_fee?: number;
  reserve_fund?: number;
  parking?: string;
  parking_fee?: number;
  delivery?: string;
  viewing_key?: string;
  viewing_parking?: string;
  viewing_notes?: string;
  special_notes?: string;
  memo?: string;
  broker_response?: string;
}

// 問合時ヒアリング用クイック入力ボタンの定義
const INQUIRY_HEARING_QUICK_INPUTS = [
  { label: '初見か', text: '初見か：' },
  { label: '希望時期', text: '希望時期：' },
  { label: '駐車場希望台数', text: '駐車場希望台数：' },
  { label: '予算', text: '予算：' },
  { label: '持ち家か', text: '持ち家か：' },
  { label: '他物件', text: '他に気になる物件はあるか？：' },
];

// 新規買主登録画面用のフィールド定義（基本情報が上、問い合わせ内容が下）
const BUYER_FIELD_SECTIONS = [
  {
    title: '基本情報',
    fields: [
      { key: 'buyer_number', label: '買主番号', inlineEditable: true, readOnly: true },
      { key: 'name', label: '氏名・会社名', inlineEditable: true },
      { key: 'phone_number', label: '電話番号', inlineEditable: true },
      { key: 'email', label: 'メールアドレス', inlineEditable: true },
      { key: 'email_confirmation', label: 'メアド確認', inlineEditable: true, fieldType: 'dropdown', conditionalDisplay: true },
      { key: 'company_name', label: '法人名', inlineEditable: true },
      { key: 'broker_inquiry', label: '業者問合せ', inlineEditable: true, fieldType: 'button', conditionalDisplay: true, required: true },
    ],
  },
  {
    title: '問合せ内容',
    fields: [
      // 一番上：問合時ヒアリング（全幅）
      { key: 'inquiry_hearing', label: '問合時ヒアリング', multiline: true, inlineEditable: true, fullWidth: true },
      // 業者向けアンケート（問合時ヒアリングの直下、条件付き表示）
      { key: 'broker_survey', label: '業者向けアンケート', inlineEditable: true, fieldType: 'button', conditionalDisplay: true },
      // 左の列
      { key: 'inquiry_email_phone', label: '【問合メール】電話対応', inlineEditable: true, fieldType: 'dropdown', column: 'left' },
      { key: 'three_calls_confirmed', label: '3回架電確認済み', inlineEditable: true, fieldType: 'dropdown', column: 'left', conditionalDisplay: true, required: true },
      { key: 'viewing_promotion_email', label: '内覧促進メール', inlineEditable: true, fieldType: 'button', column: 'left', conditionalDisplay: true, required: true },
      { key: 'distribution_type', label: '配信の有無', inlineEditable: true, fieldType: 'button', column: 'left' },
      { key: 'pinrich', label: 'Pinrich', inlineEditable: true, fieldType: 'dropdown', column: 'left' },
      // 右の列
      { key: 'reception_date', label: '受付日', type: 'date', inlineEditable: true, column: 'right' },
      { key: 'initial_assignee', label: '初動担当', inlineEditable: true, fieldType: 'button', column: 'right' },
      { key: 'inquiry_source', label: '問合せ元', inlineEditable: true, column: 'right' },
      { key: 'next_call_date', label: '次電日', type: 'date', inlineEditable: true, column: 'right' },
      { key: 'latest_status', label: '最新状況', inlineEditable: true, fieldType: 'dropdown', column: 'right' },
    ],
  },
];

export default function NewBuyerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyNumber = searchParams.get('propertyNumber');

  const [loading, setLoading] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(false);
  const [propertyNumberField, setPropertyNumberField] = useState(propertyNumber || '');
  
  // スタッフイニシャル用の状態
  const [staffInitials, setStaffInitials] = useState<string[]>([]);
  
  // 買主データ（新規登録用の空オブジェクト）
  const [buyer, setBuyer] = useState<any>({
    property_number: propertyNumber || '',
    reception_date: new Date().toISOString().split('T')[0], // 今日の日付をデフォルト
    buyer_number: '', // 初期値は空
  });

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 買主番号を自動取得
  useEffect(() => {
    const fetchNextBuyerNumber = async () => {
      try {
        const response = await api.get('/api/buyers/next-buyer-number');
        const nextBuyerNumber = response.data.buyerNumber;
        setBuyer((prev: any) => ({ ...prev, buyer_number: nextBuyerNumber }));
      } catch (error) {
        console.error('Failed to fetch next buyer number:', error);
        setSnackbar({
          open: true,
          message: '買主番号の取得に失敗しました',
          severity: 'error',
        });
      }
    };

    fetchNextBuyerNumber();
  }, []);

  // スタッフイニシャルを取得
  useEffect(() => {
    const fetchStaffInitials = async () => {
      try {
        const res = await api.get('/api/employees/active-initials');
        const initials = res.data?.initials || [];
        setStaffInitials(initials);
      } catch (error) {
        console.error('Failed to fetch staff initials:', error);
        setStaffInitials([]);
      }
    };

    fetchStaffInitials();
  }, []);

  useEffect(() => {
    if (propertyNumber) {
      fetchPropertyInfo(propertyNumber);
    }
  }, [propertyNumber]);

  const fetchPropertyInfo = async (propNum: string) => {
    setLoadingProperty(true);
    try {
      const response = await api.get(`/api/property-listings/${propNum}`);
      setPropertyInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch property info:', error);
      setPropertyInfo(null);
    } finally {
      setLoadingProperty(false);
    }
  };

  // フィールド更新ハンドラー（新規登録用）
  const handleInlineFieldSave = async (fieldName: string, newValue: any) => {
    // ローカル状態を更新
    setBuyer((prev: any) => ({ ...prev, [fieldName]: newValue }));
  };

  // 問合時ヒアリング用クイック入力ボタンのクリックハンドラー
  const handleInquiryHearingQuickInput = (text: string) => {
    const currentValue = buyer.inquiry_hearing || '';
    const newValue = currentValue ? `${text}\n${currentValue}` : text;
    setBuyer((prev: any) => ({ ...prev, inquiry_hearing: newValue }));
  };

  const handleSubmit = async () => {
    // 必須フィールドのバリデーション
    const errors = [];
    
    // 氏名は必須
    if (!buyer.name) {
      errors.push('氏名は必須です');
    }
    
    // パターン1: 内覧促進メールが必須（メール問合せ AND 【問合メール】電話対応 = 済）
    const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
    const isViewingPromotionEmailRequiredPattern1 = hasMailInquiry && buyer.inquiry_email_phone === '済';
    
    // パターン2: 内覧促進メールが必須（電話問合せ AND 問合時ヒアリングに入力がある）
    const hasPhoneInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('電話');
    const hasInquiryHearing = buyer.inquiry_hearing && buyer.inquiry_hearing.trim() !== '';
    const isViewingPromotionEmailRequiredPattern2 = hasPhoneInquiry && hasInquiryHearing;
    
    if ((isViewingPromotionEmailRequiredPattern1 || isViewingPromotionEmailRequiredPattern2) && !buyer.viewing_promotion_email) {
      errors.push('内覧促進メールを選択してください');
    }
    
    // パターン3: 3回架電確認済みが必須（【問合メール】電話対応 = 不通 の場合のみ）
    const isThreeCallsConfirmedDisplayed = hasMailInquiry && (buyer.inquiry_email_phone === '未' || buyer.inquiry_email_phone === '不通');
    const isThreeCallsConfirmedRequired = buyer.inquiry_email_phone === '不通';
    
    if (isThreeCallsConfirmedDisplayed && isThreeCallsConfirmedRequired && !buyer.three_calls_confirmed) {
      errors.push('3回架電確認済みを選択してください');
    }
    
    // パターン4: 業者問合せが必須（法人名に入力がある場合）
    const hasCompanyName = buyer.company_name && buyer.company_name.trim() !== '';
    
    if (hasCompanyName && !buyer.broker_inquiry) {
      errors.push('業者問合せを選択してください');
    }
    
    if (errors.length > 0) {
      setSnackbar({
        open: true,
        message: errors.join('\n'),
        severity: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      // 物件番号を追加
      const buyerData = {
        ...buyer,
        property_number: propertyNumberField,
      };

      await api.post('/api/buyers', buyerData);
      
      setSnackbar({
        open: true,
        message: '買主を登録しました',
        severity: 'success',
      });

      // 物件番号がある場合は物件詳細ページに戻る
      setTimeout(() => {
        if (propertyNumberField) {
          navigate(`/property-listings/${propertyNumberField}`);
        } else {
          navigate('/buyers');
        }
      }, 1000);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || '買主の作成に失敗しました',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            // 必須フィールドのバリデーション
            const errors = [];
            
            // パターン1: 内覧促進メールが必須（メール問合せ AND 【問合メール】電話対応 = 済）
            const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
            const isViewingPromotionEmailRequiredPattern1 = hasMailInquiry && buyer.inquiry_email_phone === '済';
            
            // パターン2: 内覧促進メールが必須（電話問合せ AND 問合時ヒアリングに入力がある）
            const hasPhoneInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('電話');
            const hasInquiryHearing = buyer.inquiry_hearing && buyer.inquiry_hearing.trim() !== '';
            const isViewingPromotionEmailRequiredPattern2 = hasPhoneInquiry && hasInquiryHearing;
            
            if ((isViewingPromotionEmailRequiredPattern1 || isViewingPromotionEmailRequiredPattern2) && !buyer.viewing_promotion_email) {
              errors.push('内覧促進メールを選択してください');
            }
            
            // パターン3: 3回架電確認済みが必須（【問合メール】電話対応 = 不通 の場合のみ）
            const isThreeCallsConfirmedDisplayed = hasMailInquiry && (buyer.inquiry_email_phone === '未' || buyer.inquiry_email_phone === '不通');
            const isThreeCallsConfirmedRequired = buyer.inquiry_email_phone === '不通';
            
            if (isThreeCallsConfirmedDisplayed && isThreeCallsConfirmedRequired && !buyer.three_calls_confirmed) {
              errors.push('3回架電確認済みを選択してください');
            }
            
            // パターン4: 業者問合せが必須（法人名に入力がある場合）
            const hasCompanyName = buyer.company_name && buyer.company_name.trim() !== '';
            
            if (hasCompanyName && !buyer.broker_inquiry) {
              errors.push('業者問合せを選択してください');
            }
            
            if (errors.length > 0) {
              setSnackbar({
                open: true,
                message: errors.join('\n'),
                severity: 'error'
              });
              return; // 遷移をキャンセル
            }
            
            // バリデーションOKなら遷移
            if (propertyNumberField) {
              navigate(`/property-listings/${propertyNumberField}`);
            } else {
              navigate('/buyers');
            }
          }}
          sx={{ mb: 2 }}
        >
          {propertyNumberField ? '物件詳細に戻る' : '買主リストに戻る'}
        </Button>
        
        {/* タイトル行 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: SECTION_COLORS.buyer.main }}>
              新規買主登録
            </Typography>
            {buyer.name && (
              <Chip 
                label={buyer.name} 
                sx={{ 
                  bgcolor: SECTION_COLORS.buyer.main, 
                  color: '#fff',
                  fontWeight: 'bold',
                }} 
              />
            )}
            {buyer.buyer_number && (
              <Chip 
                label={buyer.buyer_number} 
                size="small"
                sx={{ 
                  backgroundColor: SECTION_COLORS.buyer.main,
                  color: SECTION_COLORS.buyer.contrastText,
                }}
              />
            )}
          </Box>

          {/* ヘッダー右側のボタン */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* 近隣物件ボタン（物件がある場合のみ有効） */}
            <Tooltip title={!propertyInfo ? '物件番号を入力してください' : ''}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<HomeIcon />}
                  disabled={!propertyInfo}
                  sx={{
                    borderColor: SECTION_COLORS.buyer.main,
                    color: SECTION_COLORS.buyer.main,
                    '&:hover': {
                      borderColor: SECTION_COLORS.buyer.dark,
                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                    },
                    '&.Mui-disabled': {
                      borderColor: 'grey.300',
                      color: 'grey.400',
                    },
                  }}
                >
                  近隣物件
                </Button>
              </span>
            </Tooltip>
            
            {/* Email送信ドロップダウン */}
            <FormControl size="small" sx={{ 
              minWidth: 150,
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: SECTION_COLORS.buyer.main,
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: SECTION_COLORS.buyer.main,
              },
            }}>
              <InputLabel>Email送信</InputLabel>
              <Select
                value=""
                label="Email送信"
                disabled={!buyer.email}
              >
                <MenuItem value="">選択してください</MenuItem>
              </Select>
            </FormControl>

            {/* SMS送信ドロップダウン */}
            <FormControl size="small" sx={{ 
              minWidth: 150,
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: SECTION_COLORS.buyer.main,
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: SECTION_COLORS.buyer.main,
              },
            }}>
              <InputLabel>SMS送信</InputLabel>
              <Select
                value=""
                label="SMS送信"
                disabled={!buyer.phone_number}
              >
                <MenuItem value="">選択してください</MenuItem>
              </Select>
            </FormControl>

            {/* 電話番号ボタン（電話番号がある場合のみ表示） */}
            {buyer.phone_number && (
              <Button
                variant="contained"
                startIcon={<Phone />}
                href={`tel:${buyer.phone_number}`}
                sx={{ 
                  fontWeight: 'bold', 
                  whiteSpace: 'nowrap',
                  backgroundColor: SECTION_COLORS.buyer.main,
                  '&:hover': {
                    backgroundColor: SECTION_COLORS.buyer.dark,
                  },
                }}
              >
                {buyer.phone_number}
              </Button>
            )}

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            {/* 希望条件ボタン */}
            <Button
              variant="outlined"
              size="medium"
              onClick={() => {
                // 希望条件画面に遷移（買主番号をパラメータとして渡す）
                if (buyer.buyer_number) {
                  navigate(`/buyers/${buyer.buyer_number}/desired-conditions`);
                }
              }}
              sx={{
                whiteSpace: 'nowrap',
                borderColor: SECTION_COLORS.buyer.main,
                color: SECTION_COLORS.buyer.main,
                '&:hover': {
                  borderColor: SECTION_COLORS.buyer.dark,
                  backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                },
              }}
            >
              希望条件
            </Button>

            {/* 内覧ボタン */}
            <Button
              variant="contained"
              size="medium"
              onClick={() => {
                // 内覧画面に遷移（買主番号をパラメータとして渡す）
                if (buyer.buyer_number) {
                  navigate(`/buyers/${buyer.buyer_number}/viewing`);
                }
              }}
              sx={{
                whiteSpace: 'nowrap',
                backgroundColor: SECTION_COLORS.buyer.main,
                '&:hover': {
                  backgroundColor: SECTION_COLORS.buyer.dark,
                },
              }}
            >
              内覧
            </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 左側: 物件情報 */}
        <Grid item xs={12} md={5}>
          {/* 物件番号入力フィールド */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>物件番号</Typography>
            <InlineEditableField
              value={propertyNumberField}
              fieldName="property_number"
              fieldType="text"
              onSave={async (newValue) => {
                setPropertyNumberField(newValue);
                setBuyer((prev: any) => ({ ...prev, property_number: newValue }));
                if (newValue) {
                  fetchPropertyInfo(newValue);
                } else {
                  setPropertyInfo(null);
                }
              }}
              placeholder="物件番号を入力"
              alwaysShowBorder={true}
              showEditIndicator={true}
            />
          </Paper>

          {loadingProperty && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {propertyInfo && !loadingProperty && (
            <PropertyInfoCard
              propertyId={propertyNumberField}
              showCloseButton={false}
              themeColor="buyer"
            />
          )}

          {!propertyInfo && !loadingProperty && propertyNumberField && (
            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">物件情報が見つかりませんでした</Typography>
            </Paper>
          )}

          {!propertyNumberField && (
            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">物件番号を入力すると物件情報が表示されます</Typography>
            </Paper>
          )}
        </Grid>

        {/* 右側: 買主入力フォーム（買主詳細ページと同じ構造） */}
        <Grid item xs={12} md={7}>
          {/* フィールドセクション */}
          {BUYER_FIELD_SECTIONS.map((section) => (
            <Paper key={section.title} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6">{section.title}</Typography>
                {/* 問合せ内容セクションの場合、初動担当・問合せ元・受付日を表示 */}
                {section.title === '問合せ内容' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    {buyer.initial_assignee && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.5,
                        bgcolor: 'grey.300',
                        color: 'text.primary',
                        borderRadius: 1,
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                      }}>
                        初動：{buyer.initial_assignee}
                      </Box>
                    )}
                    {buyer.inquiry_source && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.5,
                        bgcolor: 'grey.200',
                        color: 'text.primary',
                        borderRadius: 1,
                        fontSize: '0.875rem',
                      }}>
                        {buyer.inquiry_source}
                      </Box>
                    )}
                    {buyer.reception_date && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.5,
                        bgcolor: 'grey.200',
                        color: 'text.primary',
                        borderRadius: 1,
                        fontSize: '0.875rem',
                      }}>
                        {new Date(buyer.reception_date).toLocaleDateString('ja-JP')}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {section.fields.map((field: any) => {
                  const value = buyer[field.key];
                  
                  // グリッドサイズの決定
                  const gridSize = field.fullWidth 
                    ? { xs: 12 } 
                    : field.column 
                      ? { xs: 12, sm: 6 } 
                      : field.multiline 
                        ? { xs: 12 } 
                        : { xs: 12, sm: 6 };
                  
                  // broker_surveyフィールドは値がある場合のみ表示
                  if (field.key === 'broker_survey' && (!value || value.trim() === '')) {
                    return null;
                  }

                  // 問合せ内容セクションで、値がある場合は非表示にするフィールド
                  if (section.title === '問合せ内容') {
                    if (field.key === 'initial_assignee' && buyer.initial_assignee) {
                      return null;
                    }
                    if (field.key === 'inquiry_source' && buyer.inquiry_source) {
                      return null;
                    }
                    if (field.key === 'reception_date' && buyer.reception_date) {
                      return null;
                    }
                  }

                  // インライン編集可能なフィールド
                  if (field.inlineEditable) {
                    // inquiry_sourceフィールドは特別処理（ドロップダウン）
                    if (field.key === 'inquiry_source') {
                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="dropdown"
                            options={INQUIRY_SOURCE_OPTIONS}
                            onSave={async (newValue) => handleInlineFieldSave(field.key, newValue)}
                            showEditIndicator={true}
                            oneClickDropdown={true}
                          />
                        </Grid>
                      );
                    }

                    // latest_statusフィールドは特別処理（ドロップダウン）
                    if (field.key === 'latest_status') {
                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="dropdown"
                            options={LATEST_STATUS_OPTIONS}
                            onSave={async (newValue) => handleInlineFieldSave(field.key, newValue)}
                            showEditIndicator={true}
                            oneClickDropdown={true}
                          />
                        </Grid>
                      );
                    }

                    // inquiry_email_phoneフィールドは特別処理（条件付き表示・ボタン形式）
                    if (field.key === 'inquiry_email_phone') {
                      const shouldDisplay = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
                      if (!shouldDisplay) {
                        return null;
                      }

                      const handleButtonClick = (newValue: string) => {
                        const valueToSave = value === newValue ? '' : newValue;
                        setBuyer((prev: any) => ({ ...prev, [field.key]: valueToSave }));
                      };

                      const standardOptions = ['済', '未', '不通', '不要'];
                      const isStandardValue = standardOptions.includes(value);

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                            </Typography>
                            {isStandardValue || !value ? (
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {standardOptions.map((option) => (
                                  <Button
                                    key={option}
                                    variant={value === option ? 'contained' : 'outlined'}
                                    sx={{ 
                                      flex: '1 1 auto', 
                                      minWidth: '60px',
                                      ...(value === option ? {
                                        backgroundColor: SECTION_COLORS.buyer.main,
                                        '&:hover': {
                                          backgroundColor: SECTION_COLORS.buyer.dark,
                                        },
                                      } : {
                                        borderColor: SECTION_COLORS.buyer.main,
                                        color: SECTION_COLORS.buyer.main,
                                        '&:hover': {
                                          borderColor: SECTION_COLORS.buyer.dark,
                                          backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                        },
                                      }),
                                    }}
                                    size="small"
                                    onClick={() => handleButtonClick(option)}
                                  >
                                    {option}
                                  </Button>
                                ))}
                              </Box>
                            ) : (
                              <Box sx={{ 
                                p: 1, 
                                border: '1px solid', 
                                borderColor: 'warning.main',
                                borderRadius: 1,
                                bgcolor: 'warning.light',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {value}
                                </Typography>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setBuyer((prev: any) => ({ ...prev, [field.key]: '' }))}
                                  sx={{ ml: 1 }}
                                >
                                  クリア
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      );
                    }

                    // three_calls_confirmedフィールドは条件付き表示（ボタン形式）
                    if (field.key === 'three_calls_confirmed') {
                      const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
                      const shouldDisplay = hasMailInquiry && (buyer.inquiry_email_phone === '未' || buyer.inquiry_email_phone === '不通');

                      if (!shouldDisplay) {
                        return null;
                      }

                      const isRequired = !value || value.trim() === '';

                      const handleButtonClick = (newValue: string) => {
                        const valueToSave = value === newValue ? '' : newValue;
                        setBuyer((prev: any) => ({ ...prev, [field.key]: valueToSave }));
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                              {isRequired && <span style={{ color: 'red', fontWeight: 'bold' }}> *必須</span>}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                variant={value === '3回架電OK' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: '1 1 auto', 
                                  minWidth: '90px',
                                  ...(value === '3回架電OK' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('3回架電OK')}
                              >
                                3回架電OK
                              </Button>
                              <Button
                                variant={value === '3回架電未' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: '1 1 auto', 
                                  minWidth: '90px',
                                  ...(value === '3回架電未' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('3回架電未')}
                              >
                                3回架電未
                              </Button>
                              <Button
                                variant={value === '他' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: '1 1 auto', 
                                  minWidth: '60px',
                                  ...(value === '他' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('他')}
                              >
                                他
                              </Button>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    }

                    // initial_assigneeフィールドは特別処理（スタッフイニシャルボタン形式）
                    if (field.key === 'initial_assignee') {
                      const handleButtonClick = (newValue: string) => {
                        const valueToSave = value === newValue ? '' : newValue;
                        setBuyer((prev: any) => ({ ...prev, [field.key]: valueToSave }));
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {staffInitials.map((initial) => (
                                <Button
                                  key={initial}
                                  variant={value === initial ? 'contained' : 'outlined'}
                                  sx={{ 
                                    minWidth: '40px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    ...(value === initial ? {
                                      backgroundColor: SECTION_COLORS.buyer.main,
                                      '&:hover': {
                                        backgroundColor: SECTION_COLORS.buyer.dark,
                                      },
                                    } : {
                                      borderColor: SECTION_COLORS.buyer.main,
                                      color: SECTION_COLORS.buyer.main,
                                      '&:hover': {
                                        borderColor: SECTION_COLORS.buyer.dark,
                                        backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                      },
                                    }),
                                  }}
                                  size="small"
                                  onClick={() => handleButtonClick(initial)}
                                >
                                  {initial}
                                </Button>
                              ))}
                            </Box>
                          </Box>
                        </Grid>
                      );
                    }

                    // viewing_promotion_emailフィールド（条件付き表示・ボタン形式）
                    if (field.key === 'viewing_promotion_email') {
                      const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
                      const hasPhoneInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('電話');
                      const isViewingPromotionRequired = buyer.status === '要内覧促進客';
                      const isSecondInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('2件目以降紹介');
                      const shouldDisplay = (hasMailInquiry || hasPhoneInquiry || isViewingPromotionRequired) && !isSecondInquiry;

                      if (!shouldDisplay) {
                        return null;
                      }

                      const hasInquiryHearing = buyer.inquiry_hearing && buyer.inquiry_hearing.trim() !== '';
                      const isRequiredPattern1 = hasPhoneInquiry && hasInquiryHearing;
                      const isRequiredPattern2 = hasMailInquiry && buyer.inquiry_email_phone === '不通';
                      const isRequired = (isRequiredPattern1 || isRequiredPattern2) && (!value || value.trim() === '');

                      const handleButtonClick = (newValue: string) => {
                        const valueToSave = value === newValue ? '' : newValue;
                        setBuyer((prev: any) => ({ ...prev, [field.key]: valueToSave }));
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                              {isRequired && <span style={{ color: 'red', fontWeight: 'bold' }}> *必須</span>}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant={value === '要' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: 1,
                                  ...(value === '要' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('要')}
                              >
                                要
                              </Button>
                              <Button
                                variant={value === '不要' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: 1,
                                  ...(value === '不要' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('不要')}
                              >
                                不要
                              </Button>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    }

                    // distribution_typeフィールドは特別処理（ボタン形式）
                    if (field.key === 'distribution_type') {
                      const handleButtonClick = (newValue: string) => {
                        const valueToSave = value === newValue ? '' : newValue;
                        setBuyer((prev: any) => ({ ...prev, [field.key]: valueToSave }));
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant={value === '要' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: 1,
                                  ...(value === '要' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('要')}
                              >
                                要
                              </Button>
                              <Button
                                variant={value === '不要' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: 1,
                                  ...(value === '不要' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('不要')}
                              >
                                不要
                              </Button>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    }

                    // broker_inquiryフィールド（条件付き表示・ボタン形式）
                    if (field.key === 'broker_inquiry') {
                      const hasCompanyName = buyer.company_name && buyer.company_name.trim() !== '';
                      
                      if (!hasCompanyName) {
                        return null;
                      }

                      const isRequired = !value || value.trim() === '';

                      const handleButtonClick = (newValue: string) => {
                        const valueToSave = value === newValue ? '' : newValue;
                        setBuyer((prev: any) => ({ ...prev, [field.key]: valueToSave }));
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                              {isRequired && <span style={{ color: 'red', fontWeight: 'bold' }}> *必須</span>}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                variant={value === '業者問合せ' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: '1 1 auto', 
                                  minWidth: '100px',
                                  ...(value === '業者問合せ' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('業者問合せ')}
                              >
                                業者問合せ
                              </Button>
                              <Button
                                variant={value === '業者（両手）' ? 'contained' : 'outlined'}
                                sx={{ 
                                  flex: '1 1 auto', 
                                  minWidth: '100px',
                                  ...(value === '業者（両手）' ? {
                                    backgroundColor: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      backgroundColor: SECTION_COLORS.buyer.dark,
                                    },
                                  } : {
                                    borderColor: SECTION_COLORS.buyer.main,
                                    color: SECTION_COLORS.buyer.main,
                                    '&:hover': {
                                      borderColor: SECTION_COLORS.buyer.dark,
                                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                    },
                                  }),
                                }}
                                size="small"
                                onClick={() => handleButtonClick('業者（両手）')}
                              >
                                業者（両手）
                              </Button>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    }

                    // Pinrich（条件付き必須）
                    if (field.key === 'pinrich') {
                      const hasEmail = buyer.email && buyer.email.trim() !== '';
                      const hasValue = value && value.trim() !== '';
                      const isRequired = hasEmail && !hasValue;

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box 
                            sx={{ 
                              mb: 1,
                              p: isRequired ? 2 : 0,
                              border: isRequired ? '3px solid' : 'none',
                              borderColor: isRequired ? 'error.main' : 'transparent',
                              borderRadius: isRequired ? 1 : 0,
                              bgcolor: isRequired ? 'error.light' : 'transparent',
                            }}
                          >
                            <InlineEditableField
                              label={field.label}
                              value={value || ''}
                              fieldName={field.key}
                              fieldType="dropdown"
                              options={PINRICH_OPTIONS}
                              onSave={async (newValue) => handleInlineFieldSave(field.key, newValue)}
                              showEditIndicator={true}
                              oneClickDropdown={true}
                            />
                            {isRequired && (
                              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, fontWeight: 'bold' }}>
                                *必須: メールアドレスが入力されている場合、Pinrichの選択が必要です
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      );
                    }

                    // email_confirmation（条件付き表示）
                    if (field.key === 'email_confirmation') {
                      const shouldDisplay = !buyer.email || buyer.email.trim() === '';

                      if (!shouldDisplay) {
                        return null;
                      }

                      return (
                        <Grid item xs={12} key={field.key}>
                          <Box 
                            sx={{ 
                              mb: 1,
                              p: 2,
                              border: '2px solid',
                              borderColor: 'error.main',
                              borderRadius: 1,
                              bgcolor: 'error.light',
                              animation: 'pulse 2s ease-in-out infinite',
                              '@keyframes pulse': {
                                '0%, 100%': {
                                  opacity: 1,
                                },
                                '50%': {
                                  opacity: 0.8,
                                },
                              },
                            }}
                          >
                            <InlineEditableField
                              label={field.label}
                              value={value || ''}
                              fieldName={field.key}
                              fieldType="dropdown"
                              options={EMAIL_CONFIRMATION_OPTIONS}
                              onSave={async (newValue) => handleInlineFieldSave(field.key, newValue)}
                              showEditIndicator={true}
                              oneClickDropdown={true}
                            />
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, fontWeight: 'bold' }}>
                              *重要: メールアドレスが空欄の場合、メアド確認の選択が必要です
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    }

                    // 日付フィールド
                    if (field.type === 'date') {
                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="date"
                            onSave={async (newValue) => handleInlineFieldSave(field.key, newValue)}
                            showEditIndicator={true}
                          />
                        </Grid>
                      );
                    }

                    // 問合時ヒアリングフィールド（クイックボタン付き）
                    if (field.key === 'inquiry_hearing') {
                      return (
                        <Grid item {...gridSize} key={field.key}>
                          {/* 問合時ヒアリング用クイック入力ボタン */}
                          <Box sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2">
                                ヒアリング項目
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {INQUIRY_HEARING_QUICK_INPUTS.map((item) => {
                                return (
                                  <Tooltip 
                                    key={item.label} 
                                    title={item.text} 
                                    arrow
                                  >
                                    <Chip
                                      label={item.label}
                                      onClick={() => handleInquiryHearingQuickInput(item.text)}
                                      size="small"
                                      clickable
                                      variant="outlined"
                                      sx={{
                                        cursor: 'pointer',
                                        borderColor: SECTION_COLORS.buyer.main,
                                        color: SECTION_COLORS.buyer.main,
                                        '&:hover': {
                                          borderColor: SECTION_COLORS.buyer.dark,
                                          backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                                        },
                                      }}
                                    />
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          </Box>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="textarea"
                            onSave={async (newValue) => handleInlineFieldSave(field.key, newValue)}
                            alwaysShowBorder={true}
                            borderPlaceholder="ヒアリング内容を入力..."
                            showEditIndicator={true}
                          />
                        </Grid>
                      );
                    }

                    // テキストエリア
                    if (field.multiline) {
                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="textarea"
                            onSave={async (newValue) => handleInlineFieldSave(field.key, newValue)}
                            alwaysShowBorder={true}
                            borderPlaceholder="クリックして入力"
                            showEditIndicator={true}
                          />
                        </Grid>
                      );
                    }

                    // 通常のテキストフィールド
                    return (
                      <Grid item {...gridSize} key={field.key}>
                        <InlineEditableField
                          label={field.label}
                          value={value || ''}
                          fieldName={field.key}
                          fieldType="text"
                          onSave={async (newValue) => handleInlineFieldSave(field.key, newValue)}
                          readOnly={field.readOnly}
                          showEditIndicator={true}
                        />
                      </Grid>
                    );
                  }

                  return null;
                })}
              </Grid>
            </Paper>
          ))}

          {/* 登録ボタン */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  // 必須フィールドのバリデーション
                  const errors = [];
                  
                  // パターン1: 内覧促進メールが必須（メール問合せ AND 【問合メール】電話対応 = 済）
                  const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
                  const isViewingPromotionEmailRequiredPattern1 = hasMailInquiry && buyer.inquiry_email_phone === '済';
                  
                  // パターン2: 内覧促進メールが必須（電話問合せ AND 問合時ヒアリングに入力がある）
                  const hasPhoneInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('電話');
                  const hasInquiryHearing = buyer.inquiry_hearing && buyer.inquiry_hearing.trim() !== '';
                  const isViewingPromotionEmailRequiredPattern2 = hasPhoneInquiry && hasInquiryHearing;
                  
                  if ((isViewingPromotionEmailRequiredPattern1 || isViewingPromotionEmailRequiredPattern2) && !buyer.viewing_promotion_email) {
                    errors.push('内覧促進メールを選択してください');
                  }
                  
                  // パターン3: 3回架電確認済みが必須（【問合メール】電話対応 = 不通 の場合のみ）
                  const isThreeCallsConfirmedDisplayed = hasMailInquiry && (buyer.inquiry_email_phone === '未' || buyer.inquiry_email_phone === '不通');
                  const isThreeCallsConfirmedRequired = buyer.inquiry_email_phone === '不通';
                  
                  if (isThreeCallsConfirmedDisplayed && isThreeCallsConfirmedRequired && !buyer.three_calls_confirmed) {
                    errors.push('3回架電確認済みを選択してください');
                  }
                  
                  // パターン4: 業者問合せが必須（法人名に入力がある場合）
                  const hasCompanyName = buyer.company_name && buyer.company_name.trim() !== '';
                  
                  if (hasCompanyName && !buyer.broker_inquiry) {
                    errors.push('業者問合せを選択してください');
                  }
                  
                  if (errors.length > 0) {
                    setSnackbar({
                      open: true,
                      message: errors.join('\n'),
                      severity: 'error'
                    });
                    return; // 遷移をキャンセル
                  }
                  
                  // バリデーションOKなら遷移
                  if (propertyNumberField) {
                    navigate(`/property-listings/${propertyNumberField}`);
                  } else {
                    navigate('/buyers');
                  }
                }}
                disabled={loading}
              >
                キャンセル
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  backgroundColor: SECTION_COLORS.buyer.main,
                  '&:hover': {
                    backgroundColor: SECTION_COLORS.buyer.dark,
                  },
                }}
              >
                {loading ? '登録中...' : '登録'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

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
