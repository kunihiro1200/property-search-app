import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Paper
} from '@mui/material';
import { EmailTemplate } from '../types/emailTemplate';
import api from '../services/api';

interface TemplateSelectionModalProps {
  open: boolean;
  onSelect: (template: EmailTemplate) => void;
  onCancel: () => void;
}

/**
 * Modal for selecting an email template
 * Displays all available templates with names and descriptions
 */
export default function TemplateSelectionModal({
  open,
  onSelect,
  onCancel
}: TemplateSelectionModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{ subject: string; body: string } | null>(null);

  // Fetch templates when modal opens
  useEffect(() => {
    if (open) {
      fetchTemplates();
    } else {
      // Reset state when modal closes
      setSelectedTemplate(null);
      setPreviewContent(null);
      setError(null);
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/email-templates');
      setTemplates(response.data);
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
      setError('テンプレートの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    
    // Fetch preview
    try {
      const response = await api.get(`/api/email-templates/${template.id}/preview`);
      setPreviewContent(response.data);
    } catch (err: any) {
      console.error('Failed to fetch preview:', err);
      setPreviewContent(null);
    }
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  const handleRetry = () => {
    fetchTemplates();
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        メールテンプレートを選択
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleRetry}>
                再試行
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {!loading && !error && templates.length === 0 && (
          <Alert severity="info">
            利用可能なテンプレートがありません
          </Alert>
        )}

        {!loading && !error && templates.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Template List */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                テンプレート一覧
              </Typography>
              <List>
                {templates.map((template) => (
                  <ListItem key={template.id} disablePadding>
                    <ListItemButton
                      selected={selectedTemplate?.id === template.id}
                      onClick={() => handleTemplateClick(template)}
                    >
                      <ListItemText
                        primary={template.name}
                        secondary={template.description}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Preview */}
            {selectedTemplate && (
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  プレビュー
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  {previewContent ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        件名:
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {previewContent.subject}
                      </Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        本文:
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          maxHeight: 300,
                          overflow: 'auto'
                        }}
                      >
                        {previewContent.body}
                      </Typography>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                </Paper>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  ※ プレビューはサンプルデータで表示されています
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedTemplate}
        >
          このテンプレートを使用
        </Button>
      </DialogActions>
    </Dialog>
  );
}
