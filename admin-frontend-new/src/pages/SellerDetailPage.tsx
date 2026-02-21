import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
} from '@mui/material';
import { ArrowBack, Save, Warning, Phone, Sms } from '@mui/icons-material';
import api, { employeeApi } from '../services/api';
import { Seller, PropertyInfo, SellerStatus, ConfidenceLevel } from '../types';
import { getDisplayName } from '../utils/employeeUtils';
import { formatDateTime } from '../utils/dateFormat';
import CallLogDisplay from '../components/CallLogDisplay';
import WorkTaskSection from '../components/WorkTaskSection';
import CallButton from '../components/CallButton';
import PhoneCallLogDisplay from '../components/PhoneCallLogDisplay';
import { useAuthStore } from '../store/authStore';
import EditableSection from '../components/EditableSection';
import CollapsibleSection from '../components/CollapsibleSection';
import CompactBuyerList from '../components/CompactBuyerList';
import ViewingNotesField from '../components/ViewingNotesField';
import LatestStatusDropdown from '../components/LatestStatusDropdown';

/**
 * 従業員名からイニシャルを抽出（バックエンドのemployeeUtils.tsと同じロジック）
 * @param name 従業員の名前（例: "田中 太郎", "Tanaka Taro", "国広智子"）
 * @returns イニシャル（例: "TT", "国"）
 */
const extractInitials = (name: string): string => {
  if (!name) return '';
  
  // スペースで分割
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 0) return '';
  
  // スペースがない場合（例: "国広智子"）は最初の文字のみ
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0][0].toUpperCase();
  }
  
  // 各パートの最初の文字を取得
  const initials = parts
    .map((part) => {
      if (part.length === 0) return '';
      // ローマ字の場合は最初の文字
      if (/^[A-Za-z]/.test(part)) {
        return part[0].toUpperCase();
      }
      // 日本語の場合は最初の文字を使用
      return part[0];
    })
    .join('');
  
  return initials.toUpperCase();
};

// 専任・他決要因の選択肢
const DECISION_FACTORS = [
  '知り合い',
  '価格が高い',
  '決定権者の把握',
  '連絡不足',
  '購入物件の紹介',
  '購入希望者がいる',
  '以前つきあいがあった不動産',
  'ヒアリング不足',
  '担当者の対応が良い',
  '査定書郵送',
  '１番電話のスピード',
  '対応スピード（訪問１社目もこれに含む）',
  '買取保証',
  '不明',
  '追客電話の対応',
  '説明が丁寧',
  '詳細な調査',
  '不誠実、やるべきことをしない',
  '定期的な追客電話',
  'HPの口コミ',
  '売買に強い（物件数、顧客が多い）',
  '仲介手数料のサービス',
  '仲介手数料以外のサービス（特典）',
  '妥当な査定額',
  '定期的なメール配信（Pinrich)',
  '提案力',
  '熱意',
];

const SellerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee } = useAuthStore();
  
  const [seller, setSeller] = useState<Seller | null>(null);
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);



  // 活動履歴の状態
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);

  // 予約関連の状態
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentAssignedTo, setAppointmentAssignedTo] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  
  // 日付と時間を分けて管理
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState(''); // "HH:mm" 形式
  const [endTime, setEndTime] = useState(''); // "HH:mm" 形式

  // 通話メモの状態
  const [showCallMemoDialog, setShowCallMemoDialog] = useState(false);
  const [callMemo, setCallMemo] = useState('');
  const [savingCallMemo, setSavingCallMemo] = useState(false);

  // SMSの状態
  const [showSmsDialog, setShowSmsDialog] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [creatingAppointment, setCreatingAppointment] = useState(false);



  // Google Chat通知の状態
  const [sendingChatNotification, setSendingChatNotification] = useState(false);

  // 編集用の状態
  const [editedStatus, setEditedStatus] = useState<SellerStatus>(SellerStatus.FOLLOWING_UP);
  const [editedConfidence, setEditedConfidence] = useState<ConfidenceLevel>(ConfidenceLevel.B);
  const [editedNextCallDate, setEditedNextCallDate] = useState<string>('');
  const [editedAssignedTo, setEditedAssignedTo] = useState<string>('');
  const [editedEmail, setEditedEmail] = useState<string>('');
  const [valuationAssignedBy, setValuationAssignedBy] = useState<string>('');
  const [editedValuationAmount1, setEditedValuationAmount1] = useState<string>('');
  const [editedValuationAmount2, setEditedValuationAmount2] = useState<string>('');
  const [editedValuationAmount3, setEditedValuationAmount3] = useState<string>('');
  
  // 売主基本情報の編集
  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [editedName, setEditedName] = useState<string>('');
  const [editedAddress, setEditedAddress] = useState<string>('');
  const [editedPhoneNumber, setEditedPhoneNumber] = useState<string>('');
  
  // 物件情報の編集
  const [editingProperty, setEditingProperty] = useState(false);
  const [editedPropertyAddress, setEditedPropertyAddress] = useState<string>('');
  const [editedPropertyType, setEditedPropertyType] = useState<string>('');
  const [editedLandArea, setEditedLandArea] = useState<string>('');
  const [editedBuildingArea, setEditedBuildingArea] = useState<string>('');
  const [editedBuildYear, setEditedBuildYear] = useState<string>('');
  const [editedFloorPlan, setEditedFloorPlan] = useState<string>('');
  
  // 競合情報の編集
  const [editedCompetitorName, setEditedCompetitorName] = useState<string>('');
  const [editedExclusiveOtherDecisionFactors, setEditedExclusiveOtherDecisionFactors] = useState<string[]>([]);
  const [editedOtherDecisionCountermeasure, setEditedOtherDecisionCountermeasure] = useState<string>('');
  const [editedContractYearMonth, setEditedContractYearMonth] = useState<string>('');
  const [editedExclusiveOtherDecisionMeeting, setEditedExclusiveOtherDecisionMeeting] = useState<string>('');

  // 内覧前伝達事項と最新状況の編集
  const [editedViewingNotes, setEditedViewingNotes] = useState<string>('');
  const [editedLatestStatus, setEditedLatestStatus] = useState<string>('');

  useEffect(() => {
    loadSellerData();
    loadActivities();
    loadAppointments();
    loadEmployees();
  }, [id]);

  // 初回ロード時の自動計算は行わない（ユーザーが入力したときのみ計算）

  const loadEmployees = async () => {
    try {
      const employeesData = await employeeApi.getAll();
      setEmployees(employeesData);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadBuyers = async (propertyNumber: string) => {
    try {
      setBuyersLoading(true);
      const response = await api.get(`/api/property-listings/${propertyNumber}/buyers`);
      setBuyers(response.data);
    } catch (err) {
      console.error('Failed to load buyers:', err);
      setBuyers([]);
    } finally {
      setBuyersLoading(false);
    }
  };

  const loadSellerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // キャッシュバスターを追加
      const timestamp = new Date().getTime();
      const response = await api.get(`/api/sellers/${id}?_t=${timestamp}`);
      const sellerData = response.data;
      
      setSeller(sellerData);
      const propertyData = sellerData.property || null;
      setProperty(propertyData);
      
      // 編集フィールドを初期化
      setEditedStatus(sellerData.status);
      setEditedConfidence(sellerData.confidence || ConfidenceLevel.B);
      setEditedNextCallDate(sellerData.nextCallDate || '');
      setEditedAssignedTo(sellerData.assignedTo || '');
      setEditedEmail(sellerData.email || '');
      setEditedValuationAmount1(sellerData.valuationAmount1?.toString() || '');
      setEditedValuationAmount2(sellerData.valuationAmount2?.toString() || '');
      setEditedValuationAmount3(sellerData.valuationAmount3?.toString() || '');
      setValuationAssignedBy(sellerData.valuationAssignee || '');
      setEditedName(sellerData.name);
      setEditedAddress(sellerData.address);
      setEditedPhoneNumber(sellerData.phoneNumber);
      
      // 競合情報の初期化
      setEditedCompetitorName(sellerData.competitorName || '');
      setEditedExclusiveOtherDecisionFactors(sellerData.exclusiveOtherDecisionFactors || []);
      setEditedOtherDecisionCountermeasure(sellerData.otherDecisionCountermeasure || '');
      setEditedContractYearMonth(sellerData.contractYearMonth || '');
      setEditedExclusiveOtherDecisionMeeting(sellerData.exclusiveOtherDecisionMeeting || '');
      
      // 内覧前伝達事項と最新状況の初期化
      setEditedViewingNotes(sellerData.viewingNotes || '');
      setEditedLatestStatus(sellerData.latestStatus || '');
      
      // 物件情報の初期化
      if (propertyData) {
        setEditedPropertyAddress(propertyData.address || '');
        setEditedPropertyType(propertyData.propertyType || '');
        setEditedLandArea(propertyData.landArea?.toString() || '');
        setEditedBuildingArea(propertyData.buildingArea?.toString() || '');
        setEditedBuildYear(propertyData.buildYear?.toString() || '');
        setEditedFloorPlan(propertyData.floorPlan || '');
      }

      // 買主データを読み込む（物件番号がある場合）
      if (sellerData.sellerNumber) {
        loadBuyers(sellerData.sellerNumber);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '売主情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await api.get(`/api/sellers/${id}/activities`);
      // スネークケースからキャメルケースに変換
      const convertedActivities = response.data.map((activity: any) => ({
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
      console.error('Failed to load activities:', err);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await api.get(`/appointments/seller/${id}`);
      // スネークケースからキャメルケースに変換
      const convertedAppointments = response.data.map((a: any) => ({
        id: a.id,
        sellerId: a.seller_id,
        employeeId: a.employee_id,
        startTime: a.start_time,
        endTime: a.end_time,
        location: a.location,
        calendarEventId: a.calendar_event_id,
        assignedTo: a.assigned_to,
        notes: a.notes,
        createdByName: a.created_by_name,
        createdAt: a.created_at,
      }));
      setAppointments(convertedAppointments);
    } catch (err: any) {
      console.error('Failed to load appointments:', err);
    }
  };

  const handleCreateAppointment = async () => {
    // バリデーション
    if (!appointmentDate || !startTime || !endTime) {
      setError('日付と時刻は全て必須です');
      return;
    }

    if (!appointmentAssignedTo) {
      setError('営担を選択してください');
      return;
    }

    // 営担のカレンダー接続状態を確認
    const selectedEmployee = employees.find((emp) => {
      const initials = extractInitials(emp.name);
      return initials === appointmentAssignedTo;
    });

    if (selectedEmployee && !selectedEmployee.calendarStatus?.isConnected) {
      setError(`営担（${appointmentAssignedTo}）がGoogleカレンダーを接続していません。接続してから再度お試しください。`);
      return;
    }

    try {
      setCreatingAppointment(true);
      setError(null);
      setSuccessMessage(null);

      // 日付と時間を組み合わせてISO形式に変換
      const startTimeString = `${appointmentDate}T${startTime}`;
      const endTimeString = `${appointmentDate}T${endTime}`;

      await api.post('/appointments', {
        sellerId: id,
        startTime: startTimeString,
        endTime: endTimeString,
        assignedTo: appointmentAssignedTo,
        notes: appointmentNotes || undefined,
      });

      setSuccessMessage(`訪問査定予約を作成し、営担（${appointmentAssignedTo}）のGoogleカレンダーに登録しました`);
      setShowAppointmentForm(false);
      setAppointmentDate('');
      setStartTime('');
      setEndTime('');
      setAppointmentAssignedTo('');
      setAppointmentNotes('');
      await loadAppointments();
      await loadSellerData(); // ステータスが更新されるため
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '予約の作成に失敗しました');
    } finally {
      setCreatingAppointment(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('この予約をキャンセルしますか？')) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      await api.delete(`/appointments/${appointmentId}`);
      setSuccessMessage('予約をキャンセルしました');
      await loadAppointments();
      await loadSellerData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '予約のキャンセルに失敗しました');
    }
  };

  const handleSaveProperty = async () => {
    if (!property) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await api.put(`/properties/${property.id}`, {
        address: editedPropertyAddress,
        propertyType: editedPropertyType || null,
        landArea: editedLandArea ? parseFloat(editedLandArea) : null,
        buildingArea: editedBuildingArea ? parseFloat(editedBuildingArea) : null,
        buildYear: editedBuildYear ? parseInt(editedBuildYear, 10) : null,
        floorPlan: editedFloorPlan || null,
      });

      // 更新されたプロパティデータを直接設定
      if (response.data.property) {
        setProperty(response.data.property);
      }

      setSuccessMessage('物件情報を更新しました');
      setEditingProperty(false);
      
      // ページをリロードして最新データを取得
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '物件情報の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    // 競合情報のバリデーション
    if (shouldShowCompetitorInfo()) {
      if (!editedCompetitorName) {
        setError('競合名は必須項目です');
        return;
      }
      if (editedExclusiveOtherDecisionFactors.length === 0) {
        setError('専任・他決要因を少なくとも1つ選択してください');
        return;
      }
      if (!editedOtherDecisionCountermeasure) {
        setError('他決対策は必須項目です');
        return;
      }
      if (!editedContractYearMonth) {
        setError('契約年月は必須項目です');
        return;
      }
      if (!editedExclusiveOtherDecisionMeeting) {
        setError('専任他決打合せは必須項目です');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updateData: any = {
        status: editedStatus,
        confidence: editedConfidence,
        nextCallDate: editedNextCallDate || null,
        assignedTo: editedAssignedTo || null,
        email: editedEmail || null,
        // 競合情報
        competitorName: editedCompetitorName || null,
        exclusiveOtherDecisionFactors: editedExclusiveOtherDecisionFactors.length > 0 ? editedExclusiveOtherDecisionFactors : null,
        otherDecisionCountermeasure: editedOtherDecisionCountermeasure || null,
        contractYearMonth: editedContractYearMonth || null,
        exclusiveOtherDecisionMeeting: editedExclusiveOtherDecisionMeeting || null,
        // 内覧前伝達事項と最新状況
        viewingNotes: editedViewingNotes || null,
        latestStatus: editedLatestStatus || null,
      };

      // 基本情報も更新する場合
      if (editingBasicInfo) {
        updateData.name = editedName;
        updateData.address = editedAddress;
        updateData.phoneNumber = editedPhoneNumber;
      }

      await api.put(`/api/sellers/${id}`, updateData);

      // データを再読み込みしてから編集モードを解除
      await loadSellerData();
      setEditingBasicInfo(false);
      setSuccessMessage('売主情報を更新しました');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCallMemo = async () => {
    if (!callMemo.trim()) {
      setError('通話メモを入力してください');
      return;
    }

    try {
      setSavingCallMemo(true);
      setError(null);

      await api.post(`/api/sellers/${id}/activities`, {
        type: 'phone_call',
        content: callMemo,
        result: 'completed',
      });

      setSuccessMessage('通話メモを保存しました');
      setShowCallMemoDialog(false);
      setCallMemo('');
      await loadActivities();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '通話メモの保存に失敗しました');
    } finally {
      setSavingCallMemo(false);
    }
  };

  const handleSmsClick = () => {
    setShowSmsDialog(true);
  };

  const handleSendSms = async () => {
    if (!smsMessage.trim()) {
      setError('メッセージを入力してください');
      return;
    }

    try {
      setSendingSms(true);
      setError(null);

      // SMSを送信（実際のSMS送信はここでは行わず、記録のみ）
      await api.post(`/api/sellers/${id}/activities`, {
        type: 'sms',
        content: smsMessage,
        result: 'sent',
      });

      // SMS送信用のリンクを開く
      if (seller?.phoneNumber) {
        window.open(`sms:${seller.phoneNumber}?body=${encodeURIComponent(smsMessage)}`, '_blank');
      }

      setSuccessMessage('SMS送信記録を保存しました');
      setShowSmsDialog(false);
      setSmsMessage('');
      await loadActivities();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'SMS記録の保存に失敗しました');
    } finally {
      setSendingSms(false);
    }
  };

  const handleSendChatNotification = async (notificationType: string) => {
    try {
      setSendingChatNotification(true);
      setError(null);

      await api.post('/chat-notifications/send', {
        sellerId: id,
        notificationType,
      });

      setSuccessMessage('Google Chat通知を送信しました');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Google Chat通知の送信に失敗しました');
    } finally {
      setSendingChatNotification(false);
    }
  };

  const getStatusLabel = (status: SellerStatus | string): string => {
    // スプレッドシートから同期された日本語の値をそのまま表示
    if (status && typeof status === 'string' && !Object.values(SellerStatus).includes(status as SellerStatus)) {
      return status;
    }
    
    const labels: Record<SellerStatus, string> = {
      [SellerStatus.FOLLOWING_UP]: '追客中',
      [SellerStatus.APPOINTMENT_SCHEDULED]: '訪問査定予定',
      [SellerStatus.VISITED]: '訪問済み',
      [SellerStatus.EXCLUSIVE_CONTRACT]: '専任媒介',
      [SellerStatus.GENERAL_CONTRACT]: '一般媒介',
      [SellerStatus.CONTRACTED]: '契約済み',
      [SellerStatus.OTHER_DECISION]: '他決',
      [SellerStatus.FOLLOW_UP_NOT_NEEDED]: '追客不要',
      [SellerStatus.LOST]: '失注',
    };
    return labels[status as SellerStatus] || status;
  };

  const getStatusColor = (status: SellerStatus | string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    // スプレッドシートから同期された日本語の値の色を判定
    if (status && typeof status === 'string' && !Object.values(SellerStatus).includes(status as SellerStatus)) {
      if (status.includes('専任') || status.includes('一般媒介')) return 'success';
      if (status.includes('他決')) return 'warning';
      if (status.includes('追客')) return 'primary';
      if (status.includes('訪問')) return 'secondary';
      if (status.includes('失注')) return 'error';
      return 'default';
    }
    
    const colors: Record<SellerStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      [SellerStatus.FOLLOWING_UP]: 'primary',
      [SellerStatus.APPOINTMENT_SCHEDULED]: 'secondary',
      [SellerStatus.VISITED]: 'default',
      [SellerStatus.EXCLUSIVE_CONTRACT]: 'success',
      [SellerStatus.GENERAL_CONTRACT]: 'success',
      [SellerStatus.CONTRACTED]: 'success',
      [SellerStatus.OTHER_DECISION]: 'warning',
      [SellerStatus.FOLLOW_UP_NOT_NEEDED]: 'default',
      [SellerStatus.LOST]: 'error',
    };
    return colors[status as SellerStatus] || 'default';
  };

  const getPropertyTypeLabel = (propertyType: string): string => {
    const labels: Record<string, string> = {
      // Abbreviated forms (from spreadsheet)
      '戸': '戸建て',
      'マ': 'マンション',
      '土': '土地',
      // English forms (legacy)
      'detached_house': '戸建て',
      'apartment': 'マンション',
      'land': '土地',
      'commercial': '商業施設',
      // Full Japanese forms
      '戸建': '戸建て',
      '戸建て': '戸建て',
      'マンション': 'マンション',
      '土地': '土地',
    };
    return labels[propertyType] || propertyType;
  };

  // 競合情報セクションを表示するかどうかを判定
  const shouldShowCompetitorInfo = (): boolean => {
    const targetStatuses = [
      'exclusive_contract_other_decision', // 専任媒介他決
      'follow_up_other_decision', // 追客他決
      'follow_up_not_needed_other_decision', // 追客不要他決
      'exclusive_other_decision', // 専任他決
      'general_contract', // 一般
    ];
    return targetStatuses.includes(editedStatus);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!seller) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">売主情報が見つかりません</Alert>
      </Container>
    );
  }

  // 当日TELかどうかを判定
  const isTodayCall = () => {
    if (seller.status !== SellerStatus.FOLLOWING_UP || !seller.nextCallDate) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextCallDate = new Date(seller.nextCallDate);
    nextCallDate.setHours(0, 0, 0, 0);
    return today.getTime() === nextCallDate.getTime();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/')}
          variant="outlined"
        >
          一覧
        </Button>
        <Typography variant="h4" component="h1">
          売主詳細
        </Typography>
        {isTodayCall() && (
          <Chip
            label="当日TEL"
            color="error"
            sx={{ fontWeight: 'bold' }}
          />
        )}
        <Chip
          label={getStatusLabel(seller.status)}
          color={getStatusColor(seller.status)}
          sx={{ ml: isTodayCall() ? 0 : 2 }}
        />
        <Button
          onClick={() => navigate(`/sellers/${id}/call`)}
          variant="contained"
          color="primary"
          sx={{ ml: 2 }}
        >
          →コメント
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={0.5}>
        {/* 第1行: 査定情報（全幅） */}
        <Grid item xs={12}>
          <Paper sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontSize: '14px', fontWeight: 600 }}>査定情報</Typography>
              <Button size="small" variant="outlined" sx={{ fontSize: '10px', py: 0.25, px: 1 }} onClick={() => navigate(`/sellers/${id}/call`)}>
                通話モードで編集
              </Button>
            </Box>
            <Divider sx={{ mb: 0.5 }} />
            {editedValuationAmount1 ? (
              <Box>
                <Typography sx={{ fontSize: '15px', fontWeight: 600, mb: 0 }}>
                  {Math.round(parseInt(editedValuationAmount1) / 10000)}万円 ～{' '}
                  {editedValuationAmount2 ? Math.round(parseInt(editedValuationAmount2) / 10000) : '-'}万円 ～{' '}
                  {editedValuationAmount3 ? Math.round(parseInt(editedValuationAmount3) / 10000) : '-'}万円
                </Typography>
                {valuationAssignedBy && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                    査定担当: {valuationAssignedBy}
                  </Typography>
                )}
              </Box>
            ) : (
              <Alert severity="info" sx={{ py: 0.25, fontSize: '10px' }}>査定額が未設定です。通話モードで計算してください。</Alert>
            )}
          </Paper>
        </Grid>

        {/* 第2行: 管理情報 + 物件情報 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 1, mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontSize: '15px', fontWeight: 600, mb: 0.5 }}>
              管理情報
            </Typography>
            <Divider sx={{ mb: 0.5 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>ステータス</InputLabel>
                  <Select
                    value={editedStatus}
                    label="ステータス"
                    onChange={(e) => setEditedStatus(e.target.value as SellerStatus)}
                  >
                    <MenuItem value={SellerStatus.FOLLOWING_UP}>追客中</MenuItem>
                    <MenuItem value={SellerStatus.APPOINTMENT_SCHEDULED}>訪問査定予定</MenuItem>
                    <MenuItem value={SellerStatus.VISITED}>訪問済み</MenuItem>
                    <MenuItem value={SellerStatus.EXCLUSIVE_CONTRACT}>専任媒介</MenuItem>
                    <MenuItem value={SellerStatus.GENERAL_CONTRACT}>一般媒介</MenuItem>
                    <MenuItem value={SellerStatus.CONTRACTED}>契約済み</MenuItem>
                    <MenuItem value={SellerStatus.OTHER_DECISION}>他決</MenuItem>
                    <MenuItem value={SellerStatus.FOLLOW_UP_NOT_NEEDED}>追客不要</MenuItem>
                    <MenuItem value={SellerStatus.LOST}>失注</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 競合情報セクション（特定のステータス時のみ表示） */}
              {shouldShowCompetitorInfo() && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }}>
                      <Chip label="競合情報（必須）" color="error" />
                    </Divider>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="競合名"
                      value={editedCompetitorName}
                      onChange={(e) => setEditedCompetitorName(e.target.value)}
                      placeholder="競合会社名を入力"
                      error={!editedCompetitorName}
                      helperText={!editedCompetitorName ? '必須項目です' : ''}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth required error={editedExclusiveOtherDecisionFactors.length === 0}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        専任・他決要因（複数選択可）*
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {DECISION_FACTORS.map((factor) => (
                          <Chip
                            key={factor}
                            label={factor}
                            onClick={() => {
                              if (editedExclusiveOtherDecisionFactors.includes(factor)) {
                                setEditedExclusiveOtherDecisionFactors(
                                  editedExclusiveOtherDecisionFactors.filter((f) => f !== factor)
                                );
                              } else {
                                setEditedExclusiveOtherDecisionFactors([
                                  ...editedExclusiveOtherDecisionFactors,
                                  factor,
                                ]);
                              }
                            }}
                            color={editedExclusiveOtherDecisionFactors.includes(factor) ? 'primary' : 'default'}
                            variant={editedExclusiveOtherDecisionFactors.includes(factor) ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Box>
                      {editedExclusiveOtherDecisionFactors.length === 0 && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          少なくとも1つ選択してください
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="他決対策"
                      value={editedOtherDecisionCountermeasure}
                      onChange={(e) => setEditedOtherDecisionCountermeasure(e.target.value)}
                      placeholder="対策を入力"
                      multiline
                      rows={3}
                      error={!editedOtherDecisionCountermeasure}
                      helperText={!editedOtherDecisionCountermeasure ? '必須項目です' : ''}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="契約年月"
                      type="month"
                      value={editedContractYearMonth}
                      onChange={(e) => setEditedContractYearMonth(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      error={!editedContractYearMonth}
                      helperText={!editedContractYearMonth ? '必須項目です' : ''}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth required error={!editedExclusiveOtherDecisionMeeting}>
                      <InputLabel>専任他決打合せ</InputLabel>
                      <Select
                        value={editedExclusiveOtherDecisionMeeting}
                        label="専任他決打合せ"
                        onChange={(e) => setEditedExclusiveOtherDecisionMeeting(e.target.value)}
                      >
                        <MenuItem value="未">未</MenuItem>
                        <MenuItem value="完了">完了</MenuItem>
                      </Select>
                      {!editedExclusiveOtherDecisionMeeting && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          必須項目です
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <FormControl fullWidth>
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
                  label="次電日"
                  type="date"
                  value={editedNextCallDate}
                  onChange={(e) => setEditedNextCallDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="担当社員ID"
                  value={editedAssignedTo}
                  onChange={(e) => setEditedAssignedTo(e.target.value)}
                  placeholder="担当社員のIDを入力"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="メールアドレス"
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  placeholder="example@example.com"
                />
              </Grid>

              {/* 内覧前伝達事項 */}
              <Grid item xs={12}>
                <ViewingNotesField
                  value={editedViewingNotes}
                  onChange={setEditedViewingNotes}
                  disabled={saving}
                />
              </Grid>

              {/* 最新状況 */}
              <Grid item xs={12}>
                <LatestStatusDropdown
                  value={editedLatestStatus}
                  onChange={setEditedLatestStatus}
                  disabled={saving}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={loadSellerData}
                    disabled={saving}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    保存
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* 第2行: 物件情報 */}
        <Grid item xs={12} md={6}>
          <EditableSection
            title="物件情報"
            isEditing={editingProperty}
            onEdit={() => setEditingProperty(true)}
            onCancel={() => {
              if (property) {
                setEditedPropertyAddress(property.address || '');
                setEditedPropertyType(property.propertyType || '');
                setEditedLandArea(property.landArea?.toString() || '');
                setEditedBuildingArea(property.buildingArea?.toString() || '');
                setEditedBuildYear(property.buildYear?.toString() || '');
                setEditedFloorPlan(property.floorPlan || '');
              }
              setEditingProperty(false);
            }}
            onSave={handleSaveProperty}
            saving={saving}
            editContent={
              property ? (
                <>
                  <Box sx={{ mb: 1.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="物件住所"
                      value={editedPropertyAddress}
                      onChange={(e) => setEditedPropertyAddress(e.target.value)}
                    />
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>物件種別</InputLabel>
                      <Select
                        value={editedPropertyType || ''}
                        label="物件種別"
                        onChange={(e) => setEditedPropertyType(e.target.value)}
                      >
                        <MenuItem value="">未設定</MenuItem>
                        <MenuItem value="detached_house">戸建て</MenuItem>
                        <MenuItem value="apartment">マンション</MenuItem>
                        <MenuItem value="land">土地</MenuItem>
                        <MenuItem value="commercial">商業施設</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="土地面積（m²）"
                      type="number"
                      value={editedLandArea}
                      onChange={(e) => setEditedLandArea(e.target.value)}
                    />
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="建物面積（m²）"
                      type="number"
                      value={editedBuildingArea}
                      onChange={(e) => setEditedBuildingArea(e.target.value)}
                    />
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="築年"
                      type="number"
                      value={editedBuildYear}
                      onChange={(e) => setEditedBuildYear(e.target.value)}
                    />
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="間取り"
                      value={editedFloorPlan}
                      onChange={(e) => setEditedFloorPlan(e.target.value)}
                      placeholder="例: 3LDK"
                    />
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  物件情報が登録されていません
                </Typography>
              )
            }
          >
            {property ? (
                <>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                      物件住所
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontSize: '13px' }}>{property.address}</Typography>
                      <Link
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ fontSize: '11px', textDecoration: 'none', color: 'primary.main', fontWeight: 600 }}
                      >
                        [地図]
                      </Link>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                      物件種別
                    </Typography>
                    <Typography variant="body1" sx={{ fontSize: '13px' }}>{getPropertyTypeLabel(property.propertyType)}</Typography>
                  </Box>

                  {property.landArea && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                        土地面積
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '13px' }}>{property.landArea} m²</Typography>
                    </Box>
                  )}

                  {property.buildingArea && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                        建物面積
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '13px' }}>{property.buildingArea} m²</Typography>
                    </Box>
                  )}

                  {property.buildYear && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                        築年
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '13px' }}>{property.buildYear}年</Typography>
                    </Box>
                  )}

                  {property.floorPlan && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                        間取り
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '13px' }}>{property.floorPlan}</Typography>
                    </Box>
                  )}
                </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                物件情報が登録されていません
              </Typography>
            )}
          </EditableSection>
        </Grid>

        {/* 第3行: 買主リスト（全幅） */}
        <Grid item xs={12}>
          <Paper sx={{ p: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '14px', fontWeight: 600, mb: 0.5 }}>
              買主リスト {buyers.length > 0 && `(${buyers.length}件)`}
            </Typography>
            <Divider sx={{ mb: 0.5 }} />
            <CompactBuyerList buyers={buyers} loading={buyersLoading} />
          </Paper>
        </Grid>

        {/* 第4行: 売主情報 */}
        <Grid item xs={12} md={6}>
          <EditableSection
            title="売主情報"
            isEditing={editingBasicInfo}
            onEdit={() => setEditingBasicInfo(true)}
            onCancel={() => {
              setEditedName(seller.name);
              setEditedAddress(seller.address);
              setEditedPhoneNumber(seller.phoneNumber);
              setEditingBasicInfo(false);
            }}
            onSave={handleSave}
            saving={saving}
            editContent={
              <>
                <Box sx={{ mb: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="氏名"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                  />
                </Box>

                <Box sx={{ mb: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="住所"
                    value={editedAddress}
                    onChange={(e) => setEditedAddress(e.target.value)}
                  />
                </Box>

                <Box sx={{ mb: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="電話番号"
                    value={editedPhoneNumber}
                    onChange={(e) => setEditedPhoneNumber(e.target.value)}
                  />
                </Box>
              </>
            }
          >
            <>
              {seller.sellerNumber && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    売主番号
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold" sx={{ fontSize: '16px' }}>
                    {seller.sellerNumber}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                  氏名
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '13px' }}>{seller.name}</Typography>
              </Box>

              {seller.inquirySource && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    問い合わせ元
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '13px' }}>{seller.inquirySource}</Typography>
                </Box>
              )}

              {seller.inquiryYear && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    反響年
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '13px' }}>{seller.inquiryYear}</Typography>
                </Box>
              )}

              {seller.inquiryDate && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    問い合わせ日
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '13px' }}>
                    {new Date(seller.inquiryDate).toLocaleDateString('ja-JP')}
                  </Typography>
                </Box>
              )}

              {(seller.inquirySite || seller.site) && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    サイト
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '13px' }}>{seller.inquirySite || seller.site}</Typography>
                </Box>
              )}

              {seller.confidenceLevel && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    確度
                  </Typography>
                  <Chip
                    label={
                      seller.confidenceLevel === 'A' ? 'A（売る気あり）' :
                      seller.confidenceLevel === 'B' ? 'B（売る気あるがまだ先の話）' :
                      seller.confidenceLevel === 'B_PRIME' ? "B'（売る気は全く無い）" :
                      seller.confidenceLevel === 'C' ? 'C（電話が繋がらない）' :
                      seller.confidenceLevel === 'D' ? 'D（再建築不可）' :
                      seller.confidenceLevel === 'E' ? 'E（収益物件）' :
                      seller.confidenceLevel === 'DUPLICATE' ? 'ダブり（重複している）' :
                      seller.confidenceLevel
                    }
                    color={
                      seller.confidenceLevel === 'A' ? 'success' :
                      seller.confidenceLevel === 'B' ? 'info' :
                      seller.confidenceLevel === 'C' ? 'warning' :
                      'default'
                    }
                    size="small"
                  />
                </Box>
              )}

              {seller.firstCallerInitials && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    初電者
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '13px' }}>{seller.firstCallerInitials}</Typography>
                </Box>
              )}

              {seller.isUnreachable && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    連絡状況
                  </Typography>
                  <Chip label="不通" color="error" size="small" icon={<Warning />} />
                  {seller.unreachableSince && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {new Date(seller.unreachableSince).toLocaleDateString('ja-JP')}から
                    </Typography>
                  )}
                </Box>
              )}

              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                  住所
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '13px' }}>{seller.address}</Typography>
              </Box>

              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                  電話番号
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Link
                    href={`tel:${seller.phoneNumber}`}
                    sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Phone fontSize="small" />
                    <Typography variant="body1">{seller.phoneNumber}</Typography>
                  </Link>
                  {employee && seller && (
                    <CallButton
                      seller={seller}
                      userId={employee.id}
                      onCallStarted={(callLogId) => {
                        console.log('Call started:', callLogId);
                        // Reload activities to show the new call log
                        loadActivities();
                      }}
                      onError={(error) => {
                        setError(error.message);
                      }}
                    />
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/sellers/${id}/call`)}
                    startIcon={<Phone />}
                  >
                    通話メモ
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSmsClick}
                    startIcon={<Sms />}
                  >
                    SMS
                  </Button>
                </Box>
              </Box>

              {seller.email && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                    メールアドレス
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '13px' }}>{seller.email}</Typography>
                </Box>
              )}

              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '11px', mb: 0.5 }}>
                  登録日
                </Typography>
                <Typography variant="body1" sx={{ fontSize: '13px' }}>
                  {new Date(seller.createdAt).toLocaleDateString('ja-JP')}
                </Typography>
              </Box>
            </>
          </EditableSection>
        </Grid>

        {/* Google Chat通知 */}
        <Grid item xs={12}>
          <CollapsibleSection title="Google Chat通知" defaultExpanded={false}>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => handleSendChatNotification('general_contract')}
                disabled={sendingChatNotification}
              >
                一般媒介通知
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleSendChatNotification('exclusive_contract')}
                disabled={sendingChatNotification}
              >
                専任取得通知
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleSendChatNotification('post_visit_other_decision')}
                disabled={sendingChatNotification}
              >
                訪問後他決共有
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleSendChatNotification('pre_visit_other_decision')}
                disabled={sendingChatNotification}
              >
                未訪問他決共有
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleSendChatNotification('property_introduction')}
                disabled={sendingChatNotification}
              >
                物件紹介
              </Button>
            </Box>
          </CollapsibleSection>
        </Grid>

        {/* 訪問査定予約 */}
        <Grid item xs={12}>
          <CollapsibleSection 
            title="訪問査定予約" 
            count={appointments.length}
            defaultExpanded={true}
          >
            {/* スプレッドシート同期情報 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                スプレッドシート同期情報
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    訪問取得日
                  </Typography>
                  <Typography variant="body1">
                    {seller?.visitAcquisitionDate 
                      ? new Date(seller.visitAcquisitionDate).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                      : '未設定'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    訪問日
                  </Typography>
                  <Typography variant="body1">
                    {seller?.visitDate 
                      ? new Date(seller.visitDate).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                      : '未設定'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    訪問査定取得者
                  </Typography>
                  <Typography variant="body1">
                    {seller?.visitValuationAcquirer || '未設定'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    営担
                  </Typography>
                  <Typography variant="body1">
                    {seller?.visitAssignee || '未設定'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => setShowAppointmentForm(!showAppointmentForm)}
                disabled={!property}
              >
                {showAppointmentForm ? 'キャンセル' : '新規予約'}
              </Button>
            </Box>

            {!property && (
              <Alert severity="info" sx={{ mb: 2 }}>
                物件情報が登録されていないため、予約を作成できません
              </Alert>
            )}

            {showAppointmentForm && (
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" gutterBottom>
                  予約作成
                </Typography>
                <Grid container spacing={2}>
                  {/* 日付選択 */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="日付"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  {/* 開始時刻 */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="開始時刻"
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        // 開始時刻が設定されたら終了時刻を1時間後に自動設定
                        if (e.target.value) {
                          const [hour, minute] = e.target.value.split(':');
                          const endH = (parseInt(hour) + 1) % 24;
                          setEndTime(`${String(endH).padStart(2, '0')}:${minute}`);
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  {/* 終了時刻 */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="終了時刻"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>営担（イニシャル）</InputLabel>
                      <Select
                        value={appointmentAssignedTo || ''}
                        onChange={(e) => setAppointmentAssignedTo(e.target.value)}
                        label="営担（イニシャル）"
                      >
                        {employees.map((emp) => {
                          const initials = extractInitials(emp.name);
                          const isConnected = emp.calendarStatus?.isConnected;
                          const statusIcon = isConnected ? '✓' : '⚠️';
                          
                          console.log('Employee dropdown:', { name: emp.name, initials, id: emp.id });
                          
                          return (
                            <MenuItem key={emp.id} value={initials}>
                              {statusIcon} {emp.name} ({initials})
                              {!isConnected && ' - カレンダー未接続'}
                            </MenuItem>
                          );
                        })}
                      </Select>
                      {appointmentAssignedTo && employees.find((emp) => {
                        const initials = extractInitials(emp.name);
                        return initials === appointmentAssignedTo && !emp.calendarStatus?.isConnected;
                      }) && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          選択された営担はGoogleカレンダーを接続していません。予約を作成できません。
                        </Alert>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="備考"
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder="その他の情報や注意事項"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setShowAppointmentForm(false);
                          setAppointmentDate('');
                          setStartTime('');
                          setEndTime('');
                          setAppointmentAssignedTo('');
                          setAppointmentNotes('');
                        }}
                        disabled={creatingAppointment}
                      >
                        キャンセル
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={creatingAppointment ? <CircularProgress size={20} /> : null}
                        onClick={handleCreateAppointment}
                        disabled={creatingAppointment}
                      >
                        予約作成
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {appointments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                予約がありません
              </Typography>
            ) : (
              <Box>
                {appointments.map((appointment, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          開始時刻
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {new Date(appointment.startTime).toLocaleString('ja-JP')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          終了時刻
                        </Typography>
                        <Typography variant="body1">
                          {new Date(appointment.endTime).toLocaleString('ja-JP')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          場所
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {appointment.location}
                        </Typography>
                        {appointment.assignedTo && (
                          <>
                            <Typography variant="body2" color="text.secondary">
                              営担
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                              {appointment.assignedTo}
                            </Typography>
                          </>
                        )}
                        {appointment.createdByName && (
                          <>
                            <Typography variant="body2" color="text.secondary">
                              予約作成者
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 1 }}>
                              {appointment.createdByName}
                            </Typography>
                          </>
                        )}
                        {appointment.notes && (
                          <>
                            <Typography variant="body2" color="text.secondary">
                              備考
                            </Typography>
                            <Typography variant="body2">
                              {appointment.notes}
                            </Typography>
                          </>
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                          <Chip
                            label="Googleカレンダーに登録済み"
                            color="success"
                            size="small"
                          />
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleCancelAppointment(appointment.id)}
                          >
                            キャンセル
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            )}
          </CollapsibleSection>
        </Grid>

        {/* AI電話統合 - 通話履歴 */}
        <Grid item xs={12}>
          <CollapsibleSection title="AI電話統合" defaultExpanded={false}>
            <PhoneCallLogDisplay 
              sellerId={id!} 
              limit={10}
              showTranscription={true}
            />
          </CollapsibleSection>
        </Grid>

        {/* 追客ログ */}
        <Grid item xs={12}>
          <CollapsibleSection title="追客ログ" defaultExpanded={false}>
            <CallLogDisplay sellerId={id!} />
          </CollapsibleSection>
        </Grid>

        {/* 業務依頼 */}
        {seller.sellerNumber && (
          <Grid item xs={12}>
            <WorkTaskSection sellerNumber={seller.sellerNumber} />
          </Grid>
        )}

        {/* メール送信履歴 */}
        <Grid item xs={12}>
          <CollapsibleSection 
            title="メール送信履歴" 
            count={activities.filter(a => a.type === 'email').length}
            defaultExpanded={false}
          >

            {activities.filter(a => a.type === 'email').length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                メール送信履歴がありません
              </Typography>
            ) : (
              <Box>
                {activities
                  .filter(a => a.type === 'email')
                  .map((activity, index) => (
                    <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                          <Typography variant="body2" color="text.secondary">
                            件名
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {activity.metadata?.subject || activity.content}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            送信先
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {activity.metadata?.recipient_email}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" color="text.secondary">
                            送信日時
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {new Date(activity.created_at).toLocaleString('ja-JP')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ステータス
                          </Typography>
                          <Chip
                            label={activity.result || '送信成功'}
                            color="success"
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            size="small"
                            onClick={() => setSelectedEmail(selectedEmail?.id === activity.id ? null : activity)}
                          >
                            {selectedEmail?.id === activity.id ? '本文を隠す' : '本文を表示'}
                          </Button>
                          {selectedEmail?.id === activity.id && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                メール本文
                              </Typography>
                              <Box
                                sx={{ 
                                  maxHeight: '400px', 
                                  overflow: 'auto',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: 1,
                                  p: 2
                                }}
                                dangerouslySetInnerHTML={{ __html: activity.metadata?.body || '' }}
                              />
                            </Box>
                          )}
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
              </Box>
            )}
          </CollapsibleSection>
        </Grid>
      </Grid>

      {/* 通話メモダイアログ */}
      <Dialog open={showCallMemoDialog} onClose={() => setShowCallMemoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>通話メモ</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  よく使うフレーズ
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label="興味あり"
                    onClick={() => setCallMemo(callMemo + '売却に興味を持っている。')}
                    size="small"
                  />
                  <Chip
                    label="検討中"
                    onClick={() => setCallMemo(callMemo + '現在検討中とのこと。')}
                    size="small"
                  />
                  <Chip
                    label="不在"
                    onClick={() => setCallMemo(callMemo + '不在のため、後日再度連絡予定。')}
                    size="small"
                  />
                  <Chip
                    label="訪問希望"
                    onClick={() => setCallMemo(callMemo + '訪問査定を希望している。')}
                    size="small"
                  />
                  <Chip
                    label="資料送付"
                    onClick={() => setCallMemo(callMemo + '資料送付を依頼された。')}
                    size="small"
                  />
                  <Chip
                    label="急ぎ"
                    onClick={() => setCallMemo(callMemo + '早急な対応を希望している。')}
                    size="small"
                  />
                </Box>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="通話内容"
                placeholder="通話の内容を記録してください..."
                value={callMemo}
                onChange={(e) => setCallMemo(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              
              <Typography variant="subtitle2" gutterBottom>
                過去の通話メモ
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {activities
                  .filter((activity) => activity.type === 'phone_call')
                  .slice(0, 5)
                  .map((activity, index) => {
                    // 担当者名と日時を表示
                    const displayName = getDisplayName(activity.employee);
                    const formattedDate = formatDateTime(activity.createdAt);
                    const displayText = `${displayName} ${formattedDate}`;

                    return (
                      <Paper key={index} sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                          {displayText}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {activity.content}
                        </Typography>
                      </Paper>
                    );
                  })}
                {activities.filter((activity) => activity.type === 'phone_call').length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    過去の通話メモはありません
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCallMemoDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleSaveCallMemo}
            variant="contained"
            disabled={savingCallMemo || !callMemo.trim()}
          >
            {savingCallMemo ? <CircularProgress size={24} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SMSダイアログ */}
      <Dialog open={showSmsDialog} onClose={() => setShowSmsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>SMS送信</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            送信先: {seller?.phoneNumber}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="メッセージ"
            placeholder="送信するメッセージを入力してください..."
            value={smsMessage}
            onChange={(e) => setSmsMessage(e.target.value)}
            helperText={`${smsMessage.length} / 70文字`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSmsDialog(false)}>キャンセル</Button>
          <Button
            onClick={handleSendSms}
            variant="contained"
            disabled={sendingSms || !smsMessage.trim()}
            startIcon={<Sms />}
          >
            {sendingSms ? <CircularProgress size={24} /> : '送信'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SellerDetailPage;
