import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  IconButton,
  Chip,
  Alert,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api, { buyerApi, employeeApi } from '../services/api';
import { InlineEditableField } from '../components/InlineEditableField';
import { LATEST_STATUS_OPTIONS } from '../utils/buyerLatestStatusOptions';
import { VIEWING_UNCONFIRMED_OPTIONS } from '../utils/buyerDetailFieldOptions';
import { ValidationService } from '../services/ValidationService';

interface Buyer {
  [key: string]: any;
}

// 内覧結果・後続対応用クイック入力ボタンの定義
const VIEWING_RESULT_QUICK_INPUTS = [
  { label: '家族構成', text: '■家族構成：' },
  { label: '譲れない点', text: '■譲れない点：' },
  { label: '気に入っている点', text: '■気に入っている点：' },
  { label: '駄目な点', text: '■駄目な点：' },
  { label: '障害となる点', text: '■障害となる点：' },
  { label: '次のアクション', text: '■次のアクション：' },
  { label: '仮審査', text: '■仮審査：' },
];

export default function BuyerViewingResultPage() {
  const { buyer_number } = useParams<{ buyer_number: string }>();
  const navigate = useNavigate();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [linkedProperties, setLinkedProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffInitials, setStaffInitials] = useState<Array<{ label: string; value: string }>>([]);
  const [copiedBuyerNumber, setCopiedBuyerNumber] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [viewingResultKey, setViewingResultKey] = useState(0);
  const [isQuickInputSaving, setIsQuickInputSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    if (buyer_number) {
      fetchBuyer();
      fetchLinkedProperties();
      fetchStaffInitials();
      fetchEmployees();
    }
  }, [buyer_number]);

  // デバッグ用: buyerステートの変更を監視
  useEffect(() => {
    if (buyer) {
      console.log('[BuyerViewingResultPage] Buyer state updated:', {
        latest_viewing_date: buyer.latest_viewing_date,
        viewing_time: buyer.viewing_time,
        follow_up_assignee: buyer.follow_up_assignee,
      });
    }
  }, [buyer]);

  // デバッグ用: linkedPropertiesステートの変更を監視
  useEffect(() => {
    console.log('[BuyerViewingResultPage] linkedProperties updated:', linkedProperties);
    console.log('[BuyerViewingResultPage] linkedProperties length:', linkedProperties?.length);
    
    if (linkedProperties && linkedProperties.length > 0) {
      linkedProperties.forEach((property: any, index: number) => {
        console.log(`[BuyerViewingResultPage] Property ${index} status:`, property.status);
      });
    }
  }, [linkedProperties]);

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

  const fetchLinkedProperties = async () => {
    try {
      const res = await api.get(`/api/buyers/${buyer_number}/properties`);
      const properties = res.data || [];
      setLinkedProperties(properties);
    } catch (error) {
      console.error('Failed to fetch linked properties:', error);
    }
  };

  const fetchStaffInitials = async () => {
    try {
      const res = await api.get('/api/employees/active-initials');
      const initials = res.data.initials || [];
      setStaffInitials(initials.map((initial: string) => ({ label: initial, value: initial })));
    } catch (error) {
      console.error('Failed to fetch staff initials:', error);
      // エラー時は空配列を設定
      setStaffInitials([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const employeesData = await employeeApi.getAll();
      setEmployees(employeesData);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const handleInlineFieldSave = async (fieldName: string, newValue: any): Promise<void> => {
    if (!buyer) return;

    try {
      console.log(`[BuyerViewingResultPage] Saving field: ${fieldName}, value:`, newValue);
      
      // sync: false にして高速化（スプレッドシート同期は自動同期サービスに任せる）
      const result = await buyerApi.update(
        buyer_number!,
        { [fieldName]: newValue },
        { sync: false }
      );
      
      console.log(`[BuyerViewingResultPage] Save result for ${fieldName}:`, result.buyer[fieldName]);
      
      setBuyer(result.buyer);
    } catch (error: any) {
      console.error('Failed to update field:', error);
      throw new Error(error.response?.data?.error || '更新に失敗しました');
    }
  };

  const handleViewingResultQuickInput = async (text: string, buttonLabel: string) => {
    if (!buyer || isQuickInputSaving) return;
    
    setIsQuickInputSaving(true);
    
    console.log('[handleViewingResultQuickInput] Called with:', { text, buttonLabel });
    console.log('[handleViewingResultQuickInput] Current buyer.viewing_result_follow_up:', buyer.viewing_result_follow_up);
    console.log('[handleViewingResultQuickInput] Current value (escaped):', JSON.stringify(buyer.viewing_result_follow_up));
    
    // 現在の値を取得
    const currentValue = buyer.viewing_result_follow_up || '';
    
    // 新しいテキストを先頭に追加（既存内容がある場合は改行を挟む）
    const newValue = currentValue 
      ? `${text}\n${currentValue}` 
      : text;
    
    console.log('[handleViewingResultQuickInput] New value to save:', newValue);
    console.log('[handleViewingResultQuickInput] New value (escaped):', JSON.stringify(newValue));
    
    // DBのみに保存（スプレッドシートには保存しない）
    try {
      const result = await buyerApi.update(
        buyer_number!,
        { viewing_result_follow_up: newValue },
        { sync: false, force: false }  // スプレッドシート同期を無効化
      );
      
      console.log('[handleViewingResultQuickInput] Save result:', result);
      console.log('[handleViewingResultQuickInput] Saved value (escaped):', JSON.stringify(result.buyer.viewing_result_follow_up));
      
      // 保存後、buyerステートを更新（DBから返された値を使用）
      setBuyer(result.buyer);
      // キーを更新してInlineEditableFieldを強制再レンダリング
      setViewingResultKey(prev => prev + 1);
      
    } catch (error: any) {
      console.error('[handleViewingResultQuickInput] Exception:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || '保存に失敗しました',
        severity: 'error'
      });
    } finally {
      setIsQuickInputSaving(false);
    }
  };

  const handleCalendarButtonClick = async () => {
    if (!buyer) return;

    // バリデーション実行
    const validationResult = ValidationService.validateRequiredFields(
      buyer,
      linkedProperties
    );

    // バリデーション失敗時
    if (!validationResult.isValid) {
      const errorMessage = ValidationService.getValidationErrorMessage(
        validationResult.errors
      );
      
      // スナックバーで警告メッセージを表示
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'warning',
      });
      
      return; // カレンダーを開かない
    }

    // バリデーション成功時：バックエンドAPIを呼び出してカレンダーに登録
    try {
      // 内覧日時を取得
      const viewingDate = new Date(buyer.latest_viewing_date);
      const viewingTime = buyer.viewing_time || '14:00';
      
      // 時間をパース
      const [hours, minutes] = viewingTime.split(':').map(Number);
      viewingDate.setHours(hours, minutes, 0, 0);
      
      // 終了時刻（1時間後）
      const endDate = new Date(viewingDate);
      endDate.setHours(viewingDate.getHours() + 1);

      // 紐づいた物件情報を取得（最初の物件を使用）
      const property = linkedProperties && linkedProperties.length > 0 ? linkedProperties[0] : null;

      console.log('[BuyerViewingResultPage] Property info:', {
        hasProperty: !!property,
        address: property?.address,
        googleMapUrl: property?.google_map_url,
        propertyNumber: property?.property_number,
      });

      // バックエンドAPIを呼び出し
      const response = await api.post('/api/buyer-appointments', {
        buyerNumber: buyer.buyer_number,
        startTime: viewingDate.toISOString(),
        endTime: endDate.toISOString(),
        assignedTo: buyer.follow_up_assignee,
        buyerName: buyer.name,
        buyerPhone: buyer.phone_number,
        buyerEmail: buyer.email,
        viewingMobile: buyer.viewing_mobile, // 内覧形態
        propertyAddress: property?.address || '', // 物件住所
        propertyGoogleMapUrl: property?.google_map_url || '', // GoogleMap URL
        inquiryHearing: buyer.inquiry_hearing || '', // 問合時ヒアリング
        creatorName: buyer.name, // 内覧取得者名（買主名を使用）
      });

      console.log('[BuyerViewingResultPage] Calendar event created:', response.data);

      // 成功メッセージを表示
      setSnackbar({
        open: true,
        message: `後続担当（${buyer.follow_up_assignee}）のGoogleカレンダーに内覧予約を登録しました`,
        severity: 'success',
      });
    } catch (error: any) {
      console.error('[BuyerViewingResultPage] Calendar event creation error:', error);
      
      // エラーメッセージを表示
      const errorMessage = error.response?.data?.error?.message || 'カレンダー登録に失敗しました';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 買付情報セクションの表示条件を判定
  const shouldShowOfferSection = (): boolean => {
    if (!buyer?.latest_status) return false;
    
    const status = buyer.latest_status.trim();
    
    // 「買」を含む場合は表示（「買付外れました」も含む）
    return status.includes('買');
  };

  // 買付外れましたかどうかを判定
  const isOfferFailed = (): boolean => {
    if (!buyer?.latest_status) return false;
    return buyer.latest_status.includes('買付外れました');
  };

  // ★最新状況の選択肢を物件のatbb_statusに応じてフィルタリング
  const getFilteredLatestStatusOptions = (): typeof LATEST_STATUS_OPTIONS => {
    // 空欄選択肢を先頭に追加
    const emptyOption = { value: '', label: '（空欄）' };
    
    // 紐づいた物件がない場合は全ての選択肢を表示
    if (!linkedProperties || linkedProperties.length === 0) {
      return [emptyOption, ...LATEST_STATUS_OPTIONS];
    }

    // 紐づいた物件のatbb_statusを取得
    const atbbStatus = linkedProperties[0]?.atbb_status || '';

    // 専任媒介の場合
    if (atbbStatus.includes('専任')) {
      const filtered = LATEST_STATUS_OPTIONS.filter(option => {
        // 「買（専任 両手）」「買（専任 片手）」のみ表示
        // その他の「買（）」は非表示
        if (option.value.startsWith('買（')) {
          return option.value === '買（専任 両手）' || option.value === '買（専任 片手）';
        }
        // 「買（」で始まらない選択肢はそのまま表示
        return true;
      });
      return [emptyOption, ...filtered];
    }

    // 一般媒介の場合
    if (atbbStatus.includes('一般')) {
      const filtered = LATEST_STATUS_OPTIONS.filter(option => {
        // 「買（一般 両手）」「買（一般 片手）」のみ表示
        // その他の「買（）」は非表示
        if (option.value.startsWith('買（')) {
          return option.value === '買（一般 両手）' || option.value === '買（一般 片手）';
        }
        // 「買（」で始まらない選択肢はそのまま表示
        return true;
      });
      return [emptyOption, ...filtered];
    }

    // 専任も一般も含まれない場合は全ての選択肢を表示
    return [emptyOption, ...LATEST_STATUS_OPTIONS];
  };

  // 買付チャット送信ハンドラー
  const handleOfferChatSend = async () => {
    if (!buyer || !linkedProperties || linkedProperties.length === 0) {
      setSnackbar({
        open: true,
        message: '買主または物件情報が不足しています',
        severity: 'error',
      });
      return;
    }

    try {
      // バックエンドAPIを呼び出し
      const response = await api.post(`/api/buyers/${buyer.buyer_number}/send-offer-chat`, {
        propertyNumber: linkedProperties[0].property_number,
        offerComment: buyer.offer_comment || '',
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Google Chatに送信しました',
          severity: 'success',
        });
      } else {
        throw new Error(response.data.error || 'チャット送信に失敗しました');
      }
    } catch (error: any) {
      console.error('Failed to send chat message:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || error.message || 'チャット送信に失敗しました',
        severity: 'error',
      });
    }
  };

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
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/buyers/${buyer_number}`)}>
          買主詳細に戻る
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3, px: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate(`/buyers/${buyer_number}`)} 
          sx={{ mr: 2 }}
          aria-label="買主詳細に戻る"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold">
          内覧結果・後続対応
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          {buyer.name || buyer.buyer_number}
        </Typography>
        {/* 買主番号（クリックでコピー） */}
        {buyer.buyer_number && (
          <>
            <Chip 
              label={buyer.buyer_number} 
              size="small" 
              color="primary"
              onClick={() => {
                navigator.clipboard.writeText(buyer.buyer_number || '');
                setCopiedBuyerNumber(true);
                setTimeout(() => setCopiedBuyerNumber(false), 1500);
              }}
              sx={{ ml: 2, cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
              title="クリックでコピー"
            />
            {copiedBuyerNumber && (
              <Typography variant="body2" sx={{ ml: 1, color: 'success.main', fontWeight: 'bold' }}>✓</Typography>
            )}
          </>
        )}
      </Box>

      {/* 内覧結果・後続対応セクション */}
      <Paper 
        sx={{ 
          p: 3,
          bgcolor: 'rgba(33, 150, 243, 0.08)',
          border: '1px solid',
          borderColor: 'rgba(33, 150, 243, 0.3)',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          内覧結果・後続対応
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 内覧情報（1列表示） */}
          <Box sx={{ display: 'flex', gap: 1, mb: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* 内覧日 */}
            <Box sx={{ width: '280px', flexShrink: 0 }}>
              <InlineEditableField
                label="内覧日（最新）"
                value={buyer.latest_viewing_date || ''}
                onSave={(newValue) => {
                  console.log('[BuyerViewingResultPage] InlineEditableField onSave called with:', newValue);
                  return handleInlineFieldSave('latest_viewing_date', newValue);
                }}
                fieldType="date"
              />
              {/* カレンダーリンクボタン */}
              {buyer.latest_viewing_date && (
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 0.5, fontSize: '0.7rem', padding: '2px 4px' }}
                  onClick={handleCalendarButtonClick}
                >
                  📅 カレンダーで開く
                </Button>
              )}
            </Box>

            {/* 時間 */}
            <Box sx={{ width: '200px', flexShrink: 0 }}>
              <InlineEditableField
                label="時間"
                value={buyer.viewing_time || ''}
                onSave={(newValue) => handleInlineFieldSave('viewing_time', newValue)}
                fieldType="time"
                placeholder="例: 14:30"
              />
            </Box>

            {/* 内覧形態（条件付き表示：内覧日が入力されている場合のみ表示） */}
            {(() => {
              // 内覧日が入力されているかチェック
              const hasViewingDate = buyer.latest_viewing_date && buyer.latest_viewing_date.trim() !== '';
              
              // 内覧日が入力されていない場合は表示しない
              if (!hasViewingDate) {
                return null;
              }

              console.log('[BuyerViewingResultPage] linkedProperties:', linkedProperties);
              console.log('[BuyerViewingResultPage] linkedProperties length:', linkedProperties?.length);
              
              // 紐づいた物件のatbb_statusに「専任」が含まれているかチェック
              const hasExclusiveProperty = linkedProperties?.some(
                (property: any) => {
                  console.log('[BuyerViewingResultPage] Checking property atbb_status:', property.atbb_status);
                  return property.atbb_status && property.atbb_status.includes('専任');
                }
              );

              // 紐づいた物件のatbb_statusに「一般」が含まれているかチェック
              const hasGeneralProperty = linkedProperties?.some(
                (property: any) => property.atbb_status && property.atbb_status.includes('一般')
              );

              console.log('[BuyerViewingResultPage] hasExclusiveProperty:', hasExclusiveProperty);
              console.log('[BuyerViewingResultPage] hasGeneralProperty:', hasGeneralProperty);

              // 専任物件の場合
              if (hasExclusiveProperty) {
                // 必須条件：内覧日が入力されているが、内覧形態が未入力の場合
                const hasValue = buyer.viewing_mobile && buyer.viewing_mobile.trim() !== '';
                const isRequired = !hasValue;

                const VIEWING_FORM_EXCLUSIVE_OPTIONS = [
                  '【内覧_専（自社物件）】',
                  '【内覧（他社物件）】',
                  '準不【内覧_専（立会）】',
                  '準不【内覧_専（立会不要）】',
                ];

                return (
                  <Box sx={{ width: '400px', flexShrink: 0 }}>
                    <Box 
                      sx={{ 
                        p: isRequired ? 1 : 0,
                        border: isRequired ? '2px solid' : 'none',
                        borderColor: isRequired ? 'error.main' : 'transparent',
                        borderRadius: 2,
                        bgcolor: isRequired ? 'rgba(255, 205, 210, 0.3)' : 'transparent',
                        boxShadow: isRequired ? '0 2px 8px rgba(211, 47, 47, 0.2)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                        内覧形態 {isRequired && <span style={{ color: 'red', fontWeight: 'bold' }}>*必須</span>}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {VIEWING_FORM_EXCLUSIVE_OPTIONS.map((option) => (
                          <Button
                            key={option}
                            variant={buyer.viewing_mobile === option ? 'contained' : 'outlined'}
                            color="primary"
                            size="small"
                            onClick={async () => {
                              // 同じボタンを2度クリックしたら値をクリア
                              const newValue = buyer.viewing_mobile === option ? '' : option;
                              await handleInlineFieldSave('viewing_mobile', newValue);
                            }}
                            sx={{ 
                              justifyContent: 'flex-start',
                              textAlign: 'left',
                              whiteSpace: 'normal',
                              wordBreak: 'break-all',
                              fontSize: '0.7rem',
                              padding: '2px 4px',
                            }}
                          >
                            {option}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                );
              }

              // 一般媒介物件の場合
              if (hasGeneralProperty) {
                // 必須条件：内覧日が入力されているが、内覧形態が未入力の場合
                const hasValue = buyer.viewing_mobile && buyer.viewing_mobile.trim() !== '';
                const isRequired = !hasValue;

                const VIEWING_FORM_GENERAL_OPTIONS = [
                  '【内覧_一般（自社物件）】',
                  '準不【内覧_一般（立会）】',
                  '準不【内覧_一般（立会不要）】',
                ];

                return (
                  <Box sx={{ width: '400px', flexShrink: 0 }}>
                    <Box 
                      sx={{ 
                        p: isRequired ? 1 : 0,
                        border: isRequired ? '2px solid' : 'none',
                        borderColor: isRequired ? 'error.main' : 'transparent',
                        borderRadius: 2,
                        bgcolor: isRequired ? 'rgba(255, 205, 210, 0.3)' : 'transparent',
                        boxShadow: isRequired ? '0 2px 8px rgba(211, 47, 47, 0.2)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                        内覧形態_一般媒介 {isRequired && <span style={{ color: 'red', fontWeight: 'bold' }}>*必須</span>}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {VIEWING_FORM_GENERAL_OPTIONS.map((option) => (
                          <Button
                            key={option}
                            variant={buyer.viewing_mobile === option ? 'contained' : 'outlined'}
                            color="primary"
                            size="small"
                            onClick={async () => {
                              // 同じボタンを2度クリックしたら値をクリア
                              const newValue = buyer.viewing_mobile === option ? '' : option;
                              await handleInlineFieldSave('viewing_mobile', newValue);
                            }}
                            sx={{ 
                              justifyContent: 'flex-start',
                              textAlign: 'left',
                              whiteSpace: 'normal',
                              wordBreak: 'break-all',
                              fontSize: '0.7rem',
                              padding: '2px 4px',
                            }}
                          >
                            {option}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                );
              }

              // 専任も一般もない場合は表示しない
              return null;
            })()}

            {/* 後続担当 */}
            <Box sx={{ width: '360px', flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                後続担当
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {staffInitials.map((staff) => {
                  // 営業担当かどうかを判定（K、Y、I、林、U）
                  const isSales = ['K', 'Y', 'I', '林', 'U'].includes(staff.value);
                  
                  return (
                    <Button
                      key={staff.value}
                      variant={buyer.follow_up_assignee === staff.value ? 'contained' : 'outlined'}
                      color={isSales ? 'success' : 'primary'}
                      size="small"
                      onClick={async () => {
                        // 同じボタンを2度クリックしたら値をクリア
                        const newValue = buyer.follow_up_assignee === staff.value ? '' : staff.value;
                        await handleInlineFieldSave('follow_up_assignee', newValue);
                      }}
                      sx={{ 
                        minWidth: '32px',
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        fontWeight: isSales ? 'normal' : 'bold',
                      }}
                    >
                      {staff.label}
                    </Button>
                  );
                })}
              </Box>
            </Box>

            {/* 内覧未確定 */}
            <Box sx={{ width: '240px', flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                内覧未確定
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {VIEWING_UNCONFIRMED_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={buyer.viewing_unconfirmed === option.value ? 'contained' : 'outlined'}
                    color="primary"
                    size="small"
                    onClick={async () => {
                      // 同じボタンを2度クリックしたら値をクリア
                      const newValue = buyer.viewing_unconfirmed === option.value ? '' : option.value;
                      await handleInlineFieldSave('viewing_unconfirmed', newValue);
                    }}
                    sx={{ 
                      fontSize: '0.7rem',
                      padding: '2px 4px',
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>

          {/* 内覧結果・後続対応 */}
          <Box>
            {/* クイック入力ボタン */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                ヒアリング項目
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {VIEWING_RESULT_QUICK_INPUTS.map((item) => {
                  return (
                    <Tooltip 
                      key={item.label} 
                      title={item.text} 
                      arrow
                    >
                      <Chip
                        label={item.label}
                        onClick={() => handleViewingResultQuickInput(item.text, item.label)}
                        size="small"
                        clickable
                        color="primary"
                        variant="outlined"
                        disabled={isQuickInputSaving}
                        sx={{
                          cursor: isQuickInputSaving ? 'not-allowed' : 'pointer',
                          opacity: isQuickInputSaving ? 0.5 : 1,
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
            <InlineEditableField
              key={`viewing_result_${viewingResultKey}`}
              label="内覧結果・後続対応"
              fieldName="viewing_result_follow_up"
              value={buyer.viewing_result_follow_up || ''}
              onSave={(newValue) => handleInlineFieldSave('viewing_result_follow_up', newValue)}
              fieldType="textarea"
              multiline
              rows={6}
            />
          </Box>

          {/* ★最新状況 */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {/* ★最新状況ドロップダウン（幅を半分に） */}
            <Box sx={{ flex: '0 0 50%' }}>
              <InlineEditableField
                label="★最新状況"
                value={buyer.latest_status || ''}
                onSave={(newValue) => handleInlineFieldSave('latest_status', newValue)}
                fieldType="dropdown"
                options={getFilteredLatestStatusOptions()}
                fieldName="latest_status"
                buyerId={buyer_number}
                enableConflictDetection={true}
                showEditIndicator={true}
                oneClickDropdown={true}
              />
            </Box>

            {/* 買付外れましたボタン（「買」を含む場合のみ表示） */}
            {buyer.latest_status && buyer.latest_status.includes('買') && !buyer.latest_status.includes('買付外れました') && (
              <Box sx={{ flex: '0 0 auto', pt: 3 }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="medium"
                  onClick={async () => {
                    // 「買付外れました」を選択
                    await handleInlineFieldSave('latest_status', '買付外れました');
                  }}
                  sx={{ 
                    fontWeight: 'bold',
                    minWidth: '160px',
                  }}
                >
                  買付外れました
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* 買付情報セクション（条件付き表示） */}
      {shouldShowOfferSection() && (
        <Paper 
          sx={{ 
            p: 3,
            mt: 3,
            bgcolor: isOfferFailed() ? 'rgba(211, 47, 47, 0.08)' : 'rgba(76, 175, 80, 0.08)',
            border: '1px solid',
            borderColor: isOfferFailed() ? 'rgba(211, 47, 47, 0.3)' : 'rgba(76, 175, 80, 0.3)',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            {isOfferFailed() ? '買付外れ情報' : '買付情報'}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 買付コメント or 買付ハズレコメント */}
            <Box>
              <InlineEditableField
                label={isOfferFailed() ? '買付ハズレコメント' : '買付コメント'}
                value={buyer.offer_comment || ''}
                onSave={(newValue) => handleInlineFieldSave('offer_comment', newValue)}
                fieldType="textarea"
                multiline
                rows={3}
              />
            </Box>

            {/* 買付チャット送信ボタン or 買付ハズレチャット送信ボタン */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {isOfferFailed() ? '買付ハズレチャット送信' : '買付チャット送信'}
              </Typography>
              <Button
                variant="contained"
                color={isOfferFailed() ? 'error' : 'primary'}
                size="medium"
                onClick={handleOfferChatSend}
                sx={{ 
                  fontWeight: 'bold',
                }}
              >
                送信
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
