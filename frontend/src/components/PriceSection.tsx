import { Box, Typography, TextField, Grid, Button, CircularProgress } from '@mui/material';
import { Schedule as ScheduleIcon } from '@mui/icons-material';
import { useState } from 'react';

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
    } catch (error: any) {
      console.error('Failed to schedule price reduction:', error);
      onChatSendError(
        error.response?.data?.error?.message || '予約値下げの設定に失敗しました'
      );
    } finally {
      setScheduling(false);
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
          
          {/* 予約値下げ */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd' }}>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              予約値下げ
            </Typography>
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
        </Box>
      )}
    </Box>
  );
}
