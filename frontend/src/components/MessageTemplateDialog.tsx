import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import api from '../services/api';

interface MessageTemplate {
  category: string;
  type: string;
  subject: string;
  body: string;
}

interface MessageTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  recipientEmail: string;
  propertyNumber?: string;
}

export default function MessageTemplateDialog({
  open,
  onClose,
  recipientEmail,
  propertyNumber,
}: MessageTemplateDialogProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/message-templates', {
        params: { category: '物件' },
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const template = templates.find((t) => t.type === type);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSend = () => {
    // Gmailの作成画面を開く
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipientEmail
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>売主へメール送信</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              宛先: {recipientEmail}
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>テンプレート種別</InputLabel>
              <Select
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
                label="テンプレート種別"
              >
                {templates.map((template) => (
                  <MenuItem key={template.type} value={template.type}>
                    {template.type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="件名"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="本文"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              multiline
              rows={10}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={!subject || !body}
        >
          Gmailで開く
        </Button>
      </DialogActions>
    </Dialog>
  );
}
