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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api, { buyerApi } from '../services/api';
import PropertyInfoCard from '../components/PropertyInfoCard';
import { InlineEditableField } from '../components/InlineEditableField';
import { INQUIRY_SOURCE_OPTIONS } from '../utils/buyerInquirySourceOptions';
import { LATEST_STATUS_OPTIONS } from '../utils/buyerLatestStatusOptions';
import { 
  INQUIRY_EMAIL_PHONE_OPTIONS, 
  THREE_CALLS_CONFIRMED_OPTIONS, 
  EMAIL_TYPE_OPTIONS, 
  DISTRIBUTION_TYPE_OPTIONS 
} from '../utils/buyerFieldOptions';
import {
  OTHER_PROPERTY_HEARING_OPTIONS,
  EMAIL_CONFIRMATION_OPTIONS,
  PINRICH_OPTIONS,
  VIEWING_PROMOTION_EMAIL_OPTIONS,
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

// 買主詳細ページと同じフィールド定義
const BUYER_FIELD_SECTIONS = [
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
  {
    title: '基本情報',
    fields: [
      { key: 'name', label: '氏名・会社名', inlineEditable: true },
      { key: 'phone_number', label: '電話番号', inlineEditable: true },
      { key: 'email', label: 'メールアドレス', inlineEditable: true },
      { key: 'email_confirmation', label: 'メアド確認', inlineEditable: true, fieldType: 'dropdown', conditionalDisplay: true },
      { key: 'company_name', label: '法人名', inlineEditable: true },
      { key: 'broker_inquiry', label: '業者問合せ', inlineEditable: true, fieldType: 'button', conditionalDisplay: true, required: true },
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
  
  // 買主データ（新規登録用の空オブジェクト）
  const [buyer, setBuyer] = useState<any>({
    property_number: propertyNumber || '',
    reception_date: new Date().toISOString().split('T')[0], // 今日の日付をデフォルト
  });

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

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
  const handleFieldUpdate = async (fieldName: string, newValue: any) => {
    // ローカル状態を更新
    setBuyer((prev: any) => ({ ...prev, [fieldName]: newValue }));
    return { success: true };
  };

  // 問合時ヒアリング用クイック入力ボタンのクリックハンドラー
  const handleInquiryHearingQuickInput = (text: string) => {
    const currentValue = buyer.inquiry_hearing || '';
    const newValue = currentValue ? `${text}\n${currentValue}` : text;
    setBuyer((prev: any) => ({ ...prev, inquiry_hearing: newValue }));
  };

  const handleSubmit = async () => {
    if (!buyer.name) {
      setSnackbar({
        open: true,
        message: '氏名は必須です',
        severity: 'error',
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
        <Typography variant="h5" fontWeight="bold">新規買主登録</Typography>
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
          {/* 問合時ヒアリング用クイック入力ボタン */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>問合時ヒアリング - クイック入力</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {INQUIRY_HEARING_QUICK_INPUTS.map((input) => (
                <Button
                  key={input.label}
                  variant="outlined"
                  size="small"
                  onClick={() => handleInquiryHearingQuickInput(input.text)}
                  sx={{
                    borderColor: SECTION_COLORS.buyer.main,
                    color: SECTION_COLORS.buyer.main,
                    '&:hover': {
                      borderColor: SECTION_COLORS.buyer.dark,
                      backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                    },
                  }}
                >
                  {input.label}
                </Button>
              ))}
            </Box>
          </Paper>

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
                            onSave={async (newValue) => handleFieldUpdate(field.key, newValue)}
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
                            onSave={async (newValue) => handleFieldUpdate(field.key, newValue)}
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

                    // 日付フィールド
                    if (field.type === 'date') {
                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="date"
                            onSave={async (newValue) => handleFieldUpdate(field.key, newValue)}
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
                            onSave={async (newValue) => handleFieldUpdate(field.key, newValue)}
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
                          onSave={async (newValue) => handleFieldUpdate(field.key, newValue)}
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
