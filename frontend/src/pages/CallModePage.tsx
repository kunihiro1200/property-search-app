import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import { ArrowBack, Phone, Save, CalendarToday, Email, Image as ImageIcon } from '@mui/icons-material';
import api, { emailImageApi } from '../services/api';
import { Seller, PropertyInfo, Activity, SellerStatus, ConfidenceLevel, DuplicateMatch, SelectedImages } from '../types';
import { getDisplayName } from '../utils/employeeUtils';
import { formatDateTime } from '../utils/dateFormat';
import CallLogDisplay from '../components/CallLogDisplay';
import { FollowUpLogHistoryTable } from '../components/FollowUpLogHistoryTable';
import DuplicateIndicatorBadge from '../components/DuplicateIndicatorBadge';
import DuplicateDetailsModal from '../components/DuplicateDetailsModal';
import DocumentModal from '../components/DocumentModal';
import ImageSelectorModal from '../components/ImageSelectorModal';
import RichTextEmailEditor from '../components/RichTextEmailEditor';
import { PerformanceMetricsSection } from '../components/PerformanceMetricsSection';
import { useAuthStore } from '../store/authStore';
import {
  generateInitialCancellationGuidance,
  generateCancellationGuidance,
  generateValuationSMS,
  generateVisitReminderSMS,
  generatePostVisitThankYouSMS,
  generateLongTermCustomerSMS,
  generateCallReminderSMS,
  convertLineBreaks,
} from '../utils/smsTemplateGenerators';
import { emailTemplates } from '../utils/emailTemplates';
import SenderAddressSelector from '../components/SenderAddressSelector';
import { getActiveEmployees, Employee } from '../services/employeeService';
import { getSenderAddress, saveSenderAddress } from '../utils/senderAddressStorage';
import { useCallModeQuickButtonState } from '../hooks/useCallModeQuickButtonState';

import { formatCurrentStatusDetailed } from '../utils/propertyStatusFormatter';

/**
 * SMSテンプレート型定義
 */
interface SMSTemplate {
  id: string;
  label: string;
  generator: (seller: Seller, property: PropertyInfo | null, employees?: any[]) => string;
}

const CallModePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee } = useAuthStore();

  // クイックボタン無効化機能の初期化
  const {
    handleQuickButtonClick,
    handleSave: handleQuickButtonSave,
    isButtonDisabled,
    getButtonState,
  } = useCallModeQuickButtonState(id || '');

  // 物件種別を日本語に変換
  const getPropertyTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      // Abbreviated forms (from spreadsheet)
      '戸': '戸建て',
      'マ': 'マンション',
      '土': '土地',
      // English forms (legacy)
      'detached_house': '戸建て',
      'apartment': 'マンション',
      'land': '土地',
      'commercial': '商業用',
      // Full Japanese forms
      '戸建': '戸建て',
      '戸建て': '戸建て',
      'マンション': 'マンション',
      '土地': '土地',
    };
    return labels[type] || type;
  };

  // 状況（売主）を日本語に変換（current_statusフィールド用）
  // データベースには '空き家' と保存されているが、表示は '空（空き家）' とする
  const getSellerSituationLabel = (situation: string): string => {
    return formatCurrentStatusDetailed(situation);
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // データ状態
  const [seller, setSeller] = useState<Seller | null>(null);
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [callSummary, setCallSummary] = useState<string>('');

  // 通話メモ入力状態
  const [callMemo, setCallMemo] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // ステータス更新用の状態
  const [editedStatus, setEditedStatus] = useState<string>('追客中');
  const [editedConfidence, setEditedConfidence] = useState<ConfidenceLevel>(ConfidenceLevel.B);
  const [exclusionDate, setExclusionDate] = useState<string>('');
  const [exclusionAction, setExclusionAction] = useState<string>('');
  const [editedNextCallDate, setEditedNextCallDate] = useState<string>('');
  const [editedExclusiveDecisionDate, setEditedExclusiveDecisionDate] = useState<string>('');
  const [editedCompetitors, setEditedCompetitors] = useState<string[]>([]);
  const [editedExclusiveOtherDecisionFactors, setEditedExclusiveOtherDecisionFactors] = useState<string[]>([]);
  const [editedCompetitorNameAndReason, setEditedCompetitorNameAndReason] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [appointmentSuccessMessage, setAppointmentSuccessMessage] = useState<string | null>(null);
  const [sendingChatNotification, setSendingChatNotification] = useState(false);

  // テンプレート送信中の状態
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // 確認ダイアログ用の状態
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'email' | 'sms' | null;
    template: { id: string; label: string; subject?: string; content: string } | null;
  }>({
    open: false,
    type: null,
    template: null,
  });

  // メール編集用の状態
  const [editableEmailRecipient, setEditableEmailRecipient] = useState<string>('');
  const [editableEmailSubject, setEditableEmailSubject] = useState<string>('');
  const [editableEmailBody, setEditableEmailBody] = useState<string>('');

  // 画像選択モーダル用の状態（Google Drive画像添付用 - 旧機能）
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImages | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // 訪問予約セクションへのスクロール用ref
  const appointmentSectionRef = useRef<HTMLDivElement>(null);

  // 画像ペースト機能はRichTextEmailEditorに統合されました
  // 査定計算セクションへのスクロール用ref
  const valuationSectionRef = useRef<HTMLDivElement>(null);

  // 物件情報編集用の状態
  const [editingProperty, setEditingProperty] = useState(false);
  const [editedPropertyAddress, setEditedPropertyAddress] = useState<string>('');
  const [editedPropertyType, setEditedPropertyType] = useState<string>('');
  const [editedLandArea, setEditedLandArea] = useState<string>('');
  const [editedBuildingArea, setEditedBuildingArea] = useState<string>('');
  const [editedBuildYear, setEditedBuildYear] = useState<string>('');
  const [editedFloorPlan, setEditedFloorPlan] = useState<string>('');
  const [editedStructure, setEditedStructure] = useState<string>('');
  const [editedSellerSituation, setEditedSellerSituation] = useState<string>('');
  const [savingProperty, setSavingProperty] = useState(false);

  // 売主情報編集用の状態
  const [editingSeller, setEditingSeller] = useState(false);
  const [editedName, setEditedName] = useState<string>('');
  const [editedAddress, setEditedAddress] = useState<string>('');
  const [editedPhoneNumber, setEditedPhoneNumber] = useState<string>('');
  const [editedEmail, setEditedEmail] = useState<string>('');
  const [editedInquiryDate, setEditedInquiryDate] = useState<string>('');
  const [savingSeller, setSavingSeller] = useState(false);

  // 重複案件関連の状態
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicatesWithDetails, setDuplicatesWithDetails] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ドキュメントモーダル用の状態
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // 訪問予約編集用の状態
  const [editingAppointment, setEditingAppointment] = useState(false);
  const [editedAppointmentDate, setEditedAppointmentDate] = useState<string>('');
  const [editedAssignedTo, setEditedAssignedTo] = useState<string>('');
  const [editedVisitValuationAcquirer, setEditedVisitValuationAcquirer] = useState<string>(''); // 訪問査定取得者
  const [editedAppointmentNotes, setEditedAppointmentNotes] = useState<string>('');
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  // 訪問統計用の状態
  const [visitStats, setVisitStats] = useState<any>(null);
  const [loadingVisitStats, setLoadingVisitStats] = useState(false);

  // サイト編集用の状態
  const [editingSite, setEditingSite] = useState(false);
  const [editedSite, setEditedSite] = useState<string>('');
  const [savingSite, setSavingSite] = useState(false);

  // 査定計算用の状態
  const [editingValuation, setEditingValuation] = useState(false);
  const [editedFixedAssetTaxRoadPrice, setEditedFixedAssetTaxRoadPrice] = useState<string>('');
  const [valuationAssignee, setValuationAssignee] = useState<string>('');
  const [editedValuationAmount1, setEditedValuationAmount1] = useState<string>('');
  const [editedValuationAmount2, setEditedValuationAmount2] = useState<string>('');
  const [editedValuationAmount3, setEditedValuationAmount3] = useState<string>('');
  const [autoCalculating, setAutoCalculating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const calculationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 送信元アドレス選択用の状態
  const [senderAddress, setSenderAddress] = useState<string>('tenant@ifoo-oita.com');
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);
  
  // 手入力査定額用の状態
  const [editedManualValuationAmount1, setEditedManualValuationAmount1] = useState<string>('');
  const [editedManualValuationAmount2, setEditedManualValuationAmount2] = useState<string>('');
  const [editedManualValuationAmount3, setEditedManualValuationAmount3] = useState<string>('');
  const [isManualValuation, setIsManualValuation] = useState<boolean>(false);
  const [savingManualValuation, setSavingManualValuation] = useState(false);

  // 郵送ステータス用の状態
  const [editedMailingStatus, setEditedMailingStatus] = useState<string>('');
  const [editedMailSentDate, setEditedMailSentDate] = useState<string>('');
  const [savingMailingStatus, setSavingMailingStatus] = useState(false);

  // サイトオプション
  const siteOptions = [
    'ウ',
    'ビ',
    'H',
    'お',
    'Y',
    'す',
    'a',
    'L',
    'エ',
    '近所',
    'チ',
    'P',
    '紹',
    'リ',
    '買',
    'HP',
    '知合',
    'at-homeの掲載を見て',
    '2件目以降査定'
  ];

  // 競合会社リスト
  const competitorCompanies = [
    '別大興産',
    'リライフ',
    'センチュリー21（ハッピーハウス）',
    'センチュリー２１（ベスト不動産）',
    'HouseDo(明野店）',
    'HouseDo下郡',
    '㈱ソーリン不動産',
    'HouseDo（敷戸）',
    'HouseDo(大分南㈱MIC)',
    '令和不動産',
    'Yコーポレーション',
    '林興産',
    'ベツダイ',
    'オリエルホーム',
    '作州不動産',
    '久光',
    '大分玉井不動産',
    '大京穴吹不動産',
    '㈱AIC不動産',
    '榮建',
    'トータルハウジング',
    'サカイ㈱　大分リノベ',
    '三越商事',
    '不明',
  ];

  // 専任・他決要因リスト
  const exclusiveOtherDecisionFactorOptions = [
    '①知り合い',
    '②価格が高い',
    '③決定権者の把握',
    '④連絡不足',
    '⑤購入物件の紹介',
    '⑥購入希望者がいる',
    '⑦以前つきあいがあった不動産',
    '⑧ヒアリング不足',
    '⑨担当者の対応が良い',
    '⑩査定書郵送',
    '⑪１番電話のスピード',
    '⑫対応スピード（訪問１社目もこれに含む）',
    '⑬買取保証',
    '⑭不明',
    '⑮追客電話の対応',
    '⑯説明が丁寧',
    '⑰詳細な調査',
    '⑱不誠実、やるべきことをしない',
    '⑲定期的な追客電話',
    '⑳HPの口コミ',
    '㉑売買に強い（物件数、顧客が多い）',
    '㉒仲介手数料のサービス',
    '㉓仲介手数料以外のサービス（特典）',
    '㉔妥当な査定額',
    '㉕定期的なメール配信（Pinrich)',
    '㉖提案力',
    '㉗熱意',
  ];

  // SMSテンプレート定義（新しい7つのテンプレート）
  const smsTemplates: SMSTemplate[] = [
    {
      id: 'initial_cancellation',
      label: '初回不通時キャンセル案内',
      generator: generateInitialCancellationGuidance,
    },
    {
      id: 'cancellation',
      label: 'キャンセル案内',
      generator: generateCancellationGuidance,
    },
    {
      id: 'valuation',
      label: '査定Sメール',
      generator: generateValuationSMS,
    },
    {
      id: 'visit_reminder',
      label: '訪問事前通知メール',
      generator: generateVisitReminderSMS,
    },
    {
      id: 'post_visit_thank_you',
      label: '訪問後御礼メール',
      generator: generatePostVisitThankYouSMS,
    },
    {
      id: 'long_term_customer',
      label: '除外前・長期客Sメール',
      generator: generateLongTermCustomerSMS,
    },
    {
      id: 'call_reminder',
      label: '当社が電話したというリマインドメール',
      generator: generateCallReminderSMS,
    },
  ];

  // Emailテンプレート定義（25種類の新しいテンプレート）
  // テンプレートは frontend/src/utils/emailTemplates.ts からインポート

  /**
   * 動的にソートされたEmailテンプレートを取得する関数
   * 条件に応じて特定のテンプレートを上位に表示
   */
  const getSortedEmailTemplates = useCallback(() => {
    if (!seller) return emailTemplates;

    console.log('=== getSortedEmailTemplates 実行 ===');
    console.log('seller.appointmentDate:', seller.appointmentDate);
    console.log('seller.status:', seller.status);

    const templates = [...emailTemplates];
    const priorityTemplates: typeof emailTemplates = [];
    const remainingTemplates: typeof emailTemplates = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻をリセットして日付のみで比較
    
    // 明日と明後日の日付を計算
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    // 条件1: 訪問日（appointmentDate）から3日間（訪問日当日～3日後）の場合、「訪問査定後御礼メール」を最上位に
    const visitDate = seller.appointmentDate ? new Date(seller.appointmentDate) : null;
    
    let isVisitWithinThreeDays = false;
    let isVisitTomorrowOrDayAfter = false;
    
    if (visitDate) {
      const visitDateOnly = new Date(visitDate);
      visitDateOnly.setHours(0, 0, 0, 0); // 時刻をリセット
      
      const threeDaysAfterVisit = new Date(visitDateOnly);
      threeDaysAfterVisit.setDate(visitDateOnly.getDate() + 3); // 訪問日から3日後
      
      isVisitWithinThreeDays = today >= visitDateOnly && today <= threeDaysAfterVisit;
      isVisitTomorrowOrDayAfter = 
        visitDateOnly.getTime() === tomorrow.getTime() || 
        visitDateOnly.getTime() === dayAfterTomorrow.getTime();
      
      console.log('=== 訪問日チェック ===');
      console.log('今日:', today.toISOString());
      console.log('明日:', tomorrow.toISOString());
      console.log('明後日:', dayAfterTomorrow.toISOString());
      console.log('訪問日:', visitDateOnly.toISOString());
      console.log('3日後:', threeDaysAfterVisit.toISOString());
      console.log('訪問日から3日以内:', isVisitWithinThreeDays);
      console.log('訪問日が明日または明後日:', isVisitTomorrowOrDayAfter);
    } else {
      console.log('訪問日が設定されていません');
    }

    // 条件2: ステータスに「他決」が含まれる場合、他決追客テンプレートを最上位に
    const hasOtherDecision = seller?.status?.includes('他決') || false;

    // 優先順位に基づいてテンプレートを分類
    templates.forEach(template => {
      // 最優先: 訪問日が明日または明後日の場合、訪問前日通知メールを最上位に
      if (isVisitTomorrowOrDayAfter && template.id === 'visit_reminder') {
        priorityTemplates.push(template);
      }
      // 優先2: 訪問日から3日以内の場合、訪問査定後御礼メールを最上位に
      else if (isVisitWithinThreeDays && template.id === 'visit_thank_you') {
        priorityTemplates.push(template);
      }
      // 優先3: ステータスに「他決」が含まれる場合、他決追客テンプレートを最上位に
      else if (hasOtherDecision && (template.id === 'other_decision_3month' || template.id === 'other_decision_6month')) {
        priorityTemplates.push(template);
      } else {
        remainingTemplates.push(template);
      }
    });

    // 優先テンプレートをorderでソート
    priorityTemplates.sort((a, b) => a.order - b.order);
    
    // 残りのテンプレートをorderでソート
    remainingTemplates.sort((a, b) => a.order - b.order);

    // 優先テンプレート + 残りのテンプレート
    return [...priorityTemplates, ...remainingTemplates];
  }, [seller]);

  /**
   * テキスト内のURLをクリック可能なリンクに変換する関数
   */
  const renderTextWithLinks = (text: string) => {
    // URLパターンにマッチする正規表現
    const urlPattern = /(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|chrome-extension:\/\/[^\s]+)/g;
    const parts = text.split(urlPattern);
    
    return parts.map((part, index) => {
      // URLパターンにマッチする場合はリンクとして表示
      if (part.match(urlPattern)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'underline' }}
          >
            {part}
          </a>
        );
      }
      // 通常のテキストはそのまま表示
      return part;
    });
  };

  /**
   * 除外サイトURLを計算する関数
   * ロジック: IF([サイトURL] <> "",[サイトURL],IF([サイト] = "ウ","https://partner.ieul.jp/",IF([サイト] = "H","https://www.home4u.jp/member/sell/company/menu",IF([サイト] = "す","https://docs.google.com/forms/d/e/1FAIpQLSdXeFMcXhuANI78ARzN5WCbl8JMsdcUIP-J52lv5ShMOQeu5g/viewform",IF([サイト] = "L","https://lifull.secure.force.com/inquiryform/baikyakushinsei",IF([サイト] = "Y","https://login.bizmanager.yahoo.co.jp/loginMenu",""))))))
   */
  const getExclusionSiteUrl = useCallback(() => {
    if (!seller) return '';
    
    // サイトURLが設定されている場合はそれを返す
    if (seller.siteUrl && seller.siteUrl.trim() !== '') {
      return seller.siteUrl;
    }
    
    // サイトに応じてURLを返す
    const site = seller.site || editedSite;
    switch (site) {
      case 'ウ':
        return 'https://partner.ieul.jp/';
      case 'H':
        return 'https://www.home4u.jp/member/sell/company/menu';
      case 'す':
        return 'https://docs.google.com/forms/d/e/1FAIpQLSdXeFMcXhuANI78ARzN5WCbl8JMsdcUIP-J52lv5ShMOQeu5g/viewform';
      case 'L':
        return 'https://lifull.secure.force.com/inquiryform/baikyakushinsei';
      case 'Y':
        return 'https://login.bizmanager.yahoo.co.jp/loginMenu';
      default:
        return '';
    }
  }, [seller, editedSite]);

  /**
   * 除外基準を取得する関数
   */
  const getExclusionCriteria = useCallback(() => {
    if (!seller) return '除外できません';
    
    const site = seller.site || editedSite;
    switch (site) {
      case 'ウ':
        return '反響から1週間後に申請処理する\n１．査定に必要な不動産情報及び電話番号に虚偽の記載がある場合\n２．イエウールの査定依頼よりも前に他社で専属専任媒介契約を結んでいる場合（要証拠）\n３．市街化調整区域で建物の建築が不可\n４．二等親以内の親族と法的な代理人を除く第３者からの依頼\n５．電話、メールとも、依頼日より１週間以上連絡がつかない場合\n６．他社査定サイトと情報が重複し、かつイエウールが劣後だった場合（要証拠）\n７．過去３ヶ月以内にイエウールを含む各経路から入手した査定情報と内容が重複している場合（要証拠）';
      case 'H':
        return '【売買不可な物件】市街化調整区域、再建築不可、農地法上の第1種農地、差押物件、土砂災害警戒区域\n【物件の特定不可】所在地不明や場所が特定できない\n【連絡先登録情報の不備】電話やメアドが違う（虚偽）\n【なりすまし】利用者に電話したが他人とつながる\n【過去のHOME4Uの反響】過去６ヶ月以内に、同一人物による同一物件の反響が重複している\n【他社で専任】他社が過去２ヶ月以内に専属、専任契約をしている\n【企業、団体からの売却ニーズではなく価格調査の依頼】\n＊注意！！　　下記は課金対象（除外できません！！）\n①連絡がとれない反響メール、電話で連絡するも繋がらない\n②売却意思のない反響ユーザーからのキャンセル依頼';
      case 'Y':
        return '査定依頼日より6日後まで除外申請期間（9/1に反響あった場合9/7まで除外期間）\n*電話が繋がらない場合は番号２を選択してください\n（1）査定対象の不動産に関する情報が正確でなかったこと、またはその内容の不備に起因して査定が行えない場合\n（2）査定依頼をしたユーザー情報の連絡先が正確でなかったこと、またはその内容の不備に起因して査定が行えない場合\n（3）査定対象の不動産についてすでに専属専任媒介契約が締結されている場合\n（4）不動産の所有者以外の者からの査定依頼の場合（代理権を有する代理人や二親等以内の親族からの査定依頼は除く）\n（5）不動産会社、弁護士事務所、探偵業者その他の企業、事業者等による調査目的の場合\n（6）査定依頼の日を含め3日以内にクライアントに対し査定依頼のキャンセルがあった場合\n（7）査定依頼の日から起算して過去3ヶ月以内に同一人物による同一不動産に対する査定依頼がなされている場合\n（8）差押または処分禁止の仮処分の対象である等法令上不動産の処分が禁止されている場合、または、法令上建物の建築が制限されている不動産の場合\n（9）その他、クライアントからの申請を受けて、当社が正当と判断した場合';
      case 'L':
        return '【受付期間】240時間以内（10日以内）\n【ユーザーキャンセル】問合せユーザーよりキャンセル意思のある場合、査定依頼より24時間以内\n【他社サイト重複】当サイトが後での取得でかつ、そのタイミングの差異が31日以内\n【他社媒介契約済み】他社で媒介契約した日から2ヶ月以内（一般媒介除く）\n【建築基準】再建築不可の物件場合';
      case 'す':
        return '1 査定に必要な不動産情報、電話番号に虚偽の情報がある場合（2025年7月29日より、ユーザーからのキャンセルの場合もこちらで除外可能になりました。除外理由は「１」で理由はユーザーよりキャンセルと入力してください）\n2 すまいステップよりも前に他社で専属専任媒介を締結している（証拠確認が必要です）\n3 市街化調整区域で建築不可（事実確認を要します）\n4 二親等以内の親族と法的な代理人を除く第三者からの依頼\n5 電話、メールともに依頼より一週間以上連絡とれない\n6 過去三ヶ月以内に他サイトから入手した査定情報が重複し、なおかつすまいステップからが劣後であった場合（確認できるものを要します）\n7 過去三ヶ月以内にすまいステップから入手した査定情報と内容が重複していた場合（確認できるものを要します）';
      case 'a':
        return '*除外申請するサイトは、atbb→売却査定受付サービス→コントロールパネル→右上の「反響課金除外申請申込みはこちら」より\n1  査定依頼者の全ての情報が無効　（連絡がつながらないというだけでは除外不可）\n2 　不動産売却と関係のない問合せ\n3 　売却権限のない人からの問合せ\n4  　いたずら、なりすまし\n5  　上記以外も様々なケースがありますので都度おといあわせください';
      default:
        return '除外できません';
    }
  }, [seller, editedSite]);

  useEffect(() => {
    loadAllData();
  }, [id]);

  // 社員データと送信元アドレスを初期化
  useEffect(() => {
    const initializeSenderAddress = async () => {
      try {
        // 社員データを取得
        const employeeData = await getActiveEmployees();
        setActiveEmployees(employeeData);
        
        // セッションストレージから送信元アドレスを復元
        const savedAddress = getSenderAddress();
        
        // 有効なメールアドレスのリストを作成
        const validEmails = [
          'tenant@ifoo-oita.com',
          ...employeeData.filter(emp => emp.email).map(emp => emp.email)
        ];
        
        // 保存されたアドレスが有効かどうかを検証
        const { validateSenderAddress } = await import('../utils/senderAddressStorage');
        const validatedAddress = validateSenderAddress(savedAddress, validEmails);
        
        console.log('=== Sender Address Validation ===');
        console.log('Saved address:', savedAddress);
        console.log('Valid emails:', validEmails);
        console.log('Validated address:', validatedAddress);
        console.log('Was reset:', validatedAddress !== savedAddress);
        
        // 検証済みのアドレスを設定
        setSenderAddress(validatedAddress);
        
        // 無効なアドレスだった場合は、デフォルトアドレスを保存
        if (validatedAddress !== savedAddress) {
          saveSenderAddress(validatedAddress);
          console.log('✅ Reset sender address to default:', validatedAddress);
        }
      } catch (error) {
        console.error('Failed to initialize sender address:', error);
      }
    };
    
    initializeSenderAddress();
  }, []);

  // 訪問統計をロード（visitDateまたはappointmentDateがある場合）
  useEffect(() => {
    const visitDateValue = (seller as any)?.visitDate || seller?.appointmentDate;
    if (visitDateValue) {
      loadVisitStats();
    }
  }, [(seller as any)?.visitDate, seller?.appointmentDate]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S で保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (callMemo.trim() && !saving) {
          handleSaveAndExit();
        }
      }
      // Esc で戻る
      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callMemo, saving]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('=== loadAllData開始 ===');
      console.log('売主ID:', id);
      
      // キャッシュをクリアして最新データを取得
      try {
        await api.delete(`/cache/seller/${id}`);
        console.log('✅ キャッシュをクリアしました');
      } catch (cacheError) {
        console.log('⚠️ キャッシュクリアに失敗（続行）:', cacheError);
      }
      
      // 並列で全データを取得（AI要約以外）
      const [sellerResponse, activitiesResponse, employeesResponse] = await Promise.all([
        api.get(`/api/sellers/${id}`),
        api.get(`/api/sellers/${id}/activities`),
        api.get('/employees'),
      ]);

      console.log('=== APIレスポンス ===');
      console.log('sellerResponse.data:', JSON.stringify(sellerResponse.data, null, 2));
      console.log('activitiesResponse:', activitiesResponse.data);
      console.log('employeesResponse:', employeesResponse.data);

      // スタッフ一覧を設定
      setEmployees(employeesResponse.data);

      // 売主情報を設定
      const sellerData = sellerResponse.data;
      console.log('=== sellerData詳細 ===');
      console.log('sellerData:', sellerData);
      console.log('sellerData.property:', sellerData.property);
      console.log('typeof sellerData.property:', typeof sellerData.property);
      console.log('sellerData.property === null:', sellerData.property === null);
      console.log('sellerData.property === undefined:', sellerData.property === undefined);
      
      // 売主データが存在することを確認
      if (!sellerData || !sellerData.id) {
        throw new Error('売主データが取得できませんでした');
      }
      
      setSeller(sellerData);
      
      // 物件データを設定（sellerDataに含まれていない場合は別途取得）
      let propertyData = sellerData.property || null;
      
      if (!propertyData) {
        console.log('⚠️ 売主レスポンスに物件データが含まれていません。別途取得を試みます...');
        try {
          const propertyResponse = await api.get(`/properties/seller/${id}`);
          if (propertyResponse.data && propertyResponse.data.property) {
            propertyData = propertyResponse.data.property;
            console.log('✅ 物件データを別途取得しました:', propertyData);
          } else {
            console.log('⚠️ 物件データが見つかりませんでした');
          }
        } catch (propError) {
          console.error('❌ 物件データの取得に失敗:', propError);
        }
      }
      
      setProperty(propertyData);
      
      console.log('=== 状態設定後 ===');
      console.log('seller設定:', sellerData);
      console.log('property設定:', propertyData);
      console.log('propertyがnullまたはundefined:', !propertyData);
      setEditedStatus(sellerData.status);
      setEditedConfidence(sellerData.confidence || ConfidenceLevel.B);
      
      // 除外日を設定（YYYY-MM-DD形式に変換）
      if (sellerData.exclusionDate) {
        const exclusionDateObj = new Date(sellerData.exclusionDate);
        const formattedExclusionDate = exclusionDateObj.toISOString().split('T')[0];
        setExclusionDate(formattedExclusionDate);
      } else {
        setExclusionDate('');
      }
      
      // 除外アクションを設定
      setExclusionAction(sellerData.exclusionAction || '');
      
      setEditedNextCallDate(sellerData.nextCallDate || '');
      
      // 専任（他決）決定日を設定
      if (sellerData.contractYearMonth) {
        const decisionDateObj = new Date(sellerData.contractYearMonth);
        const formattedDecisionDate = decisionDateObj.toISOString().split('T')[0];
        setEditedExclusiveDecisionDate(formattedDecisionDate);
      } else {
        setEditedExclusiveDecisionDate('');
      }
      
      // 競合を設定（カンマ区切り文字列を配列に変換）
      if (sellerData.competitorName) {
        const competitorsArray = sellerData.competitorName.split(',').map((c: string) => c.trim()).filter((c: string) => c);
        setEditedCompetitors(competitorsArray);
      } else {
        setEditedCompetitors([]);
      }
      
      setEditedExclusiveOtherDecisionFactors(sellerData.exclusiveOtherDecisionFactors || []);
      
      // 競合名、理由を設定
      setEditedCompetitorNameAndReason(sellerData.competitorNameAndReason || '');

      // 売主情報の初期化
      setEditedName(sellerData.name || '');
      setEditedAddress(sellerData.address || '');
      setEditedPhoneNumber(sellerData.phoneNumber || '');
      setEditedEmail(sellerData.email || '');
      
      // 反響日付とサイトの初期化
      if (sellerData.inquiryDate) {
        const inquiryDateObj = new Date(sellerData.inquiryDate);
        const formattedInquiryDate = inquiryDateObj.toISOString().split('T')[0];
        setEditedInquiryDate(formattedInquiryDate);
      } else {
        setEditedInquiryDate('');
      }
      setEditedSite(sellerData.site || '');

      // 物件情報の初期化
      if (propertyData) {
        setEditedPropertyAddress(propertyData.address || '');
        setEditedPropertyType(propertyData.propertyType || '');
        setEditedLandArea(propertyData.landArea?.toString() || '');
        setEditedBuildingArea(propertyData.buildingArea?.toString() || '');
        setEditedBuildYear(propertyData.buildYear?.toString() || '');
        setEditedFloorPlan(propertyData.floorPlan || '');
        setEditedStructure(propertyData.structure || '');
        setEditedSellerSituation(propertyData.sellerSituation || '');
      }

      // 訪問予約情報の初期化
      // ISO形式の日時をdatetime-local形式に変換 (YYYY-MM-DDTHH:mm)
      const appointmentDateLocal = sellerData.appointmentDate 
        ? new Date(sellerData.appointmentDate).toISOString().slice(0, 16)
        : '';
      setEditedAppointmentDate(appointmentDateLocal);
      setEditedAssignedTo(sellerData.assignedTo || '');
      setEditedVisitValuationAcquirer(sellerData.visitValuationAcquirer || '');
      setEditedAppointmentNotes(sellerData.appointmentNotes || '');

      // 査定情報の初期化
      console.log('=== 査定情報デバッグ ===');
      console.log('valuationAmount1:', sellerData.valuationAmount1);
      console.log('valuationAmount2:', sellerData.valuationAmount2);
      console.log('valuationAmount3:', sellerData.valuationAmount3);
      console.log('fixedAssetTaxRoadPrice:', sellerData.fixedAssetTaxRoadPrice);
      console.log('valuationAssignee:', sellerData.valuationAssignee);
      
      setEditedFixedAssetTaxRoadPrice(sellerData.fixedAssetTaxRoadPrice?.toString() || '');
      setEditedValuationAmount1(sellerData.valuationAmount1?.toString() || '');
      setEditedValuationAmount2(sellerData.valuationAmount2?.toString() || '');
      setEditedValuationAmount3(sellerData.valuationAmount3?.toString() || '');
      setValuationAssignee(sellerData.valuationAssignee || '');
      
      // 手入力査定額の初期化
      // valuationAmount1が存在し、fixedAssetTaxRoadPriceが存在しない場合は手入力とみなす
      const hasValuation = sellerData.valuationAmount1;
      const hasRoadPrice = sellerData.fixedAssetTaxRoadPrice;
      
      console.log('hasValuation:', hasValuation);
      console.log('hasRoadPrice:', hasRoadPrice);
      console.log('判定結果 - 手入力:', hasValuation && !hasRoadPrice);
      
      if (hasValuation && !hasRoadPrice) {
        setIsManualValuation(true);
        // 円を万円に変換して表示
        setEditedManualValuationAmount1(sellerData.valuationAmount1 ? (sellerData.valuationAmount1 / 10000).toString() : '');
        setEditedManualValuationAmount2(sellerData.valuationAmount2 ? (sellerData.valuationAmount2 / 10000).toString() : '');
        setEditedManualValuationAmount3(sellerData.valuationAmount3 ? (sellerData.valuationAmount3 / 10000).toString() : '');
        console.log('手入力モードに設定');
      } else {
        // 自動計算の場合はフラグをfalseに
        setIsManualValuation(false);
        setEditedManualValuationAmount1('');
        setEditedManualValuationAmount2('');
        setEditedManualValuationAmount3('');
        console.log('自動計算モードに設定');
      }

      // 郵送ステータスの初期化
      setEditedMailingStatus(sellerData.mailingStatus || '');
      if (sellerData.mailSentDate) {
        const mailSentDateObj = new Date(sellerData.mailSentDate);
        const formattedMailSentDate = mailSentDateObj.toISOString().split('T')[0];
        setEditedMailSentDate(formattedMailSentDate);
      } else {
        setEditedMailSentDate('');
      }

      // 活動履歴を設定
      const convertedActivities = activitiesResponse.data.map((activity: any) => ({
        id: activity.id,
        sellerId: activity.seller_id || activity.sellerId,
        employeeId: activity.employee_id || activity.employeeId,
        type: activity.type,
        content: activity.content,
        result: activity.result,
        metadata: activity.metadata,
        createdAt: activity.created_at || activity.createdAt,
        employee: activity.employee,
      }));
      setActivities(convertedActivities);

      // ローディング終了（画面を表示）
      setLoading(false);

      // AI要約を非同期で取得（画面表示後にバックグラウンドで実行）
      // 通話履歴とスプレッドシートコメントの両方を含めて要約
      const phoneCalls = convertedActivities.filter((a: Activity) => a.type === 'phone_call');
      const memosToSummarize: string[] = [];
      
      // 通話履歴を追加
      if (phoneCalls.length > 0) {
        phoneCalls.forEach((call: Activity) => {
          memosToSummarize.push(call.content);
        });
      }
      
      // 要約するコンテンツがあれば要約を生成
      if (memosToSummarize.length > 0) {
        api.post('/summarize/call-memos', { memos: memosToSummarize })
          .then((summaryResponse) => {
            setCallSummary(summaryResponse.data.summary);
          })
          .catch((err) => {
            console.error('Failed to generate summary:', err);
          });
      }

      // 重複検出を非同期で実行（画面表示後にバックグラウンドで実行）
      loadDuplicates();
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('データの取得に失敗しました');
      setLoading(false);
    }
  };

  // 重複案件を取得する関数
  const loadDuplicates = async () => {
    if (!id) return;
    
    // セッションキャッシュをチェック
    const cacheKey = `duplicates_${id}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setDuplicates(parsed);
        console.log('Loaded duplicates from cache');
        return;
      } catch (e) {
        console.error('Failed to parse cached duplicates:', e);
      }
    }
    
    try {
      setDuplicatesLoading(true);
      const response = await api.get(`/api/sellers/${id}/duplicates`, {
        timeout: 10000, // 10秒のタイムアウト
      });
      const duplicatesData = response.data.duplicates || [];
      setDuplicates(duplicatesData);
      
      // セッションキャッシュに保存
      sessionStorage.setItem(cacheKey, JSON.stringify(duplicatesData));
    } catch (error) {
      console.error('Failed to load duplicates:', error);
      // エラーは無視（重複検出は非クリティカルな機能）
      setDuplicates([]);
    } finally {
      setDuplicatesLoading(false);
    }
  };

  // 重複モーダルを開く処理
  const handleOpenDuplicateModal = async () => {
    setDuplicateModalOpen(true);
    
    if (duplicates.length === 0) return;
    
    // セッションキャッシュをチェック
    const detailsCacheKey = `duplicate_details_${id}`;
    const cachedDetails = sessionStorage.getItem(detailsCacheKey);
    
    if (cachedDetails) {
      try {
        const parsed = JSON.parse(cachedDetails);
        setDuplicatesWithDetails(parsed);
        console.log('Loaded duplicate details from cache');
        return;
      } catch (e) {
        console.error('Failed to parse cached details:', e);
      }
    }
    
    try {
      setDetailsLoading(true);
      setDetailsError(null);
      
      // 各重複案件の詳細情報を並列で取得
      const detailsPromises = duplicates.map(async (duplicate: DuplicateMatch) => {
        try {
          // 売主情報とアクティビティを並列で取得（10秒タイムアウト）
          const [sellerResponse, activitiesResponse] = await Promise.all([
            api.get(`/api/sellers/${duplicate.sellerId}`, { timeout: 10000 }),
            api.get(`/api/sellers/${duplicate.sellerId}/activities`, { timeout: 10000 }).catch(() => ({ data: [] })),
          ]);
          
          return {
            ...duplicate,
            activities: activitiesResponse.data || [],
          };
        } catch (error) {
          console.error(`Failed to load details for seller ${duplicate.sellerId}:`, error);
          // エラーが発生しても部分的なデータを返す
          return {
            ...duplicate,
            activities: [],
          };
        }
      });
      
      const details = await Promise.all(detailsPromises);
      setDuplicatesWithDetails(details);
      
      // セッションキャッシュに保存
      sessionStorage.setItem(detailsCacheKey, JSON.stringify(details));
    } catch (error) {
      console.error('Failed to load duplicate details:', error);
      setDetailsError('詳細情報の取得に失敗しました');
    } finally {
      setDetailsLoading(false);
    }
  };

  // 重複モーダルを閉じる処理
  const handleCloseDuplicateModal = () => {
    setDuplicateModalOpen(false);
  };

  const handleBack = () => {
    // 未保存のデータがある場合は確認ダイアログを表示
    if (callMemo.trim()) {
      if (window.confirm('入力中の通話メモがあります。保存せずに戻りますか？')) {
        navigate(`/sellers/${id}`);
      }
    } else {
      navigate(`/sellers/${id}`);
    }
  };

  const handleSaveAndExit = async () => {
    if (!callMemo.trim()) {
      setError('通話メモを入力してください');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await api.post(`/api/sellers/${id}/activities`, {
        type: 'phone_call',
        content: callMemo,
        result: 'completed',
      });

      // クイックボタンの状態を永続化（pending → persisted）
      handleQuickButtonSave();

      // 保存成功メッセージを表示（メモ欄はクリアしない）
      setSuccessMessage('通話メモを保存しました');
      
      // データを再読み込み
      await loadAllData();
      
      // 成功メッセージを3秒後に消す
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '通話メモの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 訪問統計を取得
  const loadVisitStats = async () => {
    // visitDateまたはappointmentDateを使用
    const visitDateValue = (seller as any)?.visitDate || seller?.appointmentDate;
    if (!visitDateValue) {
      console.log('No visit date, skipping visit stats');
      return;
    }
    
    try {
      setLoadingVisitStats(true);
      
      // 訪問日から月を取得
      const visitDate = new Date(visitDateValue);
      const month = visitDate.toISOString().slice(0, 7); // YYYY-MM形式
      
      console.log('Loading visit stats for month:', month);
      const response = await api.get(`/api/sellers/visit-stats?month=${month}`);
      console.log('Visit stats loaded:', response.data);
      setVisitStats(response.data);
    } catch (err: any) {
      console.error('Failed to load visit stats:', err);
      console.error('Error details:', err.response?.data);
    } finally {
      setLoadingVisitStats(false);
    }
  };

  const handleUpdateStatus = async () => {
    // バリデーション：専任または他決が含まれる場合は決定日、競合、専任・他決要因が必須
    if (requiresDecisionDate(editedStatus)) {
      if (!editedExclusiveDecisionDate) {
        setError('専任（他決）決定日を入力してください');
        return;
      }
      if (editedCompetitors.length === 0) {
        setError('競合を選択してください');
        return;
      }
      if (editedExclusiveOtherDecisionFactors.length === 0) {
        setError('専任・他決要因を選択してください');
        return;
      }
    }

    try {
      setSavingStatus(true);
      setError(null);
      setSuccessMessage(null);

      await api.put(`/api/sellers/${id}`, {
        status: editedStatus,
        confidence: editedConfidence,
        nextCallDate: editedNextCallDate || null,
        exclusiveDecisionDate: editedExclusiveDecisionDate || null,
        competitors: editedCompetitors.length > 0 ? editedCompetitors.join(', ') : null,
        exclusiveOtherDecisionFactors: editedExclusiveOtherDecisionFactors.length > 0 ? editedExclusiveOtherDecisionFactors : null,
        competitorNameAndReason: editedCompetitorNameAndReason || null,
        exclusionAction: exclusionAction || null,
      });

      setSuccessMessage('ステータスを更新しました');
      
      // 売主情報を再読み込み
      await loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'ステータスの更新に失敗しました');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveProperty = async () => {
    if (!property) return;
    
    try {
      setSavingProperty(true);
      setError(null);
      setSuccessMessage(null);

      await api.put(`/properties/${property.id}`, {
        address: editedPropertyAddress,
        propertyType: editedPropertyType || null,
        landArea: editedLandArea ? parseFloat(editedLandArea) : null,
        buildingArea: editedBuildingArea ? parseFloat(editedBuildingArea) : null,
        buildYear: editedBuildYear ? parseInt(editedBuildYear, 10) : null,
        floorPlan: editedFloorPlan || null,
        structure: editedStructure || null,
        sellerSituation: editedSellerSituation || null,
      });

      setSuccessMessage('物件情報を更新しました');
      setEditingProperty(false);
      
      // データを再読み込み
      await loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '物件情報の更新に失敗しました');
    } finally {
      setSavingProperty(false);
    }
  };

  const handleSaveSeller = async () => {
    if (!seller) return;
    
    // バリデーション
    if (!editedName.trim()) {
      setError('氏名は必須です');
      return;
    }
    if (!editedPhoneNumber.trim()) {
      setError('電話番号は必須です');
      return;
    }
    
    try {
      setSavingSeller(true);
      setError(null);
      setSuccessMessage(null);

      await api.put(`/api/sellers/${seller.id}`, {
        name: editedName,
        address: editedAddress || null,
        phoneNumber: editedPhoneNumber,
        email: editedEmail || null,
        inquiryDate: editedInquiryDate || null,
        site: editedSite || null,
      });

      setSuccessMessage('売主情報を更新しました');
      setEditingSeller(false);
      
      // データを再読み込み
      await loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '売主情報の更新に失敗しました');
    } finally {
      setSavingSeller(false);
    }
  };

  const handleSaveAppointment = async () => {
    try {
      setSavingAppointment(true);
      setError(null);
      setSuccessMessage(null);
      setAppointmentSuccessMessage(null);

      // datetime-localの値をISO形式に変換
      const appointmentDateISO = editedAppointmentDate 
        ? new Date(editedAppointmentDate).toISOString() 
        : null;

      console.log('Saving appointment:', {
        appointmentDate: appointmentDateISO,
        assignedTo: editedAssignedTo,
        visitValuationAcquirer: editedVisitValuationAcquirer,
        appointmentNotes: editedAppointmentNotes,
      });

      await api.put(`/api/sellers/${id}`, {
        appointmentDate: appointmentDateISO,
        assignedTo: editedAssignedTo || null,
        visitValuationAcquirer: editedVisitValuationAcquirer || null,
        appointmentNotes: editedAppointmentNotes || null,
      });

      setAppointmentSuccessMessage('訪問予約情報を更新しました');
      setEditingAppointment(false);
      
      // データを再読み込み
      try {
        await loadAllData();
      } catch (reloadError) {
        console.error('❌ データの再読み込みに失敗:', reloadError);
        // 再読み込みエラーは警告のみ（保存は成功しているため）
        setError('データの再読み込みに失敗しました。ページを更新してください。');
      }

      // カレンダーイベントはバックエンドで自動的に作成されます
    } catch (err: any) {
      console.error('❌ Failed to save appointment:', err);
      const errorMessage = err.response?.data?.error?.message || '訪問予約情報の更新に失敗しました';
      setError(errorMessage);
      
      // スプレッドシート同期エラーの場合は警告を追加
      if (errorMessage.includes('スプレッドシート') || errorMessage.includes('sync')) {
        setError(errorMessage + '（データベースには保存されました）');
      }
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleSaveSite = async () => {
    try {
      setSavingSite(true);
      setError(null);
      setSuccessMessage(null);

      await api.put(`/api/sellers/${id}`, {
        site: editedSite || null,
      });

      setSuccessMessage('サイト情報を更新しました');
      setEditingSite(false);
      
      // データを再読み込み
      await loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'サイト情報の更新に失敗しました');
    } finally {
      setSavingSite(false);
    }
  };

  // 査定額自動計算関数
  const autoCalculateValuations = useCallback(async (roadPrice: string) => {
    if (!roadPrice || !id || !property) return;
    
    // 手入力値が存在する場合は自動計算をスキップ
    if (isManualValuation) {
      console.log('Manual valuation exists, skipping auto-calculation');
      return;
    }
    
    try {
      setAutoCalculating(true);
      
      // 査定担当者を設定（現在のユーザー）
      const assignedBy = employee?.name || '';
      setValuationAssignee(assignedBy);
      
      // まず固定資産税路線価を保存
      await api.put(`/api/sellers/${id}`, {
        fixedAssetTaxRoadPrice: parseFloat(roadPrice),
      });
      
      // 査定額1を計算
      const response1 = await api.post(`/api/sellers/${id}/calculate-valuation-amount1`);
      const amount1 = response1.data.valuationAmount1;
      setEditedValuationAmount1(amount1.toString());
      
      // 査定額2を計算
      const response2 = await api.post(`/api/sellers/${id}/calculate-valuation-amount2`, {
        valuationAmount1: amount1,
      });
      const amount2 = response2.data.valuationAmount2;
      setEditedValuationAmount2(amount2.toString());
      
      // 査定額3を計算
      const response3 = await api.post(`/api/sellers/${id}/calculate-valuation-amount3`, {
        valuationAmount1: amount1,
      });
      const amount3 = response3.data.valuationAmount3;
      setEditedValuationAmount3(amount3.toString());
      
      // 計算した査定額と査定担当者をデータベースに保存
      await api.put(`/api/sellers/${id}`, {
        valuationAmount1: amount1,
        valuationAmount2: amount2,
        valuationAmount3: amount3,
        valuationAssignee: assignedBy,
      });
      
      console.log('Valuation saved:', { amount1, amount2, amount3, assignedBy });
      
    } catch (err: any) {
      console.error('Auto calculation failed:', err);
      setError('査定額の計算に失敗しました: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setAutoCalculating(false);
    }
  }, [id, employee, property, isManualValuation]);

  // デバウンス付き自動計算関数
  const debouncedAutoCalculate = useCallback((roadPrice: string) => {
    // 既存のタイマーをクリア
    if (calculationTimerRef.current) {
      clearTimeout(calculationTimerRef.current);
    }
    
    // 新しいタイマーを設定（1秒後に実行）
    calculationTimerRef.current = setTimeout(() => {
      autoCalculateValuations(roadPrice);
    }, 1000);
  }, [autoCalculateValuations]);

  // 手入力査定額を保存する関数
  const handleSaveManualValuation = async () => {
    if (!editedManualValuationAmount1) {
      setError('査定額1は必須です');
      return;
    }

    // 数値バリデーション（万円単位で入力）
    const amount1InManEn = parseFloat(editedManualValuationAmount1);
    const amount2InManEn = editedManualValuationAmount2 ? parseFloat(editedManualValuationAmount2) : null;
    const amount3InManEn = editedManualValuationAmount3 ? parseFloat(editedManualValuationAmount3) : null;

    if (amount1InManEn <= 0) {
      setError('査定額1は正の数値を入力してください');
      return;
    }

    if (amount2InManEn && amount2InManEn < amount1InManEn) {
      setError('査定額2は査定額1以上の値を入力してください（警告）');
      // 警告のみで続行
    }

    if (amount3InManEn && amount2InManEn && amount3InManEn < amount2InManEn) {
      setError('査定額3は査定額2以上の値を入力してください（警告）');
      // 警告のみで続行
    }

    // 万円を円に変換
    const amount1 = amount1InManEn * 10000;
    const amount2 = amount2InManEn ? amount2InManEn * 10000 : null;
    const amount3 = amount3InManEn ? amount3InManEn * 10000 : null;

    try {
      setSavingManualValuation(true);
      setError(null);
      setSuccessMessage(null);

      // 査定担当者を設定（現在のユーザー）
      const assignedBy = employee?.name || '';

      await api.put(`/api/sellers/${id}`, {
        valuationAmount1: amount1,
        valuationAmount2: amount2,
        valuationAmount3: amount3,
        valuationAssignee: assignedBy,
        fixedAssetTaxRoadPrice: null, // 手入力の場合は固定資産税路線価をクリア
      });

      setSuccessMessage('手入力査定額を保存しました');
      setIsManualValuation(true);
      setValuationAssignee(assignedBy);
      
      // 表示用の状態も更新（円単位）
      setEditedValuationAmount1(amount1.toString());
      setEditedValuationAmount2(amount2?.toString() || '');
      setEditedValuationAmount3(amount3?.toString() || '');
      
      // 手入力値も保持（万円単位）
      setEditedManualValuationAmount1(amount1InManEn.toString());
      setEditedManualValuationAmount2(amount2InManEn?.toString() || '');
      setEditedManualValuationAmount3(amount3InManEn?.toString() || '');
      
      // データを再読み込み
      await loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '手入力査定額の保存に失敗しました');
    } finally {
      setSavingManualValuation(false);
    }
  };

  // 手入力査定額をクリアする関数
  const handleClearManualValuation = async () => {
    if (!window.confirm('手入力査定額をクリアしますか？自動計算値に戻ります。')) {
      return;
    }

    try {
      setSavingManualValuation(true);
      setError(null);
      setSuccessMessage(null);

      await api.put(`/api/sellers/${id}`, {
        valuationAmount1: null,
        valuationAmount2: null,
        valuationAmount3: null,
        valuationAssignee: null, // 査定担当者もクリア
      });

      setSuccessMessage('手入力査定額をクリアしました');
      setIsManualValuation(false);
      setValuationAssignee(''); // ローカル状態もクリア
      setEditedManualValuationAmount1('');
      setEditedManualValuationAmount2('');
      setEditedManualValuationAmount3('');
      setEditedValuationAmount1('');
      setEditedValuationAmount2('');
      setEditedValuationAmount3('');
      
      // データを再読み込み
      await loadAllData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '手入力査定額のクリアに失敗しました');
    } finally {
      setSavingManualValuation(false);
    }
  };

  // 郵送ステータス更新ハンドラー
  const handleMailingStatusChange = async (status: '未' | '済' | '不要') => {
    try {
      setSavingMailingStatus(true);
      setError(null);

      // 同じステータスをクリックした場合は解除（空文字に）
      const newStatus = editedMailingStatus === status ? '' : status;

      const updateData: { mailingStatus: string; mailSentDate?: string | null } = {
        mailingStatus: newStatus,
      };

      // 「済」の場合は郵送日を今日の日付で設定、解除の場合はクリア
      if (newStatus === '済') {
        const today = new Date().toISOString().split('T')[0];
        updateData.mailSentDate = today;
      } else if (newStatus === '') {
        updateData.mailSentDate = null;
      }

      await api.put(`/api/sellers/${id}`, updateData);

      // ローカル状態を更新
      setEditedMailingStatus(newStatus);
      if (newStatus === '済') {
        const today = new Date().toISOString().split('T')[0];
        setEditedMailSentDate(today);
      } else if (newStatus === '') {
        setEditedMailSentDate('');
      }

      if (newStatus === '') {
        setSuccessMessage('ステータスを解除しました');
      } else {
        setSuccessMessage(`「${newStatus}」に更新しました`);
      }
      
      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'ステータスの更新に失敗しました');
    } finally {
      setSavingMailingStatus(false);
    }
  };

  // 査定メール送信確認ダイアログを表示
  const handleShowValuationEmailConfirm = () => {
    if (!editedValuationAmount1 || !editedValuationAmount2 || !editedValuationAmount3) {
      setError('査定結果がありません。先に固定資産税路線価を入力して査定を実行してください。');
      return;
    }

    if (!seller || !property) {
      setError('売主情報または物件情報が取得できません。');
      return;
    }

    // 査定額を万円単位に変換
    const amount1Man = Math.round(parseInt(editedValuationAmount1) / 10000);
    const amount2Man = Math.round(parseInt(editedValuationAmount2) / 10000);
    const amount3Man = Math.round(parseInt(editedValuationAmount3) / 10000);

    // 土地面積と建物面積を取得
    const landArea = property.landArea || '未設定';
    const buildingArea = property.buildingArea || '未設定';

    // メール件名
    const subject = `【査定結果】${seller.name}様の物件査定について`;

    // メール本文
    const body = `${seller.name}様

この度は査定依頼を頂きまして誠に有難うございます。
大分市舞鶴町にございます、不動産会社の株式会社いふうです。

机上査定は以下の通りとなっております。
※土地${landArea}㎡、建物${buildingArea}㎡で算出しております。

＜相場価格＞
　　　${amount1Man}万円～${amount2Man}万円（3ヶ月で売却可能）

＜チャレンジ価格＞
${amount2Man}万円～${amount3Man}万円（6ヶ月以上も可）

＜買取価格＞
　　　ご訪問後査定させて頂くことが可能です。

【訪問査定をご希望の方】（電話でも可能です）
★無料です！所要時間は1時間程度です。
↓こちらよりご予約可能です！
★遠方の方はWEB打合せも可能となっておりますので、ご連絡下さい！
http://bit.ly/44U9pjl

↑↑訪問査定はちょっと・・・でも来店して、「売却の流れの説明を聞きたい！！」という方もぜひご予約ください！！

机上査定はあくまで固定資産税路線価や周辺事例の平均値で自動計算されております。
チャレンジ価格以上の金額での売出も可能ですが、売却までにお時間がかかる可能性があります。ご了承ください。

●当該エリアは、子育て世代のファミリー層から人気で問い合せの多い地域となっております。
●13名のお客様が周辺で物件を探されています。

売却には自信がありますので、是非当社でご紹介させて頂ければと思います。

なお、上記は概算での金額であり、正式には訪問査定後となりますのでご了承ください。
訪問査定は30分程度で終わり、無料となっておりますのでお気軽にお申し付けください。

売却の流れから良くあるご質問をまとめた資料はこちらになります。
https://ifoo-oita.com/testsite/wp-content/uploads/2020/12/d58af49c9c6dd87c7aee1845265204b6.pdf

また、不動産を売却した際には譲渡所得税というものが課税されます。
控除方法もございますが、住宅ローン控除との併用は出来ません。
詳細はお問い合わせくださいませ。

不動産売却のほか、住み替え先のご相談や物件紹介などについてもお気軽にご相談ください。

何卒よろしくお願い致します。

***************************
株式会社 いふう（実績はこちら：bit.ly/4l8lWFF　）
〒870-0044
大分市舞鶴町1丁目3-30
TEL：097-533-2022
FAX：097-529-7160
MAIL：tenant@ifoo-oita.com
HP：https://ifoo-oita.com/
採用HP：https://en-gage.net/ifoo-oita/
店休日：毎週水曜日　年末年始、GW、盆
***************************`;

    // 確認ダイアログを表示
    setConfirmDialog({
      open: true,
      type: 'email',
      template: {
        id: 'valuation',
        label: '査定額案内メール（相続）',
        subject: subject,
        content: body,
      },
    });

    // 編集可能なフィールドに初期値を設定
    setEditableEmailRecipient(seller.email || '');
    setEditableEmailSubject(subject);
    setEditableEmailBody(body);
  };

  // 査定メール送信関数（確認後に実行）
  const handleSendValuationEmail = async () => {
    try {
      setSendingEmail(true);
      setError(null);
      setSuccessMessage(null);

      await api.post(`/api/sellers/${id}/send-valuation-email`);
      setSuccessMessage('査定メールを送信しました');
      // 活動履歴を再読み込み
      const activitiesResponse = await api.get(`/api/sellers/${id}/activities`);
      const convertedActivities = activitiesResponse.data.map((activity: any) => ({
        id: activity.id,
        sellerId: activity.seller_id || activity.sellerId,
        employeeId: activity.employee_id || activity.employeeId,
        type: activity.type,
        content: activity.content,
        result: activity.result,
        metadata: activity.metadata,
        createdAt: activity.created_at || activity.createdAt,
        employee: activity.employee,
      }));
      setActivities(convertedActivities);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'メール送信に失敗しました');
    } finally {
      setSendingEmail(false);
    }
  };

  // Emailテンプレートのプレースホルダーを置換する関数
  const replaceEmailPlaceholders = (text: string): string => {
    if (!seller || !property) return text;

    let result = text;

    // 売主名（漢字のみ）
    result = result.replace(/<<名前\(漢字のみ）>>/g, seller.name || '');
    
    // 物件所在地
    result = result.replace(/<<物件所在地>>/g, property.address || '');
    
    // 査定額（万円単位）
    const amount1 = editedValuationAmount1 ? Math.round(parseInt(editedValuationAmount1) / 10000) : '';
    const amount2 = editedValuationAmount2 ? Math.round(parseInt(editedValuationAmount2) / 10000) : '';
    const amount3 = editedValuationAmount3 ? Math.round(parseInt(editedValuationAmount3) / 10000) : '';
    result = result.replace(/<<査定額1>>/g, amount1.toString());
    result = result.replace(/<<査定額2>>/g, amount2.toString());
    result = result.replace(/<<査定額3>>/g, amount3.toString());
    
    // 土地・建物面積
    result = result.replace(/<<土（㎡）>>/g, property.landArea?.toString() || '');
    result = result.replace(/<<建（㎡）>>/g, property.buildingArea?.toString() || '');
    
    // 築年情報（条件付きロジック）
    // 物件種別が「戸建て」AND（築年が空 OR 築年≤0）の場合のみメッセージを表示
    let buildYearText = '';
    if (property.propertyType === 'detached_house' && (!property.buildYear || property.buildYear <= 0)) {
      buildYearText = '築年が不明のため、築年35年で算出しております。相違がある場合はお申し付けくださいませ。';
    }
    result = result.replace(/<<築年不明>>/g, buildYearText);
    
    // 担当者情報（営業担当）
    const assignedEmployee = employees.find(emp => emp.email === seller.assignedTo);
    const employeeName = assignedEmployee?.name || employee?.name || '';
    result = result.replace(/<<営担>>/g, employeeName);
    result = result.replace(/<<担当名（営業）名前>>/g, employeeName);
    result = result.replace(/<<担当名（営業）電話番号>>/g, assignedEmployee?.phoneNumber || employee?.phoneNumber || '');
    result = result.replace(/<<担当名（営業）メールアドレス>>/g, assignedEmployee?.email || employee?.email || '');
    
    // 訪問日時
    if (seller.appointmentDate) {
      const appointmentDate = new Date(seller.appointmentDate);
      const dateStr = `${appointmentDate.getMonth() + 1}月${appointmentDate.getDate()}日`;
      const timeStr = `${appointmentDate.getHours()}:${appointmentDate.getMinutes().toString().padStart(2, '0')}`;
      result = result.replace(/<<訪問日>>/g, dateStr);
      result = result.replace(/<<時間>>/g, timeStr);
    } else {
      result = result.replace(/<<訪問日>>/g, '');
      result = result.replace(/<<時間>>/g, '');
    }
    
    // 競合名
    result = result.replace(/<<競合名>>/g, seller.competitorName || '');
    
    // お客様紹介文言（条件付きロジック）
    let customerIntroText = '';
    if (property.propertyType === 'apartment') {
      // マンションの場合
      customerIntroText = `以前査定のご依頼をいただいた${property.address || ''}で売却のご予定はございますでしょうか？ こちらのマンションでお探しのお客様よりお問い合わせをいただきました。`;
    } else {
      // それ以外（戸建て、土地など）
      customerIntroText = `以前査定のご依頼をいただいた${property.address || ''}で売却のご予定はございますでしょうか？ こちらの周辺でお探しのお客様よりお問い合わせをいただきました。`;
    }
    result = result.replace(/<<お客様紹介文言>>/g, customerIntroText);

    return result;
  };

  const handleEmailTemplateSelect = (templateId: string) => {
    console.log('=== handleEmailTemplateSelect called ===');
    console.log('templateId:', templateId);
    console.log('seller?.email:', seller?.email);
    console.log('sendingTemplate:', sendingTemplate);
    
    if (!templateId) {
      console.log('⚠️ No templateId provided');
      return;
    }

    // Check if button is already disabled
    const buttonId = `email_${templateId}`;
    if (isButtonDisabled(buttonId)) {
      console.log('⚠️ Button is already disabled:', buttonId);
      return;
    }

    // クイックボタンクリックを記録（pending状態に設定）
    handleQuickButtonClick(buttonId);

    const template = emailTemplates.find(t => t.id === templateId);
    console.log('Found template:', template);
    
    if (!template) {
      console.log('❌ Template not found');
      return;
    }

    // プレースホルダーを置換
    const replacedSubject = replaceEmailPlaceholders(template.subject);
    const replacedContent = replaceEmailPlaceholders(template.content);

    // 改行を<br>タグに変換してHTMLとして設定
    const htmlContent = replacedContent.replace(/\n/g, '<br>');

    // 編集可能フィールドを初期化
    setEditableEmailRecipient(seller?.email || '');
    setEditableEmailSubject(replacedSubject);
    setEditableEmailBody(htmlContent);

    console.log('✅ Opening email confirmation dialog');
    console.log('Recipient:', seller?.email);
    console.log('Subject:', replacedSubject);

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

    // Check if button is already disabled
    const buttonId = `sms_${templateId}`;
    if (isButtonDisabled(buttonId)) {
      console.log('⚠️ Button is already disabled:', buttonId);
      return;
    }

    // クイックボタンクリックを記録（pending状態に設定）
    handleQuickButtonClick(buttonId);

    const template = smsTemplates.find(t => t.id === templateId);
    if (!template) return;

    try {
      // generator関数を使用してメッセージ内容を生成
      // 訪問後御礼メールの場合は従業員データを渡す
      const generatedContent = template.id === 'post_visit_thank_you'
        ? template.generator(seller!, property, employees)
        : template.generator(seller!, property);
      
      // メッセージ長の検証（日本語SMS制限: 670文字）
      const messageLength = convertLineBreaks(generatedContent).length;
      if (messageLength > 670) {
        setError(`メッセージが長すぎます（${messageLength}文字 / 670文字制限）。内容を確認してください。`);
        return;
      }
      
      // 確認ダイアログを表示（生成されたコンテンツを含む）
      setConfirmDialog({
        open: true,
        type: 'sms',
        template: {
          ...template,
          content: generatedContent,
        },
      });
    } catch (err: any) {
      setError('メッセージの生成に失敗しました: ' + (err.message || '不明なエラー'));
    }
  };

  // 画像ペースト機能はRichTextEmailEditorに統合されたため、ここでは不要

  // 送信元アドレス変更ハンドラー
  const handleSenderAddressChange = (address: string) => {
    setSenderAddress(address);
    saveSenderAddress(address);
  };

  const handleConfirmSend = async () => {
    const { type, template } = confirmDialog;
    if (!type || !template) return;

    try {
      setSendingTemplate(true);
      setError(null);
      setConfirmDialog({ open: false, type: null, template: null });

      if (type === 'email') {
        // 査定メールの場合は専用のAPIエンドポイントを使用
        if (template.id === 'valuation') {
          await handleSendValuationEmail();
        } else {
          // RichTextEmailEditorからHTMLコンテンツを取得
          // editableEmailBodyには既にHTMLが含まれている（画像のBase64データURLを含む）
          const hasImages = editableEmailBody.includes('<img');
          
          await api.post(`/api/sellers/${id}/send-template-email`, {
            templateId: template.id,
            to: editableEmailRecipient,
            subject: editableEmailSubject,
            content: editableEmailBody,
            htmlBody: hasImages ? editableEmailBody : undefined,
            from: senderAddress,  // 送信元アドレスを追加
          });

          setSuccessMessage(hasImages ? `${template.label}を画像付きで送信しました` : `${template.label}を送信しました`);
        }
      } else if (type === 'sms') {
        // 改行プレースホルダーを実際の改行に変換
        const messageContent = convertLineBreaks(template.content);
        
        // テンプレート選択を記録
        await api.post(`/api/sellers/${id}/activities`, {
          type: 'sms',
          content: `【${template.label}】を送信`,
          result: 'sent',
        });

        setSuccessMessage(`${template.label}を記録しました`);

        // SMSアプリを開く
        if (seller?.phoneNumber) {
          const smsLink = `sms:${seller.phoneNumber}?body=${encodeURIComponent(messageContent)}`;
          window.location.href = smsLink;
        }
      }

      // クイックボタンの状態を永続化（pending → persisted）
      handleQuickButtonSave();

      // 活動履歴を再読み込み
      const activitiesResponse = await api.get(`/api/sellers/${id}/activities`);
      const convertedActivities = activitiesResponse.data.map((activity: any) => ({
        id: activity.id,
        sellerId: activity.seller_id || activity.sellerId,
        employeeId: activity.employee_id || activity.employeeId,
        type: activity.type,
        content: activity.content,
        result: activity.result,
        metadata: activity.metadata,
        createdAt: activity.created_at || activity.createdAt,
        employee: activity.employee,
      }));
      setActivities(convertedActivities);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || `${type === 'email' ? 'メール' : 'SMS'}送信に失敗しました`);
    } finally {
      setSendingTemplate(false);
    }
  };

  const handleCancelSend = () => {
    setConfirmDialog({ open: false, type: null, template: null });
    // 編集フィールドをクリア
    setEditableEmailRecipient('');
    setEditableEmailSubject('');
    setEditableEmailBody('');
  };

  // 画像選択ボタンのハンドラー（新しい実装）
  const handleOpenImageSelector = () => {
    setImageSelectorOpen(true);
  };

  // 画像選択確定のハンドラー（新しい実装）
  const handleImageSelectionConfirm = (images: any[]) => {
    // 新しい形式の画像データを保存
    setSelectedImages(images as any);
    setImageSelectorOpen(false);
    setImageError(null);
  };

  // 画像選択キャンセルのハンドラー
  const handleImageSelectionCancel = () => {
    setImageSelectorOpen(false);
  };

  // 訪問予約セクションへスクロール
  const scrollToAppointmentSection = () => {
    appointmentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 査定計算セクションへスクロール
  const scrollToValuationSection = () => {
    valuationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ステータスのラベルを取得
  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      [SellerStatus.FOLLOWING_UP]: '追客中',
      [SellerStatus.FOLLOW_UP_NOT_NEEDED]: '追客不要（未訪問）',
      [SellerStatus.LOST]: '除外済追客不要',
      'follow_up_not_needed_after_exclusion': '除外後追客中',
      [SellerStatus.EXCLUSIVE_CONTRACT]: '専任媒介',
      'general_contract': '一般媒介',
      'other_company_purchase': '他社買取',
      'other_decision_follow_up': '他決→追客',
      [SellerStatus.OTHER_DECISION]: '他決→追客不要',
      'other_decision_exclusive': '他決→専任',
      'other_decision_general': '他決→一般',
      [SellerStatus.APPOINTMENT_SCHEDULED]: '訪問（担当付）追客不要',
    };
    return statusLabels[status] || status;
  };

  // 専任、他決、一般媒介が含まれているかチェック
  const requiresDecisionDate = (status: string): boolean => {
    if (!status) return false;
    const label = getStatusLabel(status);
    return label.includes('専任') || label.includes('他決') || label.includes('一般媒介');
  };

  // 必須項目が全て入力されているかチェック
  const isRequiredFieldsComplete = (): boolean => {
    if (!requiresDecisionDate(editedStatus)) {
      return false;
    }
    return (
      editedExclusiveDecisionDate !== '' &&
      editedCompetitors.length > 0 &&
      editedExclusiveOtherDecisionFactors.length > 0
    );
  };

  // GoogleChat通知を送信
  const handleSendChatNotification = async () => {
    if (!seller) return;

    try {
      setSendingChatNotification(true);
      setError(null);

      const statusLabel = getStatusLabel(editedStatus);
      
      await api.post('/chat-notifications/send', {
        sellerId: seller.id,
        notificationType: statusLabel,
        message: `${statusLabel}の通知\n\n売主: ${seller.name}\n決定日: ${editedExclusiveDecisionDate}\n競合: ${editedCompetitors.join(', ')}\n要因: ${editedExclusiveOtherDecisionFactors.join(', ')}`,
      });

      setSuccessMessage(`${statusLabel}の通知を送信しました`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Chat通知の送信に失敗しました');
    } finally {
      setSendingChatNotification(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={handleBack}>
          売主詳細ページに戻る
        </Button>
      </Container>
    );
  }

  // sellerがnullの場合はエラー表示
  if (!seller) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          売主情報の読み込みに失敗しました
        </Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          一覧に戻る
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', minWidth: '1280px' }}>
      {/* ヘッダー */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} variant="outlined">
            一覧
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5">通話モード - {seller?.name || '読み込み中...'}</Typography>
            {seller?.sellerNumber && (
              <Chip label={seller.sellerNumber} size="small" color="primary" />
            )}
            {/* 重複インジケーター */}
            {!duplicatesLoading && duplicates.length > 0 && (
              <DuplicateIndicatorBadge
                duplicateCount={duplicates.length}
                onClick={handleOpenDuplicateModal}
              />
            )}
          </Box>
          <Button
            startIcon={<CalendarToday />}
            onClick={scrollToAppointmentSection}
            variant="outlined"
            color="primary"
            sx={{ ml: 2 }}
            title="訪問予約セクションへ"
          >
            訪問予約
          </Button>
        </Box>

        {/* 査定額表示（中央） */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 2 }}>
          {seller?.valuationAmount1 ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {Math.round(seller.valuationAmount1 / 10000)}万円 ～{' '}
                  {seller.valuationAmount2 ? Math.round(seller.valuationAmount2 / 10000) : '-'}万円 ～{' '}
                  {seller.valuationAmount3 ? Math.round(seller.valuationAmount3 / 10000) : '-'}万円
                </Typography>
                {isManualValuation && (
                  <Chip 
                    label="手入力" 
                    color="primary" 
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
                {!isManualValuation && seller.fixedAssetTaxRoadPrice && (
                  <Chip 
                    label="自動計算" 
                    color="default" 
                    size="small"
                  />
                )}
              </Box>
              {seller.valuationAssignee && (
                <Typography variant="caption" color="text.secondary">
                  査定担当: {seller.valuationAssignee}
                </Typography>
              )}
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                査定額未設定
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={scrollToValuationSection}
              >
                査定計算へ
              </Button>
            </Box>
          )}
        </Box>
        {seller?.phoneNumber && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* 画像ボタン */}
            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={() => setDocumentModalOpen(true)}
              size="small"
            >
              画像
            </Button>

            {/* Emailテンプレート選択 */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Email送信</InputLabel>
              <Select
                value=""
                label="Email送信"
                onChange={(e) => handleEmailTemplateSelect(e.target.value)}
                disabled={!seller?.email || sendingTemplate}
                MenuProps={{
                  PaperProps: {
                    sx: { maxWidth: 500 }
                  }
                }}
              >
                {getSortedEmailTemplates()
                  .filter((template) => {
                    // サイト別フィルタリング
                    // sitesが指定されている場合は、現在のサイトがsites配列に含まれているかチェック
                    if (template.sites && template.sites.length > 0) {
                      return seller?.site && template.sites.includes(seller.site);
                    }
                    // sitesが指定されていない場合は常に表示
                    return true;
                  })
                  .map((template) => (
                    <MenuItem 
                      key={template.id} 
                      value={template.id}
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-start',
                        py: 1.5,
                        whiteSpace: 'normal'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {template.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        件名: {template.subject}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          fontSize: '0.7rem',
                          mt: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {template.content}
                      </Typography>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* SMSテンプレート選択 */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>SMS送信</InputLabel>
              <Select
                value=""
                label="SMS送信"
                onChange={(e) => handleSmsTemplateSelect(e.target.value)}
                disabled={sendingTemplate}
                MenuProps={{
                  PaperProps: {
                    sx: { maxWidth: 500 }
                  }
                }}
              >
                {smsTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    <Typography variant="body2">
                      {template.label}
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 電話番号ボタン */}
            <Button
              variant="contained"
              color="primary"
              startIcon={<Phone />}
              href={`tel:${seller.phoneNumber}`}
              sx={{ fontWeight: 'bold' }}
            >
              {seller.phoneNumber}
            </Button>
          </Box>
        )}
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* メインコンテンツ（左右2分割） */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* 左側：情報表示エリア（50%） */}
          <Grid
            item
            xs={6}
            sx={{
              height: '100%',
              overflow: 'auto',
              borderRight: 1,
              borderColor: 'divider',
              p: 3,
            }}
          >
            {/* 物件情報 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">
                  📍 物件情報
                </Typography>
                {seller && (seller.inquiryDetailedDateTime || seller.inquiryDetailedDatetime || seller.inquiryDate) && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    反響日：
                    <Typography component="span" variant="body2" sx={{ fontWeight: 'bold', ml: 0.5 }}>
                      {(() => {
                        const detailedDateTime = seller.inquiryDetailedDateTime || seller.inquiryDetailedDatetime;
                        if (detailedDateTime) {
                          return new Date(detailedDateTime).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                        }
                        if (seller.inquiryDate) {
                          return new Date(seller.inquiryDate).toLocaleDateString('ja-JP');
                        }
                        return '-';
                      })()}
                    </Typography>
                  </Typography>
                )}
              </Box>
              {property && (
                <Button
                  size="small"
                  onClick={() => {
                    if (editingProperty) {
                      // キャンセル時は元の値に戻す
                      setEditedPropertyAddress(property.address || '');
                      setEditedPropertyType(property.propertyType || '');
                      setEditedLandArea(property.landArea?.toString() || '');
                      setEditedBuildingArea(property.buildingArea?.toString() || '');
                      setEditedBuildYear(property.buildYear?.toString() || '');
                      setEditedFloorPlan(property.floorPlan || '');
                      setEditedStructure(property.structure || '');
                      setEditedSellerSituation(property.sellerSituation || '');
                    }
                    setEditingProperty(!editingProperty);
                  }}
                >
                  {editingProperty ? 'キャンセル' : '編集'}
                </Button>
              )}
            </Box>
            <Paper sx={{ p: 2, mb: 3 }}>
              {property ? (
                <>
                  {!editingProperty ? (
                    // 表示モード
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          物件住所
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {property.address}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          物件種別
                        </Typography>
                        <Typography variant="body1">{getPropertyTypeLabel(property.propertyType)}</Typography>
                      </Box>
                      {property.landArea && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            土地面積
                          </Typography>
                          <Typography variant="body1">{property.landArea} m²</Typography>
                        </Box>
                      )}
                      {property.buildingArea && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            建物面積
                          </Typography>
                          <Typography variant="body1">{property.buildingArea} m²</Typography>
                        </Box>
                      )}
                      {property.buildYear && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            築年
                          </Typography>
                          <Typography variant="body1">{property.buildYear}年</Typography>
                        </Box>
                      )}
                      {property.floorPlan && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            間取り
                          </Typography>
                          <Typography variant="body1">{property.floorPlan}</Typography>
                        </Box>
                      )}
                      {property.structure && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            構造
                          </Typography>
                          <Typography variant="body1">{property.structure}</Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          状況（売主）
                        </Typography>
                        <Typography variant="body1">
                          {property.currentStatus ? getSellerSituationLabel(property.currentStatus) : 
                           property.sellerSituation ? getSellerSituationLabel(property.sellerSituation) : '未設定'}
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    // 編集モード
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="物件住所"
                          value={editedPropertyAddress}
                          onChange={(e) => setEditedPropertyAddress(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>物件種別</InputLabel>
                          <Select
                            value={editedPropertyType}
                            label="物件種別"
                            onChange={(e) => setEditedPropertyType(e.target.value)}
                          >
                            <MenuItem value="detached_house">戸建て</MenuItem>
                            <MenuItem value="apartment">マンション</MenuItem>
                            <MenuItem value="land">土地</MenuItem>
                            <MenuItem value="commercial">商業用</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="土地面積 (m²)"
                          type="number"
                          value={editedLandArea}
                          onChange={(e) => setEditedLandArea(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="建物面積 (m²)"
                          type="number"
                          value={editedBuildingArea}
                          onChange={(e) => setEditedBuildingArea(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="築年"
                          type="number"
                          value={editedBuildYear}
                          onChange={(e) => setEditedBuildYear(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="間取り"
                          value={editedFloorPlan}
                          onChange={(e) => setEditedFloorPlan(e.target.value)}
                          placeholder="例: 3LDK, 5LK / 5LDK"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>構造</InputLabel>
                          <Select
                            value={editedStructure}
                            label="構造"
                            onChange={(e) => setEditedStructure(e.target.value)}
                          >
                            <MenuItem value="">
                              <em>未選択</em>
                            </MenuItem>
                            <MenuItem value="木造">木造</MenuItem>
                            <MenuItem value="軽量鉄骨">軽量鉄骨</MenuItem>
                            <MenuItem value="鉄骨">鉄骨</MenuItem>
                            <MenuItem value="他">他</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth size="small">
                          <InputLabel>状況（売主）</InputLabel>
                          <Select
                            value={editedSellerSituation}
                            label="状況（売主）"
                            onChange={(e) => setEditedSellerSituation(e.target.value)}
                          >
                            <MenuItem value="">
                              <em>未選択</em>
                            </MenuItem>
                            <MenuItem value="居">居（居住中）</MenuItem>
                            <MenuItem value="空">空（空き家）</MenuItem>
                            <MenuItem value="賃">賃（賃貸中）</MenuItem>
                            <MenuItem value="古有">古有（古屋あり）</MenuItem>
                            <MenuItem value="更">更（更地）</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={savingProperty ? <CircularProgress size={20} /> : <Save />}
                          onClick={handleSaveProperty}
                          disabled={savingProperty}
                        >
                          {savingProperty ? '保存中...' : '保存'}
                        </Button>
                      </Grid>
                    </Grid>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  物件情報が登録されていません
                </Typography>
              )}
            </Paper>

            {/* 売主情報 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                👤 売主情報
              </Typography>
              {seller && (
                <Button
                  size="small"
                  onClick={() => {
                    if (editingSeller) {
                      // キャンセル時は元の値に戻す
                      setEditedName(seller.name || '');
                      setEditedAddress(seller.address || '');
                      setEditedPhoneNumber(seller.phoneNumber || '');
                      setEditedEmail(seller.email || '');
                      if (seller.inquiryDate) {
                        const inquiryDateObj = new Date(seller.inquiryDate);
                        const formattedInquiryDate = inquiryDateObj.toISOString().split('T')[0];
                        setEditedInquiryDate(formattedInquiryDate);
                      } else {
                        setEditedInquiryDate('');
                      }
                      setEditedSite(seller.site || '');
                    }
                    setEditingSeller(!editingSeller);
                  }}
                >
                  {editingSeller ? 'キャンセル' : '編集'}
                </Button>
              )}
            </Box>
            <Paper sx={{ p: 2, mb: 3 }}>
              {seller ? (
                <>
                  {!editingSeller ? (
                    // 表示モード
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          氏名
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {seller.name}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          住所
                        </Typography>
                        <Typography variant="body1">{seller.address}</Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          電話番号
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {seller.phoneNumber}
                          </Typography>
                          {(() => {
                            const phoneCalls = activities.filter((a) => a.type === 'phone_call');
                            if (phoneCalls.length > 0) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  最終追客:{' '}
                                  {new Date(phoneCalls[0].createdAt).toLocaleString('ja-JP', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Typography>
                              );
                            }
                            return null;
                          })()}
                        </Box>
                      </Box>
                      {seller.email && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            メールアドレス
                          </Typography>
                          <Typography variant="body1">{seller.email}</Typography>
                        </Box>
                      )}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          反響日付
                        </Typography>
                        <Typography variant="body1">
                          {seller.inquiryDate
                            ? new Date(seller.inquiryDate).toLocaleDateString('ja-JP')
                            : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          サイト
                        </Typography>
                        <Typography variant="body1">{seller.site || '-'}</Typography>
                      </Box>
                    </>
                  ) : (
                    // 編集モード
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="氏名"
                          required
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          error={!editedName.trim()}
                          helperText={!editedName.trim() ? '必須項目です' : ''}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="住所"
                          value={editedAddress}
                          onChange={(e) => setEditedAddress(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="電話番号"
                          required
                          value={editedPhoneNumber}
                          onChange={(e) => setEditedPhoneNumber(e.target.value)}
                          error={!editedPhoneNumber.trim()}
                          helperText={!editedPhoneNumber.trim() ? '必須項目です' : ''}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="メールアドレス"
                          type="email"
                          value={editedEmail}
                          onChange={(e) => setEditedEmail(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="反響日付"
                          type="date"
                          value={editedInquiryDate}
                          onChange={(e) => setEditedInquiryDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          helperText="除外日の計算に使用されます"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="サイト"
                          value={editedSite}
                          onChange={(e) => setEditedSite(e.target.value)}
                          helperText="除外日の計算に使用されます"
                        >
                          <MenuItem value="">
                            <em>未選択</em>
                          </MenuItem>
                          {siteOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={savingSeller ? <CircularProgress size={20} /> : <Save />}
                          onClick={handleSaveSeller}
                          disabled={savingSeller || !editedName.trim() || !editedPhoneNumber.trim()}
                        >
                          {savingSeller ? '保存中...' : '保存'}
                        </Button>
                      </Grid>
                    </Grid>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  売主情報が取得できませんでした
                </Typography>
              )}
            </Paper>

            {/* ステータス更新セクション */}
            <Typography variant="h6" gutterBottom>
              📊 ステータス
            </Typography>
            <Paper sx={{ p: 2, mb: 3 }}>
              {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
                  {successMessage}
                </Alert>
              )}

              {/* 最終追客情報の表示 */}
              {(() => {
                const phoneCalls = activities.filter((a) => a.type === 'phone_call');
                if (phoneCalls.length > 0) {
                  const lastCall = phoneCalls[0];
                  const displayName = getDisplayName(lastCall.employee);
                  const formattedDate = formatDateTime(lastCall.createdAt);
                  return (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        最終追客
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {displayName} {formattedDate}
                      </Typography>
                    </Box>
                  );
                }
                return null;
              })()}

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>状況（当社）</InputLabel>
                    <Select
                      value={editedStatus}
                      label="状況（当社）"
                      onChange={(e) => setEditedStatus(e.target.value)}
                    >
                      <MenuItem value="追客中">追客中</MenuItem>
                      <MenuItem value="追客不要(未訪問）">追客不要(未訪問）</MenuItem>
                      <MenuItem value="除外済追客不要">除外済追客不要</MenuItem>
                      <MenuItem value="除外後追客中">除外後追客中</MenuItem>
                      <MenuItem value="専任媒介">専任媒介</MenuItem>
                      <MenuItem value="一般媒介">一般媒介</MenuItem>
                      <MenuItem value="リースバック（専任）">リースバック（専任）</MenuItem>
                      <MenuItem value="他決→追客">他決→追客</MenuItem>
                      <MenuItem value="他決→追客不要">他決→追客不要</MenuItem>
                      <MenuItem value="他決→専任">他決→専任</MenuItem>
                      <MenuItem value="他決→一般">他決→一般</MenuItem>
                      <MenuItem value="専任→他社専任">専任→他社専任</MenuItem>
                      <MenuItem value="一般→他決">一般→他決</MenuItem>
                      <MenuItem value="他社買取">他社買取</MenuItem>
                      <MenuItem value="訪問後（担当付）追客不要">訪問後（担当付）追客不要</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* 専任または他決が含まれる場合のみ表示 */}
                {requiresDecisionDate(editedStatus) && (
                  <>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="専任（他決）決定日"
                        type="date"
                        required
                        value={editedExclusiveDecisionDate}
                        onChange={(e) => setEditedExclusiveDecisionDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        error={!editedExclusiveDecisionDate}
                        helperText={!editedExclusiveDecisionDate ? '必須項目です' : ''}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small" required error={editedCompetitors.length === 0}>
                        <InputLabel>競合（複数選択可）</InputLabel>
                        <Select
                          multiple
                          value={editedCompetitors}
                          label="競合（複数選択可）"
                          onChange={(e) => setEditedCompetitors(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={value} size="small" />
                              ))}
                            </Box>
                          )}
                        >
                          {competitorCompanies.map((company) => (
                            <MenuItem key={company} value={company}>
                              {company}
                            </MenuItem>
                          ))}
                        </Select>
                        {editedCompetitors.length === 0 && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                            必須項目です
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small" required error={editedExclusiveOtherDecisionFactors.length === 0}>
                        <InputLabel>専任・他決要因（複数選択可）</InputLabel>
                        <Select
                          multiple
                          value={editedExclusiveOtherDecisionFactors}
                          label="専任・他決要因（複数選択可）"
                          onChange={(e) => setEditedExclusiveOtherDecisionFactors(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={value} size="small" />
                              ))}
                            </Box>
                          )}
                        >
                          {exclusiveOtherDecisionFactorOptions.map((factor) => (
                            <MenuItem key={factor} value={factor}>
                              {factor}
                            </MenuItem>
                          ))}
                        </Select>
                        {editedExclusiveOtherDecisionFactors.length === 0 && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                            必須項目です
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    
                    {/* 競合名、理由フィールド */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        size="small"
                        label="競合名、理由（他決、専任）"
                        value={editedCompetitorNameAndReason}
                        onChange={(e) => setEditedCompetitorNameAndReason(e.target.value)}
                        placeholder="競合他社の名前や、専任・他決になった理由の詳細を記入してください"
                      />
                    </Grid>
                    
                    {/* GoogleChat通知ボタン - 必須項目が全て入力されている場合のみ表示 */}
                    {isRequiredFieldsComplete() && (
                      <Grid item xs={12}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          onClick={handleSendChatNotification}
                          disabled={sendingChatNotification}
                          startIcon={sendingChatNotification ? <CircularProgress size={20} /> : null}
                        >
                          {sendingChatNotification ? '送信中...' : `${getStatusLabel(editedStatus)}通知`}
                        </Button>
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>確度</InputLabel>
                    <Select
                      value={editedConfidence}
                      label="確度"
                      onChange={(e) => setEditedConfidence(e.target.value as ConfidenceLevel)}
                    >
                      <MenuItem value={ConfidenceLevel.A}>A（売る気あり）</MenuItem>
                      <MenuItem value={ConfidenceLevel.B}>B（売る気あるがまだ先の話）</MenuItem>
                      <MenuItem value={ConfidenceLevel.B_PRIME}>B'（売る気は全く無い）</MenuItem>
                      <MenuItem value={ConfidenceLevel.C}>C（電話が繋がらない）</MenuItem>
                      <MenuItem value={ConfidenceLevel.D}>D（再建築不可）</MenuItem>
                      <MenuItem value={ConfidenceLevel.E}>E（収益物件）</MenuItem>
                      <MenuItem value={ConfidenceLevel.DUPLICATE}>ダブり（重複している）</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="除外日"
                    type="date"
                    value={exclusionDate || ''}
                    InputProps={{
                      readOnly: true,
                      sx: {
                        backgroundColor: '#f5f5f5',
                        '& input': {
                          cursor: 'not-allowed',
                        },
                      },
                    }}
                    InputLabelProps={{ shrink: true }}
                    helperText="反響日付とサイトから自動計算（編集不可）"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>除外日にすること</InputLabel>
                    <Select
                      value={exclusionAction}
                      label="除外日にすること"
                      onChange={(e) => {
                        const value = e.target.value;
                        setExclusionAction(value);
                        // 除外日が設定されている場合、次電日を除外日に設定
                        if (value && exclusionDate) {
                          setEditedNextCallDate(exclusionDate);
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>未選択</em>
                      </MenuItem>
                      <MenuItem value="除外日に不通であれば除外">除外日に不通であれば除外</MenuItem>
                      <MenuItem value="除外日に何もせず除外">除外日に何もせず除外</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="次電日"
                    type="date"
                    value={editedNextCallDate}
                    onChange={(e) => setEditedNextCallDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={savingStatus ? <CircularProgress size={20} /> : <Save />}
                    onClick={handleUpdateStatus}
                    disabled={savingStatus}
                  >
                    {savingStatus ? '更新中...' : 'ステータスを更新'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* 訪問予約セクション */}
            <Box ref={appointmentSectionRef} sx={{ scrollMarginTop: '20px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">
                  📅 訪問予約
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    if (editingAppointment) {
                      // キャンセル時は元の値に戻す
                      const appointmentDateLocal = seller?.appointmentDate 
                        ? new Date(seller.appointmentDate).toISOString().slice(0, 16)
                        : '';
                      setEditedAppointmentDate(appointmentDateLocal);
                      setEditedAssignedTo(seller?.assignedTo || '');
                      setEditedVisitValuationAcquirer(seller?.visitValuationAcquirer || '');
                      setEditedAppointmentNotes(seller?.appointmentNotes || '');
                    } else {
                      // 編集モードに入る時に現在の値を設定
                      // visitDateとvisitTimeがあればそれを使用、なければappointmentDateを使用
                      let appointmentDateLocal = '';
                      if (seller?.visitDate) {
                        // visitDateとvisitTimeから日時を構築
                        const visitDateObj = new Date(seller.visitDate);
                        const dateStr = visitDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                        const timeStr = seller.visitTime || '00:00:00';
                        const timeOnly = timeStr.substring(0, 5); // HH:mm
                        appointmentDateLocal = `${dateStr}T${timeOnly}`;
                      } else if (seller?.appointmentDate) {
                        appointmentDateLocal = new Date(seller.appointmentDate).toISOString().slice(0, 16);
                      }
                      setEditedAppointmentDate(appointmentDateLocal);
                      setEditedAssignedTo(seller?.visitAssignee || seller?.assignedTo || '');
                      setEditedVisitValuationAcquirer(seller?.visitValuationAcquirer || '');
                      setEditedAppointmentNotes(seller?.appointmentNotes || '');
                    }
                    setEditingAppointment(!editingAppointment);
                  }}
                >
                  {editingAppointment ? 'キャンセル' : '編集'}
                </Button>
              </Box>
              <Paper sx={{ p: 2, mb: 3 }}>
                {appointmentSuccessMessage && (
                  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAppointmentSuccessMessage(null)}>
                    {appointmentSuccessMessage}
                  </Alert>
                )}
                {!editingAppointment ? (
                  // 表示モード
                  <>
                    {(seller?.visitDate || seller?.appointmentDate) && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          訪問予定日時
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {seller.visitDate ? (
                              // visit_dateとvisit_timeを使用
                              <>
                                {new Date(seller.visitDate).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                                {seller.visitTime && ` ${seller.visitTime}`}
                              </>
                            ) : (
                              // フォールバック: appointmentDateを使用
                              new Date(seller.appointmentDate!).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            )}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CalendarToday />}
                            onClick={() => {
                              // Googleカレンダーに飛ぶ
                              const date = seller.visitDate ? new Date(seller.visitDate) : new Date(seller.appointmentDate!);
                              const dateStr = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                              const title = encodeURIComponent(`訪問査定 - ${seller.name}`);
                              const details = encodeURIComponent(`売主: ${seller.name}\n住所: ${seller.address}\n電話: ${seller.phoneNumber}`);
                              const location = encodeURIComponent(seller.address);
                              window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}&location=${location}`, '_blank');
                            }}
                          >
                            📅 カレンダーで開く
                          </Button>
                        </Box>
                      </Box>
                    )}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        営担
                      </Typography>
                      <Typography variant="body1">
                        {seller?.assignedTo || seller?.visitAssignee ? (
                          employees.find(e => (e.initials || e.name || e.email) === (seller.assignedTo || seller.visitAssignee))?.name || (seller.assignedTo || seller.visitAssignee)
                        ) : '未設定'}
                      </Typography>
                        
                      {/* 訪問統計情報 */}
                      {visitStats && !loadingVisitStats && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            📊 {visitStats.month} 訪問統計
                          </Typography>
                          
                          {/* 営担ごとの訪問数 */}
                          {visitStats.statsByEmployee && visitStats.statsByEmployee.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                ［当月訪問数］
                                {visitStats.statsByEmployee.map((stat: any, index: number) => (
                                  <span key={stat.employeeId}>
                                    {index > 0 && ' '}
                                    {stat.initials}: {stat.count}件
                                  </span>
                                ))}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* 山本マネージャーの訪問率 */}
                          {visitStats.yamamotoStats && (
                            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: '0.875rem',
                                  fontWeight: 'bold',
                                  color: visitStats.yamamotoStats.rate > 20 ? 'error.main' : 'success.main'
                                }}
                              >
                                山本マネージャー訪問率: {visitStats.yamamotoStats.rate.toFixed(1)}%
                              </Typography>
                              {visitStats.yamamotoStats.rate > 20 && (
                                <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                                  ⚠️ 目標の20%を超えています
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      )}
                      
                      {loadingVisitStats && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography variant="caption" color="text.secondary">
                            統計を読み込み中...
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        訪問査定取得者
                      </Typography>
                      <Typography variant="body1">
                        {seller?.visitValuationAcquirer ? (
                          employees.find(e => (e.initials || e.name || e.email) === seller.visitValuationAcquirer)?.name || seller.visitValuationAcquirer
                        ) : '未設定'}
                      </Typography>
                    </Box>
                    {seller?.appointmentNotes && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          メモ
                        </Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                          {seller.appointmentNotes}
                        </Typography>
                      </Box>
                    )}
                    {!seller?.appointmentDate && !seller?.assignedTo && !seller?.appointmentNotes && (
                      <Typography variant="body2" color="text.secondary">
                        訪問予約の詳細情報はまだ登録されていません
                      </Typography>
                    )}
                  </>
                ) : (
                  // 編集モード
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="訪問予定日時"
                        type="datetime-local"
                        value={editedAppointmentDate}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setEditedAppointmentDate(newDate);
                          
                          // 訪問査定日時が入力された場合、現在のログインユーザーを訪問査定取得者に自動設定
                          if (newDate && employee?.email) {
                            try {
                              // 現在のログインユーザーのメールアドレスからスタッフを検索
                              const currentStaff = employees.find(emp => emp.email === employee.email);
                              
                              if (currentStaff) {
                                // スタッフが見つかった場合、訪問査定取得者に設定（既存の値を上書き）
                                const initials = currentStaff.initials || currentStaff.name || currentStaff.email;
                                setEditedVisitValuationAcquirer(initials);
                                console.log('✅ 訪問査定取得者を自動設定:', initials);
                              } else {
                                // スタッフが見つからない場合は警告をログに出力（ユーザーには表示しない）
                                console.warn('⚠️ ログインユーザーがスタッフ一覧に見つかりません:', employee.email);
                              }
                            } catch (error) {
                              // エラーが発生しても処理を続行（自動設定をスキップ）
                              console.error('❌ 訪問査定取得者の自動設定に失敗:', error);
                            }
                          } else if (newDate && !employee?.email) {
                            // ログインユーザー情報が取得できない場合
                            console.warn('⚠️ ログインユーザー情報が取得できません');
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>営担</InputLabel>
                        <Select
                          value={editedAssignedTo}
                          label="営担"
                          onChange={(e) => setEditedAssignedTo(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>未選択</em>
                          </MenuItem>
                          {employees.map((employee) => {
                            // データベースのinitialsを使用
                            const initials = employee.initials || employee.name || employee.email;
                            return (
                              <MenuItem key={employee.id} value={initials}>
                                {employee.name} ({initials})
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>訪問査定取得者</InputLabel>
                        <Select
                          value={editedVisitValuationAcquirer}
                          label="訪問査定取得者"
                          onChange={(e) => setEditedVisitValuationAcquirer(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>未設定</em>
                          </MenuItem>
                          {employees.map((employee) => {
                            const initials = employee.initials || employee.name || employee.email;
                            return (
                              <MenuItem key={employee.id} value={initials}>
                                {employee.name} ({initials})
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="メモ"
                        multiline
                        rows={3}
                        value={editedAppointmentNotes}
                        onChange={(e) => setEditedAppointmentNotes(e.target.value)}
                        placeholder="訪問に関するメモを入力"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={savingAppointment ? <CircularProgress size={20} /> : <Save />}
                        onClick={handleSaveAppointment}
                        disabled={savingAppointment}
                      >
                        {savingAppointment ? '保存中...' : '保存'}
                      </Button>
                    </Grid>
                    
                    {/* 編集モードでも訪問統計を表示 */}
                    <Grid item xs={12}>
                      {visitStats && !loadingVisitStats && (
                        <Box sx={{ mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            📊 {visitStats.month} 訪問統計
                          </Typography>
                          
                          {visitStats.statsByEmployee && visitStats.statsByEmployee.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                ［当月訪問数］
                                {visitStats.statsByEmployee.map((stat: any, index: number) => (
                                  <span key={stat.employeeId}>
                                    {index > 0 && ' '}
                                    {stat.initials}: {stat.count}件
                                  </span>
                                ))}
                              </Typography>
                            </Box>
                          )}
                          
                          {visitStats.yamamotoStats && (
                            <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: '0.875rem',
                                  fontWeight: 'bold',
                                  color: visitStats.yamamotoStats.rate > 20 ? 'error.main' : 'success.main'
                                }}
                              >
                                山本マネージャー訪問率: {visitStats.yamamotoStats.rate.toFixed(1)}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                      
                      {loadingVisitStats && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography variant="caption" color="text.secondary">
                            統計を読み込み中...
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                )}
              </Paper>
            </Box>

            {/* 査定計算セクション */}
            <Box ref={valuationSectionRef} sx={{ mb: 3, scrollMarginTop: '20px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">💰 査定計算</Typography>
                {editedValuationAmount1 && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={() => setEditingValuation(!editingValuation)}>
                      {editingValuation ? '完了' : '編集'}
                    </Button>
                    {!editingValuation && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Email />}
                        onClick={handleShowValuationEmailConfirm}
                        disabled={sendingEmail}
                      >
                        査定メール送信
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
              <Paper sx={{ p: 2 }}>
                {!property && (
                  <Alert severity="info">
                    物件情報が登録されていないため、査定を実行できません
                  </Alert>
                )}

                {/* 査定額が設定されていて、編集モードでない場合：簡潔な表示 */}
                {editedValuationAmount1 && !editingValuation && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="h5">
                        {Math.round(parseInt(editedValuationAmount1) / 10000)}万円 ～{' '}
                        {editedValuationAmount2 ? Math.round(parseInt(editedValuationAmount2) / 10000) : '-'}万円 ～{' '}
                        {editedValuationAmount3 ? Math.round(parseInt(editedValuationAmount3) / 10000) : '-'}万円
                      </Typography>
                      {isManualValuation && (
                        <Chip 
                          label="✍️ 手入力" 
                          color="primary" 
                          size="medium"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                      {!isManualValuation && editedFixedAssetTaxRoadPrice && (
                        <Chip 
                          label="🤖 自動計算" 
                          color="default" 
                          size="medium"
                        />
                      )}
                    </Box>
                    {valuationAssignee && (
                      <Typography variant="caption" color="text.secondary">
                        査定担当: {valuationAssignee}
                      </Typography>
                    )}
                    {isManualValuation && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        手入力された査定額が使用されています。メール・SMS送信時もこの金額が使用されます。
                      </Alert>
                    )}

                    {/* 郵送・不要ボタン */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                          variant={editedMailingStatus === '未' ? 'contained' : 'outlined'}
                          color={editedMailingStatus === '未' ? 'warning' : 'inherit'}
                          size="small"
                          onClick={() => handleMailingStatusChange('未')}
                          disabled={savingMailingStatus}
                        >
                          郵送
                        </Button>
                        <Button
                          variant={editedMailingStatus === '済' ? 'contained' : 'outlined'}
                          color={editedMailingStatus === '済' ? 'success' : 'inherit'}
                          size="small"
                          onClick={() => handleMailingStatusChange('済')}
                          disabled={savingMailingStatus}
                        >
                          済
                        </Button>
                        <Button
                          variant={editedMailingStatus === '不要' ? 'contained' : 'outlined'}
                          color={editedMailingStatus === '不要' ? 'secondary' : 'inherit'}
                          size="small"
                          onClick={() => handleMailingStatusChange('不要')}
                          disabled={savingMailingStatus}
                        >
                          不要
                        </Button>
                        {editedMailingStatus === '済' && editedMailSentDate && (
                          <Typography variant="body2" color="text.secondary">
                            郵送日: {new Date(editedMailSentDate).toLocaleDateString('ja-JP')}
                          </Typography>
                        )}
                        {savingMailingStatus && <CircularProgress size={20} />}
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* 査定額が未設定、または編集モードの場合：詳細な編集画面 */}
                {(!editedValuationAmount1 || editingValuation) && property && (
                  <Box>
                    <Grid container spacing={3}>
                      {/* 査定額表示エリア（編集モード時） */}
                      {editedValuationAmount1 && (
                        <>
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                              <Typography variant="body2" gutterBottom>
                                査定額1（最低額）
                              </Typography>
                              <Typography variant="h4">
                                ¥{parseInt(editedValuationAmount1).toLocaleString()}
                              </Typography>
                            </Paper>
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                              <Typography variant="body2" gutterBottom>
                                査定額2（中間額）
                              </Typography>
                              <Typography variant="h4">
                                ¥{editedValuationAmount2 ? parseInt(editedValuationAmount2).toLocaleString() : '-'}
                              </Typography>
                            </Paper>
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                              <Typography variant="body2" gutterBottom>
                                査定額3（最高額）
                              </Typography>
                              <Typography variant="h4">
                                ¥{editedValuationAmount3 ? parseInt(editedValuationAmount3).toLocaleString() : '-'}
                              </Typography>
                            </Paper>
                          </Grid>
                        </>
                      )}

                      <Grid item xs={12} md={4}>
                        <Box>
                          <TextField
                            fullWidth
                            label="固定資産税路線価"
                            type="number"
                            value={editedFixedAssetTaxRoadPrice}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEditedFixedAssetTaxRoadPrice(value);
                              if (value && parseFloat(value) > 0) {
                                debouncedAutoCalculate(value);
                              }
                            }}
                            disabled={autoCalculating}
                            InputProps={{
                              startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography>,
                            }}
                            helperText={autoCalculating ? '計算中...' : '値を入力すると1秒後に自動的に査定額が計算されます'}
                          />
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                            <Button
                              size="small"
                              href="https://www.chikamap.jp/chikamap/Portal?mid=216"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              路線価を確認
                            </Button>
                            {property?.address && (
                              <TextField
                                size="small"
                                value={property.address}
                                InputProps={{
                                  readOnly: true,
                                }}
                                sx={{ flex: 1, minWidth: '400px' }}
                                label="物件住所（コピー用）"
                              />
                            )}
                          </Box>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="査定担当"
                          value={valuationAssignee}
                          disabled
                          helperText="査定額を入力したユーザー"
                        />
                      </Grid>

                      {/* 手入力査定額セクション */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Typography variant="h6">
                            ✍️ 手入力査定額
                          </Typography>
                          {isManualValuation && (
                            <Chip 
                              label="手入力" 
                              color="primary" 
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                          {!isManualValuation && editedValuationAmount1 && (
                            <Chip 
                              label="自動計算" 
                              color="default" 
                              size="small"
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          マンション物件や、固定資産税路線価による自動計算が適切でない場合は、こちらに直接査定額を入力してください。
                          手入力された査定額は自動計算よりも優先されます。
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="査定額1（最低額）"
                          type="number"
                          value={editedManualValuationAmount1}
                          onChange={(e) => setEditedManualValuationAmount1(e.target.value)}
                          InputProps={{
                            endAdornment: <Typography sx={{ ml: 1 }}>万円</Typography>,
                          }}
                          helperText="必須（万円単位で入力）"
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="査定額2（中間額）"
                          type="number"
                          value={editedManualValuationAmount2}
                          onChange={(e) => setEditedManualValuationAmount2(e.target.value)}
                          InputProps={{
                            endAdornment: <Typography sx={{ ml: 1 }}>万円</Typography>,
                          }}
                          helperText="オプション（万円単位で入力）"
                        />
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="査定額3（最高額）"
                          type="number"
                          value={editedManualValuationAmount3}
                          onChange={(e) => setEditedManualValuationAmount3(e.target.value)}
                          InputProps={{
                            endAdornment: <Typography sx={{ ml: 1 }}>万円</Typography>,
                          }}
                          helperText="オプション（万円単位で入力）"
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={savingManualValuation ? <CircularProgress size={20} /> : <Save />}
                            onClick={handleSaveManualValuation}
                            disabled={savingManualValuation || !editedManualValuationAmount1}
                          >
                            {savingManualValuation ? '保存中...' : '手入力査定額を保存'}
                          </Button>
                          {isManualValuation && (
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={handleClearManualValuation}
                              disabled={savingManualValuation}
                            >
                              手入力査定額をクリア
                            </Button>
                          )}
                        </Box>
                      </Grid>

                      {/* 郵送・不要ボタン（編集モード） */}
                      <Grid item xs={12}>
                        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Button
                              variant={editedMailingStatus === '未' ? 'contained' : 'outlined'}
                              color={editedMailingStatus === '未' ? 'warning' : 'inherit'}
                              size="small"
                              onClick={() => handleMailingStatusChange('未')}
                              disabled={savingMailingStatus}
                            >
                              郵送
                            </Button>
                            <Button
                              variant={editedMailingStatus === '済' ? 'contained' : 'outlined'}
                              color={editedMailingStatus === '済' ? 'success' : 'inherit'}
                              size="small"
                              onClick={() => handleMailingStatusChange('済')}
                              disabled={savingMailingStatus}
                            >
                              済
                            </Button>
                            <Button
                              variant={editedMailingStatus === '不要' ? 'contained' : 'outlined'}
                              color={editedMailingStatus === '不要' ? 'secondary' : 'inherit'}
                              size="small"
                              onClick={() => handleMailingStatusChange('不要')}
                              disabled={savingMailingStatus}
                            >
                              不要
                            </Button>
                            {editedMailingStatus === '済' && editedMailSentDate && (
                              <Typography variant="body2" color="text.secondary">
                                郵送日: {new Date(editedMailSentDate).toLocaleDateString('ja-JP')}
                              </Typography>
                            )}
                            {savingMailingStatus && <CircularProgress size={20} />}
                          </Box>
                        </Box>
                      </Grid>

                      {/* 計算根拠セクション */}
                      {editedValuationAmount1 &&
                        property &&
                        (() => {
                          const landArea = property.landArea || 0;
                          const roadPrice = parseFloat(editedFixedAssetTaxRoadPrice) || 0;
                          const landPrice = (landArea * roadPrice) / 0.6;

                          const buildingArea = property.buildingArea || 0;
                          const buildYear = property.buildYear || 0;
                          const buildingAge = buildYear > 0 ? 2025 - buildYear : 0;
                          const unitPrice = 176200;
                          const basePrice = unitPrice * buildingArea;
                          const depreciation = basePrice * 0.9 * buildingAge * 0.031;
                          const buildingPrice = basePrice - depreciation;

                          return (
                            <Grid item xs={12}>
                              <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                                <Typography variant="h6" gutterBottom>
                                  計算根拠
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                <Grid container spacing={3}>
                                  <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 2, bgcolor: 'white' }}>
                                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">
                                        🏠 建物価格
                                      </Typography>
                                      <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
                                        ¥{Math.round(buildingPrice).toLocaleString()}
                                      </Typography>
                                      <Box sx={{ mt: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          物件種別:{' '}
                                          {property.propertyType === 'detached_house' ? '戸建て' : property.propertyType}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          構造: {property.structure || '木造'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          建物面積: {buildingArea}㎡
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          築年: {buildYear || '-'}年
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          築年数: {buildingAge}年
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          建築単価: ¥{unitPrice.toLocaleString()}/㎡
                                        </Typography>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 'bold' }}>
                                          計算式:
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          基準価格 = 建築単価 × 建物面積
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          = ¥{unitPrice.toLocaleString()} × {buildingArea}㎡
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          = ¥{Math.round(basePrice).toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                          減価償却 = 基準価格 × 0.9 × 築年数 × 0.031
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          = ¥{Math.round(basePrice).toLocaleString()} × 0.9 × {buildingAge} × 0.031
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          = ¥{Math.round(depreciation).toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                          建物価格 = 基準価格 - 減価償却
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          = ¥{Math.round(basePrice).toLocaleString()} - ¥
                                          {Math.round(depreciation).toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" fontWeight="bold">
                                          = ¥{Math.round(buildingPrice).toLocaleString()}
                                        </Typography>
                                      </Box>
                                    </Paper>
                                  </Grid>

                                  <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 2, bgcolor: 'white' }}>
                                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="success.main">
                                        🌳 土地価格
                                      </Typography>
                                      <Typography variant="h5" color="success.main" sx={{ mb: 2 }}>
                                        ¥{Math.round(landPrice).toLocaleString()}
                                      </Typography>
                                      <Box sx={{ mt: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          土地面積: {property.landArea || 0}㎡
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          固定資産税路線価: ¥
                                          {editedFixedAssetTaxRoadPrice
                                            ? parseInt(editedFixedAssetTaxRoadPrice).toLocaleString()
                                            : 0}
                                          /㎡
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                          計算式: 土地面積 × 固定資産税路線価 ÷ 0.6
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          （固定資産税路線価は実勢価格の約60%）
                                        </Typography>
                                      </Box>
                                    </Paper>
                                  </Grid>
                                </Grid>
                              </Paper>
                            </Grid>
                          );
                        })()}
                    </Grid>
                  </Box>
                )}
              </Paper>
            </Box>

            {/* 売主追客ログ */}
            <Box sx={{ mb: 3 }}>
              <CallLogDisplay sellerId={id!} />
              
              {/* 追客ログ履歴（APPSHEET） */}
              {seller?.sellerNumber && (
                <FollowUpLogHistoryTable sellerNumber={seller.sellerNumber} />
              )}
            </Box>

            {/* 他セクション */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                📌 他
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  if (editingSite) {
                    setEditedSite(seller?.site || '');
                  }
                  setEditingSite(!editingSite);
                }}
              >
                {editingSite ? 'キャンセル' : '編集'}
              </Button>
            </Box>
            <Paper sx={{ p: 2, mb: 3 }}>
              {!editingSite ? (
                // 表示モード
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    サイト
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {seller?.site || '未設定'}
                  </Typography>
                  
                  {/* 除外サイト */}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    除外サイト
                  </Typography>
                  {getExclusionSiteUrl() ? (
                    <Box sx={{ mt: 1 }}>
                      <a
                        href={getExclusionSiteUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#1976d2',
                          textDecoration: 'underline',
                          fontSize: '0.875rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        {getExclusionSiteUrl()}
                      </a>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                      URLなし（サイトが設定されていません）
                    </Typography>
                  )}
                  
                  {/* 除外基準 */}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    除外基準
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 1, 
                      whiteSpace: 'pre-line',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {getExclusionCriteria()}
                  </Typography>
                </Box>
              ) : (
                // 編集モード
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>サイト</InputLabel>
                      <Select
                        value={editedSite}
                        label="サイト"
                        onChange={(e) => setEditedSite(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>未選択</em>
                        </MenuItem>
                        {siteOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={savingSite ? <CircularProgress size={20} /> : <Save />}
                      onClick={handleSaveSite}
                      disabled={savingSite}
                    >
                      {savingSite ? '保存中...' : '保存'}
                    </Button>
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* 右側：通話メモ入力エリア（50%） */}
          <Grid
            item
            xs={6}
            sx={{
              height: '100%',
              overflow: 'auto',
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6">
                📝 通話メモ入力
              </Typography>
              {exclusionAction && (
                <Typography
                  variant="h5"
                  sx={{
                    color: 'error.main',
                    fontWeight: 'bold',
                    backgroundColor: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    border: 2,
                    borderColor: 'error.main',
                  }}
                >
                  ⚠️ {exclusionAction}
                </Typography>
              )}
            </Box>

            {/* 通話内容に残す言葉 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                通話内容に残す言葉
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  label="B'"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-b-prime');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '価格が知りたかっただけ');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-b-prime')}
                  sx={{
                    ...(getButtonState('call-memo-b-prime') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-b-prime') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="木２"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-wood-2f');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '木造２F');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-wood-2f')}
                  sx={{
                    ...(getButtonState('call-memo-wood-2f') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-wood-2f') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="土地面積"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-land-area');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '土地面積：だいたい');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-land-area')}
                  sx={{
                    ...(getButtonState('call-memo-land-area') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-land-area') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="太陽光"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-solar');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '太陽光付き');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-solar')}
                  sx={{
                    ...(getButtonState('call-memo-solar') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-solar') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="一旦机上"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-desk-valuation');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '一旦机上査定して、その後訪問考える');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-desk-valuation')}
                  sx={{
                    ...(getButtonState('call-memo-desk-valuation') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-desk-valuation') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="他社待ち"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-waiting-other');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + 'まだ他社の査定がでていない');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-waiting-other')}
                  sx={{
                    ...(getButtonState('call-memo-waiting-other') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-waiting-other') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="高く驚"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-surprised-high');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '思ったより査定額高かった');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-surprised-high')}
                  sx={{
                    ...(getButtonState('call-memo-surprised-high') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-surprised-high') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="名義"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-ownership');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '本人名義人：本人');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-ownership')}
                  sx={{
                    ...(getButtonState('call-memo-ownership') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-ownership') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="ローン"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-loan');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + 'ローン残：');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-loan')}
                  sx={{
                    ...(getButtonState('call-memo-loan') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-loan') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="売る気あり"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-willing-sell');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '売却には興味あり');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-willing-sell')}
                  sx={{
                    ...(getButtonState('call-memo-willing-sell') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-willing-sell') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
                <Chip
                  label="検討中"
                  onClick={() => {
                    handleQuickButtonClick('call-memo-considering');
                    setCallMemo(callMemo + (callMemo ? '\n' : '') + '検討中');
                  }}
                  size="small"
                  clickable
                  disabled={isButtonDisabled('call-memo-considering')}
                  sx={{
                    ...(getButtonState('call-memo-considering') === 'pending' && {
                      backgroundColor: '#fff9c4',
                      textDecoration: 'line-through',
                      color: 'text.secondary',
                    }),
                    ...(getButtonState('call-memo-considering') === 'persisted' && {
                      backgroundColor: '#e0e0e0',
                      textDecoration: 'line-through',
                      color: 'text.disabled',
                    }),
                  }}
                />
              </Box>
            </Box>

            {/* 通話メモ入力欄 */}
            <TextField
              fullWidth
              multiline
              rows={8}
              label="通話内容"
              placeholder="通話の内容を記録してください..."
              value={callMemo}
              onChange={(e) => setCallMemo(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* 保存ボタン */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={saving || !callMemo.trim()}
              onClick={handleSaveAndExit}
              sx={{ mb: 3 }}
            >
              {saving ? <CircularProgress size={24} /> : '保存'}
            </Button>

            {/* AI要約（通話履歴サマリー） */}
            {callSummary && (
              <>
                <Typography variant="h6" gutterBottom>
                  🤖 通話履歴サマリー（AI要約）
                </Typography>
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#e8f5e9', borderLeft: '4px solid #4caf50' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {callSummary}
                  </Typography>
                </Paper>
              </>
            )}

            {/* 過去のコミュニケーション履歴 */}
            <Typography variant="h6" gutterBottom>
              📋 コミュニケーション履歴
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              {/* スプレッドシートからのコメント */}
              {seller?.comments && (
                <Paper 
                  sx={{ 
                    p: 1.5, 
                    mb: 1, 
                    bgcolor: '#fff3e0',
                    borderLeft: '4px solid #ff9800'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      📝 スプレッドシートコメント
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 0.5,
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {seller.comments}
                  </Typography>
                </Paper>
              )}
              
              {/* 活動ログ（電話、SMS、Email） */}
              {activities
                .filter((activity) => activity.type === 'phone_call' || activity.type === 'sms' || activity.type === 'email')
                .slice(0, 10)
                .map((activity, index) => {
                  const displayName = getDisplayName(activity.employee);
                  const formattedDate = formatDateTime(activity.createdAt);
                  const displayText = `${displayName} ${formattedDate}`;
                  
                  let typeIcon = '📞';
                  let typeLabel = '通話';
                  let bgcolor = 'grey.50';
                  let borderColor = 'none';
                  
                  if (activity.type === 'sms') {
                    typeIcon = '💬';
                    typeLabel = 'SMS';
                    bgcolor = '#e3f2fd';
                    borderColor = '4px solid #2196f3';
                  } else if (activity.type === 'email') {
                    typeIcon = '📧';
                    typeLabel = 'Email';
                    bgcolor = '#f3e5f5';
                    borderColor = '4px solid #9c27b0';
                  }

                  return (
                    <Paper 
                      key={index} 
                      sx={{ 
                        p: 1.5, 
                        mb: 1, 
                        bgcolor: bgcolor,
                        borderLeft: borderColor
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                          {typeIcon} {typeLabel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                          {displayText}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {activity.content}
                      </Typography>
                    </Paper>
                  );
                })}
              {activities.filter((activity) => activity.type === 'phone_call' || activity.type === 'sms' || activity.type === 'email').length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  過去のコミュニケーション履歴はありません
                </Typography>
              )}
            </Box>

            {/* 実績セクション */}
            <Box sx={{ mt: 3 }}>
              <PerformanceMetricsSection />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* 確認ダイアログ */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={handleCancelSend}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog.type === 'email' ? 'Email送信確認' : 'SMS送信確認'}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.template && (
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {confirmDialog.template.label}
              </Typography>
              
              {confirmDialog.type === 'email' && (
                <>
                  <Box sx={{ mt: 2, mb: 2 }}>
                    <SenderAddressSelector
                      value={senderAddress}
                      onChange={handleSenderAddressChange}
                      employees={activeEmployees}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="送信先"
                      value={editableEmailRecipient}
                      onChange={(e) => setEditableEmailRecipient(e.target.value)}
                      size="small"
                      type="email"
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label="件名"
                      value={editableEmailSubject}
                      onChange={(e) => setEditableEmailSubject(e.target.value)}
                      size="small"
                    />
                  </Box>
                </>
              )}

              {confirmDialog.type === 'sms' && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    送信先
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {seller?.phoneNumber}
                  </Typography>
                </Box>
              )}
              
              <Box>
                {confirmDialog.type === 'email' ? (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      本文
                    </Typography>
                    <RichTextEmailEditor
                      value={editableEmailBody}
                      onChange={setEditableEmailBody}
                      placeholder="メール本文を入力..."
                      helperText="Ctrl+Vで画像を貼り付けられます（カーソル位置に挿入）"
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      本文
                    </Typography>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        mt: 1, 
                        bgcolor: 'grey.50',
                        whiteSpace: 'pre-line'
                      }}
                    >
                      <Typography variant="body2" component="div">
                        {confirmDialog.template?.content 
                          ? renderTextWithLinks(convertLineBreaks(confirmDialog.template.content))
                          : ''
                        }
                      </Typography>
                    </Paper>
                  </>
                )}
              </Box>

              {/* 画像添付ボタン（常に表示） */}
              {confirmDialog.type === 'email' && (
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
              )}

              <Alert severity="info" sx={{ mt: 2 }}>
                {confirmDialog.type === 'email' 
                  ? 'この内容でメールを送信します。よろしいですか？'
                  : 'この内容でSMSアプリを開きます。よろしいですか？'
                }
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSend} color="inherit">
            キャンセル
          </Button>
          <Button 
            onClick={handleConfirmSend} 
            variant="contained" 
            color="primary"
            disabled={sendingTemplate}
          >
            {sendingTemplate ? <CircularProgress size={20} /> : '送信'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 重複案件詳細モーダル */}
      <DuplicateDetailsModal
        open={duplicateModalOpen}
        onClose={handleCloseDuplicateModal}
        duplicates={duplicatesWithDetails}
        loading={detailsLoading}
        error={detailsError}
        onRetry={handleOpenDuplicateModal}
      />

      {/* ドキュメント管理モーダル */}
      {seller && (
        <DocumentModal
          open={documentModalOpen}
          onClose={() => setDocumentModalOpen(false)}
          sellerNumber={seller.sellerNumber || ''}
        />
      )}

      {/* 画像選択モーダル */}
      <ImageSelectorModal
        open={imageSelectorOpen}
        onConfirm={handleImageSelectionConfirm}
        onCancel={handleImageSelectionCancel}
      />
    </Box>
  );
};

export default CallModePage;
