import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Divider,
  CircularProgress,
  IconButton,
  Alert,
  Snackbar,
  List,
  ListItem,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Phone,
  Image as ImageIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import api, { buyerApi } from '../services/api';
import PropertyInfoCard from '../components/PropertyInfoCard';
import InquiryHistoryTable, { InquiryHistoryItem } from '../components/InquiryHistoryTable';
import { InquiryResponseEmailModal } from '../components/InquiryResponseEmailModal';
import RelatedBuyersSection from '../components/RelatedBuyersSection';
import UnifiedInquiryHistoryTable from '../components/UnifiedInquiryHistoryTable';
import RelatedBuyerNotificationBadge from '../components/RelatedBuyerNotificationBadge';
import BuyerGmailSendButton from '../components/BuyerGmailSendButton';
import ImageSelectorModal from '../components/ImageSelectorModal';
import { InlineEditableField } from '../components/InlineEditableField';
import { ConfirmationToAssignee } from '../components/ConfirmationToAssignee';
import { useStableContainerHeight } from '../hooks/useStableContainerHeight';
import { useQuickButtonState } from '../hooks/useQuickButtonState';
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
import { formatDateTime } from '../utils/dateFormat';
import { getDisplayName } from '../utils/employeeUtils';
import { useAuthStore } from '../store/authStore';
import { SECTION_COLORS } from '../theme/sectionColors';

interface Buyer {
  [key: string]: any;
}

interface PropertyListing {
  id: string;
  property_number: string;
  address: string;
  display_address?: string;
  property_type: string;
  sales_price: number;
  status: string;
  sales_assignee?: string;
  contract_date?: string;
  settlement_date?: string;
  google_map_url?: string;
  suumo_url?: string;
}

interface InquiryHistory {
  buyerNumber: string;
  propertyNumber: string | null;
  inquiryDate: string | null;
  inquirySource: string | null;
  status: string | null;
  isCurrent: boolean;
}

interface Activity {
  id: number;
  action: string;
  target_type: string;
  target_id: number;
  metadata: any;
  created_at: string;
  employee?: {
    id: number;
    name: string;
    initials: string;
  };
}

interface BuyerTemplate {
  id: string;
  category: string;
  type: string;
  subject: string;
  content: string;
}

// フィールドをセクションごとにグループ化
// 問合時ヒアリング用クイック入力ボタンの定義
const INQUIRY_HEARING_QUICK_INPUTS = [
  { label: '初見か', text: '初見か：' },
  { label: '希望時期', text: '希望時期：' },
  { label: '駐車場希望台数', text: '駐車場希望台数：' },
  { label: '予算', text: '予算：' },
  { label: '持ち家か', text: '持ち家か：' },
  { label: '他物件', text: '他に気になる物件はあるか？：' },
];

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
      { key: 'buyer_number', label: '買主番号', inlineEditable: true, readOnly: true },
      { key: 'name', label: '氏名・会社名', inlineEditable: true },
      { key: 'phone_number', label: '電話番号', inlineEditable: true },
      { key: 'email', label: 'メールアドレス', inlineEditable: true },
      { key: 'email_confirmation', label: 'メアド確認', inlineEditable: true, fieldType: 'dropdown', conditionalDisplay: true },
      { key: 'company_name', label: '法人名', inlineEditable: true },
      { key: 'broker_inquiry', label: '業者問合せ', inlineEditable: true, fieldType: 'button', conditionalDisplay: true, required: true },
    ],
  },
  // 希望条件セクションは別ページに移動
  // 内覧結果・後続対応セクションは別ページに移動
  // 買付情報セクションは内覧結果ページに移動
];

export default function BuyerDetailPage() {
  const { buyer_number } = useParams<{ buyer_number: string }>();
  const navigate = useNavigate();
  const { employee } = useAuthStore();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [linkedProperties, setLinkedProperties] = useState<PropertyListing[]>([]);
  const [inquiryHistory, setInquiryHistory] = useState<InquiryHistory[]>([]);
  const [inquiryHistoryTable, setInquiryHistoryTable] = useState<InquiryHistoryItem[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<Set<string>>(new Set());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalProperties, setEmailModalProperties] = useState<PropertyListing[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [relatedBuyersCount, setRelatedBuyersCount] = useState(0);
  const [nearbyPropertiesCount, setNearbyPropertiesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedBuyerNumber, setCopiedBuyerNumber] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [emailTemplates, setEmailTemplates] = useState<BuyerTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<BuyerTemplate[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'email' | 'sms' | null;
    template: BuyerTemplate | null;
  }>({
    open: false,
    type: null,
    template: null,
  });
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [editableEmailRecipient, setEditableEmailRecipient] = useState('');
  const [editableEmailSubject, setEditableEmailSubject] = useState('');
  const [editableEmailBody, setEditableEmailBody] = useState('');
  
  // アクティビティ詳細ダイアログ用の状態
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  // スタッフイニシャル用の状態
  const [staffInitials, setStaffInitials] = useState<string[]>([]);
  
  // 画像選択モーダル用の状態
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<any[] | null>(null);
  const [imageError, setImageError] = useState<string>('');

  // クイックボタンの状態管理
  const { isDisabled: isQuickButtonDisabled, disableButton: disableQuickButton } = useQuickButtonState(buyer_number || '');

  // useStableContainerHeightフックを使用して安定した高さ管理
  const { error: heightError } = useStableContainerHeight({
    headerHeight: 64,
    padding: 48,
    minHeight: 400,
    debounceDelay: 200,
  });

  // ビューポート高さ計算エラーのハンドリング
  useEffect(() => {
    if (heightError) {
      console.error('[BuyerDetailPage] Height calculation error:', heightError);
      setSnackbar({
        open: true,
        message: '画面高さの計算でエラーが発生しました。デフォルト値を使用します。',
        severity: 'warning',
      });
    }
  }, [heightError]);

  // Validate buyer_number parameter - support UUID, numeric, BY_ prefix, and AA prefix formats
  const isUuid = buyer_number ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(buyer_number) : false;
  const isNumericBuyerNumber = buyer_number ? /^\d+$/.test(buyer_number) : false;
  const isByPrefixBuyerNumber = buyer_number ? /^BY_[A-Za-z0-9_]+$/.test(buyer_number) : false;
  const isAaPrefixBuyerNumber = buyer_number ? /^AA\d+$/.test(buyer_number) : false;
  const isValidBuyerNumber = isUuid || isNumericBuyerNumber || isByPrefixBuyerNumber || isAaPrefixBuyerNumber;

  useEffect(() => {
    if (buyer_number && isValidBuyerNumber) {
      fetchBuyer();
      fetchLinkedProperties();
      fetchInquiryHistory();
      fetchInquiryHistoryTable();
      fetchRelatedBuyersCount();
      fetchActivities();
      // fetchTemplates(); // linkedPropertiesが取得された後に自動的に呼ばれるため、ここでは呼ばない
      fetchStaffInitials();
    }
  }, [buyer_number, isValidBuyerNumber]);

  const fetchRelatedBuyersCount = async () => {
    try {
      const res = await api.get(`/api/buyers/${buyer_number}/related`);
      setRelatedBuyersCount(res.data.total_count || 0);
    } catch (error) {
      console.error('Failed to fetch related buyers count:', error);
    }
  };

  const fetchNearbyPropertiesCount = async () => {
    try {
      if (linkedProperties.length > 0) {
        const firstProperty = linkedProperties[0];
        console.log('[BuyerDetailPage] Fetching nearby properties count for:', firstProperty.property_number);
        const res = await api.get(`/api/buyers/${buyer_number}/nearby-properties`, {
          params: { propertyNumber: firstProperty.property_number }
        });
        const count = res.data.nearbyProperties?.length || 0;
        console.log('[BuyerDetailPage] Nearby properties count:', count);
        setNearbyPropertiesCount(count);
      } else {
        console.log('[BuyerDetailPage] No linked properties, setting count to 0');
        setNearbyPropertiesCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch nearby properties count:', error);
      setNearbyPropertiesCount(0);
    }
  };

  const scrollToRelatedBuyers = () => {
    const element = document.getElementById('related-buyers-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const fetchBuyer = async () => {
    try {
      setLoading(true);
      // DBから最新データを取得（高速）
      const res = await api.get(`/api/buyers/${buyer_number}`);
      setBuyer(res.data);
      // inquiry_hearingフィールドを強制再レンダリング
      setInquiryHearingKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to fetch buyer:', error);
    } finally {
      setLoading(false);
    }
  };

  // インライン編集用のフィールド更新ハンドラー
  const handleInlineFieldSave = async (fieldName: string, newValue: any) => {
    if (!buyer) return;

    try {
      // 更新するフィールドのみを送信（DB → スプレッドシートに即座に同期）
      const result = await buyerApi.update(
        buyer_number!,
        { [fieldName]: newValue },
        { sync: true, force: true }  // スプレッドシートへの同期を有効化
      );
      
      // ローカル状態を更新
      setBuyer(result.buyer);
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update field:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || '更新に失敗しました' 
      };
    }
  };

  // 問合時ヒアリング用クイック入力ボタンのクリックハンドラー
  // inquiry_hearingフィールドの強制再レンダリング用キー
  const [inquiryHearingKey, setInquiryHearingKey] = useState(0);
  const [inquiryHearingDraft, setInquiryHearingDraft] = useState<string | null>(null);
  const [isSavingInquiryHearing, setIsSavingInquiryHearing] = useState(false);
  
  const handleInquiryHearingQuickInput = (text: string, buttonLabel: string) => {
    if (!buyer) return;
    
    console.log('[handleInquiryHearingQuickInput] Called with:', { text, buttonLabel });
    
    // 現在の値を取得（ドラフトがあればそれを使用、なければbuyerの値）
    const currentValue = inquiryHearingDraft !== null ? inquiryHearingDraft : (buyer.inquiry_hearing || '');
    
    // 新しいテキストを先頭に追加（既存内容がある場合は改行を挟む）
    const newValue = currentValue 
      ? `${text}\n${currentValue}` 
      : text;
    
    console.log('[handleInquiryHearingQuickInput] New draft value:', newValue);
    
    // ドラフトとして保存（まだDBには保存しない）
    setInquiryHearingDraft(newValue);
    
    // ローカル状態を更新して即座にUIに反映
    setBuyer(prev => prev ? { ...prev, inquiry_hearing: newValue } : prev);
    
    // キーを更新してInlineEditableFieldを強制再レンダリング
    setInquiryHearingKey(prev => prev + 1);
  };
  
  const handleSaveInquiryHearing = async () => {
    console.log('[handleSaveInquiryHearing] Called');
    console.log('[handleSaveInquiryHearing] buyer:', buyer?.buyer_number);
    console.log('[handleSaveInquiryHearing] inquiryHearingDraft:', inquiryHearingDraft);
    
    if (!buyer || inquiryHearingDraft === null) {
      console.log('[handleSaveInquiryHearing] Early return - buyer or draft is null');
      return;
    }
    
    setIsSavingInquiryHearing(true);
    
    try {
      console.log('[handleSaveInquiryHearing] Saving:', inquiryHearingDraft);
      
      const result = await buyerApi.update(
        buyer_number!,
        { inquiry_hearing: inquiryHearingDraft },
        { sync: true, force: true }  // スプレッドシート同期を有効化
      );
      
      console.log('[handleSaveInquiryHearing] Save result:', result);
      
      // ドラフトをクリア
      setInquiryHearingDraft(null);
      
      setSnackbar({
        open: true,
        message: '問合せ時ヒアリングを保存しました',
        severity: 'success'
      });
      
    } catch (error: any) {
      console.error('[handleSaveInquiryHearing] Exception:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || '保存に失敗しました',
        severity: 'error'
      });
    } finally {
      setIsSavingInquiryHearing(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleEmailTemplateSelect = (templateId: string) => {
    if (!templateId) return;

    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) return;

    console.log('[handleEmailTemplateSelect] Selected template:', {
      id: template.id,
      category: template.category,
      type: template.type,
      subject: template.subject,
    });

    console.log('[handleEmailTemplateSelect] Linked properties:', linkedProperties);
    console.log('[handleEmailTemplateSelect] Buyer data:', {
      buyer_number: buyer?.buyer_number,
      pre_viewing_notes: buyer?.pre_viewing_notes,
    });

    // プレースホルダーを置換（<br>タグも改行に変換される）
    const replacedSubject = replacePlaceholders(template.subject);
    const replacedContent = replacePlaceholders(template.content);

    // 編集可能フィールドを初期化
    setEditableEmailRecipient(buyer?.email || '');
    setEditableEmailSubject(replacedSubject);
    setEditableEmailBody(replacedContent); // 改行（\n）のまま設定

    // 確認ダイアログを表示
    setConfirmDialog({
      open: true,
      type: 'email',
      template: {
        ...template,
        subject: replacedSubject,
        content: replacedContent,
      },
    });
  };

  const handleSmsTemplateSelect = async (templateId: string) => {
    if (!templateId) return;

    const template = smsTemplates.find(t => t.id === templateId);
    if (!template) return;

    console.log('[handleSmsTemplateSelect] Selected template:', {
      id: template.id,
      category: template.category,
      type: template.type,
      contentLength: template.content.length,
    });
    
    console.log('[handleSmsTemplateSelect] Current state:', {
      linkedPropertiesCount: linkedProperties?.length || 0,
      linkedProperties: linkedProperties?.map(p => p.property_number),
      buyerNumber: buyer_number,
    });

    // SMS用に署名を簡略化
    const simplifiedContent = simplifySmsSignature(template.content);
    console.log('[handleSmsTemplateSelect] After simplifySmsSignature:', {
      contentLength: simplifiedContent.length,
      hasAddressPlaceholder: simplifiedContent.includes('<<住居表示>>') || simplifiedContent.includes('<<住居表示Pinrich>>'),
    });
    
    // 近隣物件リンクを挿入（プレースホルダー置換前にチェック）
    const contentWithLink = await insertNearbyPropertyLink(simplifiedContent);
    console.log('[handleSmsTemplateSelect] After insertNearbyPropertyLink:', {
      contentLength: contentWithLink.length,
      changed: contentWithLink !== simplifiedContent,
    });
    
    // プレースホルダーを置換
    const replacedContent = replacePlaceholders(contentWithLink);
    
    // 2箇所目以降の「所在地：[住所]」を削除
    const addressPattern = /所在地\s*[:：]\s*[^\n]+/g;
    const addressMatches = replacedContent.match(addressPattern);
    let finalContent = replacedContent;
    
    if (addressMatches && addressMatches.length > 1) {
      // 1箇所目を保持し、2箇所目以降を削除
      let firstFound = false;
      finalContent = replacedContent.replace(addressPattern, (match) => {
        if (!firstFound) {
          firstFound = true;
          return match; // 1箇所目は保持
        }
        return ''; // 2箇所目以降は削除
      });
    }
    
    // 3行以上の連続した空行を1行に圧縮
    const compressedContent = finalContent.replace(/\n{3,}/g, '\n\n');

    // メッセージ長の検証（日本語SMS制限: 670文字）
    const isOverLimit = compressedContent.length > 670;
    
    if (isOverLimit) {
      setSnackbar({
        open: true,
        message: `メッセージが長すぎます（${compressedContent.length}文字 / 670文字制限）。内容を確認してください。`,
        severity: 'warning',
      });
    }

    // 確認ダイアログを表示
    setConfirmDialog({
      open: true,
      type: 'sms',
      template: {
        ...template,
        content: compressedContent, // プレースホルダー置換後の本文
      },
    });
  };

  const handleConfirmSend = async () => {
    const { type, template } = confirmDialog;
    if (!type || !template) return;

    console.log('[handleConfirmSend] Confirm dialog state:', {
      type,
      template: {
        id: template.id,
        category: template.category,
        type: template.type,
        subject: template.subject,
      },
    });

    try {
      setSendingTemplate(true);
      setConfirmDialog({ open: false, type: null, template: null });

      if (type === 'email') {
        console.log('[handleConfirmSend] Sending email:', {
          to: editableEmailRecipient,
          subject: editableEmailSubject,
          bodyLength: editableEmailBody.length,
          hasImages: selectedImages && selectedImages.length > 0,
          imageCount: selectedImages?.length || 0,
          templateType: template.type,
        });

        // メール送信API呼び出し（画像添付データも送信）
        // 改行変換はバックエンドで処理
        const response = await api.post(`/api/buyers/${buyer_number}/send-email`, {
          to: editableEmailRecipient,
          subject: editableEmailSubject,
          content: editableEmailBody,  // 改行（\n）のまま送信
          selectedImages: selectedImages || [], // 画像添付データを送信
          templateType: template.type, // テンプレート種別を送信
        });

        console.log('[handleConfirmSend] Email sent successfully:', response.data);

        setSnackbar({
          open: true,
          message: 'メールを送信しました',
          severity: 'success',
        });

        // 画像選択をクリア
        setSelectedImages(null);
        setImageError('');

        // アクティビティを再読み込み
        fetchActivities();
      } else if (type === 'sms') {
        // SMS送信記録API呼び出し
        await api.post(`/api/buyers/${buyer_number}/send-sms`, {
          message: template.content,
          templateType: template.type, // テンプレート種別を送信
        });

        setSnackbar({
          open: true,
          message: 'SMS送信を記録しました',
          severity: 'success',
        });

        // SMSアプリを開く
        if (buyer?.phone_number) {
          const smsLink = `sms:${buyer.phone_number}?body=${encodeURIComponent(template.content)}`;
          window.location.href = smsLink;
        }

        // アクティビティを再読み込み
        fetchActivities();
      }
    } catch (error: any) {
      console.error('[handleConfirmSend] Failed to send:', error);
      console.error('[handleConfirmSend] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // より詳細なエラーメッセージを表示
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || '送信に失敗しました';
      
      setSnackbar({
        open: true,
        message: `送信エラー: ${errorMessage}`,
        severity: 'error',
      });
    } finally {
      setSendingTemplate(false);
    }
  };

  const handleCancelSend = () => {
    setConfirmDialog({ open: false, type: null, template: null });
    setSelectedImages(null);
    setImageError('');
  };

  // 画像選択ボタンのハンドラー
  const handleOpenImageSelector = () => {
    setImageSelectorOpen(true);
  };

  // 画像選択確定のハンドラー
  const handleImageSelectionConfirm = (images: any[]) => {
    setSelectedImages(images);
    setImageSelectorOpen(false);
    setImageError('');
  };

  // 画像選択キャンセルのハンドラー
  const handleImageSelectionCancel = () => {
    setImageSelectorOpen(false);
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

  // linkedPropertiesが取得されたら近隣物件数を取得
  useEffect(() => {
    if (linkedProperties.length > 0) {
      fetchNearbyPropertiesCount();
      // 物件種別に応じてSMSテンプレートを再フィルタリング
      fetchTemplates();
    }
  }, [linkedProperties]);

  const fetchInquiryHistory = async () => {
    try {
      const res = await api.get(`/api/buyers/${buyer_number}/inquiry-history`);
      const history = res.data || [];
      setInquiryHistory(history);
    } catch (error) {
      console.error('Failed to fetch inquiry history:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/api/activity-logs`, {
        params: {
          target_type: 'buyer',
          target_id: buyer_number,
        },
      });
      setActivities(res.data || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/buyers/templates');
      const templates = res.data || [];
      
      console.log('[fetchTemplates] 取得したテンプレート数:', templates.length);
      console.log('[fetchTemplates] linkedProperties:', linkedProperties?.length || 0, '件');
      
      // 全てのテンプレートをメールとSMS両方で使用可能にする
      // （ユーザーがどちらでも選択できるように）
      setEmailTemplates(templates);
      
      // SMSテンプレートは物件種別に応じてフィルタリング
      const filteredSmsTemplates = filterSmsTemplatesByPropertyType(templates);
      console.log('[fetchTemplates] フィルタリング後のSMSテンプレート数:', filteredSmsTemplates.length);
      console.log('[fetchTemplates] フィルタリング後のSMSテンプレート:', filteredSmsTemplates.map(t => t.subject));
      setSmsTemplates(filteredSmsTemplates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };
  
  /**
   * 物件種別に応じてSMSテンプレートをフィルタリング
   */
  const filterSmsTemplatesByPropertyType = (templates: BuyerTemplate[]): BuyerTemplate[] => {
    // 紐づいた物件がない場合は「資料請求メール（戸、マ）」のみ表示
    if (!linkedProperties || linkedProperties.length === 0) {
      console.log('[filterSmsTemplatesByPropertyType] 紐づいた物件なし → 資料請求メール（戸、マ）のみ表示');
      return templates.filter(template => {
        const templateName = template.subject || '';
        // 「資料請求」以外のテンプレートは全て表示
        if (!templateName.includes('資料請求')) {
          return true;
        }
        // 「資料請求（戸、マ）」のみ表示
        return templateName.includes('資料請求') && templateName.includes('戸') && templateName.includes('マ');
      });
    }
    
    // 最初の物件の種別を取得
    const firstProperty = linkedProperties[0];
    const propertyType = firstProperty.property_type;
    console.log('[filterSmsTemplatesByPropertyType] 物件種別:', propertyType, '物件番号:', firstProperty.property_number);
    console.log('[filterSmsTemplatesByPropertyType] テンプレート数:', templates.length);
    console.log('[filterSmsTemplatesByPropertyType] テンプレート種別一覧:', templates.map(t => t.type));
    
    // 物件種別に応じてフィルタリング
    return templates.filter(template => {
      const templateType = template.type || '';
      console.log('[filterSmsTemplatesByPropertyType] フィルタリング中:', templateType, '件名:', template.subject);
      
      // 「資料請求」以外のテンプレートは全て表示
      if (!templateType.includes('資料請求')) {
        console.log('[filterSmsTemplatesByPropertyType] 資料請求以外 → true');
        return true;
      }
      
      // 物件種別が「戸建」または「マンション」の場合
      if (propertyType === '戸建' || propertyType === 'マンション') {
        // 「資料請求（戸、マ）」のみ表示
        const shouldShow = templateType.includes('資料請求') && templateType.includes('戸') && templateType.includes('マ');
        console.log('[filterSmsTemplatesByPropertyType] 戸建/マンション:', templateType, '→', shouldShow);
        return shouldShow;
      }
      
      // 物件種別が「土地」の場合
      if (propertyType === '土地') {
        // 「資料請求（土）」のみ表示
        const shouldShow = templateType.includes('資料請求') && templateType.includes('土') && !templateType.includes('マ');
        console.log('[filterSmsTemplatesByPropertyType] 土地:', templateType, '→', shouldShow);
        return shouldShow;
      }
      
      // その他の場合（種別が土地/戸建/マンション以外）は「資料請求メール（戸、マ）」を表示
      console.log('[filterSmsTemplatesByPropertyType] その他の種別:', propertyType, '→ 資料請求メール（戸、マ）のみ表示');
      return templateType.includes('資料請求') && templateType.includes('戸') && templateType.includes('マ');
    });
  };

  const fetchStaffInitials = async () => {
    try {
      const res = await api.get('/api/employees/active-initials');
      const initials = res.data?.initials || [];
      setStaffInitials(initials);
      console.log('[fetchStaffInitials] Fetched staff initials:', initials);
    } catch (error) {
      console.error('Failed to fetch staff initials:', error);
      setStaffInitials([]);
    }
  };

  /**
   * テンプレート内のプレースホルダーを置換
   */
  const replacePlaceholders = (template: string): string => {
    if (!buyer) return template;

    let result = template;

    // 買主情報の置換
    result = result.replace(/<<●氏名・会社名>>/g, buyer.name || '');
    result = result.replace(/<<氏名>>/g, buyer.name || '');
    result = result.replace(/<<●電話番号>>/g, buyer.phone_number || '');
    result = result.replace(/<<電話番号>>/g, buyer.phone_number || '');
    result = result.replace(/<<●メールアドレス>>/g, buyer.email || '');
    result = result.replace(/<<メールアドレス>>/g, buyer.email || '');
    result = result.replace(/<<買主番号>>/g, buyer.buyer_number || '');
    result = result.replace(/<<会社名>>/g, buyer.company_name || '');
    
    // 問い合わせ情報
    result = result.replace(/<<物件番号>>/g, buyer.property_number || '');
    result = result.replace(/<<問合せ元>>/g, buyer.inquiry_source || '');
    result = result.replace(/<<受付日>>/g, buyer.reception_date ? new Date(buyer.reception_date).toLocaleDateString('ja-JP') : '');
    
    // 内覧情報
    result = result.replace(/<<内覧日>>/g, buyer.latest_viewing_date ? new Date(buyer.latest_viewing_date).toLocaleDateString('ja-JP') : '');
    result = result.replace(/<<内覧時間>>/g, buyer.viewing_time || '');
    result = result.replace(/<<時間>>/g, buyer.viewing_time || '');
    
    // 物件情報（紐づいた物件から取得）
    if (linkedProperties && linkedProperties.length > 0) {
      const firstProperty = linkedProperties[0];
      result = result.replace(/<<住居表示>>/g, firstProperty.display_address || firstProperty.address || '');
      result = result.replace(/<<住居表示Pinrich>>/g, firstProperty.display_address || firstProperty.address || '');
      result = result.replace(/<<建物名\/価格 内覧物件は赤表示（★は他社物件）>>/g, firstProperty.property_number || '');
      
      // SUUMO URLは削除（空文字に置換）
      result = result.replace(/<<athome URL>>/g, '');
      result = result.replace(/<<SUUMO　URLの表示>>/g, '');
      result = result.replace(/<<SUUMO URLの表示>>/g, '');
      result = result.replace(/<<SUUMO URL>>/g, '');
      
      // Google MapのURLに「地図：」を追加
      const googleMapDisplay = firstProperty.google_map_url ? `地図：${firstProperty.google_map_url}` : '';
      result = result.replace(/<<GoogleMap>>/g, googleMapDisplay);
      
      result = result.replace(/<<現況v>>/g, ''); // TODO: 現況フィールドを追加
      result = result.replace(/<<鍵等v>>/g, ''); // TODO: 鍵等フィールドを追加
      
      // 物件詳細URL: 公開物件サイトのURL
      const propertyDetailUrl = `https://property-site-frontend-kappa.vercel.app/public/properties/${firstProperty.property_number}`;
      result = result.replace(/<<物件詳細URL>>/g, propertyDetailUrl);
      
      // 内覧前伝達事項: 物件リストテーブルのpre_viewing_notesフィールドから取得
      result = result.replace(/<<内覧前伝達事項v>>/g, (firstProperty as any).pre_viewing_notes || '');
      result = result.replace(/<<内覧前伝達事項>>/g, (firstProperty as any).pre_viewing_notes || '');
    } else {
      // 物件が紐づいていない場合は空文字
      result = result.replace(/<<内覧前伝達事項v>>/g, '');
      result = result.replace(/<<内覧前伝達事項>>/g, '');
      result = result.replace(/<<物件詳細URL>>/g, '');
    }
    
    // アンケートURL（固定値）
    result = result.replace(/<<内覧アンケート>>/g, 'https://forms.gle/xxxxx'); // TODO: 実際のURLに置き換え
    result = result.replace(/<<不動産査定アンケート>>/g, 'https://forms.gle/xxxxx'); // TODO: 実際のURLに置き換え
    
    // 担当者情報（現在ログイン中のユーザー）
    const currentUser = employee || {};
    result = result.replace(/<<後続担当>>/g, buyer.follow_up_assignee || currentUser.name || '');
    result = result.replace(/<<担当者名>>/g, currentUser.name || '');
    result = result.replace(/<<担当名（営業）名前>>/g, currentUser.name || '');
    result = result.replace(/<<担当者電話番号>>/g, currentUser.phoneNumber || '');
    result = result.replace(/<<担当名（営業）電話番号>>/g, currentUser.phoneNumber || '');
    result = result.replace(/<<担当者メールアドレス>>/g, currentUser.email || '');
    result = result.replace(/<<担当名（営業）メールアドレス>>/g, currentUser.email || '');
    result = result.replace(/<<担当名（営業）固定休>>/g, '水曜日'); // TODO: 実際の固定休を取得
    
    // 会社情報（固定値）
    result = result.replace(/<<会社名>>/g, '株式会社いふう');
    result = result.replace(/<<住所>>/g, '〒870-0044 大分市舞鶴町1丁目3-30');
    result = result.replace(/<<会社電話番号>>/g, '097-533-2022');
    result = result.replace(/<<会社メールアドレス>>/g, 'tenant@ifoo-oita.com');

    // <br>タグを改行に変換
    result = result.replace(/<br>/g, '\n');
    result = result.replace(/<br\/>/g, '\n');
    result = result.replace(/<br \/>/g, '\n');

    return result;
  };

  /**
   * SMS用に署名を簡略化
   */
  const simplifySmsSignature = (content: string): string => {
    let result = content;

    // 「また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡くださいませ。」を削除
    result = result.replace(/また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡くださいませ。/g, '');
    result = result.replace(/また、他社物件もご紹介できますので、気になる物件がございましたらお気軽にご連絡ください。/g, '');
    
    // 「ご不明な点等ございましたら」を「他社物件もご紹介できますので、」に置換
    result = result.replace(/ご不明な点等ございましたら/g, '他社物件もご紹介できますので、');
    
    // カンマの重複を修正（「、、」→「、」）
    result = result.replace(/、、/g, '、');

    // 内覧予約フォームのURLを含む文章を削除（複数のパターンに対応）
    const viewingFormPatterns = [
      /また、ご内覧希望の場合は、こちらからご予約お願いいたします[↓\s]*https:\/\/docs\.google\.com\/forms\/[^\s]+/g,
      /内覧のご予約はこちらから[↓\s]*https:\/\/docs\.google\.com\/forms\/[^\s]+/g,
      /ご内覧のご予約はこちらから[↓\s]*https:\/\/docs\.google\.com\/forms\/[^\s]+/g,
    ];
    
    for (const pattern of viewingFormPatterns) {
      result = result.replace(pattern, '');
    }

    // 署名部分を簡略化（最後の署名欄を会社名、住所、電話番号、メアドのみに）
    const signaturePattern = /---+\s*\n([\s\S]*?)$/;
    const match = result.match(signaturePattern);

    if (match) {
      // 署名部分を簡略化
      const simplifiedSignature = `
---
<<会社名>>
<<住所>>
TEL: <<会社電話番号>>
Email: <<会社メールアドレス>>`;

      result = result.replace(signaturePattern, simplifiedSignature);
    }

    return result;
  };

  /**
   * 近隣物件リンクをSMS本文に挿入（単一リンク方式）
   * @param content - プレースホルダー置換前のSMS本文
   * @returns 近隣物件リンクが挿入されたSMS本文
   */
  const insertNearbyPropertyLink = async (content: string): Promise<string> => {
    console.log('[insertNearbyPropertyLink] Starting...', {
      contentLength: content.length,
      linkedPropertiesCount: linkedProperties?.length || 0,
      hasAddressPlaceholder: content.includes('<<住居表示>>') || content.includes('<<住居表示Pinrich>>'),
    });

    // 条件1: 所在地プレースホルダーが含まれているか確認
    const hasAddressPlaceholder = content.includes('<<住居表示>>') || 
                                   content.includes('<<住居表示Pinrich>>');
    
    // 条件2: 買主に紐づいた物件が存在するか確認
    const hasLinkedProperty = linkedProperties && linkedProperties.length > 0;
    
    console.log('[insertNearbyPropertyLink] Conditions:', {
      hasAddressPlaceholder,
      hasLinkedProperty,
      linkedProperties: linkedProperties?.map(p => p.property_number),
    });

    // 条件を満たさない場合は元の本文をそのまま返す
    if (!hasAddressPlaceholder || !hasLinkedProperty) {
      console.log('[insertNearbyPropertyLink] Conditions not met, returning original content');
      return content;
    }
    
    // 近隣物件を取得
    try {
      const firstProperty = linkedProperties[0];
      const res = await api.get(`/api/buyers/${buyer_number}/nearby-properties`, {
        params: { propertyNumber: firstProperty.property_number }
      });
      
      const nearbyProperties = res.data.nearbyProperties || [];
      
      console.log('[insertNearbyPropertyLink] Nearby properties:', {
        count: nearbyProperties.length,
        properties: nearbyProperties.map((p: any) => p.property_number),
      });
      
      // 近隣物件がない場合は元の本文をそのまま返す
      if (nearbyProperties.length === 0) {
        console.log('[insertNearbyPropertyLink] No nearby properties found');
        return content;
      }
      
      // 単一リンク方式：公開物件サイトの一覧ページに nearbyパラメータを付与
      const nearbyPropertyUrl = `https://property-site-frontend-kappa.vercel.app/public/properties?nearby=${firstProperty.property_number}`;
      
      // 近隣物件リンクテキスト（前に空行を追加）
      const nearbyPropertyLink = `\n\n類似物件はこちらから\n${nearbyPropertyUrl}\n`;
      
      console.log('[insertNearbyPropertyLink] Generated single link:', {
        count: nearbyProperties.length,
        basePropertyNumber: firstProperty.property_number,
        nearbyPropertyLink,
      });

      // 挿入位置を検索（「お気軽にお問い合わせください」の直後）
      const insertMarkers = [
        'お気軽にお問い合わせくださいませ。',
        'お気軽にお問い合わせください。',
        'お気軽にお問い合わせください',
        'お気軽にご連絡くださいませ。',
        'お気軽にご連絡ください。',
        'お気軽にご連絡ください',
      ];
      
      let insertIndex = -1;
      let foundMarker = '';
      
      for (const marker of insertMarkers) {
        const index = content.indexOf(marker);
        if (index !== -1) {
          insertIndex = index;
          foundMarker = marker;
          break;
        }
      }
      
      console.log('[insertNearbyPropertyLink] Insert position:', {
        insertMarkers,
        insertIndex,
        foundMarker,
        found: insertIndex !== -1,
      });

      if (insertIndex !== -1) {
        // マーカーが見つかった場合、その直後に挿入
        const markerEndIndex = insertIndex + foundMarker.length;
        const result = content.slice(0, markerEndIndex) + 
                       nearbyPropertyLink + 
                       content.slice(markerEndIndex);
        console.log('[insertNearbyPropertyLink] Inserted after marker, result length:', result.length);
        return result;
      } else {
        // マーカーが見つからない場合、末尾に追加
        const result = content + nearbyPropertyLink;
        console.log('[insertNearbyPropertyLink] Appended to end, result length:', result.length);
        return result;
      }
    } catch (error) {
      console.error('[insertNearbyPropertyLink] Error fetching nearby properties:', error);
      return content;
    }
  };

  const fetchInquiryHistoryTable = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await api.get(`/api/buyers/${buyer_number}/inquiry-history`);
      
      // Validate response structure
      if (!res.data || !res.data.inquiryHistory) {
        console.error('Invalid response format:', res.data);
        throw new Error('Invalid response format');
      }
      
      const historyData = res.data.inquiryHistory || [];
      setInquiryHistoryTable(historyData);
      
      // Automatically select properties with "current" status (今回)
      const currentStatusIds = new Set<string>(
        historyData
          .filter((item: InquiryHistoryItem) => item.status === 'current')
          .map((item: InquiryHistoryItem) => item.propertyListingId)
      );
      setSelectedPropertyIds(currentStatusIds);
    } catch (error: any) {
      console.error('Failed to fetch inquiry history table:', error);
      
      // Set empty array on error to prevent crashes
      setInquiryHistoryTable([]);
      
      // Display user-friendly error message
      const errorMessage = error.response?.status === 404
        ? '買主が見つかりませんでした'
        : error.response?.data?.error || '問い合わせ履歴の取得に失敗しました';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectionChange = (propertyIds: Set<string>) => {
    setSelectedPropertyIds(propertyIds);
  };

  const handleClearSelection = () => {
    setSelectedPropertyIds(new Set());
  };

  const handleGmailSend = async () => {
    // 2.1: Empty selection validation
    if (selectedPropertyIds.size === 0) {
      setSnackbar({
        open: true,
        message: '物件を選択してください',
        severity: 'warning',
      });
      return;
    }

    try {
      // 2.2: Implement resilient property details fetching
      // Fetch full property details for selected properties with individual error handling
      const selectedProperties = await Promise.all(
        Array.from(selectedPropertyIds).map(async (propertyListingId) => {
          try {
            const res = await api.get(`/api/property-listings/${propertyListingId}`);
            return res.data;
          } catch (error: any) {
            // 2.4: Log specific property IDs that failed
            console.error(`Failed to fetch property ${propertyListingId}:`, error);
            // Return null for failed fetches to continue with other properties
            return null;
          }
        })
      );

      // 2.2: Filter out null values (failed fetches)
      const validProperties = selectedProperties.filter(p => p !== null);

      // 2.3: Handle case where all properties failed to fetch
      if (validProperties.length === 0) {
        setSnackbar({
          open: true,
          message: '選択された物件の情報を取得できませんでした',
          severity: 'error',
        });
        return;
      }

      // 2.3 & 2.4: Display warning if some properties failed (partial success)
      if (validProperties.length < selectedProperties.length) {
        const failedCount = selectedProperties.length - validProperties.length;
        setSnackbar({
          open: true,
          message: `${failedCount}件の物件情報を取得できませんでした。取得できた${validProperties.length}件で続行します。`,
          severity: 'warning',
        });
      }

      setEmailModalProperties(validProperties);
      setEmailModalOpen(true);
    } catch (error: any) {
      // 2.4: Provide clear user-friendly error messages
      console.error('Failed to fetch property details:', error);
      
      const errorMessage = error.response?.status === 404
        ? '物件が見つかりませんでした'
        : error.response?.data?.error || '物件情報の取得に失敗しました';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleEmailSuccess = () => {
    setSelectedPropertyIds(new Set());
    setEmailModalOpen(false);
    setSnackbar({
      open: true,
      message: 'メールを送信しました',
      severity: 'success',
    });
    // Refresh activities to show new email history
    fetchActivities();
  };

  const handleBuyerClick = (buyerNumber: string) => {
    // Navigate to buyer detail page using buyer number
    navigate(`/buyers/${buyerNumber}`);
  };

  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (type === 'date') {
      try {
        return new Date(value).toLocaleDateString('ja-JP');
      } catch {
        return value;
      }
    }
    
    if (type === 'price') {
      const num = Number(value);
      if (!isNaN(num)) {
        return `${(num / 10000).toLocaleString()}万円`;
      }
    }
    
    return String(value);
  };

  // Validate buyer_number parameter
  if (!buyer_number || !isValidBuyerNumber) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, px: 2 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="error" gutterBottom>
            無効な買主番号です
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            買主番号は有効な数値、UUID、BY_形式、またはAA形式である必要があります
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
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
              // ただし、フィールドが表示されている場合のみチェック
              // hasMailInquiryは既に上で宣言済み
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
              navigate('/buyers');
            }} 
            sx={{ mr: 2 }}
            aria-label="買主一覧に戻る"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold" sx={{ color: SECTION_COLORS.buyer.main }}>
            {buyer.name ? `${buyer.name}様` : buyer.buyer_number}
          </Typography>
          {/* 買主番号（クリックでコピー） */}
          {buyer.buyer_number && (
            <>
              <Chip 
                label={buyer.buyer_number} 
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(buyer.buyer_number || '');
                  setCopiedBuyerNumber(true);
                  setTimeout(() => setCopiedBuyerNumber(false), 1500);
                }}
                sx={{ 
                  cursor: 'pointer', 
                  backgroundColor: SECTION_COLORS.buyer.main,
                  color: SECTION_COLORS.buyer.contrastText,
                  '&:hover': { 
                    opacity: 0.8,
                    backgroundColor: SECTION_COLORS.buyer.dark,
                  } 
                }}
                title="クリックでコピー"
              />
              {copiedBuyerNumber && (
                <Typography variant="body2" sx={{ color: SECTION_COLORS.buyer.main, fontWeight: 'bold' }}>✓</Typography>
              )}
            </>
          )}
          {/* ステータス表示: 最新確度を優先、なければ問合せ時確度を表示（頭文字のみ） */}
          {(() => {
            const status = buyer.latest_status || buyer.inquiry_confidence;
            if (!status) return null;
            
            // 頭文字を抽出（A, B, C, D, E, AZ, BZ等）
            const match = status.match(/^[A-Z]+/);
            const label = match ? match[0] : status.substring(0, 2);
            
            return <Chip 
              label={label} 
              sx={{ 
                ml: 2,
                backgroundColor: buyer.latest_status ? SECTION_COLORS.buyer.dark : SECTION_COLORS.buyer.light,
                color: SECTION_COLORS.buyer.contrastText,
              }} 
            />;
          })()}
          <RelatedBuyerNotificationBadge 
            count={relatedBuyersCount} 
            onClick={scrollToRelatedBuyers}
          />
        </Box>

        {/* ヘッダー右側のボタン */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* 近隣物件ボタン */}
          {linkedProperties.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<HomeIcon />}
              onClick={() => {
                const firstProperty = linkedProperties[0];
                window.open(`/buyers/${buyer_number}/nearby-properties?propertyNumber=${firstProperty.property_number}`, '_blank');
              }}
              sx={{
                borderColor: SECTION_COLORS.buyer.main,
                color: SECTION_COLORS.buyer.main,
                '&:hover': {
                  borderColor: SECTION_COLORS.buyer.dark,
                  backgroundColor: `${SECTION_COLORS.buyer.main}15`,
                },
              }}
            >
              近隣物件 ({nearbyPropertiesCount})
            </Button>
          )}
          
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
              disabled={!buyer?.email || sendingTemplate}
              onChange={(e) => handleEmailTemplateSelect(e.target.value)}
            >
              {emailTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.type}
                </MenuItem>
              ))}
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
              disabled={!buyer?.phone_number || sendingTemplate}
              onChange={(e) => handleSmsTemplateSelect(e.target.value)}
            >
              {smsTemplates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 電話番号ボタン */}
          {buyer?.phone_number && (
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

          {/* 問い合わせ履歴ボタン（履歴がある場合のみ表示） */}
          {inquiryHistoryTable.length > 0 && (
            <Button
              variant="outlined"
              size="medium"
              onClick={() => navigate(`/buyers/${buyer_number}/inquiry-history`)}
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
              問い合わせ履歴 ({inquiryHistoryTable.length})
            </Button>
          )}
          
          {/* 希望条件ボタン */}
          <Button
            variant="outlined"
            size="medium"
            onClick={() => navigate(`/buyers/${buyer_number}/desired-conditions`)}
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
            onClick={() => navigate(`/buyers/${buyer_number}/viewing-result`)}
            sx={{
              whiteSpace: 'nowrap',
              backgroundColor: SECTION_COLORS.buyer.main,
              color: '#fff',
              fontWeight: 'bold',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: SECTION_COLORS.buyer.dark,
                boxShadow: 4,
              },
            }}
          >
            内覧
          </Button>
        </Box>
      </Box>

      {/* 2カラムレイアウト: 左側に紐づいた物件の詳細情報、右側に買主情報 */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'flex-start',
          '@media (max-width: 900px)': {
            flexDirection: 'column',
          },
        }}
        role="region"
        aria-label="買主詳細情報の2カラムレイアウト"
      >
        {/* 左側: 紐づいた物件の詳細情報 - 独立スクロール */}
        <Box 
          sx={{ 
            flex: '0 0 42%', 
            minWidth: 0,
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 1,
            position: 'sticky',
            top: 16,
            // カスタムスクロールバースタイル
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            },
            '@media (max-width: 900px)': {
              flex: '1 1 auto',
              width: '100%',
              maxHeight: 'none',
              overflowY: 'visible',
              position: 'static',
              pr: 0,
            },
          }}
          role="complementary"
          aria-label="物件情報"
          tabIndex={0}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">物件情報</Typography>
              {linkedProperties.length > 0 && (
                <Chip 
                  label={`${linkedProperties.length}件`} 
                  size="small" 
                  sx={{ ml: 2 }}
                />
              )}
            </Box>
            {linkedProperties.length > 0 ? (
              linkedProperties.map((property) => (
                <Box key={property.id} sx={{ mb: 2 }}>
                  <PropertyInfoCard 
                    propertyId={property.property_number} 
                    buyer={buyer}
                    onClose={() => {}}
                    showCloseButton={false}
                    themeColor="buyer"
                  />
                </Box>
              ))
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">紐づいた物件はありません</Typography>
              </Paper>
            )}
          </Box>
        </Box>

        {/* 右側: 買主詳細情報 - 独立スクロール */}
        <Box 
          sx={{ 
            flex: '1 1 58%', 
            minWidth: 0,
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            pl: 1,
            position: 'sticky',
            top: 16,
            // カスタムスクロールバースタイル
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            },
            '@media (max-width: 900px)': {
              flex: '1 1 auto',
              width: '100%',
              maxHeight: 'none',
              overflowY: 'visible',
              position: 'static',
              pl: 0,
            },
          }}
          role="main"
          aria-label="買主情報"
          tabIndex={0}
        >
          {/* 重複履歴セクション */}
          {inquiryHistory.length > 1 && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Chip 
                  label={`重複あり (${inquiryHistory.length}件の問合せ履歴)`} 
                  color="warning" 
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                この買主は過去に別の買主番号で問い合わせをしています
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {inquiryHistory.map((history) => (
                  <Box 
                    key={history.buyerNumber} 
                    sx={{ 
                      py: 1, 
                      px: 1.5,
                      mb: 0.5,
                      bgcolor: history.isCurrent ? SECTION_COLORS.buyer.light : 'background.paper',
                      borderRadius: 1,
                      border: history.isCurrent ? '2px solid' : '1px solid',
                      borderColor: history.isCurrent ? SECTION_COLORS.buyer.main : 'divider'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        買主番号: {history.buyerNumber}
                      </Typography>
                      {history.isCurrent && (
                        <Chip label="現在" sx={{ backgroundColor: SECTION_COLORS.buyer.main, color: SECTION_COLORS.buyer.contrastText }} size="small" />
                      )}
                    </Box>
                    <Grid container spacing={1}>
                      {history.propertyNumber && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">物件番号</Typography>
                          <Typography variant="body2">{history.propertyNumber}</Typography>
                        </Grid>
                      )}
                      {history.inquiryDate && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">問合せ日</Typography>
                          <Typography variant="body2">
                            {formatValue(history.inquiryDate, 'date')}
                          </Typography>
                        </Grid>
                      )}
                      {history.inquirySource && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">問合せ元</Typography>
                          <Typography variant="body2">{history.inquirySource}</Typography>
                        </Grid>
                      )}
                      {history.status && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">ステータス</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {history.status.substring(0, 30)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {BUYER_FIELD_SECTIONS.map((section) => (
            <Paper 
              key={section.title} 
              sx={{ 
                p: 2, 
                mb: 2,
                // 内覧結果グループには特別なスタイルを適用
                ...(section.isViewingResultGroup && {
                  bgcolor: 'rgba(33, 150, 243, 0.08)',  // 薄い青色の背景
                  border: '1px solid',
                  borderColor: 'rgba(33, 150, 243, 0.3)',
                }),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography 
                  variant="h6" 
                  sx={{
                    // 内覧結果グループのタイトルを強調
                    ...(section.isViewingResultGroup && {
                      color: SECTION_COLORS.buyer.main,
                      fontWeight: 'bold',
                    }),
                  }}
                >
                  {section.title}
                </Typography>
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
                  
                  // グリッドサイズの決定（最初に定義）
                  // 1. fullWidthプロパティがtrueの場合は全幅
                  // 2. columnプロパティがある場合は半幅（左右の列）
                  // 3. multilineフィールドは全幅
                  // 4. それ以外は半幅
                  const gridSize = field.fullWidth 
                    ? { xs: 12 } 
                    : field.column 
                      ? { xs: 12, sm: 6 } 
                      : field.multiline 
                        ? { xs: 12 } 
                        : { xs: 12, sm: 6 };
                  
                  // broker_surveyフィールドは値がある場合のみ表示（ボタン形式）
                  if (field.key === 'broker_survey') {
                    // 値がない場合は表示しない
                    if (!value || value.trim() === '') {
                      return null;
                    }

                    const handleButtonClick = async (newValue: string) => {
                      // 同じボタンを2度クリックしたら値をクリア
                      const valueToSave = value === newValue ? '' : newValue;
                      
                      // 先にローカル状態を更新（即座にUIに反映）
                      setBuyer(prev => prev ? { ...prev, [field.key]: valueToSave } : prev);
                      
                      // バックグラウンドで保存
                      try {
                        const result = await handleInlineFieldSave(field.key, valueToSave);
                        
                        if (result && !result.success && result.error) {
                          // エラー時は元の値に戻す
                          setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                          setSnackbar({
                            open: true,
                            message: result.error,
                            severity: 'error'
                          });
                        }
                      } catch (error: any) {
                        // エラー時は元の値に戻す
                        setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                        setSnackbar({
                          open: true,
                          message: error.message || '保存に失敗しました',
                          severity: 'error'
                        });
                      }
                    };

                    // 標準的な選択肢
                    const standardOptions = ['確認済み', '未確認'];
                    const isStandardValue = standardOptions.includes(value);

                    return (
                      <Grid item {...gridSize} key={field.key}>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
                            {field.label}
                          </Typography>
                          {isStandardValue ? (
                            // 標準的な値の場合はボタンを表示
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {standardOptions.map((option) => (
                                <Button
                                  key={option}
                                  variant={value === option ? 'contained' : 'outlined'}
                                  sx={{ 
                                    flex: '1 1 auto', 
                                    minWidth: '80px',
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
                            // 想定外の値の場合はテキストとして表示
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
                                onClick={async () => {
                                  // 先にローカル状態を更新
                                  setBuyer(prev => prev ? { ...prev, [field.key]: '' } : prev);
                                  
                                  try {
                                    const result = await handleInlineFieldSave(field.key, '');
                                    if (result && !result.success && result.error) {
                                      // エラー時は元の値に戻す
                                      setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                                      setSnackbar({
                                        open: true,
                                        message: result.error,
                                        severity: 'error'
                                      });
                                    }
                                  } catch (error: any) {
                                    // エラー時は元の値に戻す
                                    setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                                    setSnackbar({
                                      open: true,
                                      message: error.message || 'クリアに失敗しました',
                                      severity: 'error'
                                    });
                                  }
                                }}
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

                  // 問合せ内容セクションで、値がある場合は非表示にするフィールド
                  if (section.title === '問合せ内容') {
                    if (field.key === 'initial_assignee' && buyer.initial_assignee) {
                      return null; // 値がある場合は非表示
                    }
                    if (field.key === 'inquiry_source' && buyer.inquiry_source) {
                      return null; // 値がある場合は非表示
                    }
                    if (field.key === 'reception_date' && buyer.reception_date) {
                      return null; // 値がある場合は非表示
                    }
                  }

                  // 買付チャット送信（Google Chatへのリンクボタン）- inlineEditableチェックの前に処理
                  if (field.key === 'image_chat_sent') {
                    const GOOGLE_CHAT_URL = 'https://chat.googleapis.com/v1/spaces/AAAA6iEDkiU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=azlyf21pENCpLLUdJPjnRNXOzsIAP550xebOMVxYRMQ';

                    return (
                      <Grid item {...gridSize} key={field.key}>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
                            {field.label}
                          </Typography>
                          <Button
                            variant="contained"
                            size="medium"
                            onClick={() => {
                              window.open(GOOGLE_CHAT_URL, '_blank');
                            }}
                            sx={{ 
                              fontWeight: 'bold',
                              backgroundColor: SECTION_COLORS.buyer.main,
                              '&:hover': {
                                backgroundColor: SECTION_COLORS.buyer.dark,
                              },
                            }}
                          >
                            送信
                          </Button>
                        </Box>
                      </Grid>
                    );
                  }

                  // インライン編集可能なフィールド
                  if (field.inlineEditable) {
                    // inquiry_sourceフィールドは特別処理（ドロップダウン）
                    if (field.key === 'inquiry_source') {
                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="dropdown"
                            options={INQUIRY_SOURCE_OPTIONS}
                            onSave={handleFieldSave}
                            buyerId={buyer?.id || buyer_number}
                            enableConflictDetection={true}
                            showEditIndicator={true}
                            oneClickDropdown={true}
                          />
                        </Grid>
                      );
                    }

                    // latest_statusフィールドは特別処理（ドロップダウン）
                    if (field.key === 'latest_status') {
                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="dropdown"
                            options={LATEST_STATUS_OPTIONS}
                            onSave={handleFieldSave}
                            buyerId={buyer?.id || buyer_number}
                            enableConflictDetection={true}
                            showEditIndicator={true}
                            oneClickDropdown={true}
                          />
                        </Grid>
                      );
                    }

                    // inquiry_email_phoneフィールドは特別処理（条件付き表示・ボタン形式）
                    if (field.key === 'inquiry_email_phone') {
                      // 表示条件：「問合せ元」に"メール"が含まれる場合のみ表示
                      const shouldDisplay = buyer.inquiry_source && buyer.inquiry_source.includes('メール');

                      if (!shouldDisplay) {
                        return null; // 条件を満たさない場合は表示しない
                      }

                      const handleButtonClick = async (newValue: string) => {
                        // 同じボタンを2度クリックしたら値をクリア
                        const valueToSave = value === newValue ? '' : newValue;
                        
                        // 先にローカル状態を更新（即座にUIに反映）
                        setBuyer(prev => prev ? { ...prev, [field.key]: valueToSave } : prev);
                        
                        // バックグラウンドで保存
                        try {
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            // エラー時は元の値に戻す
                            setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          // エラー時は元の値に戻す
                          setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                          setSnackbar({
                            open: true,
                            message: error.message || '保存に失敗しました',
                            severity: 'error'
                          });
                        }
                      };

                      // 標準的な選択肢
                      const standardOptions = ['済', '未', '不通', '不要'];
                      const isStandardValue = standardOptions.includes(value);

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.primary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                            </Typography>
                            {isStandardValue || !value ? (
                              // 標準的な値または空の場合はボタンを表示
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
                              // 想定外の値の場合はテキストとして表示
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
                                  onClick={async () => {
                                    // 先にローカル状態を更新
                                    setBuyer(prev => prev ? { ...prev, [field.key]: '' } : prev);
                                    
                                    try {
                                      const result = await handleInlineFieldSave(field.key, '');
                                      if (result && !result.success && result.error) {
                                        // エラー時は元の値に戻す
                                        setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                                        setSnackbar({
                                          open: true,
                                          message: result.error,
                                          severity: 'error'
                                        });
                                      }
                                    } catch (error: any) {
                                      // エラー時は元の値に戻す
                                      setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                                      setSnackbar({
                                        open: true,
                                        message: error.message || 'クリアに失敗しました',
                                        severity: 'error'
                                      });
                                    }
                                  }}
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
                      // パターン3: 問合せ元に"メール"が含まれる AND 【問合メール】電話対応が"未"または"不通"
                      const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
                      const shouldDisplay = hasMailInquiry && (buyer.inquiry_email_phone === '未' || buyer.inquiry_email_phone === '不通');

                      if (!shouldDisplay) {
                        return null; // 条件を満たさない場合は表示しない
                      }

                      // 必須条件: 値が空の場合のみ赤字表示
                      const isRequired = !value || value.trim() === '';

                      const handleButtonClick = async (newValue: string) => {
                        // 同じボタンを2度クリックしたら値をクリア
                        const valueToSave = value === newValue ? '' : newValue;
                        
                        // 先にローカル状態を更新（即座にUIに反映）
                        setBuyer(prev => prev ? { ...prev, [field.key]: valueToSave } : prev);
                        
                        // バックグラウンドで保存
                        try {
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            // エラー時は元の値に戻す
                            setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          // エラー時は元の値に戻す
                          setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                          setSnackbar({
                            open: true,
                            message: error.message || '保存に失敗しました',
                            severity: 'error'
                          });
                        }
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

                    // email_typeフィールドは削除されました

                    // initial_assigneeフィールドは特別処理（スタッフイニシャルボタン形式）
                    if (field.key === 'initial_assignee') {
                      const handleButtonClick = async (newValue: string) => {
                        // 同じボタンを2度クリックしたら値をクリア
                        const valueToSave = value === newValue ? '' : newValue;
                        
                        // 先にローカル状態を更新（即座にUIに反映）
                        setBuyer(prev => prev ? { ...prev, [field.key]: valueToSave } : prev);
                        
                        // バックグラウンドで保存
                        try {
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            // エラー時は元の値に戻す
                            setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          // エラー時は元の値に戻す
                          setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                          setSnackbar({
                            open: true,
                            message: error.message || '保存に失敗しました',
                            severity: 'error'
                          });
                        }
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

                    // 他気になる物件ヒアリング
                    if (field.key === 'other_property_hearing') {
                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="dropdown"
                            options={OTHER_PROPERTY_HEARING_OPTIONS}
                            onSave={handleFieldSave}
                            buyerId={buyer?.id || buyer_number}
                            enableConflictDetection={true}
                            showEditIndicator={true}
                            oneClickDropdown={true}
                          />
                        </Grid>
                      );
                    }

                    // 内覧促進メール不要
                    if (field.key === 'viewing_promotion_email_unnecessary') {
                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="dropdown"
                            options={VIEWING_PROMOTION_EMAIL_OPTIONS}
                            onSave={handleFieldSave}
                            buyerId={buyer?.id || buyer_number}
                            enableConflictDetection={true}
                            showEditIndicator={true}
                            oneClickDropdown={true}
                          />
                        </Grid>
                      );
                    }

                    // 内覧促進メール（条件付き表示・ボタン形式）
                    if (field.key === 'viewing_promotion_email') {
                      // 表示条件：
                      // 1. 「問合せ元」に"メール"または"電話"が含まれる
                      // 2. または、ステータスが「要内覧促進客」
                      // 3. ただし、「問合せ元」が"2件目以降紹介"の場合は表示しない
                      const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
                      const hasPhoneInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('電話');
                      const isViewingPromotionRequired = buyer.status === '要内覧促進客';
                      const isSecondInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('2件目以降紹介');
                      const shouldDisplay = (hasMailInquiry || hasPhoneInquiry || isViewingPromotionRequired) && !isSecondInquiry;

                      if (!shouldDisplay) {
                        return null; // 条件を満たさない場合は表示しない
                      }

                      // 必須条件の判定
                      // パターン1: 問合せ元に"電話"が含まれる AND 問合時ヒアリングに入力がある
                      const hasInquiryHearing = buyer.inquiry_hearing && buyer.inquiry_hearing.trim() !== '';
                      const isRequiredPattern1 = hasPhoneInquiry && hasInquiryHearing;
                      // パターン2: 問合せ元に"メール"が含まれる AND 【問合メール】電話対応 = "不通"
                      const isRequiredPattern2 = hasMailInquiry && buyer.inquiry_email_phone === '不通';
                      const isRequired = (isRequiredPattern1 || isRequiredPattern2) && (!value || value.trim() === '');

                      const handleButtonClick = async (newValue: string) => {
                        // 同じボタンを2度クリックしたら値をクリア
                        const valueToSave = value === newValue ? '' : newValue;
                        
                        // 先にローカル状態を更新（即座にUIに反映）
                        setBuyer(prev => prev ? { ...prev, [field.key]: valueToSave } : prev);
                        
                        // バックグラウンドで保存
                        try {
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            // エラー時は元の値に戻す
                            setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          // エラー時は元の値に戻す
                          setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                          setSnackbar({
                            open: true,
                            message: error.message || '保存に失敗しました',
                            severity: 'error'
                          });
                        }
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

                    // メアド確認（条件付き表示）
                    if (field.key === 'email_confirmation') {
                      // 表示条件：メールアドレスが空欄
                      const shouldDisplay = !buyer.email || buyer.email.trim() === '';

                      if (!shouldDisplay) {
                        return null; // メールアドレスがある場合は表示しない
                      }

                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

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
                              onSave={handleFieldSave}
                              buyerId={buyer?.id || buyer_number}
                              enableConflictDetection={true}
                              showEditIndicator={true}
                              oneClickDropdown={true}
                            />
                          </Box>
                        </Grid>
                      );
                    }

                    // メアド確認
                    if (field.key === 'email_confirmation') {
                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <InlineEditableField
                            label={field.label}
                            value={value || ''}
                            fieldName={field.key}
                            fieldType="dropdown"
                            options={EMAIL_CONFIRMATION_OPTIONS}
                            onSave={handleFieldSave}
                            buyerId={buyer?.id || buyer_number}
                            enableConflictDetection={true}
                            showEditIndicator={true}
                            oneClickDropdown={true}
                          />
                        </Grid>
                      );
                    }

                    // 業者問合せ（条件付き表示・ボタン形式）
                    if (field.key === 'broker_inquiry') {
                      // 表示条件：法人名に入力がある場合のみ表示
                      const hasCompanyName = buyer.company_name && buyer.company_name.trim() !== '';
                      
                      if (!hasCompanyName) {
                        return null; // 条件を満たさない場合は表示しない
                      }

                      // 必須条件: 値が空の場合のみ赤字表示
                      const isRequired = !value || value.trim() === '';

                      const handleButtonClick = async (newValue: string) => {
                        // 同じボタンを2度クリックしたら値をクリア
                        const valueToSave = value === newValue ? '' : newValue;
                        
                        // 先にローカル状態を更新（即座にUIに反映）
                        setBuyer(prev => prev ? { ...prev, [field.key]: valueToSave } : prev);
                        
                        // バックグラウンドで保存
                        try {
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            // エラー時は元の値に戻す
                            setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          // エラー時は元の値に戻す
                          setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                          setSnackbar({
                            open: true,
                            message: error.message || '保存に失敗しました',
                            severity: 'error'
                          });
                        }
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
                      // 必須条件：メールアドレスが入力されていて、かつPinrichが空欄の場合
                      const hasEmail = buyer.email && buyer.email.trim() !== '';
                      const hasValue = value && value.trim() !== '';
                      const isRequired = hasEmail && !hasValue;

                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

                      const PINRICH_URL = 'https://pinrich.com/management/hankyo';

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box 
                            sx={{ 
                              mb: 1,
                              p: isRequired ? 2 : 0,
                              border: isRequired ? '3px solid' : 'none',
                              borderColor: isRequired ? 'error.main' : 'transparent',
                              borderRadius: 2,
                              bgcolor: isRequired ? 'error.light' : 'transparent',
                              boxShadow: isRequired ? '0 4px 12px rgba(211, 47, 47, 0.3)' : 'none',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            {isRequired && (
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  display: 'block', 
                                  mb: 1,
                                  fontWeight: 'bold',
                                  fontSize: '0.95rem',
                                  color: 'text.primary',
                                }}
                              >
                                <Box 
                                  component="a" 
                                  href={PINRICH_URL} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  sx={{ 
                                    color: SECTION_COLORS.buyer.main,
                                    textDecoration: 'none',
                                    '&:hover': {
                                      textDecoration: 'underline',
                                    }
                                  }}
                                >
                                  {field.label}
                                </Box>
                                {' '}
                                <span style={{ color: 'red', fontWeight: 'bold' }}>*必須</span>
                              </Typography>
                            )}
                            <InlineEditableField
                              label={isRequired ? '' : (
                                <Box 
                                  component="a" 
                                  href={PINRICH_URL} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  sx={{ 
                                    color: SECTION_COLORS.buyer.main,
                                    textDecoration: 'none',
                                    fontSize: '0.75rem',
                                    '&:hover': {
                                      textDecoration: 'underline',
                                    }
                                  }}
                                >
                                  {field.label}
                                </Box>
                              )}
                              value={value || ''}
                              fieldName={field.key}
                              fieldType="dropdown"
                              options={PINRICH_OPTIONS}
                              onSave={handleFieldSave}
                              buyerId={buyer?.id || buyer_number}
                              enableConflictDetection={true}
                              showEditIndicator={true}
                              oneClickDropdown={true}
                            />
                          </Box>
                        </Grid>
                      );
                    }

                    // 内覧未確定
                    // distribution_typeフィールドは特別処理（ボタン形式）
                    if (field.key === 'distribution_type') {
                      const handleButtonClick = async (newValue: string) => {
                        // 同じボタンを2度クリックしたら値をクリア
                        const valueToSave = value === newValue ? '' : newValue;
                        
                        // 先にローカル状態を更新（即座にUIに反映）
                        setBuyer(prev => prev ? { ...prev, [field.key]: valueToSave } : prev);
                        
                        // バックグラウンドで保存
                        try {
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            // エラー時は元の値に戻す
                            setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          // エラー時は元の値に戻す
                          setBuyer(prev => prev ? { ...prev, [field.key]: value } : prev);
                          setSnackbar({
                            open: true,
                            message: error.message || '保存に失敗しました',
                            severity: 'error'
                          });
                        }
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

                    // その他のフィールド
                    const handleFieldSave = async (newValue: any) => {
                      const result = await handleInlineFieldSave(field.key, newValue);
                      if (result && !result.success && result.error) {
                        throw new Error(result.error);
                      }
                    };

                    // inquiry_hearingフィールドには常に囲い枠を表示
                    const isInquiryHearing = field.key === 'inquiry_hearing';
                    
                    // inquiry_hearingフィールドの場合は自動保存を無効化（保存ボタンで保存）
                    const handleInquiryHearingSave = async (newValue: any) => {
                      // ドラフトとして保存（DBには保存しない）
                      setInquiryHearingDraft(newValue);
                      setBuyer(prev => prev ? { ...prev, inquiry_hearing: newValue } : prev);
                      // 何もしない（保存ボタンで保存）
                    };

                    return (
                      <Grid item {...gridSize} key={field.key}>
                        {/* 問合時ヒアリング用クイック入力ボタン */}
                        {isInquiryHearing && (
                          <Box sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2">
                                ヒアリング項目
                              </Typography>
                              {/* 保存ボタン（ドラフトがある場合のみ有効） */}
                              <Button
                                variant="contained"
                                size="small"
                                onClick={handleSaveInquiryHearing}
                                disabled={inquiryHearingDraft === null || isSavingInquiryHearing}
                                startIcon={isSavingInquiryHearing ? <CircularProgress size={16} /> : null}
                                sx={{
                                  backgroundColor: SECTION_COLORS.buyer.main,
                                  color: '#fff',
                                  '&:hover': {
                                    backgroundColor: SECTION_COLORS.buyer.dark,
                                  },
                                  '&:disabled': {
                                    backgroundColor: '#ccc',
                                    color: '#999',
                                  },
                                }}
                              >
                                {isSavingInquiryHearing ? '保存中...' : '保存'}
                              </Button>
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
                                      onClick={() => handleInquiryHearingQuickInput(item.text, item.label)}
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
                        )}
                        <InlineEditableField
                          key={isInquiryHearing ? `inquiry_hearing_${inquiryHearingKey}` : field.key}
                          label={field.label}
                          value={value || ''}
                          fieldName={field.key}
                          fieldType={
                            field.type === 'date' ? 'date' :
                            field.multiline ? 'textarea' :
                            'text'
                          }
                          onSave={isInquiryHearing ? handleInquiryHearingSave : handleFieldSave}
                          readOnly={field.readOnly === true}
                          buyerId={buyer?.id || buyer_number}
                          enableConflictDetection={true}
                          alwaysShowBorder={isInquiryHearing}
                          borderPlaceholder={isInquiryHearing ? 'ヒアリング内容を入力...' : undefined}
                          showEditIndicator={!field.readOnly}
                        />
                      </Grid>
                    );
                  }

                  // インライン編集不可のフィールド（通常表示）
                  return (
                    <Grid item {...gridSize} key={field.key}>
                      <Typography variant="caption" color="text.secondary">
                        {field.label}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: field.multiline ? 'pre-wrap' : 'normal' }}>
                        {formatValue(value, field.type)}
                      </Typography>
                    </Grid>
                  );
                })}
                
                {/* 問合せ内容セクションの場合、担当への確認事項コンポーネントを追加 */}
                {section.title === '問合せ内容' && linkedProperties.length > 0 && linkedProperties[0].sales_assignee && (
                  <Grid item xs={12}>
                    <ConfirmationToAssignee
                      buyer={buyer}
                      propertyAssignee={linkedProperties[0].sales_assignee}
                      onSendSuccess={() => {
                        setSnackbar({
                          open: true,
                          message: '送信しました',
                          severity: 'success'
                        });
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>
          ))}

          {/* メール・SMS送信履歴セクション */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon sx={{ mr: 1, color: SECTION_COLORS.buyer.main }} />
              <Typography variant="h6">メール・SMS送信履歴</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {activities.filter(a => a.action === 'email' || a.action === 'sms').length > 0 ? (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {activities
                  .filter(a => a.action === 'email' || a.action === 'sms')
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((activity) => {
                    const metadata = activity.metadata || {};
                    const propertyNumbers = metadata.propertyNumbers || [];
                    const displayName = activity.employee ? getDisplayName(activity.employee) : '不明';
                    const actionLabel = activity.action === 'email' ? 'Email' : 'SMS';
                    const templateType = metadata.template_type || '不明';
                    
                    return (
                      <ListItem
                        key={activity.id}
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          py: 2,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                        onClick={() => {
                          setSelectedActivity(activity);
                          setActivityDetailOpen(true);
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={actionLabel} 
                              size="small" 
                              color={activity.action === 'email' ? 'primary' : 'secondary'}
                              sx={{ fontWeight: 'bold' }}
                            />
                            <Typography variant="body2" fontWeight="bold">
                              {templateType}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(activity.created_at)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ width: '100%', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            送信者: {displayName} ({metadata.sender_email || metadata.sender || '-'})
                          </Typography>
                        </Box>
                        
                        {propertyNumbers.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                              物件:
                            </Typography>
                            {propertyNumbers.map((pn: string) => (
                              <Chip
                                key={pn}
                                label={pn}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        )}
                      </ListItem>
                    );
                  })}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                <EmailIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
                <Typography variant="body2">メール・SMS送信履歴はありません</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* 関連買主セクション */}
      {buyer?.id && (
        <Box sx={{ mt: 3 }}>
          <RelatedBuyersSection buyerId={buyer.id} />
        </Box>
      )}

      {/* 統合問合せ履歴 */}
      {buyer?.id && (
        <Box sx={{ mt: 3 }}>
          <UnifiedInquiryHistoryTable buyerId={buyer.id} />
        </Box>
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

      {/* メール送信モーダル */}
      <InquiryResponseEmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        selectedProperties={emailModalProperties}
        onSuccess={handleEmailSuccess}
        buyerInfo={buyer ? {
          name: buyer.name || '',
          email: buyer.email || '',
          buyerId: buyer.id || buyer_number || '',
        } : undefined}
      />

      {/* 確認ダイアログ */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelSend}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog.type === 'email' ? 'Email送信確認' : 'SMS送信確認'}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.type === 'email' && confirmDialog.template && (
            <Box>
              <TextField
                fullWidth
                label="宛先"
                value={editableEmailRecipient}
                onChange={(e) => setEditableEmailRecipient(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="件名"
                value={editableEmailSubject}
                onChange={(e) => setEditableEmailSubject(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="本文"
                value={editableEmailBody}
                onChange={(e) => setEditableEmailBody(e.target.value)}
                margin="normal"
                multiline
                rows={20}
                required
              />
              
              {/* 画像添付ボタン */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  onClick={handleOpenImageSelector}
                  fullWidth
                >
                  画像を添付
                </Button>

                {selectedImages && Array.isArray(selectedImages) && selectedImages.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="success">
                      {selectedImages.length}枚の画像が選択されました
                    </Alert>
                  </Box>
                )}

                {imageError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {imageError}
                  </Alert>
                )}
              </Box>
            </Box>
          )}
          {confirmDialog.type === 'sms' && confirmDialog.template && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                宛先: {buyer?.phone_number}
              </Typography>
              <TextField
                fullWidth
                label="メッセージ"
                value={confirmDialog.template.content}
                margin="normal"
                multiline
                rows={10}
                InputProps={{
                  readOnly: true,
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                文字数: {confirmDialog.template.content.length} / 670
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSend} disabled={sendingTemplate}>
            キャンセル
          </Button>
          <Button
            onClick={handleConfirmSend}
            variant="contained"
            sx={{
              backgroundColor: SECTION_COLORS.buyer.main,
              '&:hover': {
                backgroundColor: SECTION_COLORS.buyer.dark,
              },
            }}
            disabled={sendingTemplate}
          >
            {sendingTemplate ? '送信中...' : '送信'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* アクティビティ詳細ダイアログ */}
      <Dialog
        open={activityDetailOpen}
        onClose={() => setActivityDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedActivity?.action === 'email' ? 'メール送信詳細' : 'SMS送信詳細'}
        </DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  種別: {selectedActivity.metadata?.template_type || '不明'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  送信日時: {formatDateTime(selectedActivity.created_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  送信者: {selectedActivity.employee ? getDisplayName(selectedActivity.employee) : '不明'} ({selectedActivity.metadata?.sender_email || selectedActivity.metadata?.sender || '-'})
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {selectedActivity.action === 'email' && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      件名
                    </Typography>
                    <Typography variant="body1">
                      {selectedActivity.metadata?.subject || '件名なし'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      宛先
                    </Typography>
                    <Typography variant="body1">
                      {selectedActivity.metadata?.recipient_email || '-'}
                    </Typography>
                  </Box>
                  
                  {selectedActivity.metadata?.body && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        本文
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 500, overflow: 'auto' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedActivity.metadata.body}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                  
                  {selectedActivity.metadata?.selected_images > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        添付画像
                      </Typography>
                      <Typography variant="body2">
                        {selectedActivity.metadata.selected_images}枚
                      </Typography>
                    </Box>
                  )}
                </>
              )}
              
              {selectedActivity.action === 'sms' && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      宛先
                    </Typography>
                    <Typography variant="body1">
                      {selectedActivity.metadata?.recipient_phone || '-'}
                    </Typography>
                  </Box>
                  
                  {selectedActivity.metadata?.message && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        メッセージ
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 500, overflow: 'auto' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedActivity.metadata.message}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDetailOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* 画像選択モーダル */}
      <ImageSelectorModal
        open={imageSelectorOpen}
        onConfirm={handleImageSelectionConfirm}
        onCancel={handleImageSelectionCancel}
      />
    </Container>
  );
}
