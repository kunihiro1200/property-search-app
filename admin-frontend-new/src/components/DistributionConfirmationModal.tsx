import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Send as SendIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import SenderAddressSelector from './SenderAddressSelector';

interface DistributionConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  recipientCount: number;
  senderAddress: string;
  onSenderAddressChange: (address: string) => void;
  employees: any[];
  subject: string;
  bodyPreview: string;
}

export default function DistributionConfirmationModal({
  open,
  onClose,
  onConfirm,
  recipientCount,
  senderAddress,
  onSenderAddressChange,
  employees,
  subject,
  bodyPreview
}: DistributionConfirmationModalProps) {
  const [sending, setSending] = useState(false);

  const handleConfirm = async () => {
    setSending(true);
    try {
      await onConfirm();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        メール配信の確認
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          {/* 送信元アドレス選択 */}
          <Box sx={{ mb: 2 }}>
            <SenderAddressSelector
              value={senderAddress}
              onChange={onSenderAddressChange}
              employees={employees}
            />
          </Box>

          {/* 送信情報サマリー */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              送信情報
            </Typography>
            <List dense disablePadding>
              <ListItem disablePadding>
                <ListItemText
                  primary="送信元"
                  secondary={senderAddress}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem disablePadding>
                <ListItemText
                  primary="送信先"
                  secondary={`${recipientCount}件の買主`}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem disablePadding>
                <ListItemText
                  primary="件名"
                  secondary={subject}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
          </Box>

          {/* メール本文プレビュー */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              メール本文プレビュー
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.300',
                maxHeight: 200,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            >
              {bodyPreview}
            </Box>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            この操作により、{recipientCount}件の買主にメールが送信されます。
            送信後は取り消すことができません。
          </Alert>

          <Alert severity="info">
            送信元アドレス「{senderAddress}」から送信されます。
            Reply-Toも同じアドレスに設定されます。
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          キャンセル
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
          disabled={sending || recipientCount === 0}
        >
          {sending ? '送信中...' : `送信する (${recipientCount}件)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
