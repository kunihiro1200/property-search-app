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

// 繝輔ぅ繝ｼ繝ｫ繝峨ｒ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ縺斐→縺ｫ繧ｰ繝ｫ繝ｼ繝怜喧
// 蝠丞粋譎ゅヲ繧｢繝ｪ繝ｳ繧ｰ逕ｨ繧ｯ繧､繝・け蜈･蜉帙・繧ｿ繝ｳ縺ｮ螳夂ｾｩ
const INQUIRY_HEARING_QUICK_INPUTS = [
  { label: '蛻晁ｦ九°', text: '蛻晁ｦ九°・・ },
  { label: '蟶梧悍譎よ悄', text: '蟶梧悍譎よ悄・・ },
  { label: '鬧占ｻ雁ｴ蟶梧悍蜿ｰ謨ｰ', text: '鬧占ｻ雁ｴ蟶梧悍蜿ｰ謨ｰ・・ },
  { label: '繝ｪ繝輔か繝ｼ繝莠育ｮ・, text: '繝ｪ繝輔か繝ｼ繝霎ｼ縺ｿ縺ｮ莠育ｮ暦ｼ域怙鬮倬｡搾ｼ会ｼ・ },
  { label: '謖√■螳ｶ縺・, text: '謖√■螳ｶ縺具ｼ・ },
  { label: '莉也黄莉ｶ', text: '莉悶↓豌励↓縺ｪ繧狗黄莉ｶ縺ｯ縺ゅｋ縺具ｼ滂ｼ・ },
];

const BUYER_FIELD_SECTIONS = [
  {
    title: '蝠丞粋縺帛・螳ｹ',
    fields: [
      // 荳逡ｪ荳奇ｼ壼撫蜷域凾繝偵い繝ｪ繝ｳ繧ｰ・亥・蟷・ｼ・      { key: 'inquiry_hearing', label: '蝠丞粋譎ゅヲ繧｢繝ｪ繝ｳ繧ｰ', multiline: true, inlineEditable: true, fullWidth: true },
      // 蟾ｦ縺ｮ蛻・      { key: 'inquiry_email_phone', label: '縲仙撫蜷医Γ繝ｼ繝ｫ縲鷹崕隧ｱ蟇ｾ蠢・, inlineEditable: true, fieldType: 'dropdown', column: 'left' },
      { key: 'three_calls_confirmed', label: '3蝗樊楔髮ｻ遒ｺ隱肴ｸ医∩', inlineEditable: true, fieldType: 'dropdown', column: 'left' },
      { key: 'email_type', label: '繝｡繝ｼ繝ｫ遞ｮ蛻･', inlineEditable: true, fieldType: 'dropdown', column: 'left' },
      { key: 'distribution_type', label: '驟堺ｿ｡縺ｮ譛臥┌', inlineEditable: true, fieldType: 'button', column: 'left' },
      // 蜿ｳ縺ｮ蛻・      { key: 'reception_date', label: '蜿嶺ｻ俶律', type: 'date', inlineEditable: true, column: 'right' },
      { key: 'initial_assignee', label: '蛻晏虚諡・ｽ・, inlineEditable: true, column: 'right' },
      { key: 'inquiry_source', label: '蝠丞粋縺帛・', inlineEditable: true, column: 'right' },
      { key: 'next_call_date', label: '谺｡髮ｻ譌･', type: 'date', inlineEditable: true, column: 'right' },
      // 蜑企勁: owned_home_hearing・域戟螳ｶ繝偵い繝ｪ繝ｳ繧ｰ・・      // 蜑企勁: inquiry_confidence・亥撫蜷域凾遒ｺ蠎ｦ・・ 謖・ｮ壹＆繧後※縺・↑縺・◆繧∝炎髯､
    ],
  },
  {
    title: '蝓ｺ譛ｬ諠・ｱ',
    fields: [
      { key: 'buyer_number', label: '雋ｷ荳ｻ逡ｪ蜿ｷ', inlineEditable: true, readOnly: true },
      { key: 'name', label: '豌丞錐繝ｻ莨夂､ｾ蜷・, inlineEditable: true },
      { key: 'phone_number', label: '髮ｻ隧ｱ逡ｪ蜿ｷ', inlineEditable: true },
      { key: 'email', label: '繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ', inlineEditable: true },
      { key: 'company_name', label: '豕穂ｺｺ蜷・, inlineEditable: true },
    ],
  },
  // 蟶梧悍譚｡莉ｶ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ縺ｯ蛻･繝壹・繧ｸ縺ｫ遘ｻ蜍・  // 蜀・ｦｧ邨先棡繝ｻ蠕檎ｶ壼ｯｾ蠢懊そ繧ｯ繧ｷ繝ｧ繝ｳ縺ｯ蛻･繝壹・繧ｸ縺ｫ遘ｻ蜍・  {
    title: '雋ｷ莉俶ュ蝣ｱ',
    fields: [
      { key: 'offer_status', label: '雋ｷ莉俶怏辟｡', inlineEditable: true },
      { key: 'offer_comment', label: '雋ｷ莉倥さ繝｡繝ｳ繝・, inlineEditable: true },
      { key: 'offer_property_sheet', label: '雋ｷ莉假ｼ育黄莉ｶ繧ｷ繝ｼ繝茨ｼ・, inlineEditable: true },
      { key: 'offer_lost_comment', label: '雋ｷ莉伜､悶ｌ繧ｳ繝｡繝ｳ繝・, inlineEditable: true },
      { key: 'offer_lost_chat', label: '雋ｷ莉伜､悶ｌ繝√Ε繝・ヨ', inlineEditable: true },
    ],
  },
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
  
  // 繧｢繧ｯ繝・ぅ繝薙ユ繧｣隧ｳ邏ｰ繝繧､繧｢繝ｭ繧ｰ逕ｨ縺ｮ迥ｶ諷・  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  // 逕ｻ蜒城∈謚槭Δ繝ｼ繝繝ｫ逕ｨ縺ｮ迥ｶ諷・  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<any[] | null>(null);
  const [imageError, setImageError] = useState<string>('');

  // 繧ｯ繧､繝・け繝懊ち繝ｳ縺ｮ迥ｶ諷狗ｮ｡逅・  const { isDisabled: isQuickButtonDisabled, disableButton: disableQuickButton } = useQuickButtonState(buyer_number || '');

  // useStableContainerHeight繝輔ャ繧ｯ繧剃ｽｿ逕ｨ縺励※螳牙ｮ壹＠縺滄ｫ倥＆邂｡逅・  const { error: heightError } = useStableContainerHeight({
    headerHeight: 64,
    padding: 48,
    minHeight: 400,
    debounceDelay: 200,
  });

  // 繝薙Η繝ｼ繝昴・繝磯ｫ倥＆險育ｮ励お繝ｩ繝ｼ縺ｮ繝上Φ繝峨Μ繝ｳ繧ｰ
  useEffect(() => {
    if (heightError) {
      console.error('[BuyerDetailPage] Height calculation error:', heightError);
      setSnackbar({
        open: true,
        message: '逕ｻ髱｢鬮倥＆縺ｮ險育ｮ励〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅョ繝輔か繝ｫ繝亥､繧剃ｽｿ逕ｨ縺励∪縺吶・,
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
      // DB縺九ｉ譛譁ｰ繝・・繧ｿ繧貞叙蠕暦ｼ磯ｫ倬滂ｼ・      const res = await api.get(`/api/buyers/${buyer_number}`);
      setBuyer(res.data);
      // inquiry_hearing繝輔ぅ繝ｼ繝ｫ繝峨ｒ蠑ｷ蛻ｶ蜀阪Ξ繝ｳ繝繝ｪ繝ｳ繧ｰ
      setInquiryHearingKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to fetch buyer:', error);
    } finally {
      setLoading(false);
    }
  };

  // 繧､繝ｳ繝ｩ繧､繝ｳ邱ｨ髮・畑縺ｮ繝輔ぅ繝ｼ繝ｫ繝画峩譁ｰ繝上Φ繝峨Λ繝ｼ
  const handleInlineFieldSave = async (fieldName: string, newValue: any) => {
    if (!buyer) return;

    try {
      // 譖ｴ譁ｰ縺吶ｋ繝輔ぅ繝ｼ繝ｫ繝峨・縺ｿ繧帝∽ｿ｡・・B 竊・繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医↓蜊ｳ蠎ｧ縺ｫ蜷梧悄・・      const result = await buyerApi.update(
        buyer_number!,
        { [fieldName]: newValue },
        { sync: true, force: true }  // 繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医∈縺ｮ蜷梧悄繧呈怏蜉ｹ蛹・      );
      
      // 繝ｭ繝ｼ繧ｫ繝ｫ迥ｶ諷九ｒ譖ｴ譁ｰ
      setBuyer(result.buyer);
      
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update field:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || '譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆' 
      };
    }
  };

  // 蝠丞粋譎ゅヲ繧｢繝ｪ繝ｳ繧ｰ逕ｨ繧ｯ繧､繝・け蜈･蜉帙・繧ｿ繝ｳ縺ｮ繧ｯ繝ｪ繝・け繝上Φ繝峨Λ繝ｼ
  // inquiry_hearing繝輔ぅ繝ｼ繝ｫ繝峨・蠑ｷ蛻ｶ蜀阪Ξ繝ｳ繝繝ｪ繝ｳ繧ｰ逕ｨ繧ｭ繝ｼ
  const [inquiryHearingKey, setInquiryHearingKey] = useState(0);
  
  const handleInquiryHearingQuickInput = async (text: string, buttonLabel: string) => {
    if (!buyer) return;
    
    console.log('[handleInquiryHearingQuickInput] Called with:', { text, buttonLabel });
    console.log('[handleInquiryHearingQuickInput] Current buyer.inquiry_hearing:', buyer.inquiry_hearing);
    
    // 迴ｾ蝨ｨ縺ｮ蛟､繧貞叙蠕暦ｼ・uyer縺ｮ譛譁ｰ迥ｶ諷九°繧会ｼ・    const currentValue = buyer.inquiry_hearing || '';
    
    // 譁ｰ縺励＞繝・く繧ｹ繝医ｒ蜈磯ｭ縺ｫ霑ｽ蜉・域里蟄伜・螳ｹ縺後≠繧句ｴ蜷医・謾ｹ陦後ｒ謖溘・・・    const newValue = currentValue 
      ? `${text}\n${currentValue}` 
      : text;
    
    console.log('[handleInquiryHearingQuickInput] New value to save:', newValue);
    
    // 蜈医↓繝ｭ繝ｼ繧ｫ繝ｫ迥ｶ諷九ｒ譖ｴ譁ｰ縺励※蜊ｳ蠎ｧ縺ｫUI縺ｫ蜿肴丐
    setBuyer(prev => prev ? { ...prev, inquiry_hearing: newValue } : prev);
    // 繧ｭ繝ｼ繧呈峩譁ｰ縺励※InlineEditableField繧貞ｼｷ蛻ｶ蜀阪Ξ繝ｳ繝繝ｪ繝ｳ繧ｰ
    setInquiryHearingKey(prev => prev + 1);
    
    // DB 竊・繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝医↓蜊ｳ蠎ｧ縺ｫ蜷梧悄
    try {
      const result = await buyerApi.update(
        buyer_number!,
        { inquiry_hearing: newValue },
        { sync: true, force: true }  // 繧ｹ繝励Ξ繝・ラ繧ｷ繝ｼ繝亥酔譛溘ｒ譛牙柑蛹・      );
      
      console.log('[handleInquiryHearingQuickInput] Save result:', result);
      
    } catch (error: any) {
      console.error('[handleInquiryHearingQuickInput] Exception:', error);
      // 繧ｨ繝ｩ繝ｼ譎ゅ・蜈・・蛟､縺ｫ謌ｻ縺・      setBuyer(prev => prev ? { ...prev, inquiry_hearing: currentValue } : prev);
      setInquiryHearingKey(prev => prev + 1);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || '菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
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

    // 繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧堤ｽｮ謠幢ｼ・br>繧ｿ繧ｰ繧よ隼陦後↓螟画鋤縺輔ｌ繧具ｼ・    const replacedSubject = replacePlaceholders(template.subject);
    const replacedContent = replacePlaceholders(template.content);

    // 邱ｨ髮・庄閭ｽ繝輔ぅ繝ｼ繝ｫ繝峨ｒ蛻晄悄蛹・    setEditableEmailRecipient(buyer?.email || '');
    setEditableEmailSubject(replacedSubject);
    setEditableEmailBody(replacedContent); // 謾ｹ陦鯉ｼ・n・峨・縺ｾ縺ｾ險ｭ螳・
    // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ
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

    // SMS逕ｨ縺ｫ鄂ｲ蜷阪ｒ邁｡逡･蛹悶＠縺ｦ縺九ｉ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧堤ｽｮ謠・    const simplifiedContent = simplifySmsSignature(template.content);
    const replacedContent = replacePlaceholders(simplifiedContent);

    // 繝｡繝・そ繝ｼ繧ｸ髟ｷ縺ｮ讀懆ｨｼ・域律譛ｬ隱朶MS蛻ｶ髯・ 670譁・ｭ暦ｼ・    const isOverLimit = replacedContent.length > 670;
    
    if (isOverLimit) {
      // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ縺吶ｋ縺後√ム繧､繧｢繝ｭ繧ｰ繧る幕縺・      setSnackbar({
        open: true,
        message: `繝｡繝・そ繝ｼ繧ｸ縺碁聞縺吶℃縺ｾ縺呻ｼ・{replacedContent.length}譁・ｭ・/ 670譁・ｭ怜宛髯撰ｼ峨ょ・螳ｹ繧堤｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲Ａ,
        severity: 'warning',
      });
    }

    // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ・域枚蟄玲焚繧ｪ繝ｼ繝舌・縺ｧ繧り｡ｨ遉ｺ・・    // 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ・域枚蟄玲焚繧ｪ繝ｼ繝舌・縺ｧ繧り｡ｨ遉ｺ・・    setConfirmDialog({
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

        // 繝｡繝ｼ繝ｫ騾∽ｿ｡API蜻ｼ縺ｳ蜃ｺ縺暦ｼ育判蜒乗ｷｻ莉倥ョ繝ｼ繧ｿ繧る∽ｿ｡・・        // 謾ｹ陦悟､画鋤縺ｯ繝舌ャ繧ｯ繧ｨ繝ｳ繝峨〒蜃ｦ逅・        const response = await api.post(`/api/buyers/${buyer_number}/send-email`, {
          to: editableEmailRecipient,
          subject: editableEmailSubject,
          content: editableEmailBody,  // 謾ｹ陦鯉ｼ・n・峨・縺ｾ縺ｾ騾∽ｿ｡
          selectedImages: selectedImages || [], // 逕ｻ蜒乗ｷｻ莉倥ョ繝ｼ繧ｿ繧帝∽ｿ｡
          templateType: template.type, // 繝・Φ繝励Ξ繝ｼ繝育ｨｮ蛻･繧帝∽ｿ｡
        });

        console.log('[handleConfirmSend] Email sent successfully:', response.data);

        setSnackbar({
          open: true,
          message: '繝｡繝ｼ繝ｫ繧帝∽ｿ｡縺励∪縺励◆',
          severity: 'success',
        });

        // 逕ｻ蜒城∈謚槭ｒ繧ｯ繝ｪ繧｢
        setSelectedImages(null);
        setImageError('');

        // 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繧貞・隱ｭ縺ｿ霎ｼ縺ｿ
        fetchActivities();
      } else if (type === 'sms') {
        // SMS騾∽ｿ｡險倬鹸API蜻ｼ縺ｳ蜃ｺ縺・        await api.post(`/api/buyers/${buyer_number}/send-sms`, {
          message: template.content,
          templateType: template.type, // 繝・Φ繝励Ξ繝ｼ繝育ｨｮ蛻･繧帝∽ｿ｡
        });

        setSnackbar({
          open: true,
          message: 'SMS騾∽ｿ｡繧定ｨ倬鹸縺励∪縺励◆',
          severity: 'success',
        });

        // SMS繧｢繝励Μ繧帝幕縺・        if (buyer?.phone_number) {
          const smsLink = `sms:${buyer.phone_number}?body=${encodeURIComponent(template.content)}`;
          window.location.href = smsLink;
        }

        // 繧｢繧ｯ繝・ぅ繝薙ユ繧｣繧貞・隱ｭ縺ｿ霎ｼ縺ｿ
        fetchActivities();
      }
    } catch (error: any) {
      console.error('[handleConfirmSend] Failed to send:', error);
      console.error('[handleConfirmSend] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // 繧医ｊ隧ｳ邏ｰ縺ｪ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || '騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆';
      
      setSnackbar({
        open: true,
        message: `騾∽ｿ｡繧ｨ繝ｩ繝ｼ: ${errorMessage}`,
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

  // 逕ｻ蜒城∈謚槭・繧ｿ繝ｳ縺ｮ繝上Φ繝峨Λ繝ｼ
  const handleOpenImageSelector = () => {
    setImageSelectorOpen(true);
  };

  // 逕ｻ蜒城∈謚樒｢ｺ螳壹・繝上Φ繝峨Λ繝ｼ
  const handleImageSelectionConfirm = (images: any[]) => {
    setSelectedImages(images);
    setImageSelectorOpen(false);
    setImageError('');
  };

  // 逕ｻ蜒城∈謚槭く繝｣繝ｳ繧ｻ繝ｫ縺ｮ繝上Φ繝峨Λ繝ｼ
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
      
      // 蜈ｨ縺ｦ縺ｮ繝・Φ繝励Ξ繝ｼ繝医ｒ繝｡繝ｼ繝ｫ縺ｨSMS荳｡譁ｹ縺ｧ菴ｿ逕ｨ蜿ｯ閭ｽ縺ｫ縺吶ｋ
      // ・医Θ繝ｼ繧ｶ繝ｼ縺後←縺｡繧峨〒繧る∈謚槭〒縺阪ｋ繧医≧縺ｫ・・      setEmailTemplates(templates);
      setSmsTemplates(templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  /**
   * 繝・Φ繝励Ξ繝ｼ繝亥・縺ｮ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧堤ｽｮ謠・   */
  const replacePlaceholders = (template: string): string => {
    if (!buyer) return template;

    let result = template;

    // 雋ｷ荳ｻ諠・ｱ縺ｮ鄂ｮ謠・    result = result.replace(/<<笳乗ｰ丞錐繝ｻ莨夂､ｾ蜷・>/g, buyer.name || '');
    result = result.replace(/<<豌丞錐>>/g, buyer.name || '');
    result = result.replace(/<<笳城崕隧ｱ逡ｪ蜿ｷ>>/g, buyer.phone_number || '');
    result = result.replace(/<<髮ｻ隧ｱ逡ｪ蜿ｷ>>/g, buyer.phone_number || '');
    result = result.replace(/<<笳上Γ繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ>>/g, buyer.email || '');
    result = result.replace(/<<繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ>>/g, buyer.email || '');
    result = result.replace(/<<雋ｷ荳ｻ逡ｪ蜿ｷ>>/g, buyer.buyer_number || '');
    result = result.replace(/<<莨夂､ｾ蜷・>/g, buyer.company_name || '');
    
    // 蝠上＞蜷医ｏ縺帶ュ蝣ｱ
    result = result.replace(/<<迚ｩ莉ｶ逡ｪ蜿ｷ>>/g, buyer.property_number || '');
    result = result.replace(/<<蝠丞粋縺帛・>>/g, buyer.inquiry_source || '');
    result = result.replace(/<<蜿嶺ｻ俶律>>/g, buyer.reception_date ? new Date(buyer.reception_date).toLocaleDateString('ja-JP') : '');
    
    // 蜀・ｦｧ諠・ｱ
    result = result.replace(/<<蜀・ｦｧ譌･>>/g, buyer.latest_viewing_date ? new Date(buyer.latest_viewing_date).toLocaleDateString('ja-JP') : '');
    result = result.replace(/<<蜀・ｦｧ譎る俣>>/g, buyer.viewing_time || '');
    result = result.replace(/<<譎る俣>>/g, buyer.viewing_time || '');
    
    // 迚ｩ莉ｶ諠・ｱ・育ｴ舌▼縺・◆迚ｩ莉ｶ縺九ｉ蜿門ｾ暦ｼ・    if (linkedProperties && linkedProperties.length > 0) {
      const firstProperty = linkedProperties[0];
      result = result.replace(/<<菴丞ｱ・｡ｨ遉ｺ>>/g, firstProperty.display_address || firstProperty.address || '');
      result = result.replace(/<<菴丞ｱ・｡ｨ遉ｺPinrich>>/g, firstProperty.display_address || firstProperty.address || '');
      result = result.replace(/<<蟒ｺ迚ｩ蜷構/萓｡譬ｼ 蜀・ｦｧ迚ｩ莉ｶ縺ｯ襍､陦ｨ遉ｺ・遺・縺ｯ莉也､ｾ迚ｩ莉ｶ・・>/g, firstProperty.property_number || '');
      result = result.replace(/<<athome URL>>/g, firstProperty.suumo_url || '');
      
      // SUUMO URL縺ｮ陦ｨ遉ｺ: URL縺後≠繧句ｴ蜷医・縺ｿ縲郡UUMO: URL縲榊ｽ｢蠑上〒陦ｨ遉ｺ
      const suumoUrlDisplay = firstProperty.suumo_url ? `SUUMO: ${firstProperty.suumo_url}` : '';
      result = result.replace(/<<SUUMO縲URL縺ｮ陦ｨ遉ｺ>>/g, suumoUrlDisplay);
      result = result.replace(/<<SUUMO URL縺ｮ陦ｨ遉ｺ>>/g, suumoUrlDisplay);
      
      result = result.replace(/<<SUUMO URL>>/g, firstProperty.suumo_url || '');
      result = result.replace(/<<GoogleMap>>/g, firstProperty.google_map_url || '');
      result = result.replace(/<<迴ｾ豕」>>/g, ''); // TODO: 迴ｾ豕√ヵ繧｣繝ｼ繝ｫ繝峨ｒ霑ｽ蜉
      result = result.replace(/<<骰ｵ遲益>>/g, ''); // TODO: 骰ｵ遲峨ヵ繧｣繝ｼ繝ｫ繝峨ｒ霑ｽ蜉
      
      // 蜀・ｦｧ蜑堺ｼ晞＃莠矩・ 迚ｩ莉ｶ繝ｪ繧ｹ繝医ユ繝ｼ繝悶Ν縺ｮpre_viewing_notes繝輔ぅ繝ｼ繝ｫ繝峨°繧牙叙蠕・      result = result.replace(/<<蜀・ｦｧ蜑堺ｼ晞＃莠矩・>>/g, (firstProperty as any).pre_viewing_notes || '');
      result = result.replace(/<<蜀・ｦｧ蜑堺ｼ晞＃莠矩・>/g, (firstProperty as any).pre_viewing_notes || '');
    } else {
      // 迚ｩ莉ｶ縺檎ｴ舌▼縺・※縺・↑縺・ｴ蜷医・遨ｺ譁・ｭ・      result = result.replace(/<<蜀・ｦｧ蜑堺ｼ晞＃莠矩・>>/g, '');
      result = result.replace(/<<蜀・ｦｧ蜑堺ｼ晞＃莠矩・>/g, '');
    }
    
    // 繧｢繝ｳ繧ｱ繝ｼ繝・RL・亥崋螳壼､・・    result = result.replace(/<<蜀・ｦｧ繧｢繝ｳ繧ｱ繝ｼ繝・>/g, 'https://forms.gle/xxxxx'); // TODO: 螳滄圀縺ｮURL縺ｫ鄂ｮ縺肴鋤縺・    result = result.replace(/<<荳榊虚逕｣譟ｻ螳壹い繝ｳ繧ｱ繝ｼ繝・>/g, 'https://forms.gle/xxxxx'); // TODO: 螳滄圀縺ｮURL縺ｫ鄂ｮ縺肴鋤縺・    
    // 諡・ｽ楢・ュ蝣ｱ・育樟蝨ｨ繝ｭ繧ｰ繧､繝ｳ荳ｭ縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ・・    const currentUser = employee || {};
    result = result.replace(/<<蠕檎ｶ壽球蠖・>/g, buyer.follow_up_assignee || currentUser.name || '');
    result = result.replace(/<<諡・ｽ楢・錐>>/g, currentUser.name || '');
    result = result.replace(/<<諡・ｽ灘錐・亥霧讌ｭ・牙錐蜑・>/g, currentUser.name || '');
    result = result.replace(/<<諡・ｽ楢・崕隧ｱ逡ｪ蜿ｷ>>/g, currentUser.phoneNumber || '');
    result = result.replace(/<<諡・ｽ灘錐・亥霧讌ｭ・蛾崕隧ｱ逡ｪ蜿ｷ>>/g, currentUser.phoneNumber || '');
    result = result.replace(/<<諡・ｽ楢・Γ繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ>>/g, currentUser.email || '');
    result = result.replace(/<<諡・ｽ灘錐・亥霧讌ｭ・峨Γ繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ>>/g, currentUser.email || '');
    result = result.replace(/<<諡・ｽ灘錐・亥霧讌ｭ・牙崋螳壻ｼ・>/g, '豌ｴ譖懈律'); // TODO: 螳滄圀縺ｮ蝗ｺ螳壻ｼ代ｒ蜿門ｾ・    
    // 莨夂､ｾ諠・ｱ・亥崋螳壼､・・    result = result.replace(/<<莨夂､ｾ蜷・>/g, '譬ｪ蠑丈ｼ夂､ｾ縺・・縺・);
    result = result.replace(/<<菴乗園>>/g, '縲・70-0044 螟ｧ蛻・ｸり・鮓ｴ逕ｺ1荳∫岼3-30');
    result = result.replace(/<<莨夂､ｾ髮ｻ隧ｱ逡ｪ蜿ｷ>>/g, '097-533-2022');
    result = result.replace(/<<莨夂､ｾ繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ>>/g, 'tenant@ifoo-oita.com');

    // <br>繧ｿ繧ｰ繧呈隼陦後↓螟画鋤
    result = result.replace(/<br>/g, '\n');
    result = result.replace(/<br\/>/g, '\n');
    result = result.replace(/<br \/>/g, '\n');

    return result;
  };

  /**
   * SMS逕ｨ縺ｫ鄂ｲ蜷阪ｒ邁｡逡･蛹・   */
  const simplifySmsSignature = (content: string): string => {
    let result = content;

    // 鄂ｲ蜷埼Κ蛻・ｒ邁｡逡･蛹厄ｼ域怙蠕後・鄂ｲ蜷肴ｬ・ｒ莨夂､ｾ蜷阪∽ｽ乗園縲・崕隧ｱ逡ｪ蜿ｷ縲√Γ繧｢繝峨・縺ｿ縺ｫ・・    const signaturePattern = /---+\s*\n([\s\S]*?)$/;
    const match = result.match(signaturePattern);

    if (match) {
      // 鄂ｲ蜷埼Κ蛻・ｒ邁｡逡･蛹・      const simplifiedSignature = `
---
<<莨夂､ｾ蜷・>
<<菴乗園>>
TEL: <<莨夂､ｾ髮ｻ隧ｱ逡ｪ蜿ｷ>>
Email: <<莨夂､ｾ繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ>>`;

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
      
      // Automatically select properties with "current" status (莉雁屓)
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
        ? '雋ｷ荳ｻ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆'
        : error.response?.data?.error || '蝠上＞蜷医ｏ縺帛ｱ･豁ｴ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆';
      
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
        message: '迚ｩ莉ｶ繧帝∈謚槭＠縺ｦ縺上□縺輔＞',
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
          message: '驕ｸ謚槭＆繧後◆迚ｩ莉ｶ縺ｮ諠・ｱ繧貞叙蠕励〒縺阪∪縺帙ｓ縺ｧ縺励◆',
          severity: 'error',
        });
        return;
      }

      // 2.3 & 2.4: Display warning if some properties failed (partial success)
      if (validProperties.length < selectedProperties.length) {
        const failedCount = selectedProperties.length - validProperties.length;
        setSnackbar({
          open: true,
          message: `${failedCount}莉ｶ縺ｮ迚ｩ莉ｶ諠・ｱ繧貞叙蠕励〒縺阪∪縺帙ｓ縺ｧ縺励◆縲ょ叙蠕励〒縺阪◆${validProperties.length}莉ｶ縺ｧ邯夊｡後＠縺ｾ縺吶Ａ,
          severity: 'warning',
        });
      }

      setEmailModalProperties(validProperties);
      setEmailModalOpen(true);
    } catch (error: any) {
      // 2.4: Provide clear user-friendly error messages
      console.error('Failed to fetch property details:', error);
      
      const errorMessage = error.response?.status === 404
        ? '迚ｩ莉ｶ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆'
        : error.response?.data?.error || '迚ｩ莉ｶ諠・ｱ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆';
      
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
      message: '繝｡繝ｼ繝ｫ繧帝∽ｿ｡縺励∪縺励◆',
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
        return `${(num / 10000).toLocaleString()}荳・・`;
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
            辟｡蜉ｹ縺ｪ雋ｷ荳ｻ逡ｪ蜿ｷ縺ｧ縺・          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            雋ｷ荳ｻ逡ｪ蜿ｷ縺ｯ譛牙柑縺ｪ謨ｰ蛟､縲ゞUID縲√∪縺溘・BY_蠖｢蠑上〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・          </Typography>
          <Button 
            variant="contained" 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/buyers')}
          >
            雋ｷ荳ｻ荳隕ｧ縺ｫ謌ｻ繧・          </Button>
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
        <Typography>雋ｷ荳ｻ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/buyers')}>
          荳隕ｧ縺ｫ謌ｻ繧・        </Button>
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
            aria-label="雋ｷ荳ｻ荳隕ｧ縺ｫ謌ｻ繧・
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            {buyer.name ? `${buyer.name}讒倭 : buyer.buyer_number}
          </Typography>
          {/* 雋ｷ荳ｻ逡ｪ蜿ｷ・医け繝ｪ繝・け縺ｧ繧ｳ繝斐・・・*/}
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
                title="繧ｯ繝ｪ繝・け縺ｧ繧ｳ繝斐・"
              />
              {copiedBuyerNumber && (
                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>笨・/Typography>
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

        {/* 繝倥ャ繝繝ｼ蜿ｳ蛛ｴ縺ｮ繝懊ち繝ｳ */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Email騾∽ｿ｡繝峨Ο繝・・繝繧ｦ繝ｳ */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Email騾∽ｿ｡</InputLabel>
            <Select
              value=""
              label="Email騾∽ｿ｡"
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

          {/* SMS騾∽ｿ｡繝峨Ο繝・・繝繧ｦ繝ｳ */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>SMS騾∽ｿ｡</InputLabel>
            <Select
              value=""
              label="SMS騾∽ｿ｡"
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

          {/* 髮ｻ隧ｱ逡ｪ蜿ｷ繝懊ち繝ｳ */}
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

          {/* 蝠上＞蜷医ｏ縺帛ｱ･豁ｴ繝懊ち繝ｳ・亥ｱ･豁ｴ縺後≠繧句ｴ蜷医・縺ｿ陦ｨ遉ｺ・・*/}
          {inquiryHistoryTable.length > 0 && (
            <Button
              variant="outlined"
              size="medium"
              onClick={() => navigate(`/buyers/${buyer_number}/inquiry-history`)}
              sx={{
                whiteSpace: 'nowrap',
              }}
            >
              蝠上＞蜷医ｏ縺帛ｱ･豁ｴ ({inquiryHistoryTable.length})
            </Button>
          )}
          
          {/* 蟶梧悍譚｡莉ｶ繝懊ち繝ｳ */}
          <Button
            variant="outlined"
            size="medium"
            onClick={() => navigate(`/buyers/${buyer_number}/desired-conditions`)}
            sx={{
              whiteSpace: 'nowrap',
            }}
          >
            蟶梧悍譚｡莉ｶ
          </Button>

          {/* 蜀・ｦｧ繝懊ち繝ｳ */}
          <Button
            variant="outlined"
            size="medium"
            onClick={() => navigate(`/buyers/${buyer_number}/viewing-result`)}
            sx={{
              whiteSpace: 'nowrap',
            }}
          >
            蜀・ｦｧ
          </Button>
        </Box>
      </Box>

      {/* 2繧ｫ繝ｩ繝繝ｬ繧､繧｢繧ｦ繝・ 蟾ｦ蛛ｴ縺ｫ邏舌▼縺・◆迚ｩ莉ｶ縺ｮ隧ｳ邏ｰ諠・ｱ縲∝承蛛ｴ縺ｫ雋ｷ荳ｻ諠・ｱ */}
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
        aria-label="雋ｷ荳ｻ隧ｳ邏ｰ諠・ｱ縺ｮ2繧ｫ繝ｩ繝繝ｬ繧､繧｢繧ｦ繝・
      >
        {/* 蟾ｦ蛛ｴ: 邏舌▼縺・◆迚ｩ莉ｶ縺ｮ隧ｳ邏ｰ諠・ｱ - 迢ｬ遶九せ繧ｯ繝ｭ繝ｼ繝ｫ */}
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
            // 繧ｫ繧ｹ繧ｿ繝繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ繝舌・繧ｹ繧ｿ繧､繝ｫ
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
          aria-label="迚ｩ莉ｶ諠・ｱ"
          tabIndex={0}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">迚ｩ莉ｶ諠・ｱ</Typography>
              {linkedProperties.length > 0 && (
                <Chip 
                  label={`${linkedProperties.length}莉ｶ`} 
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
                <Typography variant="body2">邏舌▼縺・◆迚ｩ莉ｶ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</Typography>
              </Paper>
            )}
          </Box>
        </Box>

        {/* 蜿ｳ蛛ｴ: 雋ｷ荳ｻ隧ｳ邏ｰ諠・ｱ - 迢ｬ遶九せ繧ｯ繝ｭ繝ｼ繝ｫ */}
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
            // 繧ｫ繧ｹ繧ｿ繝繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ繝舌・繧ｹ繧ｿ繧､繝ｫ
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
          aria-label="雋ｷ荳ｻ諠・ｱ"
          tabIndex={0}
        >
          {/* 驥崎､・ｱ･豁ｴ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
          {inquiryHistory.length > 1 && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Chip 
                  label={`驥崎､・≠繧・(${inquiryHistory.length}莉ｶ縺ｮ蝠丞粋縺帛ｱ･豁ｴ)`} 
                  color="warning" 
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                縺薙・雋ｷ荳ｻ縺ｯ驕主悉縺ｫ蛻･縺ｮ雋ｷ荳ｻ逡ｪ蜿ｷ縺ｧ蝠上＞蜷医ｏ縺帙ｒ縺励※縺・∪縺・              </Typography>
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
                        雋ｷ荳ｻ逡ｪ蜿ｷ: {history.buyerNumber}
                      </Typography>
                      {history.isCurrent && (
                        <Chip label="迴ｾ蝨ｨ" color="primary" size="small" />
                      )}
                    </Box>
                    <Grid container spacing={1}>
                      {history.propertyNumber && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">迚ｩ莉ｶ逡ｪ蜿ｷ</Typography>
                          <Typography variant="body2">{history.propertyNumber}</Typography>
                        </Grid>
                      )}
                      {history.inquiryDate && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">蝠丞粋縺帶律</Typography>
                          <Typography variant="body2">
                            {formatValue(history.inquiryDate, 'date')}
                          </Typography>
                        </Grid>
                      )}
                      {history.inquirySource && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">蝠丞粋縺帛・</Typography>
                          <Typography variant="body2">{history.inquirySource}</Typography>
                        </Grid>
                      )}
                      {history.status && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">繧ｹ繝・・繧ｿ繧ｹ</Typography>
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
                // 蜀・ｦｧ邨先棡繧ｰ繝ｫ繝ｼ繝励↓縺ｯ迚ｹ蛻･縺ｪ繧ｹ繧ｿ繧､繝ｫ繧帝←逕ｨ
                ...(section.isViewingResultGroup && {
                  bgcolor: 'rgba(33, 150, 243, 0.08)',  // 阮・＞髱定牡縺ｮ閭梧勹
                  border: '1px solid',
                  borderColor: 'rgba(33, 150, 243, 0.3)',
                }),
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{
                  // 蜀・ｦｧ邨先棡繧ｰ繝ｫ繝ｼ繝励・繧ｿ繧､繝医Ν繧貞ｼｷ隱ｿ
                  ...(section.isViewingResultGroup && {
                    color: 'primary.main',
                    fontWeight: 'bold',
                  }),
                }}
              >
                {section.title}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {section.fields.map((field: any) => {
                  const value = buyer[field.key];
                  
                  // 繧ｰ繝ｪ繝・ラ繧ｵ繧､繧ｺ縺ｮ豎ｺ螳・                  // 1. fullWidth繝励Ο繝代ユ繧｣縺荊rue縺ｮ蝣ｴ蜷医・蜈ｨ蟷・                  // 2. column繝励Ο繝代ユ繧｣縺後≠繧句ｴ蜷医・蜊雁ｹ・ｼ亥ｷｦ蜿ｳ縺ｮ蛻暦ｼ・                  // 3. multiline繝輔ぅ繝ｼ繝ｫ繝峨・蜈ｨ蟷・                  // 4. 縺昴ｌ莉･螟悶・蜊雁ｹ・                  const gridSize = field.fullWidth 
                    ? { xs: 12 } 
                    : field.column 
                      ? { xs: 12, sm: 6 } 
                      : field.multiline 
                        ? { xs: 12 } 
                        : { xs: 12, sm: 6 };

                  // 繧､繝ｳ繝ｩ繧､繝ｳ邱ｨ髮・庄閭ｽ縺ｪ繝輔ぅ繝ｼ繝ｫ繝・                  if (field.inlineEditable) {
                    // inquiry_source繝輔ぅ繝ｼ繝ｫ繝峨・迚ｹ蛻･蜃ｦ逅・ｼ医ラ繝ｭ繝・・繝繧ｦ繝ｳ・・                    if (field.key === 'inquiry_source') {
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

                    // latest_status繝輔ぅ繝ｼ繝ｫ繝峨・迚ｹ蛻･蜃ｦ逅・ｼ医ラ繝ｭ繝・・繝繧ｦ繝ｳ・・                    if (field.key === 'latest_status') {
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

                    // inquiry_email_phone繝輔ぅ繝ｼ繝ｫ繝峨・迚ｹ蛻･蜃ｦ逅・ｼ医・繧ｿ繝ｳ蠖｢蠑擾ｼ・                    if (field.key === 'inquiry_email_phone') {
                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

                      // 讓呎ｺ也噪縺ｪ驕ｸ謚櫁い
                      const standardOptions = ['貂・, '譛ｪ', '荳埼・, '驕主悉縺ｮ繧ゅ・'];
                      const isStandardValue = standardOptions.includes(value);

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                            </Typography>
                            {isStandardValue || !value ? (
                              // 讓呎ｺ也噪縺ｪ蛟､縺ｾ縺溘・遨ｺ縺ｮ蝣ｴ蜷医・繝懊ち繝ｳ繧定｡ｨ遉ｺ
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {standardOptions.map((option) => (
                                  <Button
                                    key={option}
                                    variant={value === option ? 'contained' : 'outlined'}
                                    color="primary"
                                    size="small"
                                    onClick={() => {
                                      // 蜷後§繝懊ち繝ｳ繧・蠎ｦ繧ｯ繝ｪ繝・け縺励◆繧牙､繧偵け繝ｪ繧｢
                                      if (value === option) {
                                        handleFieldSave('');
                                      } else {
                                        handleFieldSave(option);
                                      }
                                    }}
                                    sx={{ flex: '1 1 auto', minWidth: '60px' }}
                                  >
                                    {option}
                                  </Button>
                                ))}
                              </Box>
                            ) : (
                              // 諠ｳ螳壼､悶・蛟､縺ｮ蝣ｴ蜷医・繝・く繧ｹ繝医→縺励※陦ｨ遉ｺ
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
                                  onClick={() => handleFieldSave('')}
                                  sx={{ ml: 1 }}
                                >
                                  繧ｯ繝ｪ繧｢
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      );
                    }

                    // three_calls_confirmed繝輔ぅ繝ｼ繝ｫ繝峨・迚ｹ蛻･蜃ｦ逅・ｼ医・繧ｿ繝ｳ蠖｢蠑擾ｼ・                    if (field.key === 'three_calls_confirmed') {
                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
                        }
                      };

                      // 讓呎ｺ也噪縺ｪ驕ｸ謚櫁い
                      const standardOptions = ['3蝗樊楔髮ｻOK', '3蝗樊楔髮ｻ譛ｪ', '莉・];
                      const isStandardValue = standardOptions.includes(value);

                      return (
                        <Grid item {...gridSize} key={field.key}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              {field.label}
                            </Typography>
                            {isStandardValue || !value ? (
                              // 讓呎ｺ也噪縺ｪ蛟､縺ｾ縺溘・遨ｺ縺ｮ蝣ｴ蜷医・繝懊ち繝ｳ繧定｡ｨ遉ｺ
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {standardOptions.map((option) => (
                                  <Button
                                    key={option}
                                    variant={value === option ? 'contained' : 'outlined'}
                                    color="primary"
                                    size="small"
                                    onClick={() => {
                                      // 蜷後§繝懊ち繝ｳ繧・蠎ｦ繧ｯ繝ｪ繝・け縺励◆繧牙､繧偵け繝ｪ繧｢
                                      if (value === option) {
                                        handleFieldSave('');
                                      } else {
                                        handleFieldSave(option);
                                      }
                                    }}
                                    sx={{ flex: '1 1 auto', minWidth: '80px' }}
                                  >
                                    {option}
                                  </Button>
                                ))}
                              </Box>
                            ) : (
                              // 諠ｳ螳壼､悶・蛟､縺ｮ蝣ｴ蜷医・繝・く繧ｹ繝医→縺励※陦ｨ遉ｺ
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
                                  onClick={() => handleFieldSave('')}
                                  sx={{ ml: 1 }}
                                >
                                  繧ｯ繝ｪ繧｢
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      );
                    }

                    // email_type繝輔ぅ繝ｼ繝ｫ繝峨・迚ｹ蛻･蜃ｦ逅・ｼ医ラ繝ｭ繝・・繝繧ｦ繝ｳ・・                    if (field.key === 'email_type') {
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
                            options={EMAIL_TYPE_OPTIONS}
                            onSave={handleFieldSave}
                            buyerId={buyer?.id || buyer_number}
                            enableConflictDetection={true}
                            showEditIndicator={true}
                          />
                        </Grid>
                      );
                    }

                    // distribution_type繝輔ぅ繝ｼ繝ｫ繝峨・迚ｹ蛻･蜃ｦ逅・ｼ医・繧ｿ繝ｳ蠖｢蠑擾ｼ・                    if (field.key === 'distribution_type') {
                      const handleFieldSave = async (newValue: any) => {
                        const result = await handleInlineFieldSave(field.key, newValue);
                        if (result && !result.success && result.error) {
                          throw new Error(result.error);
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
                                variant={value === '隕・ ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={() => {
                                  // 蜷後§繝懊ち繝ｳ繧・蠎ｦ繧ｯ繝ｪ繝・け縺励◆繧牙､繧偵け繝ｪ繧｢
                                  if (value === '隕・) {
                                    handleFieldSave('');
                                  } else {
                                    handleFieldSave('隕・);
                                  }
                                }}
                                sx={{ flex: 1 }}
                              >
                                隕・                              </Button>
                              <Button
                                variant={value === '荳崎ｦ・ ? 'contained' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={() => {
                                  // 蜷後§繝懊ち繝ｳ繧・蠎ｦ繧ｯ繝ｪ繝・け縺励◆繧牙､繧偵け繝ｪ繧｢
                                  if (value === '荳崎ｦ・) {
                                    handleFieldSave('');
                                  } else {
                                    handleFieldSave('荳崎ｦ・);
                                  }
                                }}
                                sx={{ flex: 1 }}
                              >
                                荳崎ｦ・                              </Button>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    }

                    // 縺昴・莉悶・繝輔ぅ繝ｼ繝ｫ繝・                    const handleFieldSave = async (newValue: any) => {
                      const result = await handleInlineFieldSave(field.key, newValue);
                      if (result && !result.success && result.error) {
                        throw new Error(result.error);
                      }
                    };

                    // inquiry_hearing繝輔ぅ繝ｼ繝ｫ繝峨↓縺ｯ蟶ｸ縺ｫ蝗ｲ縺・棧繧定｡ｨ遉ｺ
                    const isInquiryHearing = field.key === 'inquiry_hearing';

                    return (
                      <Grid item {...gridSize} key={field.key}>
                        {/* 蝠丞粋譎ゅヲ繧｢繝ｪ繝ｳ繧ｰ逕ｨ繧ｯ繧､繝・け蜈･蜉帙・繧ｿ繝ｳ */}
                        {isInquiryHearing && (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              繝偵い繝ｪ繝ｳ繧ｰ鬆・岼
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
                          borderPlaceholder={isInquiryHearing ? '繝偵い繝ｪ繝ｳ繧ｰ蜀・ｮｹ繧貞・蜉・..' : undefined}
                          showEditIndicator={!field.readOnly}
                        />
                      </Grid>
                    );
                  }

                  // 繧､繝ｳ繝ｩ繧､繝ｳ邱ｨ髮・ｸ榊庄縺ｮ繝輔ぅ繝ｼ繝ｫ繝会ｼ磯壼ｸｸ陦ｨ遉ｺ・・                  return (
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
                
                {/* 蝠丞粋縺帛・螳ｹ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ縺ｮ蝣ｴ蜷医∵球蠖薙∈縺ｮ遒ｺ隱堺ｺ矩・さ繝ｳ繝昴・繝阪Φ繝医ｒ霑ｽ蜉 */}
                {section.title === '蝠丞粋縺帛・螳ｹ' && linkedProperties.length > 0 && linkedProperties[0].sales_assignee && (
                  <Grid item xs={12}>
                    <ConfirmationToAssignee
                      buyer={buyer}
                      propertyAssignee={linkedProperties[0].sales_assignee}
                      onSendSuccess={() => {
                        setSnackbar({
                          open: true,
                          message: '騾∽ｿ｡縺励∪縺励◆',
                          severity: 'success'
                        });
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Paper>
          ))}

          {/* 繝｡繝ｼ繝ｫ繝ｻSMS騾∽ｿ｡螻･豁ｴ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">繝｡繝ｼ繝ｫ繝ｻSMS騾∽ｿ｡螻･豁ｴ</Typography>
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
                    const displayName = activity.employee ? getDisplayName(activity.employee) : '荳肴・';
                    const actionLabel = activity.action === 'email' ? 'Email' : 'SMS';
                    const templateType = metadata.template_type || '荳肴・';
                    
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
                            騾∽ｿ｡閠・ {displayName} ({metadata.sender_email || metadata.sender || '-'})
                          </Typography>
                        </Box>
                        
                        {propertyNumbers.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                              迚ｩ莉ｶ:
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
                <Typography variant="body2">繝｡繝ｼ繝ｫ繝ｻSMS騾∽ｿ｡螻･豁ｴ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* 髢｢騾｣雋ｷ荳ｻ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
      {buyer?.id && (
        <Box sx={{ mt: 3 }}>
          <RelatedBuyersSection buyerId={buyer.id} />
        </Box>
      )}

      {/* 邨ｱ蜷亥撫蜷医○螻･豁ｴ */}
      {buyer?.id && (
        <Box sx={{ mt: 3 }}>
          <UnifiedInquiryHistoryTable buyerId={buyer.id} />
        </Box>
      )}

      {/* 繧ｹ繝翫ャ繧ｯ繝舌・ */}
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

      {/* 繝｡繝ｼ繝ｫ騾∽ｿ｡繝｢繝ｼ繝繝ｫ */}
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

      {/* 遒ｺ隱阪ム繧､繧｢繝ｭ繧ｰ */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelSend}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog.type === 'email' ? 'Email騾∽ｿ｡遒ｺ隱・ : 'SMS騾∽ｿ｡遒ｺ隱・}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.type === 'email' && confirmDialog.template && (
            <Box>
              <TextField
                fullWidth
                label="螳帛・"
                value={editableEmailRecipient}
                onChange={(e) => setEditableEmailRecipient(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="莉ｶ蜷・
                value={editableEmailSubject}
                onChange={(e) => setEditableEmailSubject(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="譛ｬ譁・
                value={editableEmailBody}
                onChange={(e) => setEditableEmailBody(e.target.value)}
                margin="normal"
                multiline
                rows={20}
                required
              />
              
              {/* 逕ｻ蜒乗ｷｻ莉倥・繧ｿ繝ｳ */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  onClick={handleOpenImageSelector}
                  fullWidth
                >
                  逕ｻ蜒上ｒ豺ｻ莉・                </Button>

                {selectedImages && Array.isArray(selectedImages) && selectedImages.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="success">
                      {selectedImages.length}譫壹・逕ｻ蜒上′驕ｸ謚槭＆繧後∪縺励◆
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
                螳帛・: {buyer?.phone_number}
              </Typography>
              <TextField
                fullWidth
                label="繝｡繝・そ繝ｼ繧ｸ"
                value={confirmDialog.template.content}
                margin="normal"
                multiline
                rows={10}
                InputProps={{
                  readOnly: true,
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                譁・ｭ玲焚: {confirmDialog.template.content.length} / 670
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSend} disabled={sendingTemplate}>
            繧ｭ繝｣繝ｳ繧ｻ繝ｫ
          </Button>
          <Button
            onClick={handleConfirmSend}
            variant="contained"
            color="primary"
            disabled={sendingTemplate}
          >
            {sendingTemplate ? '騾∽ｿ｡荳ｭ...' : '騾∽ｿ｡'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 繧｢繧ｯ繝・ぅ繝薙ユ繧｣隧ｳ邏ｰ繝繧､繧｢繝ｭ繧ｰ */}
      <Dialog
        open={activityDetailOpen}
        onClose={() => setActivityDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedActivity?.action === 'email' ? '繝｡繝ｼ繝ｫ騾∽ｿ｡隧ｳ邏ｰ' : 'SMS騾∽ｿ｡隧ｳ邏ｰ'}
        </DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  遞ｮ蛻･: {selectedActivity.metadata?.template_type || '荳肴・'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  騾∽ｿ｡譌･譎・ {formatDateTime(selectedActivity.created_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  騾∽ｿ｡閠・ {selectedActivity.employee ? getDisplayName(selectedActivity.employee) : '荳肴・'} ({selectedActivity.metadata?.sender_email || selectedActivity.metadata?.sender || '-'})
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {selectedActivity.action === 'email' && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      莉ｶ蜷・                    </Typography>
                    <Typography variant="body1">
                      {selectedActivity.metadata?.subject || '莉ｶ蜷阪↑縺・}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      螳帛・
                    </Typography>
                    <Typography variant="body1">
                      {selectedActivity.metadata?.recipient_email || '-'}
                    </Typography>
                  </Box>
                  
                  {selectedActivity.metadata?.body && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        譛ｬ譁・                      </Typography>
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
                        豺ｻ莉倡判蜒・                      </Typography>
                      <Typography variant="body2">
                        {selectedActivity.metadata.selected_images}譫・                      </Typography>
                    </Box>
                  )}
                </>
              )}
              
              {selectedActivity.action === 'sms' && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      螳帛・
                    </Typography>
                    <Typography variant="body1">
                      {selectedActivity.metadata?.recipient_phone || '-'}
                    </Typography>
                  </Box>
                  
                  {selectedActivity.metadata?.message && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        繝｡繝・そ繝ｼ繧ｸ
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
            髢峨§繧・          </Button>
        </DialogActions>
      </Dialog>

      {/* 逕ｻ蜒城∈謚槭Δ繝ｼ繝繝ｫ */}
      <ImageSelectorModal
        open={imageSelectorOpen}
        onConfirm={handleImageSelectionConfirm}
        onCancel={handleImageSelectionCancel}
      />
    </Container>
  );
}
