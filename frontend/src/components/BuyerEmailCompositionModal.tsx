import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { EmailData, MergedEmailContent } from '../types/emailTemplate';

interface BuyerEmailCompositionModalProps {
  open: boolean;
  buyerId: string;
  buyerEmail: string;
  propertyIds: string[]; // 複数物件対応に変更
  templateId: string;
  templateName: string;
  mergedContent: MergedEmailContent;
  onSend: (emailData: EmailData) => Promise<void>;
  onCancel: () => void;
}

/**
 * Modal for composing and sending email with merged template content
 * Allows user to review and edit before sending
 * Supports multiple properties
 */
export default function BuyerEmailCompositionModal({
  open,
  buyerId,
  buyerEmail,
  propertyIds,
  templateId,
  templateName,
  mergedContent,
  onSend,
  onCancel
}: BuyerEmailCompositionModalProps) {
  const [subject, setSubject] = useState(mergedContent.subject);
  const [body, setBody] = useState(mergedContent.body);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update content when mergedContent changes
  React.useEffect(() => {
    setSubject(mergedContent.subject);
    setBody(mergedContent.body);
    setError(null);
  }, [mergedContent]);

  const handleSend = async () => {
    setSending(true);
    setError(null);

    try {
      const emailData: EmailData = {
        buyerId,
        propertyId: propertyIds.length > 0 ? propertyIds[0] : undefined, // 後方互換性のため
        templateId,
        subject,
        body,
        recipientEmail: buyerEmail
      };

      await onSend(emailData);
    } catch (err: any) {
      console.error('Failed to send email:', err);
      setError(err.message || 'メールの送信に失敗しました');
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        メール送信
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            テンプレート: {templateName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            送信先: {buyerEmail}
          </Typography>
          {propertyIds.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              選択物件数: {propertyIds.length}件
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="件名"
          fullWidth
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          sx={{ mb: 2 }}
          disabled={sending}
        />

        <TextField
          label="本文"
          fullWidth
          multiline
          rows={15}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={sending}
        />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          ※ 送信前に内容を確認・編集できます
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={sending}>
          キャンセル
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={sending || !subject || !body}
          startIcon={sending ? <CircularProgress size={20} /> : null}
        >
          {sending ? '送信中...' : '送信'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
