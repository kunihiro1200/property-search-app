import { Box, Typography, TextField, Grid, Button, CircularProgress, List, ListItem, ListItemText, Chip, Collapse } from '@mui/material';
import { Schedule as ScheduleIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';

interface PriceSectionProps {
  salesPrice?: number;
  listingPrice?: number;
  priceReductionHistory?: string;
  onFieldChange: (field: string, value: any) => void;
  editedData: Record<string, any>;
  isEditMode: boolean;
  propertyNumber: string;
  salesAssignee?: string;
  onChatSendSuccess: (message: string) => void;
  onChatSendError: (message: string) => void;
}

export default function PriceSection({
  salesPrice,
  listingPrice,
  priceReductionHistory,
  onFieldChange,
  editedData,
  isEditMode,
  propertyNumber,
  salesAssignee,
  onChatSendSuccess,
  onChatSendError,
}: PriceSectionProps) {
  const displaySalesPrice = editedData.sales_price !== undefined ? editedData.sales_price : salesPrice;
  const displayPriceReductionHistory = editedData.price_reduction_history !== undefined ? editedData.price_reduction_history : priceReductionHistory;

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledMessage, setScheduledMessage] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showImmediateForm, setShowImmediateForm] = useState(false);
  const [immediateMessage, setImmediateMessage] = useState('');
  const [sendingImmediate, setSendingImmediate] = useState(false);

  // 予約通知を取得
  useEffect(() => {
    if (!isEditMode && propertyNumber) {
      fetchScheduledNotifications();
    }
  }, [isEditMode, propertyNumber]);

  const fetchScheduledNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const api = (await import('../services/api')).default;
      const response = await api.get(`/api/chat-notifications/scheduled/${propertyNumber}`);
      setScheduledNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch scheduled notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const formatPrice = (price?: number | null) => {
    if (price === null || price === undefined) return '-';
    return `¥${price.toLocaleString()}`;
  };

  const handleSchedulePriceReduction = async () => {
    if (!scheduledDate) {
      onChatSendError('日付を入力してください');
      return;
    }

    if (!scheduledMessage.trim()) {
      onChatSendError('メッセージを入力してください');
      return;
    }

    setScheduling(true);
    try {
      const api = (await import('../services/api')).default;
      await api.post(`/api/chat-notifications/schedule-price-reduction/${propertyNumber}`, {
        scheduledDate,
        message: scheduledMessage,
      });
      
      onChatSendSuccess(`予約値下げを設定しました（${scheduledDate} 9:00に送信予定）`);
      setScheduledDate('');
      setScheduledMessage('');
      // 予約通知リストを再取得
      await fetchScheduledNotifications();
    } catch (error: any) {
      console.error('Failed to schedule price reduction:', error);
      onChatSendError(
        error.response?.data?.error?.message || '予約値下げの設定に失敗しました'
      );
    } finally {
      setScheduling(false);
    }
  };

  const handleImmediatePriceReduction = async () => {
    if (!immediateMessage.trim()) {
      onChatSendError('メッセージを入力してください');
      return;
    }

    setSendingImmediate(true);
    try {
      const webhookUrl = 'https://chat.googleapis.com/v1/spaces/AAAAw9wyS-o/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=t6SJmZ8af-yyB38DZzAqGOKYI-DnIl6wYtVo-Lyskuk';
      
      const message = {
        text: `【即値下げ通知】\n物件番号: ${propertyNumber}\n\n${immediateMessage}`
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error('Failed to send message to Google Chat');
      }

      onChatSendSuccess('即値下げ通知を送信しました');
      setImmediateMessage('');
      setShowImmediateForm(false);
    } catch (error: any) {
      console.error('Failed to send immediate price reduction:', error);
      onChatSendError('即値下げ通知の送信に失敗しました');
    } finally {
      setSendingImmediate(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
      {isEditMode ? (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              売買価格
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={displaySalesPrice || ''}
              onChange={(e) => onFieldChange('sales_price', e.target.value ? Number(e.target.value) : null)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>¥</Typography>,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'primary.main',
                },
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              値下げ履歴
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={displayPriceReductionHistory || ''}
              onChange={(e) => onFieldChange('price_reduction_history', e.target.value)}
              placeholder="値下げ履歴を入力してください"
              sx={{ whiteSpace: 'pre-line' }}
            />
          </Grid>
        </Grid>
      ) : (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              売買価格
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="primary.main" sx={{ fontSize: '2.5rem' }}>
              {formatPrice(displaySalesPrice)}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              値下げ履歴
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', fontSize: '1.1rem' }}>
              {displayPriceReductionHistory || '-'}
            </Typography>
          </Box>
          
          {/* 即値下げ */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd' }}>
            <Button
              fullWidth
              variant="outlined"
              endIcon={showImmediateForm ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowImmediateForm(!showImmediateForm)}
              sx={{
                justifyContent: 'space-between',
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: 'text.secondary',
                borderColor: '#ddd',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: 'rgba(211, 47, 47, 0.04)',
                },
              }}
            >
              即値下げ
            </Button>
            
            <Collapse in={showImmediateForm}>
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={immediateMessage}
                  onChange={(e) => setImmediateMessage(e.target.value)}
                  placeholder="即値下げ通知メッセージを入力してください"
                  sx={{ 
                    mb: 1,
                    '& .MuiInputBase-input': { fontSize: '1rem' }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleImmediatePriceReduction}
                  disabled={!immediateMessage.trim() || sendingImmediate}
                  fullWidth
                  sx={{
                    backgroundColor: '#d32f2f',
                    '&:hover': {
                      backgroundColor: '#b71c1c',
                    },
                  }}
                >
                  {sendingImmediate ? '送信中...' : 'Chat送信'}
                </Button>
              </Box>
            </Collapse>
          </Box>
          
          {/* 予約値下げ */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd' }}>
            <Button
              fullWidth
              variant="outlined"
              endIcon={showScheduleForm ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              sx={{
                justifyContent: 'space-between',
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: 'text.secondary',
                borderColor: '#ddd',
                '&:hover': {
                  borderColor: '#ed6c02',
                  backgroundColor: 'rgba(237, 108, 2, 0.04)',
                },
              }}
            >
              予約値下げ
            </Button>
            
            <Collapse in={showScheduleForm}>
              <Box sx={{ mt: 2 }}>
                {/* 予約済み通知リスト */}
                {loadingNotifications ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : scheduledNotifications.length > 0 && (
                  <Box sx={{ mb: 2, p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      予約済み
                    </Typography>
                    <List dense>
                      {scheduledNotifications.map((notification) => (
                        <ListItem key={notification.id} sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={new Date(notification.scheduled_at).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }) + ' 9:00'} 
                                  size="small" 
                                  color="warning"
                                />
                                <Typography variant="body2">
                                  {notification.message.split('\n').slice(2).join('\n')}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                
                <TextField
                  fullWidth
                  type="date"
                  label="予約日"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={scheduledMessage}
                  onChange={(e) => setScheduledMessage(e.target.value)}
                  placeholder="値下げ通知メッセージを入力してください"
                  sx={{ 
                    mb: 1,
                    '& .MuiInputBase-input': { fontSize: '1rem' }
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={scheduling ? <CircularProgress size={16} color="inherit" /> : <ScheduleIcon />}
                  onClick={handleSchedulePriceReduction}
                  disabled={!scheduledDate || !scheduledMessage.trim() || scheduling || !salesAssignee}
                  fullWidth
                  sx={{
                    backgroundColor: '#ed6c02',
                    '&:hover': {
                      backgroundColor: '#e65100',
                    },
                  }}
                >
                  {scheduling ? '設定中...' : `予約値下げを設定（${scheduledDate || '日付未選択'} 9:00送信）`}
                </Button>
                {!salesAssignee && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    物件に担当者が設定されていません
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Box>
        </Box>
      )}
    </Box>
  );
}
