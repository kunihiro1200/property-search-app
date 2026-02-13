import { Box, Typography, TextField, Grid, Button, CircularProgress } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
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

  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const formatPrice = (price?: number | null) => {
    if (price === null || price === undefined) return '-';
    return `¥${price.toLocaleString()}`;
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim()) {
      onChatSendError('メッセージを入力してください');
      return;
    }

    setSendingChat(true);
    try {
      const api = (await import('../services/api')).default;
      await api.post(`/api/chat-notifications/property-assignee/${propertyNumber}`, {
        message: chatMessage,
      });
      
      onChatSendSuccess('チャットを送信しました');
      setChatMessage('');
    } catch (error: any) {
      console.error('Failed to send chat:', error);
      onChatSendError(
        error.response?.data?.error?.message || 'チャットの送信に失敗しました'
      );
    } finally {
      setSendingChat(false);
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
          
          {/* その他チャット送信 */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd' }}>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              その他チャット送信
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="担当者へのメッセージを入力してください"
              sx={{ 
                mb: 1,
                '& .MuiInputBase-input': { fontSize: '1rem' }
              }}
            />
            <Button
              variant="contained"
              startIcon={sendingChat ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              onClick={handleSendChat}
              disabled={!chatMessage.trim() || sendingChat || !salesAssignee}
              fullWidth
              sx={{
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#115293',
                },
              }}
            >
              {sendingChat ? '送信中...' : `${salesAssignee || '担当者'}へチャット送信`}
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
