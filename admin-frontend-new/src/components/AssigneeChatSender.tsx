import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Collapse,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Send as SendIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import api from '../services/api';

interface AssigneeChatSenderProps {
  propertyNumber: string;
  salesAssignee?: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function AssigneeChatSender({
  propertyNumber,
  salesAssignee,
  onSuccess,
  onError,
}: AssigneeChatSenderProps) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      onError('送信内容を入力してください');
      return;
    }

    if (!salesAssignee) {
      onError('担当者が設定されていません');
      return;
    }

    setSending(true);
    try {
      await api.post(`/api/chat-notifications/property-assignee/${propertyNumber}`, {
        message: message.trim(),
      });
      
      onSuccess(`担当者（${salesAssignee}）にChat送信しました`);
      setMessage('');
      setExpanded(false);
    } catch (error: any) {
      console.error('Failed to send chat:', error);
      onError(
        error.response?.data?.error?.message || '担当者へのChat送信に失敗しました'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={() => setExpanded(!expanded)}
        endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
        fullWidth
        sx={{ mb: expanded ? 2 : 0 }}
      >
        担当へChat送信
      </Button>
      
      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {salesAssignee && (
            <Typography variant="body2" color="text.secondary">
              送信先: {salesAssignee}
            </Typography>
          )}
          
          <TextField
            label="送信内容"
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="担当者へのメッセージを入力してください"
            fullWidth
          />
          
          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
            onClick={handleSend}
            disabled={!message.trim() || sending || !salesAssignee}
            fullWidth
          >
            {sending ? '送信中...' : '送信'}
          </Button>
        </Box>
      </Collapse>
    </Box>
  );
}
