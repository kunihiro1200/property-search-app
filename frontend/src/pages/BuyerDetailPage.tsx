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
  { label: 'リフォーム予算', text: 'リフォーム込みの予算（最高額）：' },
  { label: '持ち家か', text: '持ち家か：' },
  { label: '他物件', text: '他に気になる物件はあるか？：' },
];

const BUYER_FIELD_SECTIONS = [
  {
    title: '問合せ内容',
    fields: [
      // 一番上：問合時ヒアリング（全幅）
      { key: 'inquiry_hearing', label: '問合時ヒアリング', multiline: true, inlineEditable: true, fullWidth: true },
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

  // Validate buyer_number parameter - support UUID, numeric, and BY_ prefix formats
  const isUuid = buyer_number ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(buyer_number) : false;
  const isNumericBuyerNumber = buyer_number ? /^\d+$/.test(buyer_number) : false;
  const isByPrefixBuyerNumber = buyer_number ? /^BY_[A-Za-z0-9_]+$/.test(buyer_number) : false;
  const isValidBuyerNumber = isUuid || isNumericBuyerNumber || isByPrefixBuyerNumber;

  useEffect(() => {
    if (buyer_number && isValidBuyerNumber) {
      fetchBuyer();
      fetchLinkedProperties();
      fetchInquiryHistory();
      fetchInquiryHistoryTable();
      fetchRelatedBuyersCount();
      fetchActivities();
      fetchTemplates();
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
  
  const handleInquiryHearingQuickInput = async (text: string, buttonLabel: string) => {
    if (!buyer) return;
    
    console.log('[handleInquiryHearingQuickInput] Called with:', { text, buttonLabel });
    console.log('[handleInquiryHearingQuickInput] Current buyer.inquiry_hearing:', buyer.inquiry_hearing);
    
    // 現在の値を取得（buyerの最新状態から）
    const currentValue = buyer.inquiry_hearing || '';
    
    // 新しいテキストを先頭に追加（既存内容がある場合は改行を挟む）
    const newValue = currentValue 
      ? `${text}\n${currentValue}` 
      : text;
    
    console.log('[handleInquiryHearingQuickInput] New value to save:', newValue);
    
    // 先にローカル状態を更新して即座にUIに反映
    setBuyer(prev => prev ? { ...prev, inquiry_hearing: newValue } : prev);
    // キーを更新してInlineEditableFieldを強制再レンダリング
    setInquiryHearingKey(prev => prev + 1);
    
    // DB → スプレッドシートに即座に同期
    try {
      const result = await buyerApi.update(
        buyer_number!,
        { inquiry_hearing: newValue },
        { sync: true, force: true }  // スプレッドシート同期を有効化
      );
      
      console.log('[handleInquiryHearingQuickInput] Save result:', result);
      
    } catch (error: any) {
      console.error('[handleInquiryHearingQuickInput] Exception:', error);
      // エラー時は元の値に戻す
      setBuyer(prev => prev ? { ...prev, inquiry_hearing: currentValue } : prev);
      setInquiryHearingKey(prev => prev + 1);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || '保存に失敗しました',
        severity: 'error'
      });
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

  const handleSmsTemplateSelect = (templateId: string) => {
    if (!templateId) return;

    const template = smsTemplates.find(t => t.id === templateId);
    if (!template) return;

    console.log('[handleSmsTemplateSelect] Selected template:', {
      id: template.id,
      category: template.category,
      type: template.type,
      contentLength: template.content.length,
    });

    // SMS用に署名を簡略化してからプレースホルダーを置換
    const simplifiedContent = simplifySmsSignature(template.content);
    const replacedContent = replacePlaceholders(simplifiedContent);

    // メッセージ長の検証（日本語SMS制限: 670文字）
    const isOverLimit = replacedContent.length > 670;
    
    if (isOverLimit) {
      // エラーメッセージを表示するが、ダイアログも開く
      setSnackbar({
        open: true,
        message: `メッセージが長すぎます（${replacedContent.length}文字 / 670文字制限）。内容を確認してください。`,
        severity: 'warning',
      });
    }

    // 確認ダイアログを表示（文字数オーバーでも表示）
    // 確認ダイアログを表示（文字数オーバーでも表示）
    setConfirmDialog({
      open: true,
      type: 'sms',
      template: {
        ...template,
        content: replacedContent,
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
      
      // 全てのテンプレートをメールとSMS両方で使用可能にする
      // （ユーザーがどちらでも選択できるように）
      setEmailTemplates(templates);
      setSmsTemplates(templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
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
      result = result.replace(/<<athome URL>>/g, firstProperty.suumo_url || '');
      
      // SUUMO URLの表示: URLがある場合のみ「SUUMO: URL」形式で表示
      const suumoUrlDisplay = firstProperty.suumo_url ? `SUUMO: ${firstProperty.suumo_url}` : '';
      result = result.replace(/<<SUUMO　URLの表示>>/g, suumoUrlDisplay);
      result = result.replace(/<<SUUMO URLの表示>>/g, suumoUrlDisplay);
      
      result = result.replace(/<<SUUMO URL>>/g, firstProperty.suumo_url || '');
      result = result.replace(/<<GoogleMap>>/g, firstProperty.google_map_url || '');
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={() => navigate('/buyers')} 
            sx={{ mr: 2 }}
            aria-label="買主一覧に戻る"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            {buyer.name ? `${buyer.name}様` : buyer.buyer_number}
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
                sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                title="クリックでコピー"
              />
              {copiedBuyerNumber && (
                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>✓</Typography>
              )}
            </>
          )}
          {buyer.inquiry_confidence && (
            <Chip label={buyer.inquiry_confidence} color="info" sx={{ ml: 2 }} />
          )}
          {buyer.latest_status && (
            <Chip label={buyer.latest_status.substring(0, 30)} sx={{ ml: 1 }} />
          )}
          <RelatedBuyerNotificationBadge 
            count={relatedBuyersCount} 
            onClick={scrollToRelatedBuyers}
          />
        </Box>

        {/* ヘッダー右側のボタン */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Email送信ドロップダウン */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
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
              color="primary"
              startIcon={<Phone />}
              href={`tel:${buyer.phone_number}`}
              sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
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
            }}
          >
            希望条件
          </Button>

          {/* 内覧ボタン */}
          <Button
            variant="outlined"
            size="medium"
            onClick={() => navigate(`/buyers/${buyer_number}/viewing-result`)}
            sx={{
              whiteSpace: 'nowrap',
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
                      bgcolor: history.isCurrent ? 'primary.light' : 'background.paper',
                      borderRadius: 1,
                      border: history.isCurrent ? '2px solid' : '1px solid',
                      borderColor: history.isCurrent ? 'primary.main' : 'divider'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        買主番号: {history.buyerNumber}
                      </Typography>
                      {history.isCurrent && (
                        <Chip label="現在" color="primary" size="small" />
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
                      color: 'primary.main',
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
                  
                  // グリッドサイズの決定
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
                            color="primary"
                            size="medium"
                            onClick={() => {
                              window.open(GOOGLE_CHAT_URL, '_blank');
                            }}
                            sx={{ 
                              fontWeight: 'bold',
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
                        try {
                          console.log('[inquiry_email_phone] Button clicked, current value:', value, 'new value:', newValue);
                          
                          // 同じボタンを2度クリックしたら値をクリア
                          const valueToSave = value === newValue ? '' : newValue;
                          console.log('[inquiry_email_phone] Setting value:', valueToSave);
                          
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          console.error('[inquiry_email_phone] Error:', error);
                          setSnackbar({
                            open: true,
                            message: error.message || '保存に失敗しました',
                            severity: 'error'
                          });
                        }
                      };

                      // 標準的な選択肢
                      const standardOptions = ['済', '未', '不通'];
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
                                    color="primary"
                                    size="small"
                                    onClick={() => handleButtonClick(option)}
                                    sx={{ flex: '1 1 auto', minWidth: '60px' }}
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
                                    try {
                                      const result = await handleInlineFieldSave(field.key, '');
                                      if (result && !result.success && result.error) {
                                        setSnackbar({
                                          open: true,
                                          message: result.error,
                                          severity: 'error'
                                        });
                                      }
                                    } catch (error: any) {
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
                      // 表示条件の判定
                      const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
                      const hasPhoneInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('電話');
                      const hasInquiryHearing = buyer.inquiry_hearing && buyer.inquiry_hearing.trim() !== '';
                      
                      // パターン1: 問合せ元に"メール"が含まれる AND 【問合メール】電話対応 = "済"
                      const shouldDisplayPattern1 = hasMailInquiry && buyer.inquiry_email_phone === '済';
                      // パターン2: 問合せ元に"電話"が含まれる AND 問合時ヒアリングに入力がある
                      const shouldDisplayPattern2 = hasPhoneInquiry && hasInquiryHearing;
                      
                      const shouldDisplay = shouldDisplayPattern1 || shouldDisplayPattern2;

                      if (!shouldDisplay) {
                        return null; // 条件を満たさない場合は表示しない
                      }

                      const handleButtonClick = async (newValue: string) => {
                        try {
                          console.log('[three_calls_confirmed] Button clicked, current value:', value, 'new value:', newValue);
                          
                          // 同じボタンを2度クリックしたら値をクリア
                          const valueToSave = value === newValue ? '' : newValue;
                          console.log('[three_calls_confirmed] Setting value:', valueToSave);
                          
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          console.error('[three_calls_confirmed] Error:', error);
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
                              {field.label} <span style={{ color: 'red', fontWeight: 'bold' }}>*必須</span>
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                variant={value === '3回架電OK' ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={() => handleButtonClick('3回架電OK')}
                                sx={{ flex: '1 1 auto', minWidth: '90px' }}
                              >
                                3回架電OK
                              </Button>
                              <Button
                                variant={value === '3回架電未' ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={() => handleButtonClick('3回架電未')}
                                sx={{ flex: '1 1 auto', minWidth: '90px' }}
                              >
                                3回架電未
                              </Button>
                              <Button
                                variant={value === '他' ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={() => handleButtonClick('他')}
                                sx={{ flex: '1 1 auto', minWidth: '60px' }}
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
                        try {
                          console.log('[initial_assignee] Button clicked, current value:', value, 'new value:', newValue);
                          
                          // 同じボタンを2度クリックしたら値をクリア
                          const valueToSave = value === newValue ? '' : newValue;
                          console.log('[initial_assignee] Setting value:', valueToSave);
                          
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          } else {
                            setSnackbar({
                              open: true,
                              message: '保存しました',
                              severity: 'success'
                            });
                          }
                        } catch (error: any) {
                          console.error('[initial_assignee] Error:', error);
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
                                  color="primary"
                                  size="small"
                                  onClick={() => handleButtonClick(initial)}
                                  sx={{ 
                                    minWidth: '40px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                  }}
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
                          />
                        </Grid>
                      );
                    }

                    // 内覧促進メール（条件付き表示・ボタン形式）
                    if (field.key === 'viewing_promotion_email') {
                      // 表示条件：「問合せ元」に"メール"または"電話"が含まれる場合のみ表示
                      const hasMailInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('メール');
                      const hasPhoneInquiry = buyer.inquiry_source && buyer.inquiry_source.includes('電話');
                      const shouldDisplay = hasMailInquiry || hasPhoneInquiry;

                      if (!shouldDisplay) {
                        return null; // 条件を満たさない場合は表示しない
                      }

                      // 必須条件の判定
                      // パターン1: 問合せ元に"メール"が含まれる AND 【問合メール】電話対応 = "済"
                      const isRequiredPattern1 = hasMailInquiry && buyer.inquiry_email_phone === '済';
                      // パターン2: 問合せ元に"電話"が含まれる AND 問合時ヒアリングに入力がある
                      const isRequiredPattern2 = hasPhoneInquiry && buyer.inquiry_hearing && buyer.inquiry_hearing.trim() !== '';
                      const isRequired = isRequiredPattern1 || isRequiredPattern2;

                      const handleButtonClick = async (newValue: string) => {
                        try {
                          console.log('[viewing_promotion_email] Button clicked, current value:', value, 'new value:', newValue);
                          
                          // 同じボタンを2度クリックしたら値をクリア
                          const valueToSave = value === newValue ? '' : newValue;
                          console.log('[viewing_promotion_email] Setting value:', valueToSave);
                          
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          }
                        } catch (error: any) {
                          console.error('[viewing_promotion_email] Error:', error);
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
                                color="primary"
                                size="small"
                                onClick={() => handleButtonClick('要')}
                                sx={{ flex: 1 }}
                              >
                                要
                              </Button>
                              <Button
                                variant={value === '不要' ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={() => handleButtonClick('不要')}
                                sx={{ flex: 1 }}
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
                          />
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
                                    color: 'primary.main',
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
                                    color: 'primary.main',
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
                            />
                          </Box>
                        </Grid>
                      );
                    }

                    // 内覧未確定
                    // distribution_typeフィールドは特別処理（ボタン形式）
                    if (field.key === 'distribution_type') {
                      const handleButtonClick = async (newValue: string) => {
                        try {
                          console.log('[distribution_type] Button clicked, current value:', value, 'new value:', newValue);
                          
                          // 同じボタンを2度クリックしたら値をクリア
                          const valueToSave = value === newValue ? '' : newValue;
                          console.log('[distribution_type] Setting value:', valueToSave);
                          
                          const result = await handleInlineFieldSave(field.key, valueToSave);
                          
                          if (result && !result.success && result.error) {
                            setSnackbar({
                              open: true,
                              message: result.error,
                              severity: 'error'
                            });
                          } else {
                            setSnackbar({
                              open: true,
                              message: '保存しました',
                              severity: 'success'
                            });
                          }
                        } catch (error: any) {
                          console.error('[distribution_type] Error:', error);
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
                                color="primary"
                                size="small"
                                onClick={() => handleButtonClick('要')}
                                sx={{ flex: 1 }}
                              >
                                要
                              </Button>
                              <Button
                                variant={value === '不要' ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={() => handleButtonClick('不要')}
                                sx={{ flex: 1 }}
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

                    return (
                      <Grid item {...gridSize} key={field.key}>
                        {/* 問合時ヒアリング用クイック入力ボタン */}
                        {isInquiryHearing && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              ヒアリング項目
                            </Typography>
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
                                      color="primary"
                                      variant="outlined"
                                      sx={{
                                        cursor: 'pointer',
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
                          onSave={handleFieldSave}
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
              <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
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
            color="primary"
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
