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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api, { buyerApi, employeeApi } from '../services/api';
import { InlineEditableField } from '../components/InlineEditableField';
import { LATEST_STATUS_OPTIONS } from '../utils/buyerLatestStatusOptions';

interface Buyer {
  [key: string]: any;
}

export default function BuyerViewingResultPage() {
  const { buyer_number } = useParams<{ buyer_number: string }>();
  const navigate = useNavigate();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffInitials, setStaffInitials] = useState<Array<{ label: string; value: string }>>([]);
  const [copiedBuyerNumber, setCopiedBuyerNumber] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (buyer_number) {
      fetchBuyer();
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
          {/* 1行目: 内覧日（最新）、時間、後続担当 */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
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
                  sx={{ mt: 1 }}
                  onClick={() => {
                    // 内覧日時を取得
                    const viewingDate = new Date(buyer.latest_viewing_date);
                    const viewingTime = buyer.viewing_time || '14:00'; // デフォルト14:00
                    
                    // 時間をパース
                    const [hours, minutes] = viewingTime.split(':').map(Number);
                    viewingDate.setHours(hours, minutes, 0, 0);
                    
                    // 終了時刻（1時間後）
                    const endDate = new Date(viewingDate);
                    endDate.setHours(viewingDate.getHours() + 1);
                    
                    // Googleカレンダー用の日時フォーマット（YYYYMMDDTHHmmss）
                    const formatDateForCalendar = (date: Date) => {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hour = String(date.getHours()).padStart(2, '0');
                      const minute = String(date.getMinutes()).padStart(2, '0');
                      const second = String(date.getSeconds()).padStart(2, '0');
                      return `${year}${month}${day}T${hour}${minute}${second}`;
                    };
                    
                    const startDateStr = formatDateForCalendar(viewingDate);
                    const endDateStr = formatDateForCalendar(endDate);
                    
                    // イベントタイトル
                    const title = encodeURIComponent(`内覧: ${buyer.name || buyer.buyer_number}`);
                    
                    // 詳細情報
                    const details = encodeURIComponent(
                      `買主名: ${buyer.name || buyer.buyer_number}\n` +
                      `買主番号: ${buyer.buyer_number}\n` +
                      `電話: ${buyer.phone_number || 'なし'}\n` +
                      `メール: ${buyer.email || 'なし'}\n` +
                      `\n` +
                      `買主詳細ページ:\n${window.location.origin}/buyers/${buyer.buyer_number}\n` +
                      `\n` +
                      `内覧前伝達事項: ${buyer.pre_viewing_notes || 'なし'}`
                    );
                    
                    // 後続担当のメールアドレスを取得
                    const assignedToValue = buyer.follow_up_assignee;
                    const assignedEmployee = employees.find(e => 
                      e.name === assignedToValue || 
                      e.initials === assignedToValue || 
                      e.email === assignedToValue
                    );
                    const assignedEmail = assignedEmployee?.email || '';
                    
                    // 後続担当のカレンダーに直接作成（srcパラメータを使用）
                    const srcParam = assignedEmail ? `&src=${encodeURIComponent(assignedEmail)}` : '';
                    
                    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}${srcParam}`, '_blank');
                  }}
                >
                  📅 カレンダーで開く
                </Button>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <InlineEditableField
                label="時間"
                value={buyer.viewing_time || ''}
                onSave={(newValue) => handleInlineFieldSave('viewing_time', newValue)}
                fieldType="time"
                placeholder="例: 14:30"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <InlineEditableField
                label="後続担当"
                value={buyer.follow_up_assignee || ''}
                onSave={(newValue) => handleInlineFieldSave('follow_up_assignee', newValue)}
                fieldType="dropdown"
                options={staffInitials}
                placeholder="選択してください"
              />
            </Box>
          </Box>

          {/* 内覧結果・後続対応 */}
          <Box>
            <InlineEditableField
              label="内覧結果・後続対応"
              value={buyer.viewing_result_follow_up || ''}
              onSave={(newValue) => handleInlineFieldSave('viewing_result_follow_up', newValue)}
              multiline
              rows={6}
            />
          </Box>

          {/* ★最新状況 */}
          <Box>
            <InlineEditableField
              label="★最新状況"
              value={buyer.latest_status || ''}
              onSave={(newValue) => handleInlineFieldSave('latest_status', newValue)}
              fieldType="dropdown"
              options={LATEST_STATUS_OPTIONS}
            />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
